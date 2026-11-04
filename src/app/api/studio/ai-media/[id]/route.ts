import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStaffUser } from '@/lib/auth';
import { buildObjectKey, putObject } from '@/lib/storage';
import { checkClip, downloadClip } from '@/lib/ai-media';

type Params = { params: Promise<{ id: string }> };

export const maxDuration = 120;

// Clip Veo quá lâu chưa xong thì coi như thất bại (vẫn tính chi phí vì Google có thể đã tạo)
const STALE_AFTER_MS = 15 * 60 * 1000;

// Hỏi tiến độ tạo clip: khi Veo xong thì tải video về R2 và trả link
export async function GET(request: Request, { params }: Params) {
  const { role } = await getStaffUser(request);
  if (role === 'GUEST') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const generation = await prisma.aiMediaGeneration.findUnique({ where: { id } });
  if (!generation) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const reply = (g: typeof generation) => NextResponse.json({ id: g.id, kind: g.kind, status: g.status, url: g.url, error: g.error });
  if (generation.status !== 'pending' || !generation.operation) return reply(generation);

  try {
    const result = await checkClip(generation.operation);
    if (!result) {
      if (Date.now() - generation.createdAt.getTime() > STALE_AFTER_MS) {
        return reply(await prisma.aiMediaGeneration.update({ where: { id }, data: { status: 'failed', error: 'Veo quá 15 phút chưa trả kết quả' } }));
      }
      return reply(generation);
    }
    // Hai lần hỏi cùng lúc: chỉ một lần được tải & lưu video
    const claimed = await prisma.aiMediaGeneration.updateMany({ where: { id, status: 'pending', url: null }, data: { url: '' } });
    if (claimed.count === 0) return reply(generation);
    const buffer = await downloadClip(result.videoUri);
    const url = await putObject(buildObjectKey(`projects/${generation.projectId || 'shared'}/ai`, 'clip.mp4'), buffer, 'video/mp4');
    return reply(await prisma.aiMediaGeneration.update({ where: { id }, data: { status: 'done', url } }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Lỗi tạo clip AI';
    // Nội dung bị Veo từ chối thì không bị tính phí (hoàn ngân sách); lỗi khác giữ trạng thái chờ để lần sau hỏi lại
    const refused = /từ chối nội dung/.test(message);
    return reply(await prisma.aiMediaGeneration.update({
      where: { id },
      data: refused ? { status: 'failed', error: message, costUsd: 0 } : { error: message, url: null }
    }));
  }
}
