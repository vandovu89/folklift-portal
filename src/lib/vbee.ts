// Gọi Vbee Text-to-Speech (https://api-docs.vbee.vn). Chỉ dùng phía server.
// Dùng chế độ "async" (giới hạn 100.000 ký tự, đủ mọi giọng) rồi hỏi trạng thái đến khi có file MP3,
// vì chế độ "sync" chỉ nhận tối đa 300 ký tự và vài giọng.
import { SITE_URL } from '@/lib/seo';
import { BASE_SPEED } from '@/lib/vietnamese-tts';
import { mp3Duration } from '@/lib/mp3';

const VBEE_API = 'https://api.vbee.vn/v1';
const POLL_TIMEOUT_MS = 100_000;

export interface VbeeCredentials { token: string; appId: string }

export function vbeeCredentials(): VbeeCredentials | null {
  const token = process.env.VBEE_API_TOKEN;
  const appId = process.env.VBEE_APP_ID;
  return token && appId ? { token, appId } : null;
}

export function vbeeHeaders({ token, appId }: VbeeCredentials): Record<string, string> {
  return { Authorization: `Bearer ${token}`, 'App-Id': appId, 'Content-Type': 'application/json' };
}

// Vbee bắt buộc có webhookUrl ở chế độ async; hệ thống tự hỏi trạng thái nên webhook chỉ cần trả 200
function webhookUrl(): string {
  if (process.env.VBEE_WEBHOOK_URL) return process.env.VBEE_WEBHOOK_URL;
  const base = (process.env.NEXT_PUBLIC_APP_URL || SITE_URL).replace(/\/+$/, '');
  return `${base}/api/ai/vbee-webhook`;
}

interface VbeeRequestInfo {
  requestId?: string;
  request_id?: string;
  status?: string;
  audioLink?: string;
  audio_link?: string;
  error_code?: string;
  error_message?: string;
}

async function readVbee(res: Response, action: string): Promise<VbeeRequestInfo> {
  const text = await res.text();
  let data: { result?: VbeeRequestInfo; error?: { code?: string; message?: string } } & VbeeRequestInfo = {};
  try { data = JSON.parse(text); } catch { /* lỗi không phải JSON */ }
  if (!res.ok || data.error) {
    const detail = data.error ? `${data.error.code || ''} ${data.error.message || ''}`.trim() : text.slice(0, 300);
    console.error(`Vbee ${action} failed:`, res.status, detail);
    throw new Error(`Lỗi tạo giọng đọc từ Vbee (${res.status}): ${detail}`);
  }
  return data.result && typeof data.result === 'object' ? data.result : data;
}

// Tốc độ trong dự án theo thang ElevenLabs (0.95 = chuẩn) -> thang Vbee (1.0 = chuẩn, 0.25 - 1.9)
export function toVbeeSpeed(speed: number): number {
  const s = (speed > 0 ? speed : BASE_SPEED) / BASE_SPEED;
  return Math.round(Math.min(1.9, Math.max(0.25, s)) * 100) / 100;
}

export async function synthesizeVbee(creds: VbeeCredentials, voiceCode: string, text: string, speed: number) {
  const created = await readVbee(await fetch(`${VBEE_API}/tts`, {
    method: 'POST',
    headers: vbeeHeaders(creds),
    body: JSON.stringify({
      text,
      voiceCode,
      mode: 'async',
      outputFormat: 'mp3',
      bitrate: 128,
      speed: toVbeeSpeed(speed),
      webhookUrl: webhookUrl()
    })
  }), 'create');

  const requestId = created.requestId || created.request_id;
  if (!requestId) throw new Error('Vbee không trả về mã yêu cầu (requestId)');

  // Hỏi trạng thái: 0.8s, 1.2s, 1.6s ... tối đa 2.5s/lần
  const started = Date.now();
  let audioLink = created.audioLink || created.audio_link;
  for (let attempt = 0; !audioLink; attempt++) {
    if (Date.now() - started > POLL_TIMEOUT_MS) throw new Error('Vbee tạo giọng đọc quá lâu, vui lòng thử lại');
    await new Promise(r => setTimeout(r, Math.min(2500, 800 + attempt * 400)));
    const info = await readVbee(await fetch(`${VBEE_API}/tts/requests/${encodeURIComponent(requestId)}`, {
      headers: vbeeHeaders(creds), cache: 'no-store'
    }), 'status');
    const status = (info.status || '').toUpperCase();
    if (status === 'FAILED' || status === 'FAILURE' || status === 'ERROR') {
      throw new Error(`Vbee không tạo được giọng đọc: ${info.error_message || info.error_code || status}`);
    }
    if (status === 'COMPLETED' || status === 'SUCCESS') {
      audioLink = info.audioLink || info.audio_link;
      if (!audioLink) throw new Error('Vbee báo hoàn thành nhưng không có link file âm thanh');
    }
  }

  // Link file của Vbee hết hạn sau 3 phút: tải về ngay
  const audioRes = await fetch(audioLink, { cache: 'no-store' });
  if (!audioRes.ok) throw new Error(`Không tải được file giọng đọc từ Vbee (${audioRes.status})`);
  const buffer = Buffer.from(await audioRes.arrayBuffer());
  return { buffer, duration: mp3Duration(buffer) || (buffer.length * 8) / 128_000 };
}
