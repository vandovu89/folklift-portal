// Tạo ảnh (Gemini Image) và clip (Gemini Omni) bằng AI cho AI Video Studio, kèm sổ ngân sách theo tháng. Chỉ dùng phía server.
import { prisma } from '@/lib/prisma';

// Biến môi trường (đều tùy chọn):
// AI_MEDIA_MONTHLY_BUDGET_USD  Trần chi phí ảnh + clip AI mỗi tháng (mặc định 50)
// AI_IMAGE_MODEL               Model tạo ảnh (mặc định gemini-3.1-flash-image)
// AI_IMAGE_COST_USD            Chi phí ước tính mỗi ảnh (mặc định 0.07)
// AI_CLIP_MODEL                Model tạo clip; để trống thì tự chọn model "gemini-omni-*" mà key được dùng
// AI_CLIP_COST_USD             Chi phí ước tính giữ trước cho mỗi clip ~10 giây 720p (mặc định 1.05)
// AI_CLIP_COST_PER_MTOK_USD    Giá 1 triệu token video, dùng tính chi phí thực tế khi clip xong (mặc định 17.5)
const env = (name: string) => process.env[name]?.trim().replace(/^["']|["']$/g, '') || '';
const envNumber = (name: string, fallback: number) => {
  const n = Number(env(name));
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const API = 'https://generativelanguage.googleapis.com/v1beta';

export const mediaConfig = () => ({
  budgetUsd: envNumber('AI_MEDIA_MONTHLY_BUDGET_USD', 50),
  imageModel: env('AI_IMAGE_MODEL') || 'gemini-3.1-flash-image',
  imageCostUsd: envNumber('AI_IMAGE_COST_USD', 0.07),
  clipCostUsd: envNumber('AI_CLIP_COST_USD', 1.05),
});

function apiKey(): string {
  const key = env('GEMINI_API_KEY');
  if (!key) throw new Error('GEMINI_API_KEY chưa được cấu hình');
  return key;
}

async function gemini(path: string, init?: RequestInit) {
  const res = await fetch(`${API}/${path}`, {
    ...init,
    headers: { 'x-goog-api-key': apiKey(), 'Content-Type': 'application/json', ...init?.headers },
    signal: init?.signal ?? AbortSignal.timeout(120_000)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message: string = data?.error?.message || `HTTP ${res.status}`;
    if (res.status === 402) throw new Error('Tài khoản Gemini đã hết số dư trả trước. Nạp thêm tại ai.studio/projects.');
    throw new Error(`Gemini (${res.status}): ${message.slice(0, 300)}`);
  }
  return data;
}

// ===== Ngân sách tháng (theo giờ Việt Nam) =====
function monthStart(): Date {
  const vn = new Date(Date.now() + 7 * 3600_000);
  return new Date(Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth(), 1) - 7 * 3600_000);
}

export async function monthlySpendUsd(): Promise<number> {
  const result = await prisma.aiMediaGeneration.aggregate({
    _sum: { costUsd: true },
    where: { createdAt: { gte: monthStart() } }
  });
  return Math.round((result._sum.costUsd || 0) * 100) / 100;
}

// Mọi lần tạo đều nằm trong sổ; lần nào chắc chắn Google không tính phí thì ghi costUsd = 0 (hoàn ngân sách).
// Ghi khoản chi trước khi gọi API; vượt trần thì từ chối (transaction tuần tự hoá để 2 người bấm cùng lúc không vượt trần)
export async function reserveBudget(data: { kind: 'image' | 'clip'; model: string; prompt: string; costUsd: number; projectId: string; createdById: string | null }) {
  const { budgetUsd } = mediaConfig();
  return prisma.$transaction(async tx => {
    const spent = await tx.aiMediaGeneration.aggregate({
      _sum: { costUsd: true },
      where: { createdAt: { gte: monthStart() } }
    });
    const used = spent._sum.costUsd || 0;
    if (used + data.costUsd > budgetUsd + 1e-9) {
      throw new BudgetError(`Đã dùng ${used.toFixed(2)}$ / ${budgetUsd}$ ngân sách AI tháng này, không đủ cho lần tạo ~${data.costUsd}$.`);
    }
    return tx.aiMediaGeneration.create({ data: { ...data, status: 'pending' } });
  }, { isolationLevel: 'Serializable' });
}

export class BudgetError extends Error {}

// ===== Ảnh =====
export async function generateImage(prompt: string, aspectRatio: '9:16' | '16:9'): Promise<{ buffer: Buffer; mimeType: string }> {
  const { imageModel } = mediaConfig();
  const data = await gemini(`models/${imageModel}:generateContent`, {
    method: 'POST',
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio } }
    })
  });
  const parts: { inlineData?: { mimeType: string; data: string } }[] = data?.candidates?.[0]?.content?.parts || [];
  const image = parts.find(p => p.inlineData?.data);
  if (!image?.inlineData) {
    const reason = data?.candidates?.[0]?.finishReason || data?.promptFeedback?.blockReason || 'không có ảnh trả về';
    throw new Error(`Gemini không tạo được ảnh (${reason}). Thử mô tả khác.`);
  }
  return { buffer: Buffer.from(image.inlineData.data, 'base64'), mimeType: image.inlineData.mimeType || 'image/png' };
}

