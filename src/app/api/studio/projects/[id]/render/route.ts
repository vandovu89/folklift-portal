import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';
import { getStaffUser } from '@/lib/auth';
import { isR2Url } from '@/lib/storage';
import { isRenderWorkerConfigured, dispatchRenderJob } from '@/lib/render-worker';
import { buildTimelinePayload, canEditStudio, ensureSceneAudio, loadProject, mapLimit } from '@/lib/video-studio-server';
import { sanitizeFormat, sanitizeSettings, sanitizeStoryboard } from '@/lib/video-studio';
import { ttsConfigError } from '@/lib/tts';

type Params = { params: Promise<{ id: string }> };

// Tạo giọng đọc cho nhiều cảnh có thể mất vài chục giây
export const maxDuration = 120;

// Dựng video: lưu bản mới nhất từ giao diện -> tạo giọng đọc các cảnh còn thiếu -> gửi timeline sang worker FFmpeg
export async function POST(request: Request, { params }: Params) {
  const { role, id: userId } = await getStaffUser(request);
  if (!canEditStudio(role)) return NextResponse.json({ error: 'Bạn không có quyền tạo video AI' }, { status: 401 });

  if (!isRenderWorkerConfigured()) {
    return NextResponse.json({ error: 'Chưa cấu hình Cloudflare R2 và worker render (RENDER_WORKER_URL / RENDER_WORKER_SECRET). Xem docs/r2-cloud-run.md.' }, { status: 503 });
  }
  const { id } = await params;
  const project = await loadProject(id);
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const storyboard = body.storyboard !== undefined ? sanitizeStoryboard(body.storyboard) : project.storyboard;
  const settings = body.settings !== undefined ? sanitizeSettings(body.settings) : project.settings;
  const format = body.format !== undefined ? sanitizeFormat(body.format) : project.format;

  const configError = ttsConfigError(settings.ttsModel);
  if (configError) return NextResponse.json({ error: configError }, { status: 500 });
  if (storyboard.length === 0) return NextResponse.json({ error: 'Storyboard chưa có cảnh nào' }, { status: 400 });
  const badMedia = storyboard.findIndex(s => s.visual.kind !== 'card' && !isR2Url(s.visual.url) && !s.visual.url.includes('res.cloudinary.com'));
  if (badMedia >= 0) {
    return NextResponse.json({ error: `Cảnh ${badMedia + 1}: ảnh/clip phải nằm trong kho lưu trữ của hệ thống` }, { status: 400 });
  }

  let scenes;
  try {
    scenes = await mapLimit(storyboard, 3, scene => ensureSceneAudio(id, scene, settings));
  } catch (err) {
    // Lưu lại các cảnh đã có giọng để lần sau không phải tạo lại
    await prisma.videoProject.update({ where: { id }, data: { storyboard: storyboard as object[], settings: { ...settings }, format } });
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Lỗi tạo giọng đọc' }, { status: 502 });
  }

  const jobId = randomUUID();
  const outputKey = `renders/projects/${id.replace(/[^\w-]/g, '')}/${jobId}.mp4`;
  const payload = buildTimelinePayload(jobId, outputKey, format, settings, scenes);

  await prisma.$transaction([
    prisma.videoProject.update({
      where: { id },
      data: { storyboard: scenes as object[], settings: { ...settings }, format, status: 'rendering' }
    }),
    prisma.videoRenderJob.create({
      data: {
        id: jobId,
        projectId: id,
        outputKey,
        createdById: userId,
        script: scenes.map(s => s.narration).filter(Boolean).join('\n'),
        input: { kind: payload.kind, format, clipAudio: payload.clipAudio, scenes: payload.scenes } as object
      }
    })
  ]);

  try {
    await dispatchRenderJob(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Không gửi được job sang worker render';
    await prisma.$transaction([
      prisma.videoRenderJob.update({ where: { id: jobId }, data: { status: 'failed', error: message, finishedAt: new Date() } }),
      prisma.videoProject.update({ where: { id }, data: { status: 'failed' } })
    ]);
    return NextResponse.json({ error: `Không kết nối được máy chủ render video: ${message}` }, { status: 502 });
  }

  return NextResponse.json({ jobId, storyboard: scenes });
}
