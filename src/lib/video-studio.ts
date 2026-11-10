// Cấu hình & kiểu dữ liệu dùng chung cho AI Video Studio (client + server, không phụ thuộc Node)
// Một dự án = 1 mẫu video + nguồn dữ liệu + storyboard gồm nhiều cảnh; mỗi cảnh có hình ảnh, lời đọc và chữ trên màn hình
import { DEFAULT_TTS_MODEL, BASE_SPEED, isTtsModel, ttsProviderOf, type TtsModelId } from '@/lib/vietnamese-tts';
import { DEFAULT_VOICE_ID, defaultVoiceFor, isVoiceForProvider, isScriptStyle, isVideoFormat, DEFAULT_VIDEO_FORMAT, type ScriptStyle, type VideoFormat } from '@/lib/ai-video';

export const BRAND_NAME = 'Xe Nâng MCK Japan';
export const BRAND_HOTLINE = '0362.396.092';

// ===== Mẫu video =====
// enabled = false: hiển thị "sắp có" trên giao diện, chưa tạo được dự án
export type VideoTemplate = 'forklift_intro' | 'catalog' | 'promo' | 'howto' | 'testimonial';

interface TemplateConfig {
  label: string;
  icon: string;
  description: string;
  forklifts: { min: number; max: number };
  // Chủ đề / nội dung bắt buộc nhập khi tạo dự án (VD nội dung ưu đãi, chủ đề kiến thức)
  topic?: { label: string; placeholder: string };
  testimonial?: boolean; // Chọn 1 đánh giá trong Góc Khách Hàng
  defaultDuration: number;
  enabled: boolean;
}

export const VIDEO_TEMPLATES: Record<VideoTemplate, TemplateConfig> = {
  forklift_intro: {
    label: 'Giới thiệu 1 xe',
    icon: '🚜',
    description: 'Video bán hàng cho một chiếc xe cụ thể, dùng ảnh và clip thật của xe.',
    forklifts: { min: 1, max: 1 },
    defaultDuration: 30,
    enabled: true,
  },
  catalog: {
    label: 'Catalog "Xe mới về"',
    icon: '📦',
    description: 'Điểm nhanh 2-8 xe mới về kho, mỗi xe một cảnh kèm thông số và giá.',
    forklifts: { min: 2, max: 8 },
    defaultDuration: 45,
    enabled: true,
  },
  promo: {
    label: 'Khuyến mãi / Chiến dịch',
    icon: '🔥',
    description: 'Chương trình ưu đãi cho một nhóm xe, nhấn mạnh giá và thời hạn.',
    forklifts: { min: 1, max: 8 },
    topic: { label: 'Nội dung ưu đãi', placeholder: 'VD: Giảm 10 triệu cho xe điện 1.5-2 tấn, tặng bình điện mới, áp dụng đến hết 30/11' },
    defaultDuration: 30,
    enabled: true,
  },
  howto: {
    label: 'Kiến thức xe nâng',
    icon: '💡',
    description: 'Video chia sẻ kinh nghiệm theo một chủ đề (chọn xe, bảo dưỡng ắc quy...). Có thể chọn vài xe để lấy ảnh minh họa.',
    forklifts: { min: 0, max: 3 },
    topic: { label: 'Chủ đề', placeholder: 'VD: 5 điều cần kiểm tra khi mua xe nâng điện cũ' },
    defaultDuration: 45,
    enabled: true,
  },
  testimonial: {
    label: 'Khách hàng nói về chúng tôi',
    icon: '⭐',
    description: 'Dựng từ đánh giá của khách hàng trong mục Góc Khách Hàng, có thể kèm ảnh xe đã giao.',
    forklifts: { min: 0, max: 1 },
    testimonial: true,
    defaultDuration: 30,
    enabled: true,
  },
};

export function isVideoTemplate(value: unknown): value is VideoTemplate {
  return typeof value === 'string' && value in VIDEO_TEMPLATES;
}

// Nguồn dữ liệu của dự án (lưu ở VideoProject.sources)
export interface ProjectSources {
  forkliftIds: string[];
  topic: string;
  testimonialId: string | null;
}

export const MAX_TOPIC_CHARS = 300;