// ===== Clip (Gemini Omni, Interactions API) =====
let clipModelCache: { at: number; model: string | null } | null = null;

// Model Omni mà key được dùng (danh sách model lưu tạm 10 phút); null = chưa khả dụng
export async function availableClipModel(): Promise<string | null> {
  const forced = env('AI_CLIP_MODEL');
  if (forced) return forced;
  if (clipModelCache && Date.now() - clipModelCache.at < 10 * 60_000) return clipModelCache.model;
  let model: string | null = null;
  try {
    let pageToken = '';
    const names: string[] = [];
    do {
      const data = await gemini(`models?pageSize=200${pageToken ? `&pageToken=${pageToken}` : ''}`, { signal: AbortSignal.timeout(15_000) });
      for (const m of data.models || []) {
        if (/^models\/gemini-omni-/.test(m.name)) names.push(m.name.replace('models/', ''));
      }
      pageToken = data.nextPageToken || '';
    } while (pageToken);
    // Ưu tiên bản chính thức (không "preview"), rồi bản mới nhất
    model = names.sort((a, b) => b.localeCompare(a, 'en', { numeric: true }))
      .sort((a, b) => Number(a.includes('preview')) - Number(b.includes('preview')))[0] || null;
  } catch (err) {
    console.warn('[AI media] Không đọc được danh sách model Omni:', err instanceof Error ? err.message : err);
  }
  clipModelCache = { at: Date.now(), model };
  return model;
}

export interface SourceImage { data: string; mimeType: string }

// Tải ảnh gốc (đã kiểm tra nằm trong kho R2 / Cloudinary của hệ thống) để AI làm chuyển động
export async function fetchSourceImage(url: string): Promise<SourceImage> {
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`Không tải được ảnh gốc (HTTP ${res.status})`);
  const mimeType = (res.headers.get('content-type') || '').split(';')[0].trim();
  if (!/^image\/(jpeg|png|webp)$/.test(mimeType)) throw new Error('Ảnh gốc phải là JPEG, PNG hoặc WebP');
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length > 15 * 1024 * 1024) throw new Error('Ảnh gốc quá lớn (tối đa 15MB)');
  return { data: buffer.toString('base64'), mimeType };
}

// Làm ảnh thật chuyển động: giữ nguyên mọi chi tiết, chỉ thêm chuyển động máy quay
export const ANIMATE_RULES = 'Animate this exact photo. Keep every object exactly as it appears: do not change, add or remove vehicles, people, text, logos, colors or any details. Only add subtle, realistic camera movement and natural ambient motion. No new text or captions.';

// Chạy nền (background) để không phải giữ request 1-2 phút; trả mã interaction để hỏi tiến độ
export async function startClip(model: string, prompt: string, aspectRatio: '9:16' | '16:9', image?: SourceImage): Promise<string> {
  const data = await gemini('interactions', {
    method: 'POST',
    body: JSON.stringify({
      model,
      input: image
        ? [{ type: 'image', data: image.data, mime_type: image.mimeType }, { type: 'text', text: prompt }]
        : prompt,
      ...(image ? { generation_config: { video_config: { task: 'image_to_video' } } } : {}),
      response_format: { type: 'video', aspect_ratio: aspectRatio, resolution: '720p', delivery: 'uri' },
      background: true,
      store: true
    })
  });
  if (typeof data?.id !== 'string') throw new Error('Gemini Omni không trả về mã tác vụ');
  return data.id;
}

type ClipResult = { videoUri: string; costUsd: number | null } | { refused: string } | { failed: string };

