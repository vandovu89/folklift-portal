// Cấu hình & kiểu dữ liệu dùng chung cho AI Video Studio (client + server, không phụ thuộc Node)
// Một dự án = 1 mẫu video + nguồn dữ liệu + storyboard gồm nhiều cảnh; mỗi cảnh có hình ảnh, lời đọc và chữ trên màn hình
import { DEFAULT_TTS_MODEL, BASE_SPEED, isTtsModel, type TtsModelId } from '@/lib/vietnamese-tts';
import { DEFAULT_VOICE_ID, isScriptStyle, isVideoFormat, DEFAULT_VIDEO_FORMAT, type ScriptStyle, type VideoFormat } from '@/lib/ai-video';

export const BRAND_NAME = 'Xe Nâng MCK Japan';
export const BRAND_HOTLINE = '0362.396.092';

// ===== Mẫu video =====
// enabled = false: hiển thị "sắp có" trên giao diện, chưa tạo được dự án
export const VIDEO_TEMPLATES = {
  forklift_intro: {
    label: 'Giới thiệu 1 xe',
    icon: '🚜',
    description: 'Video bán hàng cho một chiếc xe cụ thể, dùng ảnh và clip thật của xe.',
    forklifts: { min: 1, max: 1 },
    enabled: true,
  },
  catalog: {
    label: 'Catalog "Xe mới về"',
    icon: '📦',
    description: 'Điểm nhanh 3-8 xe mới về kho, mỗi xe một cảnh kèm thông số và giá.',
    forklifts: { min: 2, max: 8 },
    enabled: false,
  },
  promo: {
    label: 'Khuyến mãi / Chiến dịch',
    icon: '🔥',
    description: 'Chương trình ưu đãi cho một nhóm xe, nhấn mạnh giá và thời hạn.',
    forklifts: { min: 1, max: 8 },
    enabled: false,
  },
  howto: {
    label: 'Kiến thức xe nâng',
    icon: '💡',
    description: 'Video chia sẻ kinh nghiệm theo một chủ đề (chọn xe, bảo dưỡng ắc quy...).',
    forklifts: { min: 0, max: 0 },
    enabled: false,
  },
  testimonial: {
    label: 'Khách hàng nói về chúng tôi',
    icon: '⭐',
    description: 'Dựng từ đánh giá của khách hàng trong mục Góc Khách Hàng.',
    forklifts: { min: 0, max: 1 },
    enabled: false,
  },
} as const;
export type VideoTemplate = keyof typeof VIDEO_TEMPLATES;

export function isVideoTemplate(value: unknown): value is VideoTemplate {
  return typeof value === 'string' && value in VIDEO_TEMPLATES;
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

export type SceneVisual =
  | { kind: 'image'; url: string; motion: ImageMotion }
  | { kind: 'clip'; url: string; trimStart: number }
  | { kind: 'card'; title: string; subtitle: string; theme: CardTheme };

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
}

export interface ProjectSettings {
  voiceId: string;
  ttsModel: TtsModelId;
  speed: number;
  tone: ScriptStyle;
  targetDuration: number;
  clipAudio: 'mute' | 'mix';
  note: string;
}

export const DEFAULT_SETTINGS: ProjectSettings = {
  voiceId: DEFAULT_VOICE_ID,
  ttsModel: DEFAULT_TTS_MODEL,
  speed: BASE_SPEED,
  tone: 'random',
  targetDuration: 30,
  clipAudio: 'mute',
  note: '',
};

export const TARGET_DURATIONS = [15, 30, 45, 60, 90] as const;
export const MAX_SCENES = 30;
export const MAX_SCENE_SECONDS = 30;
export const MAX_NARRATION_CHARS = 600;
export const MAX_SCREEN_TEXT_CHARS = 80;

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
    return { kind: 'image', url, motion: typeof v.motion === 'string' && v.motion in IMAGE_MOTIONS ? (v.motion as ImageMotion) : 'zoom_in' };
  }
  if (v.kind === 'clip' && /^https:\/\//.test(url)) {
    return { kind: 'clip', url, trimStart: num(v.trimStart, 0, 3600, 0) };
  }
  return {
    kind: 'card',
    title: str(v.title, 60) || BRAND_NAME,
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
    }
    return scene;
  });
}

export function sanitizeSettings(raw: unknown): ProjectSettings {
  const s = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    voiceId: typeof s.voiceId === 'string' && /^[A-Za-z0-9]{10,40}$/.test(s.voiceId) ? s.voiceId : DEFAULT_SETTINGS.voiceId,
    ttsModel: isTtsModel(s.ttsModel) ? s.ttsModel : DEFAULT_SETTINGS.ttsModel,
    speed: num(s.speed, 0.7, 1.2, DEFAULT_SETTINGS.speed),
    tone: isScriptStyle(s.tone) ? s.tone : DEFAULT_SETTINGS.tone,
    targetDuration: num(s.targetDuration, 10, 180, DEFAULT_SETTINGS.targetDuration),
    clipAudio: s.clipAudio === 'mix' ? 'mix' : 'mute',
    note: str(s.note, 500),
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
