import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStaffUser } from '@/lib/auth';
import { isR2Configured } from '@/lib/storage';
import { canEditStudio, ensureSceneAudio, loadProject } from '@/lib/video-studio-server';
import { sanitizeSettings, sanitizeStoryboard } from '@/lib/video-studio';

type Params = { params: Promise<{ id: string }> };

// Nghe thử giọng đọc của 1 cảnh: tạo file MP3 (hoặc dùng lại nếu lời đọc không đổi) và lưu vào storyboard
export async function POST(request: Request, { params }: Params) {
  const { role } = await getStaffUser(request);
  if (!canEditStudio(role)) return NextResponse.json({ error: 'Bạn không có quyền tạo giọng đọc' }, { status: 401 });

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'ELEVENLABS_API_KEY chưa được cấu hình' }, { status: 500 });
  if (!isR2Configured()) return NextResponse.json({ error: 'Chưa cấu hình Cloudflare R2 để lưu giọng đọc' }, { status: 503 });

  const { id } = await params;
  const project = await loadProject(id);
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  // Dùng storyboard & cài đặt mới nhất trên giao diện (có thể chưa kịp lưu)
  const storyboard = body.storyboard !== undefined ? sanitizeStoryboard(body.storyboard) : project.storyboard;
  const settings = body.settings !== undefined ? sanitizeSettings(body.settings) : project.settings;
  const index = storyboard.findIndex(s => s.id === body.sceneId);
  if (index < 0) return NextResponse.json({ error: 'Không tìm thấy cảnh' }, { status: 404 });
  if (!storyboard[index].narration.trim()) return NextResponse.json({ error: 'Cảnh này chưa có lời đọc' }, { status: 400 });

  try {
    storyboard[index] = await ensureSceneAudio(id, storyboard[index], settings, apiKey);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Lỗi tạo giọng đọc' }, { status: 502 });
  }

  await prisma.videoProject.update({ where: { id }, data: { storyboard: storyboard as object[], settings: { ...settings } } });
  return NextResponse.json({ scene: storyboard[index] });
}
