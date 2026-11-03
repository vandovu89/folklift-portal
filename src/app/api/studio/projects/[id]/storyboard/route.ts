import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GoogleGenerativeAI, SchemaType, type ResponseSchema } from '@google/generative-ai';
import { getStaffUser } from '@/lib/auth';
import { numberToVietnamese, wordsPerSecond, countSpokenWords } from '@/lib/vietnamese-tts';
import { SCRIPT_STYLES, HOOK_IDEAS, type ScriptStyle } from '@/lib/ai-video';
import { canEditStudio, loadProject, loadForkliftAssets, type StudioAsset } from '@/lib/video-studio-server';
import {
  BRAND_NAME, BRAND_HOTLINE, IMAGE_MOTIONS, MAX_SCENES, newSceneId, sanitizeSettings, sanitizeStoryboard,
  type ImageMotion, type Scene
} from '@/lib/video-studio';

type Params = { params: Promise<{ id: string }> };

const CANDIDATE_MODELS = ['gemini-3.8-flash', 'gemini-3-flash-preview', 'gemini-3.1-flash-lite'];
// Gemini bị treo / sinh lặp thì chuyển sang model kế tiếp
const MODEL_TIMEOUT_MS = 45_000;

// Ép Gemini trả đúng cấu trúc storyboard; mô tả độ dài giúp model không sinh một chuỗi lặp vô tận tới hết token
const STORYBOARD_SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    title: { type: SchemaType.STRING, description: 'Tiêu đề ngắn, tối đa 10 từ' },
    scenes: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          asset: { type: SchemaType.STRING, description: 'Mã ảnh/clip trong kho (A1, C1...) hoặc CARD' },
          narration: { type: SchemaType.STRING, description: 'Lời đọc 1-2 câu, tối đa 40 từ' },
          onScreenText: { type: SchemaType.STRING, description: 'Tối đa 6 từ, có thể rỗng' },
          motion: { type: SchemaType.STRING, description: 'zoom_in | zoom_out | pan_left | pan_right' },
          cardTitle: { type: SchemaType.STRING, description: 'Chỉ dùng khi asset là CARD, tối đa 8 từ' },
          cardSubtitle: { type: SchemaType.STRING, description: 'Chỉ dùng khi asset là CARD, tối đa 15 từ' }
        },
        required: ['asset', 'narration']
      }
    }
  },
  required: ['title', 'scenes']
};

interface AiScene {
  asset?: string;
  cardTitle?: string;
  cardSubtitle?: string;
  narration?: string;
  onScreenText?: string;
  motion?: string;
}

function assetLabel(asset: StudioAsset, code: string): string {
  return `${code}: ${asset.kind === 'clip' ? 'clip quay thực tế' : 'ảnh'}${asset.category ? ` (${asset.category})` : ''}${asset.isPublic ? ', đang hiển thị trên web' : ''}`;
}