// Kiểm tra tác vụ: chưa xong -> null; xong -> link tải video + chi phí thực tế (theo số token video Google tính)
export async function checkClip(interactionId: string): Promise<ClipResult | null> {
  if (!/^[\w-]+$/.test(interactionId)) throw new Error('Mã tác vụ không hợp lệ');
  const data = await gemini(`interactions/${interactionId}`, { signal: AbortSignal.timeout(30_000) });
  if (data.status === 'in_progress' || data.status === 'queued') return null;
  const outputTokens = Number(data.usage?.total_output_tokens) || 0;
  const costUsd = outputTokens ? Math.round(outputTokens * envNumber('AI_CLIP_COST_PER_MTOK_USD', 17.5) / 1e4) / 100 : null;
  const video = (data.steps || [])
    .flatMap((step: { content?: { type?: string; uri?: string }[] }) => step.content || [])
    .find((part: { type?: string; uri?: string }) => part.type === 'video' && part.uri);
  if (data.status === 'completed' && video) return { videoUri: video.uri, costUsd };
  const reason = data.error?.message || (data.status === 'completed' ? 'không có video trả về' : data.status || 'không rõ');
  // Không sinh ra video (thường do bộ lọc nội dung) thì Google không tính token video
  if (!outputTokens) return { refused: `AI từ chối hoặc không tạo được clip (${String(reason).slice(0, 200)}). Thử mô tả khác.` };
  return { failed: `Gemini Omni lỗi: ${String(reason).slice(0, 200)}` };
}

export async function downloadClip(videoUri: string): Promise<Buffer> {
  const url = new URL(videoUri);
  if (url.hostname !== 'generativelanguage.googleapis.com') throw new Error('Link video không hợp lệ');
  const res = await fetch(videoUri, { headers: { 'x-goog-api-key': apiKey() }, redirect: 'follow', signal: AbortSignal.timeout(120_000) });
  if (!res.ok) throw new Error(`Tải video AI thất bại (HTTP ${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

// ===== Viết mô tả hình ảnh từ lời đọc của cảnh =====
const PROMPT_MODELS = ['gemini-3.8-flash', 'gemini-3-flash-preview', 'gemini-3.1-flash-lite'];

// Luật bắt buộc cho mọi hình AI: chỉ minh họa chung, không giả làm xe cụ thể đang bán, không chữ / logo
export const AI_VISUAL_RULES = 'Photorealistic, natural light, no text, no captions, no watermarks, no brand names or logos. If forklifts appear they must be generic and unbranded, shown at a distance as part of the scene, never as a close-up product shot.';

export async function suggestVisualPrompt(input: { narration: string; onScreenText: string; kind: 'image' | 'clip' }): Promise<string> {
  const instruction = `You write prompts for an AI ${input.kind === 'clip' ? 'video (about 10 seconds, one continuous shot, describe camera movement)' : 'image'} generator.
The visual illustrates one scene of a Vietnamese marketing video for a used Japanese forklift dealer.
Scene narration (Vietnamese): "${input.narration}"
${input.onScreenText ? `On-screen text (Vietnamese): "${input.onScreenText}"\n` : ''}Write ONE English prompt (max 70 words) for a GENERIC illustrative scene (warehouse, factory floor, logistics, workers, pallets, batteries, maintenance...) that fits the narration.
Rules: ${AI_VISUAL_RULES}
Return only the prompt text.`;
  const text = await geminiText(instruction, 'Không viết được mô tả hình ảnh');
  return text.replace(/^["']|["']$/g, '').slice(0, 800);
}

// Gọi Gemini viết một đoạn chữ ngắn, thử lần lượt các model (model quá tải thì sang model sau)
export async function geminiText(instruction: string, failMessage: string, maxOutputTokens = 1024): Promise<string> {
  let lastError: unknown = null;
  for (const model of PROMPT_MODELS) {
    try {
      const data = await gemini(`models/${model}:generateContent`, {
        method: 'POST',
        body: JSON.stringify({ contents: [{ parts: [{ text: instruction }] }], generationConfig: { temperature: 0.8, maxOutputTokens } }),
        signal: AbortSignal.timeout(30_000)
      });
      const text: string = (data?.candidates?.[0]?.content?.parts || []).map((p: { text?: string }) => p.text || '').join('').trim();
      if (text) return text;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(failMessage);
}

// Mô tả gửi cho model tạo hình = mô tả người dùng + luật bắt buộc
export const finalVisualPrompt = (prompt: string) => `${prompt.trim()}\n\n${AI_VISUAL_RULES}`;
