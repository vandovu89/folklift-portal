import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStaffUser } from '@/lib/auth';
import { deleteObject, r2KeyFromUrl } from '@/lib/storage';
import { canEditStudio, loadProject, loadProjectAssets } from '@/lib/video-studio-server';
import { sanitizeFormat, sanitizeSettings, sanitizeStoryboard } from '@/lib/video-studio';

type Params = { params: Promise<{ id: string }> };

// Dự án + kho ảnh/clip của các xe trong dự án + job render mới nhất
export async function GET(request: Request, { params }: Params) {
  const { role } = await getStaffUser(request);
  if (role === 'GUEST') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const project = await loadProject(id);
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const [forklifts, assets, latestJob, testimonial] = await Promise.all([
    prisma.forklift.findMany({
      where: { id: { in: project.forkliftIds } },
      select: { id: true, maker: true, model: true, year: true, loadCapacity: true, powerType: true, internalCode: true }
    }),
    loadProjectAssets(id, project.sources),
    prisma.videoRenderJob.findFirst({
      where: { projectId: id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, status: true, outputUrl: true, error: true, durationSec: true, createdAt: true, finishedAt: true }
    }),
    project.sources.testimonialId
      ? prisma.testimonial.findUnique({ where: { id: project.sources.testimonialId }, select: { id: true, customerName: true, companyName: true } })
      : null
  ]);

  // Giữ thứ tự xe như lúc tạo dự án
  const orderedForklifts = project.forkliftIds.map(fid => forklifts.find(f => f.id === fid)).filter(Boolean);
  return NextResponse.json({ project, forklifts: orderedForklifts, assets, latestJob, testimonial, canEdit: canEditStudio(role) });
}

// Lưu tiêu đề / khung hình / cài đặt giọng đọc / storyboard (trình duyệt gửi bản đầy đủ)
export async function PUT(request: Request, { params }: Params) {
  const { role } = await getStaffUser(request);
  if (!canEditStudio(role)) return NextResponse.json({ error: 'Bạn không có quyền sửa video AI' }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (typeof body.title === 'string' && body.title.trim()) data.title = body.title.trim().slice(0, 120);
  if (body.format !== undefined) data.format = sanitizeFormat(body.format);
  if (body.settings !== undefined) data.settings = { ...sanitizeSettings(body.settings) };
  if (body.storyboard !== undefined) data.storyboard = sanitizeStoryboard(body.storyboard) as object[];

  try {
    const project = await prisma.videoProject.update({ where: { id }, data, select: { id: true, updatedAt: true } });
    return NextResponse.json(project);
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const { role } = await getStaffUser(request);
  if (!canEditStudio(role)) return NextResponse.json({ error: 'Bạn không có quyền xóa video AI' }, { status: 401 });

  const { id } = await params;
  const project = await loadProject(id);
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const jobs = await prisma.videoRenderJob.findMany({ where: { projectId: id }, select: { outputKey: true, outputUrl: true } });
  // File ảnh/clip AI bị xóa theo dự án; dòng trong sổ chi phí AI được giữ lại để ngân sách tháng vẫn đúng
  const aiMedia = await prisma.aiMediaGeneration.findMany({ where: { projectId: id, url: { not: null } }, select: { url: true } });
  // Video đã gắn làm video review của xe thì giữ lại file
  const outputUrls = jobs.map(j => j.outputUrl).filter((u): u is string => Boolean(u));
  const inUse = outputUrls.length > 0
    ? await prisma.forklift.findMany({
        where: { OR: [{ videoUrl: { in: outputUrls } }, { aiVideoUrl: { in: outputUrls } }] },
        select: { videoUrl: true, aiVideoUrl: true }
      })
    : [];
  const keep = new Set(inUse.flatMap(f => [f.videoUrl, f.aiVideoUrl]));
  await prisma.videoProject.delete({ where: { id } });

  // Dọn file giọng đọc & video thành phẩm trên R2 (lỗi không chặn việc xóa dự án)
  const keys = [
    ...project.storyboard.map(s => (s.audioUrl ? r2KeyFromUrl(s.audioUrl) : null)),
    ...jobs.filter(j => !j.outputUrl || !keep.has(j.outputUrl)).map(j => j.outputKey),
    ...aiMedia.map(m => (m.url ? r2KeyFromUrl(m.url) : null))
  ].filter((k): k is string => Boolean(k));
  await Promise.allSettled(keys.map(k => deleteObject(k)));

  return NextResponse.json({ ok: true });
}
