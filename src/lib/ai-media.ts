// Tạo ảnh (Gemini Image) và clip (Veo) bằng AI cho AI Video Studio, kèm sổ ngân sách theo tháng. Chỉ dùng phía server.
import { prisma } from '@/lib/prisma';

// Biến môi trường (đều tùy chọn):
// AI_MEDIA_MONTHLY_BUDGET_USD  Trần chi phí ảnh + clip AI mỗi tháng (mặc định 50)
// AI_IMAGE_MODEL               Model tạo ảnh (mặc định gemini-3.1-flash-image)
// AI_IMAGE_COST_USD            Chi phí ước tính mỗi ảnh (mặc định 0.07)
// AI_CLIP_MODEL                Model Veo; để trống thì tự chọn model "veo-*" mà key được dùng
// AI_CLIP_COST_PER_SECOND_USD  Chi phí ước tính mỗi giây clip (mặc định 0.4)
const env = (name: string) => process.env[name]?.trim().replace(/^["']|["']$/g, '') || '';
const envNumber = (name: string, fallback: number) => {
  const n = Number(env(name));
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const API = 'https://generativelanguage.googleapis.com/v1beta';
export const CLIP_SECONDS = 8;

export const mediaConfig = () => ({
  budgetUsd: envNumber('AI_MEDIA_MONTHLY_BUDGET_USD', 50),
  imageModel: env('AI_IMAGE_MODEL') || 'gemini-3.1-flash-image',
  imageCostUsd: envNumber('AI_IMAGE_COST_USD', 0.07),
  clipCostUsd: Math.round(envNumber('AI_CLIP_COST_PER_SECOND_USD', 0.4) * CLIP_SECONDS * 100) / 100,
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

// ===== Clip (Veo) =====
let clipModelCache: { at: number; model: string | null } | null = null;

// Model Veo mà key được dùng (danh sách model lưu tạm 10 phút); null = chưa khả dụng
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
        if ((m.supportedGenerationMethods || []).includes('predictLongRunning') && /^models\/veo-/.test(m.name)) names.push(m.name.replace('models/', ''));
      }
      pageToken = data.nextPageToken || '';
    } while (pageToken);
    // Ưu tiên bản mới nhất, bản "fast" rẻ hơn
    model = names.sort((a, b) => b.localeCompare(a, 'en', { numeric: true }))
      .sort((a, b) => Number(b.includes('fast')) - Number(a.includes('fast')))[0] || null;
  } catch (err) {
    console.warn('[AI media] Không đọc được danh sách model Veo:', err instanceof Error ? err.message : err);
  }
  clipModelCache = { at: Date.now(), model };
  return model;
}

export async function startClip(model: string, prompt: string, aspectRatio: '9:16' | '16:9'): Promise<string> {
  const data = await gemini(`models/${model}:predictLongRunning`, {
    method: 'POST',
    body: JSON.stringify({ instances: [{ prompt }], parameters: { aspectRatio, durationSeconds: CLIP_SECONDS } })
  });
  if (typeof data?.name !== 'string') throw new Error('Veo không trả về mã tác vụ');
  return data.name;
}

// Kiểm tra tác vụ Veo: chưa xong -> null; xong -> link tải video (cần API key khi tải)
export async function checkClip(operation: string): Promise<{ videoUri: string } | null> {
  if (!/^[\w\-/.]+$/.test(operation)) throw new Error('Mã tác vụ Veo không hợp lệ');
  const data = await gemini(operation, { signal: AbortSignal.timeout(20_000) });
  if (!data.done) return null;
  if (data.error) throw new Error(`Veo lỗi: ${data.error.message || 'không rõ'}`);
  const sample = data.response?.generateVideoResponse?.generatedSamples?.[0];
  const uri = sample?.video?.uri;
  if (!uri) {
    const filtered = data.response?.generateVideoResponse?.raiMediaFilteredReasons?.[0];
    throw new Error(filtered ? `Veo từ chối nội dung: ${filtered}` : 'Veo không trả về video');
  }
  return { videoUri: uri };
}

export async function downloadClip(videoUri: string): Promise<Buffer> {
  const url = new URL(videoUri);
  if (url.hostname !== 'generativelanguage.googleapis.com') throw new Error('Link video Veo không hợp lệ');
  const res = await fetch(videoUri, { headers: { 'x-goog-api-key': apiKey() }, redirect: 'follow', signal: AbortSignal.timeout(120_000) });
  if (!res.ok) throw new Error(`Tải video Veo thất bại (HTTP ${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

// ===== Viết mô tả hình ảnh từ lời đọc của cảnh =====
const PROMPT_MODELS = ['gemini-3.8-flash', 'gemini-3-flash-preview', 'gemini-3.1-flash-lite'];

// Luật bắt buộc cho mọi hình AI: chỉ minh họa chung, không giả làm xe cụ thể đang bán, không chữ / logo
export const AI_VISUAL_RULES = 'Photorealistic, natural light, no text, no captions, no watermarks, no brand names or logos. If forklifts appear they must be generic and unbranded, shown at a distance as part of the scene, never as a close-up product shot.';

export async function suggestVisualPrompt(input: { narration: string; onScreenText: string; kind: 'image' | 'clip' }): Promise<string> {
  const instruction = `You write prompts for an AI ${input.kind === 'clip' ? 'video (8 seconds, one continuous shot, describe camera movement)' : 'image'} generator.
The visual illustrates one scene of a Vietnamese marketing video for a used Japanese forklift dealer.
Scene narration (Vietnamese): "${input.narration}"
${input.onScreenText ? `On-screen text (Vietnamese): "${input.onScreenText}"\n` : ''}Write ONE English prompt (max 70 words) for a GENERIC illustrative scene (warehouse, factory floor, logistics, workers, pallets, batteries, maintenance...) that fits the narration.
Rules: ${AI_VISUAL_RULES}
Return only the prompt text.`;
  let lastError: unknown = null;
  for (const model of PROMPT_MODELS) {
    try {
      const data = await gemini(`models/${model}:generateContent`, {
        method: 'POST',
        body: JSON.stringify({ contents: [{ parts: [{ text: instruction }] }], generationConfig: { temperature: 0.8, maxOutputTokens: 1024 } }),
        signal: AbortSignal.timeout(30_000)
      });
      const text: string = (data?.candidates?.[0]?.content?.parts || []).map((p: { text?: string }) => p.text || '').join('').trim();
      if (text) return text.replace(/^["']|["']$/g, '').slice(0, 800);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Không viết được mô tả hình ảnh');
}

// Mô tả gửi cho model tạo hình = mô tả người dùng + luật bắt buộc
export const finalVisualPrompt = (prompt: string) => `${prompt.trim()}\n\n${AI_VISUAL_RULES}`;
