// Gửi job render video AI sang worker FFmpeg (Cloud Run). Chỉ dùng phía server.
import { getBaseUrl } from '@/lib/url';
import { isR2Configured } from '@/lib/storage';

// Biến môi trường:
// RENDER_WORKER_URL         URL của service Cloud Run, VD https://mck-render-worker-xxxx.a.run.app
// RENDER_WORKER_SECRET      Chuỗi bí mật dùng chung giữa web và worker (đặt giống WORKER_SECRET bên worker)
// RENDER_CALLBACK_BASE_URL  (tuỳ chọn) URL web để worker gọi lại; mặc định = APP_URL / domain Vercel
const env = (name: string) => process.env[name]?.trim().replace(/^["']|["']$/g, '') || '';

export function isRenderWorkerConfigured(): boolean {
  return isR2Configured() && Boolean(env('RENDER_WORKER_URL') && env('RENDER_WORKER_SECRET'));
}

export function isValidWorkerSecret(authorization: string | null): boolean {
  const secret = env('RENDER_WORKER_SECRET');
  return Boolean(secret) && authorization === `Bearer ${secret}`;
}

export interface RenderJobPayload {
  jobId: string;
  clips: string[];
  audioUrl: string;
  format: string;
  audioMode: 'replace' | 'mix';
  outputKey: string;
}

export async function dispatchRenderJob(payload: RenderJobPayload): Promise<void> {
  const callbackBase = (env('RENDER_CALLBACK_BASE_URL') || getBaseUrl()).replace(/\/+$/, '');
  const res = await fetch(`${env('RENDER_WORKER_URL').replace(/\/+$/, '')}/render`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env('RENDER_WORKER_SECRET')}` },
    body: JSON.stringify({ ...payload, callbackUrl: `${callbackBase}/api/ai/render-callback` }),
    // Cloud Run có thể mất vài giây để khởi động instance khi đang ngủ
    signal: AbortSignal.timeout(30_000)
  });
  if (res.status !== 202) {
    throw new Error(`Worker render từ chối job (HTTP ${res.status}): ${(await res.text()).slice(0, 300)}`);
  }
}
