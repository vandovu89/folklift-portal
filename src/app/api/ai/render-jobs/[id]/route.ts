import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStaffUser } from '@/lib/auth';

// Job đứng yên quá lâu (worker sập / mất callback) thì coi như thất bại để người dùng tạo lại
const STALE_AFTER_MS = 20 * 60 * 1000;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { role } = await getStaffUser(request);
  if (role === 'GUEST') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  let job = await prisma.videoRenderJob.findUnique({
    where: { id },
    select: { id: true, forkliftId: true, status: true, outputUrl: true, error: true, durationSec: true, sizeBytes: true, createdAt: true, startedAt: true, finishedAt: true }
  });
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if ((job.status === 'queued' || job.status === 'processing') && Date.now() - job.createdAt.getTime() > STALE_AFTER_MS) {
    job = await prisma.videoRenderJob.update({
      where: { id },
      data: { status: 'failed', error: 'Quá thời gian chờ máy chủ render (20 phút). Vui lòng tạo lại video.', finishedAt: new Date() },
      select: { id: true, forkliftId: true, status: true, outputUrl: true, error: true, durationSec: true, sizeBytes: true, createdAt: true, startedAt: true, finishedAt: true }
    });
  }

  return NextResponse.json(job);
}