export function sanitizeSources(raw: unknown): ProjectSources {
  const s = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    forkliftIds: Array.isArray(s.forkliftIds) ? s.forkliftIds.filter((id): id is string => typeof id === 'string').slice(0, 8) : [],
    topic: typeof s.topic === 'string' ? s.topic.trim().slice(0, MAX_TOPIC_CHARS) : '',
    testimonialId: typeof s.testimonialId === 'string' && s.testimonialId ? s.testimonialId : null,
  };
}

// ===== Cảnh =====
export const IMAGE_MOTIONS = {
  zoom_in: 'Phóng to dần',
  zoom_out: 'Thu nhỏ dần',
  pan_left: 'Lia sang trái',
  pan_right: 'Lia sang phải',
  none: 'Đứng yên',
} as const;
export type ImageMotion = keyof typeof IMAGE_MOTIONS;

export const CARD_THEMES = {
  brand: { label: 'Xanh thương hiệu', bg: '#1e3a8a', fg: '#ffffff', accent: '#facc15' },
  dark: { label: 'Nền tối', bg: '#0f172a', fg: '#f8fafc', accent: '#38bdf8' },
  light: { label: 'Nền sáng', bg: '#f8fafc', fg: '#0f172a', accent: '#dc2626' },
} as const;
export type CardTheme = keyof typeof CARD_THEMES;

// ai = hình do AI tạo (video sẽ ghi "Hình minh họa AI" ở góc)
export type SceneVisual =
  | { kind: 'image'; url: string; motion: ImageMotion; ai?: boolean }
  | { kind: 'clip'; url: string; trimStart: number; ai?: boolean }
  | { kind: 'card'; title: string; subtitle: string; theme: CardTheme };

// Phụ đề: một cụm vài từ hiện cùng lúc, mỗi từ có thời điểm riêng để tô màu theo giọng đọc (karaoke)
// Thời gian tính bằng giây, tính từ đầu file giọng đọc của cảnh
export interface CaptionWord { w: string; s: number; e: number }
export interface CaptionChunk { s: number; e: number; words: CaptionWord[] }

export interface Scene {
  id: string;
  visual: SceneVisual;
  narration: string;
  onScreenText: string;
  minDuration: number; // Giây; cảnh kéo dài tối thiểu bằng lời đọc + 0.5s
  // Giọng đọc đã tạo cho cảnh: tạo lại chỉ khi lời đọc / giọng / tốc độ đổi (audioKey khác)
  audioUrl?: string;
  audioKey?: string;
  audioDuration?: number;
  captions?: CaptionChunk[];
}

export const SUBTITLE_STYLES = {
  karaoke: 'Tô màu theo giọng',
  plain: 'Chữ trắng',
  off: 'Tắt',
} as const;
export type SubtitleStyle = keyof typeof SUBTITLE_STYLES;

export const TRANSITIONS = {
  fade: 'Mờ dần',
  slide: 'Trượt ngang',
  mix: 'Đa dạng',
  none: 'Cắt thẳng',
} as const;
export type Transition = keyof typeof TRANSITIONS;
export const TRANSITION_SECONDS = 0.4;

// Cảnh thương hiệu tự thêm vào đầu / cuối video (logo trên nền trắng)
export const INTRO_SECONDS = 1.5;
export const OUTRO_SECONDS = 3;

export interface ProjectSettings {
  voiceId: string;
  ttsModel: TtsModelId;
  speed: number;
  tone: ScriptStyle;
  targetDuration: number;
  clipAudio: 'mute' | 'mix';
  note: string;
  subtitles: SubtitleStyle;
  transition: Transition;
  logo: boolean;
  intro: boolean;
  outro: boolean;
}

export const DEFAULT_SETTINGS: ProjectSettings = {
  voiceId: DEFAULT_VOICE_ID,
  ttsModel: DEFAULT_TTS_MODEL,
  speed: BASE_SPEED,
  tone: 'random',
  targetDuration: 30,
  clipAudio: 'mute',
  note: '',
  subtitles: 'karaoke',
  transition: 'fade',
  logo: true,
  intro: false,
  outro: true,
};

export const TARGET_DURATIONS = [15, 30, 45, 60, 90] as const;
export const MAX_SCENES = 30;
export const MAX_SCENE_SECONDS = 30;
export const MAX_NARRATION_CHARS = 600;
export const MAX_SCREEN_TEXT_CHARS = 80;
// Đủ cho một câu trích dẫn ngắn của khách hàng; worker tự thu nhỏ chữ khi tiêu đề dài
export const MAX_CARD_TITLE_CHARS = 90;

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const num = (v: unknown, min: number, max: number, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
};

