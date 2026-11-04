import { NextResponse } from 'next/server';
import { getStaffUser } from '@/lib/auth';
import { canEditStudio } from '@/lib/video-studio-server';
import { suggestVisualPrompt } from '@/lib/ai-media';

// Gemini viết mô tả hình ảnh (tiếng Anh) từ lời đọc của cảnh; người dùng xem / sửa trước khi bấm tạo (mới tốn tiền)
export async function POST(request: Request) {
  const { role } = await getStaffUser(request);
  if (!canEditStudio(role)) return NextResponse.json({ error: 'Bạn không có quyền tạo hình ảnh AI' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const narration = typeof body.narration === 'string' ? body.narration.trim().slice(0, 600) : '';
  const onScreenText = typeof body.onScreenText === 'string' ? body.onScreenText.trim().slice(0, 80) : '';
  if (!narration && !onScreenText) return NextResponse.json({ error: 'Cảnh chưa có lời đọc để gợi ý' }, { status: 400 });

  try {
    const prompt = await suggestVisualPrompt({ narration, onScreenText, kind: body.kind === 'clip' ? 'clip' : 'image' });
    return NextResponse.json({ prompt });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Lỗi gợi ý mô tả' }, { status: 502 });
  }
}