// AI lên storyboard: chia cảnh, chọn ảnh/clip thật của xe cho từng cảnh, viết lời đọc & chữ trên màn hình
export async function POST(request: Request, { params }: Params) {
  const { role } = await getStaffUser(request);
  if (!canEditStudio(role)) return NextResponse.json({ error: 'Bạn không có quyền tạo video AI' }, { status: 401 });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'GEMINI_API_KEY chưa được cấu hình' }, { status: 500 });

  const { id } = await params;
  const project = await loadProject(id);
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Cho phép gửi kèm cài đặt mới nhất từ giao diện (thời lượng, phong cách, ghi chú)
  const body = await request.json().catch(() => ({}));
  const settings = body.settings ? sanitizeSettings(body.settings) : project.settings;

  const forkliftId = project.forkliftIds[0];
  const forklift = forkliftId ? await prisma.forklift.findUnique({ where: { id: forkliftId } }) : null;
  if (!forklift) return NextResponse.json({ error: 'Dự án chưa chọn xe hoặc xe đã bị xóa' }, { status: 400 });

  const assets = (await loadForkliftAssets([forklift.id])).slice(0, 24);
  const codes = new Map<string, StudioAsset>();
  assets.filter(a => a.kind === 'image').forEach((a, i) => codes.set(`A${i + 1}`, a));
  assets.filter(a => a.kind === 'clip').forEach((a, i) => codes.set(`C${i + 1}`, a));

  const target = settings.targetDuration;
  const wps = wordsPerSecond(settings.speed, settings.ttsModel);
  const sceneCount = Math.max(3, Math.min(12, Math.round(target / 5)));
  // Mỗi cảnh có ~0.5s nghỉ sau lời đọc
  const targetWords = Math.round(Math.max(5, target - sceneCount * 0.5) * wps);

  const concreteStyles = (Object.keys(SCRIPT_STYLES) as ScriptStyle[]).filter(k => k !== 'random');
  const style: ScriptStyle = settings.tone === 'random'
    ? concreteStyles[Math.floor(Math.random() * concreteStyles.length)]
    : settings.tone;
  const hookIdea = HOOK_IDEAS[Math.floor(Math.random() * HOOK_IDEAS.length)];
  const motions = Object.keys(IMAGE_MOTIONS).filter(m => m !== 'none').join(', ');

  const prompt = `Bạn là đạo diễn video marketing ngắn (Reels/TikTok) cho thương hiệu ${BRAND_NAME}, chuyên xe nâng bãi Nhật Bản.
Hãy lên STORYBOARD cho một video giới thiệu chiếc xe nâng bên dưới, dài khoảng ${target} giây, gồm ${sceneCount} cảnh (được phép lệch 1-2 cảnh).

KHO HÌNH ẢNH THẬT CỦA CHIẾC XE (chỉ được dùng các mã này):
${assets.length > 0 ? [...codes.entries()].map(([code, a]) => `- ${assetLabel(a, code)}`).join('\n') : '- (chưa có ảnh/clip nào, hãy dùng toàn bộ là thẻ chữ CARD)'}
- CARD: thẻ chữ trên nền màu thương hiệu (dùng cho cảnh mở đầu hoặc cảnh kết kêu gọi liên hệ)

QUY TẮC:
- Mỗi cảnh chọn "asset" là một mã trong kho ở trên hoặc "CARD". Ưu tiên ảnh đang hiển thị trên web và clip thực tế; có thể dùng lại một mã nếu kho ít ảnh, nhưng tránh hai cảnh liền nhau trùng mã.
- Cảnh cuối là CARD kêu gọi liên hệ: cardTitle "${BRAND_NAME}", cardSubtitle có hotline/Zalo ${BRAND_HOTLINE}.
- "narration": lời đọc của cảnh, 1-2 câu ngắn, tiếng Việt tự nhiên. TỔNG số từ lời đọc của mọi cảnh khoảng ${targetWords} từ (tốc độ đọc ~${wps.toFixed(1)} từ/giây). VIẾT CON SỐ BẰNG CHỮ (VD "hai phẩy năm tấn"), tên model giữ nguyên ký hiệu. Không có chỉ dẫn [cảnh quay], không markdown.
- "onScreenText": chữ to hiện trên màn hình, tối đa 6 từ, có thể dùng chữ số (VD "2.5 TẤN", "Chỉ 350 triệu", "Xe bãi Nhật"). Để trống nếu không cần.
- "motion" (chỉ cho ảnh): một trong ${motions}.
- Không bịa thông số hay tình trạng xe ngoài dữ liệu bên dưới.

PHONG CÁCH LỜI ĐỌC: ${SCRIPT_STYLES[style].label}
${SCRIPT_STYLES[style].structure}
- Gợi ý mở đầu: ${hookIdea}. Tránh mở đầu sáo rỗng kiểu "Chào mừng quý khách đến với...".
${settings.note ? `- THÔNG TIN BỔ SUNG TỪ NGƯỜI BÁN (bắt buộc lồng vào): ${settings.note}\n` : ''}
THÔNG SỐ XE:
- Hãng: ${forklift.maker}
- Model: ${forklift.model}
- Năm sản xuất: ${forklift.year || 'Đang cập nhật'}
- Chủng loại: ${forklift.category || 'Không xác định'}
- Tải trọng: ${forklift.loadCapacity || 'Đang cập nhật'}
- Chiều cao nâng: ${forklift.liftHeight || 'Đang cập nhật'}
- Nhiên liệu: ${forklift.powerType || 'Đang cập nhật'}
- Giờ hoạt động: ${forklift.hour ? forklift.hour + ' giờ' : 'Đang cập nhật'}
- Tình trạng: ${forklift.condition || 'Hoạt động tốt'}
- Giá bán tham khảo: ${forklift.price ? numberToVietnamese(forklift.price) + ' đồng' : 'Liên hệ'}
- Càng: ${forklift.forkLength || 'Tiêu chuẩn'}
- Phụ kiện: ${forklift.attachment || 'Không'}

Trả về JSON đúng dạng:
{"title": "tiêu đề ngắn cho video", "scenes": [{"asset": "A1", "narration": "...", "onScreenText": "...", "motion": "zoom_in", "cardTitle": "", "cardSubtitle": ""}]}`;

  const genAI = new GoogleGenerativeAI(apiKey);
  let parsed: { title?: string; scenes?: AiScene[] } | null = null;
  let lastError: unknown = null;
  // Mỗi model thử tối đa 2 lần (JSON hỏng do sinh lặp thường không lặp lại ở lần sau); quá tải 503 thì sang model khác ngay
  models: for (const modelName of CANDIDATE_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: { temperature: 0.8, maxOutputTokens: 8192, responseMimeType: 'application/json', responseSchema: STORYBOARD_SCHEMA }
        }, { timeout: MODEL_TIMEOUT_MS });
        const result = await model.generateContent(prompt);
        const json = JSON.parse(result.response.text());
        if (Array.isArray(json?.scenes) && json.scenes.length > 0) {
          parsed = json;
          break models;
        }
      } catch (err) {
        console.warn(`[Studio Storyboard] Model ${modelName} failed:`, err instanceof Error ? err.message : err);
        lastError = err;
        if (err instanceof Error && /503/.test(err.message)) continue models;
      }
    }
  }
  if (!parsed?.scenes) {
    const message = lastError instanceof Error ? lastError.message : 'Không tạo được storyboard từ Gemini';
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const scenes: Scene[] = parsed.scenes.slice(0, MAX_SCENES).map(s => {
    const asset = s.asset ? codes.get(String(s.asset).trim().toUpperCase()) : undefined;
    const motion = typeof s.motion === 'string' && s.motion in IMAGE_MOTIONS ? (s.motion as ImageMotion) : 'zoom_in';
    return {
      id: newSceneId(),
      visual: asset
        ? asset.kind === 'clip'
          ? { kind: 'clip', url: asset.url, trimStart: 0 }
          : { kind: 'image', url: asset.url, motion }
        : { kind: 'card', title: s.cardTitle || BRAND_NAME, subtitle: s.cardSubtitle || '', theme: 'brand' },
      narration: s.narration || '',
      onScreenText: s.onScreenText || '',
      minDuration: asset?.kind === 'clip' ? 4 : 2.5
    };
  });
  const storyboard = sanitizeStoryboard(scenes);

  await prisma.videoProject.update({
    where: { id },
    data: {
      storyboard: storyboard as object[],
      settings: { ...settings },
      ...(project.storyboard.length === 0 && parsed.title ? { title: String(parsed.title).slice(0, 120) } : {})
    }
  });

  return NextResponse.json({
    storyboard,
    style,
    title: parsed.title,
    wordCount: storyboard.reduce((sum, s) => sum + countSpokenWords(s.narration), 0),
    targetWords
  });
}
