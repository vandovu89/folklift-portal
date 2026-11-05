// Đăng video đã dựng của AI Video Studio lên Fanpage (Reels hoặc bài video thường). Chỉ dùng phía server.
// Facebook tự tải video từ link công khai trên R2, không đi qua Vercel nên không vướng giới hạn dung lượng.
import { GRAPH_VERSION } from '@/lib/facebook-oauth';

const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`;

export type FacebookVideoMode = 'reel' | 'video';

// Lỗi thiếu quyền của Facebook: nói rõ cần kết nối lại Fanpage với quyền đăng bài
function graphError(data: { error?: { message?: string; code?: number } }, fallback: string): Error {
  const code = data?.error?.code;
  if (code === 10 || (code && code >= 200 && code < 300)) {
    return new Error('Fanpage chưa cấp quyền đăng bài (pages_manage_posts, pages_read_engagement). Vào "Fanpage & Bot" kết nối lại Fanpage và tick cấp các quyền này.');
  }
  if (code === 190) return new Error('Token của Fanpage đã hết hạn. Vào "Fanpage & Bot" kết nối lại Fanpage.');
  return new Error(`Facebook: ${(data?.error?.message || fallback).slice(0, 300)}`);
}

async function graphPost(path: string, params: Record<string, string>, token: string) {
  const res = await fetch(`${GRAPH}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ ...params, access_token: token }),
    signal: AbortSignal.timeout(60_000)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.error) throw graphError(data, `HTTP ${res.status}`);
  return data;
}

// Reels: 3 bước (mở phiên tải lên -> Facebook kéo file từ link -> xuất bản hoặc lưu nháp)
async function publishReel(pageId: string, token: string, videoUrl: string, description: string, opts: { draft: boolean; aiGenerated: boolean }) {
  const start = await graphPost(`${pageId}/video_reels`, { upload_phase: 'start' }, token);
  const videoId: string = start.video_id;
  if (!videoId) throw new Error('Facebook không trả về mã video');

  const upload = await fetch(`https://rupload.facebook.com/video-upload/${GRAPH_VERSION}/${videoId}`, {
    method: 'POST',
    headers: { Authorization: `OAuth ${token}`, file_url: videoUrl },
    signal: AbortSignal.timeout(90_000)
  });
  const uploadData = await upload.json().catch(() => ({}));
  if (!upload.ok || !uploadData?.success) throw graphError(uploadData, `Tải video lên Facebook thất bại (HTTP ${upload.status})`);

  await graphPost(`${pageId}/video_reels`, {
    upload_phase: 'finish',
    video_id: videoId,
    video_state: opts.draft ? 'DRAFT' : 'PUBLISHED',
    description,
    ...(opts.aiGenerated ? { is_ai_generated: 'true' } : {})
  }, token);
  return videoId;
}

// Bài video thường trên Fanpage (dùng cho cả video ngang)
async function publishPageVideo(pageId: string, token: string, videoUrl: string, title: string, description: string, opts: { draft: boolean }) {
  const data = await graphPost(`${pageId}/videos`, {
    file_url: videoUrl,
    title,
    description,
    published: opts.draft ? 'false' : 'true'
  }, token);
  if (!data.id) throw new Error('Facebook không trả về mã video');
  return data.id as string;
}

export async function publishVideoToPage(input: {
  pageId: string; token: string; mode: FacebookVideoMode; videoUrl: string; title: string; description: string; draft: boolean; aiGenerated: boolean;
}): Promise<string> {
  return input.mode === 'reel'
    ? publishReel(input.pageId, input.token, input.videoUrl, input.description, { draft: input.draft, aiGenerated: input.aiGenerated })
    : publishPageVideo(input.pageId, input.token, input.videoUrl, input.title, input.description, { draft: input.draft });
}

export interface FacebookVideoStatus { state: 'processing' | 'ready' | 'error'; published: boolean; error: string | null; permalink: string | null }

// Facebook xử lý video thêm 1-5 phút sau khi nhận
export async function facebookVideoStatus(videoId: string, token: string): Promise<FacebookVideoStatus> {
  const res = await fetch(`${GRAPH}/${videoId}?fields=status,permalink_url&access_token=${encodeURIComponent(token)}`, { cache: 'no-store', signal: AbortSignal.timeout(20_000) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.error) throw graphError(data, `HTTP ${res.status}`);
  const status = data.status || {};
  const failed = ['upload_failed', 'expired', 'error'].includes(status.video_status) || status.processing_phase?.status === 'error' || status.publishing_phase?.publish_status === 'error';
  return {
    state: failed ? 'error' : status.video_status === 'ready' ? 'ready' : 'processing',
    published: status.publishing_phase?.publish_status === 'published',
    error: failed ? (status.processing_phase?.error?.message || status.publishing_phase?.errors?.[0]?.message || 'Facebook xử lý video thất bại') : null,
    permalink: data.permalink_url ? new URL(data.permalink_url, 'https://www.facebook.com').toString() : null
  };
}
