import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isValidWorkerSecret } from '@/lib/render-worker';
import { r2PublicUrl } from '@/lib/storage';

// Worker FFmpeg báo trạng thái job: processing -> done (kèm outputKey) / failed (kèm lỗi)
export async function POST(request: Request) {
  if (!isValidWorkerSecret(request.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { jobId, status, outputKey, durationSec, sizeBytes, error } = await request.json().catch(() => ({}));
  if (typeof jobId !== 'string' || !['processing', 'done', 'failed'].includes(status)) {
    return NextResponse.json({ error: 'Payload không hợp lệ' }, { status: 400 });
  }

  const job = await prisma.videoRenderJob.findUnique({ where: { id: jobId } });
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  // Job đã kết thúc thì bỏ qua callback lặp lại
  if (job.status === 'done' || job.status === 'failed') return NextResponse.json({ ok: true, ignored: true });

  if (status === 'processing') {
    await prisma.videoRenderJob.update({ where: { id: jobId }, data: { status: 'processing', startedAt: new Date() } });
    return NextResponse.json({ ok: true });
  }

  if (status === 'failed') {
    await prisma.videoRenderJob.update({
      where: { id: jobId },
      data: { status: 'failed', error: String(error || 'Render thất bại').slice(0, 2000), finishedAt: new Date() }
    });
    if (job.projectId) await markProjectIfLatest(job.projectId, jobId, { status: 'failed' });
    return NextResponse.json({ ok: true });
  }

  // done: chỉ chấp nhận đúng outputKey mà web đã giao cho worker
  if (typeof outputKey !== 'string' || outputKey !== job.outputKey) {
    return NextResponse.json({ error: 'outputKey không khớp' }, { status: 400 });
  }
  const outputUrl = r2PublicUrl(outputKey);
  await prisma.videoRenderJob.update({
    where: { id: jobId },
    data: {
      status: 'done', outputKey, outputUrl, finishedAt: new Date(),
      durationSec: Number(durationSec) || null, sizeBytes: Number(sizeBytes) || null
    }
  });
  if (job.projectId) {
    await markProjectIfLatest(job.projectId, jobId, { status: 'done', outputUrl });
  } else if (job.forkliftId) {
    await prisma.forklift.update({
      where: { id: job.forkliftId },
      data: { aiVideoUrl: outputUrl, ...(job.script ? { aiVideoScript: job.script } : {}) }
    });
  }
  return NextResponse.json({ ok: true });
}

// Chỉ job render mới nhất của dự án được quyết định trạng thái / video thành phẩm của dự án
async function markProjectIfLatest(projectId: string, jobId: string, data: { status: string; outputUrl?: string }) {
  const latest = await prisma.videoRenderJob.findFirst({ where: { projectId }, orderBy: { createdAt: 'desc' }, select: { id: true } });
  if (latest?.id === jobId) await prisma.videoProject.update({ where: { id: projectId }, data });
}
