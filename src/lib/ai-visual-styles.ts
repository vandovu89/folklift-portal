// Phong cách hình ảnh cho ảnh / clip AI (dùng chung client & server)
export type VisualStyle = 'realistic' | 'cartoon3d' | 'anime' | 'flat' | 'watercolor' | 'clay';

export const VISUAL_STYLES: Record<VisualStyle, { label: string; prompt: string }> = {
  realistic: { label: '📷 Chân thực', prompt: 'Photorealistic, natural light' },
  cartoon3d: { label: '🧸 Hoạt hình 3D', prompt: '3D animated cartoon style like a modern animated feature film, soft lighting, rounded friendly shapes, vibrant colors' },
  anime: { label: '🌸 Anime', prompt: 'Japanese anime style, cel shading, clean line art, vivid colors' },
  flat: { label: '✏️ Minh họa phẳng', prompt: 'Flat vector illustration, clean geometric shapes, limited color palette, infographic look' },
  watercolor: { label: '🎨 Màu nước', prompt: 'Hand-painted watercolor illustration, soft brush strokes, visible paper texture' },
  clay: { label: '🕹️ Đất sét / mô hình', prompt: 'Claymation miniature diorama style, handcrafted clay figures and props, tilt-shift look' }
};

export const isVisualStyle = (value: unknown): value is VisualStyle =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(VISUAL_STYLES, value);
