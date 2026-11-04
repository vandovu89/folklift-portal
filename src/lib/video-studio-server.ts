// Tiện ích phía server của AI Video Studio: tải dự án, kho ảnh/clip của xe, giọng đọc từng cảnh, dựng job render
import { prisma } from '@/lib/prisma';
import { ADMIN_ONLY_MEDIA_CATEGORIES } from '@/lib/permissions';
import { cleanScriptForTts, synthesizeSpeechWithTimestamps } from '@/lib/elevenlabs';
import { buildObjectKey, putObject, deleteObject, r2KeyFromUrl, isR2Url } from '@/lib/storage';
import type { TimelineJobPayload } from '@/lib/render-worker';
import {
  BRAND_HOTLINE, CARD_THEMES, INTRO_SECONDS, OUTRO_SECONDS, buildCaptions, sanitizeStoryboard, sanitizeSettings, sanitizeFormat, sanitizeSources, sceneAudioKey,
  type Scene, type ProjectSettings
} from '@/lib/video-studio';

export const canEditStudio = (role: string) => role !== 'GUEST' && role !== 'VIEWER';

export interface StudioAsset {
  id: string;
  kind: 'image' | 'clip';
  url: string;
  category: string | null;
  isPublic: boolean;
  forkliftId: string | null;
}

// Ảnh trên Cloudinary: giới hạn kích thước & ép JPEG (worker FFmpeg không đọc được HEIC, ảnh 12MP tải rất chậm)
function renderableImageUrl(url: string): string {
  if (!url.includes('res.cloudinary.com') || !url.includes('/image/upload/')) return url;
  return url.replace('/image/upload/', '/image/upload/c_limit,w_2160,h_2160,f_jpg,q_90/');
}

// Ảnh & clip thật của các xe trong dự án (bỏ tài liệu nội bộ, hóa đơn, file giọng đọc)
export async function loadForkliftAssets(forkliftIds: string[]): Promise<StudioAsset[]> {
  if (forkliftIds.length === 0) return [];
  const media = await prisma.media.findMany({
    where: {
      forkliftId: { in: forkliftIds },
      fileType: { in: ['IMAGE', 'VIDEO'] },
      // category NULL cũng phải giữ (SQL "NOT IN" loại luôn NULL)
      OR: [{ category: null }, { category: { notIn: ADMIN_ONLY_MEDIA_CATEGORIES } }]
    },
    orderBy: [{ isThumbnail: 'desc' }, { order: 'asc' }, { createdAt: 'asc' }],
    select: { id: true, url: true, fileType: true, category: true, isPublic: true, forkliftId: true, fileName: true }
  });
  return media
    .filter(m => m.fileType === 'VIDEO' || !/\.(heic|heif)$/i.test(m.fileName || m.url) || m.url.includes('res.cloudinary.com'))
    .map(m => ({
      id: m.id,
      kind: m.fileType === 'VIDEO' ? 'clip' as const : 'image' as const,
      url: m.fileType === 'VIDEO' ? m.url : renderableImageUrl(m.url),
      category: m.category,
      isPublic: m.isPublic,
      forkliftId: m.forkliftId
    }));
}

// Worker chỉ tải được file trong kho của hệ thống (R2 / Cloudinary)
export const isRenderableUrl = (url: string | null | undefined): url is string =>
  Boolean(url && (isR2Url(url) || url.startsWith('https://res.cloudinary.com/')));

// Ảnh của đánh giá khách hàng (Góc Khách Hàng) dùng được làm hình cho cảnh
export function testimonialAsset(t: { id: string; imageUrl: string | null }): StudioAsset | null {
  if (!isRenderableUrl(t.imageUrl) || !/\/image\/|\.(jpe?g|png|webp)(\?|$)/i.test(t.imageUrl)) return null;
  return { id: `testimonial-${t.id}`, kind: 'image', url: renderableImageUrl(t.imageUrl), category: 'Ảnh khách hàng', isPublic: true, forkliftId: null };
}

export async function loadProject(id: string) {
  const project = await prisma.videoProject.findUnique({ where: { id } });
  if (!project) return null;
  const sources = sanitizeSources(project.sources);
  return {
    ...project,
    format: sanitizeFormat(project.format),
    storyboard: sanitizeStoryboard(project.storyboard),
    settings: sanitizeSettings(project.settings),
    sources,
    forkliftIds: sources.forkliftIds
  };
}

