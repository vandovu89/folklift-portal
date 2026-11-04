import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStaffUser } from '@/lib/auth';
import { isR2Configured, buildObjectKey, putObject } from '@/lib/storage';
import { canEditStudio } from '@/lib/video-studio-server';
import {
  BudgetError, availableClipModel, finalVisualPrompt, generateImage, mediaConfig, monthlySpendUsd, reserveBudget, startClip
} from '@/lib/ai-media';

export const maxDuration = 120;

// Ngân sách AI tháng này + chi phí ước tính mỗi lần tạo + clip (Veo) có dùng được không
export async function GET(request: Request) {
  const { role } = await getStaffUser(request);
  if (role === 'GUEST') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const config = mediaConfig();
  const [spentUsd, clipModel] = await Promise.all([monthlySpendUsd(), availableClipModel()]);
  return NextResponse.json({
    budgetUsd: config.budgetUsd,
    spentUsd,
    imageCostUsd: config.imageCostUsd,
    clipCostUsd: config.clipCostUsd,
    clipAvailable: Boolean(clipModel)
  });
}

// Tạo ảnh (trả kết quả ngay) hoặc bắt đầu tạo clip (trả id để hỏi tiến độ)
export async function POST(request: Request) {
  const { role, id: userId } = await getStaffUser(request);
  if (!canEditStudio(role)) return NextResponse.json({ error: 'Bạn không có quyền tạo hình ảnh AI' }, { status: 401 });
  if (!isR2Configured()) return NextResponse.json({ error: 'Chưa cấu hình Cloudflare R2 để lưu hình ảnh AI' }, { status: 503 });

  const body = await request.json().catch(() => ({}));
  const kind = body.kind === 'clip' ? 'clip' : 'image';
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim().slice(0, 800) : '';
  if (prompt.length < 10) return NextResponse.json({ error: 'Hãy mô tả hình ảnh cần tạo (ít nhất 10 ký tự)' }, { status: 400 });
  const project = typeof body.projectId === 'string'
    ? await prisma.videoProject.findUnique({ where: { id: body.projectId }, select: { id: true, format: true } })
    : null;
  if (!project) return NextResponse.json({ error: 'Không tìm thấy dự án' }, { status: 404 });
  const aspectRatio = project.format === 'horizontal' ? '16:9' : '9:16';
  const config = mediaConfig();

  const model = kind === 'clip' ? await availableClipModel() : config.imageModel;
  if (!model) return NextResponse.json({ error: 'Tài khoản Gemini hiện chưa được dùng Veo để tạo clip' }, { status: 503 });

  let generation;
  try {
    generation = await reserveBudget({
      kind, model, prompt, projectId: project.id, createdById: userId,
      costUsd: kind === 'clip' ? config.clipCostUsd : config.imageCostUsd
    });
  } catch (err) {
    if (err instanceof BudgetError) return NextResponse.json({ error: err.message }, { status: 402 });
    console.error('[AI media] reserve budget failed:', err);
    return NextResponse.json({ error: 'Không ghi được sổ chi phí AI, vui lòng thử lại' }, { status: 500 });
  }

  // Lỗi xảy ra trước khi Google tạo xong hình thì không bị tính phí: hoàn lại ngân sách
  let billed = false;
  try {
    if (kind === 'clip') {
      const operation = await startClip(model, finalVisualPrompt(prompt), aspectRatio);
      billed = true;
      await prisma.aiMediaGeneration.update({ where: { id: generation.id }, data: { operation } });
      return NextResponse.json({ id: generation.id, status: 'pending' });
    }

    const image = await generateImage(finalVisualPrompt(prompt), aspectRatio);
    billed = true;
    const ext = image.mimeType.includes('jpeg') ? 'jpg' : image.mimeType.split('/')[1] || 'png';
    const url = await putObject(buildObjectKey(`projects/${project.id}/ai`, `image.${ext}`), image.buffer, image.mimeType);
    await prisma.aiMediaGeneration.update({ where: { id: generation.id }, data: { status: 'done', url } });
    return NextResponse.json({ id: generation.id, status: 'done', url, kind });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Lỗi tạo hình ảnh AI';
    await prisma.aiMediaGeneration.update({ where: { id: generation.id }, data: { status: 'failed', error: message, ...(billed ? {} : { costUsd: 0 }) } });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