export function newSceneId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function sanitizeVisual(raw: unknown): SceneVisual {
  const v = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const url = str(v.url, 2000);
  if (v.kind === 'image' && /^https:\/\//.test(url)) {
    return { kind: 'image', url, motion: typeof v.motion === 'string' && v.motion in IMAGE_MOTIONS ? (v.motion as ImageMotion) : 'zoom_in', ...(v.ai === true ? { ai: true } : {}) };
  }
  if (v.kind === 'clip' && /^https:\/\//.test(url)) {
    return { kind: 'clip', url, trimStart: num(v.trimStart, 0, 3600, 0), ...(v.ai === true ? { ai: true } : {}) };
  }
  return {
    kind: 'card',
    title: str(v.title, MAX_CARD_TITLE_CHARS) || BRAND_NAME,
    subtitle: str(v.subtitle, 120),
    theme: typeof v.theme === 'string' && v.theme in CARD_THEMES ? (v.theme as CardTheme) : 'brand',
  };
}

// Chuẩn hóa storyboard nhận từ trình duyệt / Gemini trước khi lưu
export function sanitizeStoryboard(raw: unknown): Scene[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, MAX_SCENES).map(item => {
    const s = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
    const scene: Scene = {
      id: /^[\w-]{1,40}$/.test(String(s.id)) ? String(s.id) : newSceneId(),
      visual: sanitizeVisual(s.visual),
      narration: str(s.narration, MAX_NARRATION_CHARS),
      onScreenText: str(s.onScreenText, MAX_SCREEN_TEXT_CHARS),
      minDuration: num(s.minDuration, 1, MAX_SCENE_SECONDS, 3),
    };
    if (typeof s.audioUrl === 'string' && typeof s.audioKey === 'string') {
      scene.audioUrl = s.audioUrl;
      scene.audioKey = s.audioKey;
      scene.audioDuration = num(s.audioDuration, 0, 600, 0);
      const captions = sanitizeCaptions(s.captions);
      if (captions) scene.captions = captions;
    }
    return scene;
  });
}

function sanitizeCaptions(raw: unknown): CaptionChunk[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return raw.slice(0, 80).map(c => {
    const chunk = (c && typeof c === 'object' ? c : {}) as Record<string, unknown>;
    const words = (Array.isArray(chunk.words) ? chunk.words : []).slice(0, 12).map(w => {
      const word = (w && typeof w === 'object' ? w : {}) as Record<string, unknown>;
      return { w: str(word.w, 40), s: num(word.s, 0, 600, 0), e: num(word.e, 0, 600, 0) };
    }).filter(w => w.w);
    return { s: num(chunk.s, 0, 600, 0), e: num(chunk.e, 0, 600, 0), words };
  }).filter(c => c.words.length > 0);
}

const MAX_CAPTION_WORDS = 5;
const MAX_CAPTION_CHARS = 26;

