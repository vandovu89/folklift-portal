import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStaffUser } from '@/lib/auth';
import { canEditStudio, loadProject } from '@/lib/video-studio-server';
import { BRAND_HOTLINE, BRAND_NAME, VIDEO_TEMPLATES, isVideoTemplate } from '@/lib/video-studio';
import { geminiText } from '@/lib/ai-media';
import { facebookVideoStatus, publishVideoToPage, type FacebookVideoMode } from '@/lib/facebook-video';

type Params = { params: Promise<{ id: string }> };

export const maxDuration = 120;

const MAX_CAPTION_CHARS = 2000;
// Giới hạn Reels của Facebook
const REEL_MIN_SECONDS = 3;
const REEL_MAX_SECONDS = 90;

// GET: danh sách Fanpage đã kết nối; có ?videoId=&pageId= thì trả tiến độ Facebook xử lý video
export async function GET(request: Request, { params }: Params) {
  const { role } = await getStaffUser(request);
  if (!canEditStudio(role)) return NextResponse.json({ error: 'Bạn không có quyền đăng video' }, { status: 401 });
  await params;

  const url = new URL(request.url);
  const videoId = url.searchParams.get('videoId');
  const pageId = url.searchParams.get('pageId');
  if (videoId && pageId) {
    if (!/^\d+$/.test(videoId)) return NextResponse.json({ error: 'Mã video không hợp lệ' }, { status: 400 });
    const page = await prisma.facebookPage.findUnique({ where: { pageId }, select: { accessToken: true } });
    if (!page?.accessToken) return NextResponse.json({ error: 'Không tìm thấy Fanpage' }, { status: 404 });
    try {
      return NextResponse.json(await facebookVideoStatus(videoId, page.accessToken));
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : 'Lỗi kiểm tra video' }, { status: 502 });
    }
  }

  const pages = await prisma.facebookPage.findMany({ orderBy: { createdAt: 'asc' }, select: { pageId: true, pageName: true } });
  return NextResponse.json({ pages });
}

// POST { action: 'caption' }: AI viết nội dung bài đăng từ lời đọc các cảnh
// POST { action: 'publish', pageId, mode: 'reel' | 'video', message, draft }: đăng video đã dựng lên Fanpage
export async function POST(request: Request, { params }: Params) {
  const { role } = await getStaffUser(request);
  if (!canEditStudio(role)) return NextResponse.json({ error: 'Bạn không có quyền đăng video' }, { status: 401 });

  const { id } = await params;
  const project = await loadProject(id);
  if (!project) return NextResponse.json({ error: 'Không tìm thấy dự án' }, { status: 404 });
  if (!project.outputUrl) return NextResponse.json({ error: 'Dự án chưa có video đã dựng' }, { status: 400 });

  const body = await request.json().catch(() => ({}));

  if (body.action === 'caption') {
    const narration = project.storyboard.map(s => s.narration.trim()).filter(Boolean).join(' ').slice(0, 3000);
    const templateLabel = isVideoTemplate(project.type) ? VIDEO_TEMPLATES[project.type].label : 'video';
    const instruction = `Bạn là người viết nội dung Fanpage cho "${BRAND_NAME}", đơn vị bán xe nâng cũ nhập khẩu trực tiếp từ Nhật Bản.
Viết caption tiếng Việt cho một ${templateLabel} đăng Facebook, tiêu đề dự án: "${project.title}".
Lời đọc trong video: "${narration}"
Yêu cầu:
- Dòng đầu là câu mở thu hút (có thể 1 emoji), sau đó 2-4 dòng ngắn nêu điểm chính, chỉ dùng thông tin có trong lời đọc (không bịa giá, thông số, khuyến mãi).
- Kết bằng lời kêu gọi liên hệ kèm hotline ${BRAND_HOTLINE}.
- Cuối cùng 3-6 hashtag tiếng Việt không dấu, liên quan xe nâng.
- Tối đa 120 từ. Chỉ trả về nội dung caption.`;
    try {
      const caption = await geminiText(instruction, 'Không viết được nội dung bài đăng', 2048);
      return NextResponse.json({ caption: caption.slice(0, MAX_CAPTION_CHARS) });
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : 'Lỗi viết nội dung' }, { status: 502 });
    }
  }

  if (body.action !== 'publish') return NextResponse.json({ error: 'Thao tác không hợp lệ' }, { status: 400 });

  const mode: FacebookVideoMode = body.mode === 'video' ? 'video' : 'reel';
  const message = typeof body.message === 'string' ? body.message.trim().slice(0, MAX_CAPTION_CHARS) : '';
  const draft = body.draft === true;
  if (!message) return NextResponse.json({ error: 'Hãy nhập nội dung bài đăng' }, { status: 400 });
  const page = typeof body.pageId === 'string'
    ? await prisma.facebookPage.findUnique({ where: { pageId: body.pageId }, select: { pageId: true, pageName: true, accessToken: true } })
    : null;
  if (!page?.accessToken) return NextResponse.json({ error: 'Không tìm thấy Fanpage hoặc Fanpage chưa có token' }, { status: 404 });

  if (mode === 'reel') {
    const job = await prisma.videoRenderJob.findFirst({ where: { projectId: id, outputUrl: project.outputUrl }, select: { durationSec: true } });
    const seconds = job?.durationSec ?? null;
    if (seconds !== null && (seconds < REEL_MIN_SECONDS || seconds > REEL_MAX_SECONDS)) {
      return NextResponse.json({ error: `Reels chỉ nhận video ${REEL_MIN_SECONDS}-${REEL_MAX_SECONDS} giây (video này ${Math.round(seconds)} giây). Hãy chọn "Bài video thường".` }, { status: 400 });
    }
  }

  try {
    const videoId = await publishVideoToPage({
      pageId: page.pageId,
      token: page.accessToken,
      mode,
      videoUrl: project.outputUrl,
      title: project.title,
      description: message,
      draft,
      aiGenerated: project.storyboard.some(s => (s.visual.kind === 'image' || s.visual.kind === 'clip') && s.visual.ai === true)
    });
    console.log(`[Studio Facebook] project=${id} page=${page.pageId} mode=${mode} draft=${draft} video=${videoId}`);
    return NextResponse.json({ videoId, pageId: page.pageId, pageName: page.pageName });
  } catch (err) {
    console.error('[Studio Facebook] publish failed:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Lỗi đăng video lên Facebook' }, { status: 502 });
  }
}