// Kho hình của dự án: ảnh/clip của các xe + ảnh của đánh giá khách hàng (nếu có)
export async function loadProjectAssets(sources: { forkliftIds: string[]; testimonialId: string | null }): Promise<StudioAsset[]> {
  const [forkliftAssets, testimonial] = await Promise.all([
    loadForkliftAssets(sources.forkliftIds),
    sources.testimonialId ? prisma.testimonial.findUnique({ where: { id: sources.testimonialId }, select: { id: true, imageUrl: true } }) : null
  ]);
  const t = testimonial ? testimonialAsset(testimonial) : null;
  return t ? [t, ...forkliftAssets] : forkliftAssets;
}

// Tạo (hoặc dùng lại) file giọng đọc + phụ đề cho 1 cảnh. Lời đọc / giọng / tốc độ không đổi thì không gọi ElevenLabs lại
// (trừ giọng tạo từ giai đoạn 1 chưa có phụ đề mà dự án đang bật phụ đề).
export async function ensureSceneAudio(projectId: string, scene: Scene, settings: ProjectSettings, apiKey: string): Promise<Scene> {
  const text = cleanScriptForTts(scene.narration);
  if (!text) {
    return { id: scene.id, visual: scene.visual, narration: scene.narration, onScreenText: scene.onScreenText, minDuration: scene.minDuration };
  }
  const key = sceneAudioKey(scene.narration, settings);
  const needCaptions = settings.subtitles !== 'off' && !scene.captions;
  if (scene.audioKey === key && scene.audioUrl && !needCaptions) return scene;

  const tts = await synthesizeSpeechWithTimestamps(apiKey, settings.voiceId, text, settings.speed, settings.ttsModel);
  const captions = tts.alignment
    ? buildCaptions(tts.alignment.characters, tts.alignment.character_start_times_seconds, tts.alignment.character_end_times_seconds)
    : undefined;
  const objectKey = buildObjectKey(`projects/${projectId.replace(/[^\w-]/g, '')}/voice`, `scene-${scene.id}.mp3`);
  const audioUrl = await putObject(objectKey, tts.buffer, 'audio/mpeg');

  // Xóa file giọng cũ của cảnh (không chặn nếu lỗi)
  const oldKey = scene.audioUrl ? r2KeyFromUrl(scene.audioUrl) : null;
  if (oldKey?.startsWith('projects/')) deleteObject(oldKey).catch(() => {});

  return { ...scene, audioUrl, audioKey: key, audioDuration: Math.round(tts.duration * 100) / 100, captions };
}

// Chạy tối đa `limit` tác vụ cùng lúc (tránh bị ElevenLabs chặn khi tạo giọng cho nhiều cảnh)
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

export function buildTimelinePayload(
  jobId: string, outputKey: string, format: string, settings: ProjectSettings, scenes: Scene[]
): TimelineJobPayload {
  const body = scenes.map(scene => {
    const v = scene.visual;
    const visual = v.kind === 'card'
      ? { kind: 'card' as const, title: v.title, subtitle: v.subtitle, ...pickColors(v.theme) }
      : v;
    return {
      visual,
      audioUrl: scene.audioUrl,
      onScreenText: scene.onScreenText || undefined,
      minDuration: scene.minDuration,
      captions: settings.subtitles !== 'off' && scene.audioUrl ? scene.captions : undefined
    };
  });
  return {
    kind: 'timeline',
    jobId,
    outputKey,
    format,
    clipAudio: settings.clipAudio,
    subtitles: settings.subtitles,
    transition: settings.transition,
    logo: settings.logo,
    scenes: [
      ...(settings.intro ? [{ visual: { kind: 'brand' as const, subtitle: '' }, minDuration: INTRO_SECONDS }] : []),
      ...body,
      ...(settings.outro ? [{ visual: { kind: 'brand' as const, subtitle: `Hotline / Zalo: ${BRAND_HOTLINE}` }, minDuration: OUTRO_SECONDS }] : [])
    ]
  };
}

function pickColors(theme: keyof typeof CARD_THEMES) {
  const { bg, fg, accent } = CARD_THEMES[theme];
  return { bg, fg, accent };
}