// Ghép thời điểm từng ký tự (ElevenLabs /with-timestamps, hoặc ước tính với Vbee) thành các cụm phụ đề ngắn, ngắt ở dấu câu
export function buildCaptions(characters: string[], starts: number[], ends: number[]): CaptionChunk[] {
  const words: CaptionWord[] = [];
  let current: CaptionWord | null = null;
  characters.forEach((ch, i) => {
    if (/\s/.test(ch)) {
      if (current) words.push(current);
      current = null;
      return;
    }
    if (!current) current = { w: '', s: starts[i] ?? 0, e: ends[i] ?? 0 };
    current.w += ch;
    current.e = ends[i] ?? current.e;
  });
  if (current) words.push(current);

  const chunks: CaptionChunk[] = [];
  let chunk: CaptionWord[] = [];
  const flush = () => {
    if (chunk.length) chunks.push({ s: chunk[0].s, e: chunk[chunk.length - 1].e, words: chunk });
    chunk = [];
  };
  for (const word of words) {
    const length = chunk.reduce((n, w) => n + w.w.length + 1, 0) + word.w.length;
    const endsClause = /[.,!?;:…]$/.test(word.w);
    const full = chunk.length >= MAX_CAPTION_WORDS || (chunk.length > 0 && length > MAX_CAPTION_CHARS);
    // Từ cuối mệnh đề được ghép vào cụm đang có (dài hơn một chút) để không còn lại một mình
    if (full && !(endsClause && chunk.length <= MAX_CAPTION_WORDS && length <= MAX_CAPTION_CHARS + 8)) flush();
    chunk.push(word);
    if (endsClause) flush();
  }
  flush();
  return chunks.map(c => ({ ...c, s: round2(c.s), e: round2(c.e), words: c.words.map(w => ({ ...w, s: round2(w.s), e: round2(w.e) })) }));
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function sanitizeSettings(raw: unknown): ProjectSettings {
  const s = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const ttsModel = isTtsModel(s.ttsModel) ? s.ttsModel : DEFAULT_SETTINGS.ttsModel;
  const provider = ttsProviderOf(ttsModel);
  return {
    // Giọng phải thuộc đúng nhà cung cấp của model (ElevenLabs / Vbee), sai thì dùng giọng mặc định của nhà cung cấp đó
    voiceId: isVoiceForProvider(s.voiceId, provider) ? s.voiceId : defaultVoiceFor(provider),
    ttsModel,
    speed: num(s.speed, 0.7, 1.2, DEFAULT_SETTINGS.speed),
    tone: isScriptStyle(s.tone) ? s.tone : DEFAULT_SETTINGS.tone,
    targetDuration: num(s.targetDuration, 10, 180, DEFAULT_SETTINGS.targetDuration),
    clipAudio: s.clipAudio === 'mix' ? 'mix' : 'mute',
    note: str(s.note, 500),
    // Dự án tạo ở giai đoạn 1 chưa có các trường dưới đây: dùng mặc định
    subtitles: typeof s.subtitles === 'string' && s.subtitles in SUBTITLE_STYLES ? (s.subtitles as SubtitleStyle) : DEFAULT_SETTINGS.subtitles,
    transition: typeof s.transition === 'string' && s.transition in TRANSITIONS ? (s.transition as Transition) : DEFAULT_SETTINGS.transition,
    logo: typeof s.logo === 'boolean' ? s.logo : DEFAULT_SETTINGS.logo,
    intro: typeof s.intro === 'boolean' ? s.intro : DEFAULT_SETTINGS.intro,
    outro: typeof s.outro === 'boolean' ? s.outro : DEFAULT_SETTINGS.outro,
  };
}

export function sanitizeFormat(raw: unknown): VideoFormat {
  return isVideoFormat(raw) ? raw : DEFAULT_VIDEO_FORMAT;
}

// Khóa giọng đọc của cảnh: đổi lời / giọng / model / tốc độ thì phải tạo lại file MP3
export function sceneAudioKey(narration: string, settings: Pick<ProjectSettings, 'voiceId' | 'ttsModel' | 'speed'>): string {
  const input = `${settings.voiceId}|${settings.ttsModel}|${settings.speed}|${narration}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) hash = (Math.imul(31, hash) + input.charCodeAt(i)) | 0;
  return `${(hash >>> 0).toString(36)}-${input.length}`;
}

// Thời lượng ước tính của cảnh (worker đo lại chính xác bằng ffprobe khi render)
export function estimateSceneSeconds(scene: Scene, wordsPerSec: number, words: number): number {
  const speech = scene.audioDuration || (words > 0 ? words / wordsPerSec : 0);
  return Math.max(scene.minDuration, speech > 0 ? speech + 0.5 : 0);
}

// Tổng thời lượng ước tính: các cảnh + cảnh thương hiệu đầu/cuối (hiệu ứng chuyển cảnh không làm đổi tổng thời lượng)
export function estimateTotalSeconds(sceneSeconds: number[], settings: Pick<ProjectSettings, 'intro' | 'outro'>): number {
  return sceneSeconds.reduce((a, b) => a + b, 0) + (settings.intro ? INTRO_SECONDS : 0) + (settings.outro ? OUTRO_SECONDS : 0);
}

export const FORMAT_SHORT_LABELS: Record<string, string> = {
  vertical_blur: 'Dọc 9:16',
  vertical_fill: 'Dọc 9:16 (cắt đầy)',
  horizontal: 'Ngang 16:9',
};

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  draft: 'Bản nháp',
  rendering: 'Đang dựng',
  done: 'Hoàn thành',
  failed: 'Lỗi',
};
