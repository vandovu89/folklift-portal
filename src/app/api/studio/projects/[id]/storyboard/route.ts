import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GoogleGenerativeAI, SchemaType, type ResponseSchema } from '@google/generative-ai';
import { getStaffUser } from '@/lib/auth';
import { wordsPerSecond, countSpokenWords } from '@/lib/vietnamese-tts';
import { canEditStudio, loadProject } from '@/lib/video-studio-server';
import { buildStoryboardBrief } from '@/lib/studio-prompts';
import {
  BRAND_NAME, BRAND_HOTLINE, CARD_THEMES, IMAGE_MOTIONS, MAX_SCENES, isVideoTemplate, newSceneId, sanitizeSettings, sanitizeStoryboard,
  type CardTheme, type ImageMotion, type Scene
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
          cardSubtitle: { type: SchemaType.STRING, description: 'Chỉ dùng khi asset là CARD, tối đa 15 từ' },
          cardTheme: { type: SchemaType.STRING, description: 'Chỉ dùng khi asset là CARD: brand | dark | light' },
          point: { type: SchemaType.INTEGER, description: 'Số thứ tự ý trong video kiến thức (0 nếu không đánh số)' }
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
  cardTheme?: string;
  point?: number;
  narration?: string;
  onScreenText?: string;
  motion?: string;
}

// AI lên storyboard theo mẫu video: chia cảnh, chọn ảnh/clip thật cho từng cảnh, viết lời đọc & chữ trên màn hình
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

  if (!isVideoTemplate(project.type)) return NextResponse.json({ error: 'Mẫu video không hợp lệ' }, { status: 400 });
  const wps = wordsPerSecond(settings.speed, settings.ttsModel);
  const brief = await buildStoryboardBrief(project.type, project.sources, settings, wps);
  if ('error' in brief) return NextResponse.json({ error: brief.error }, { status: 400 });
  const { prompt, codes, style, targetWords } = brief;

  const genAI = new GoogleGenerativeAI(apiKey);
  let parsed: { title?: string; scenes?: AiScene[] } | null = null;
  let lastError: unknown = null;
  // Mỗi model thử tối đa 2 lần (JSON hỏng do sinh lặp thường không lặp lại ở lần sau); quá tải (503) hoặc hết hạn mức (429) thì sang model khác ngay
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
        if (err instanceof Error && /\b(503|429)\b/.test(err.message)) continue models;
      }
    }
  }
  if (!parsed?.scenes) {
    const message = lastError instanceof Error ? lastError.message : 'Không tạo được storyboard từ Gemini';
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const scenes: Scene[] = parsed.scenes.slice(0, MAX_SCENES).map(s => {
    const asset = s.asset ? codes.get(String(s.asset).trim().toUpperCase()) : undefined;
    // Ý được đánh số (video kiến thức): số thứ tự do hệ thống gắn để luôn khớp với lời đọc
    const point = Number.isInteger(s.point) && Number(s.point) > 0 ? Number(s.point) : 0;
    const numbered = (text: string | undefined) => {
      const clean = (text || '').replace(/^\s*\d+\s*[.)/:-]\s*/, '').trim();
      return point ? `${point}. ${clean || `Điều ${point}`}` : (text || '');
    };
    const motion = typeof s.motion === 'string' && s.motion in IMAGE_MOTIONS ? (s.motion as ImageMotion) : 'zoom_in';
    const theme = typeof s.cardTheme === 'string' && s.cardTheme in CARD_THEMES ? (s.cardTheme as CardTheme) : 'brand';
    return {
      id: newSceneId(),
      visual: asset
        ? asset.kind === 'clip'
          ? { kind: 'clip', url: asset.url, trimStart: 0 }
          : { kind: 'image', url: asset.url, motion }
        : { kind: 'card', title: point ? numbered(s.cardTitle) : s.cardTitle || BRAND_NAME, subtitle: s.cardSubtitle || '', theme },
      narration: s.narration || '',
      onScreenText: asset ? numbered(s.onScreenText) : '',
      minDuration: asset?.kind === 'clip' ? 4 : 2.5
    };
  });
  // Thẻ kêu gọi liên hệ ở cuối luôn có hotline
  const last = scenes[scenes.length - 1];
  if (last?.visual.kind === 'card' && !last.visual.subtitle.replace(/\D/g, '').includes(BRAND_HOTLINE.replace(/\D/g, ''))) {
    last.visual.subtitle = `Hotline / Zalo: ${BRAND_HOTLINE}`;
  }
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
