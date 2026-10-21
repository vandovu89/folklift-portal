// Cấu hình dùng chung cho AI Video Studio (client + server, không phụ thuộc Node)

// ===== Phong cách kịch bản =====
export const SCRIPT_STYLES = {
  random: {
    label: '🎲 Ngẫu nhiên (mỗi lần một kiểu)',
    structure: ''
  },
  review: {
    label: '🔧 Review kỹ thuật chuyên sâu',
    structure: `Giọng chuyên gia kỹ thuật, điềm đạm, đáng tin.
  + Mở đầu: giới thiệu thương hiệu Xe Nâng MCK Japan và model xe.
  + Thân: phân tích lần lượt khung nâng, tải trọng, động cơ / bình điện, tầm nhìn tài xế, độ cơ động trong lối đi hẹp.
  + Kết: khẳng định xe bãi Nhật chính hãng, đã kiểm định, có bảo hành; mời liên hệ hotline.`
  },
  story: {
    label: '📖 Kể chuyện tình huống thực tế',
    structure: `Kể như một câu chuyện ngắn có nhân vật (chủ kho, quản lý xưởng...).
  + Mở đầu: nêu một nỗi đau thực tế (xe cũ hay hỏng, kho chật, hàng nặng, chi phí dầu tăng...).
  + Thân: chiếc xe này xuất hiện và giải quyết vấn đề ra sao, lồng thông số kỹ thuật một cách tự nhiên.
  + Kết: kết quả tích cực, lời mời khách hàng có cùng nỗi lo liên hệ Xe Nâng MCK Japan.`
  },
  promo: {
    label: '🔥 Ưu đãi / Chốt sale gấp',
    structure: `Giọng hào hứng, khẩn trương, tạo cảm giác khan hiếm (FOMO).
  + Mở đầu: câu giật tít về giá tốt hoặc số lượng có hạn.
  + Thân: điểm nhanh 3 ưu điểm đáng tiền nhất, nhấn mạnh giá trị so với giá bán.
  + Kết: kêu gọi hành động mạnh: gọi ngay, nhắn Zalo giữ xe, xe đẹp không chờ người.`
  },
  qa: {
    label: '❓ Hỏi - Đáp (giải đáp thắc mắc)',
    structure: `Dẫn dắt bằng 3-4 câu hỏi mà khách mua xe nâng cũ hay thắc mắc, mỗi câu tự trả lời ngắn gọn.
  + Ví dụ câu hỏi: xe bãi có bền không, bình điện còn tốt không, bảo hành thế nào, có hỗ trợ vận chuyển không.
  + Lồng thông số của chính chiếc xe này vào câu trả lời.
  + Kết: "còn thắc mắc gì, gọi ngay cho Xe Nâng MCK Japan".`
  },
  compare: {
    label: '⚖️ So sánh để thuyết phục',
    structure: `Thuyết phục bằng so sánh.
  + So sánh xe bãi Nhật chất lượng cao với xe mới (giá) và với xe trôi nổi (độ bền, nguồn gốc).
  + Nếu là xe điện: so sánh chi phí vận hành với xe dầu; nếu là xe dầu: nhấn mạnh sức kéo, chạy ngoài trời bền bỉ.
  + Kết: lựa chọn thông minh là chiếc xe này tại Xe Nâng MCK Japan.`
  },
  top3: {
    label: '3️⃣ "3 lý do nên chọn chiếc xe này"',
    structure: `Cấu trúc đánh số rõ ràng: "Lý do thứ nhất... Lý do thứ hai... Lý do thứ ba...".
  + Mỗi lý do là một điểm mạnh cụ thể của chiếc xe (thông số, tình trạng, chính sách).
  + Mở đầu bằng câu hook ngắn, kết bằng lời mời liên hệ.`
  },
  trend: {
    label: '⚡ Trend TikTok / Reels năng động',
    structure: `Phong cách mạng xã hội: câu rất ngắn, nhịp nhanh, trẻ trung, có thể dùng từ ngữ bắt trend nhẹ nhàng (không dung tục).
  + 3 giây đầu phải có câu hook gây tò mò (VD: "Đừng mua xe nâng khi chưa xem video này!").
  + Thân: liệt kê dồn dập các điểm mạnh.
  + Kết: "Follow và nhắn ngay Xe Nâng MCK Japan".`
  }
} as const;
export type ScriptStyle = keyof typeof SCRIPT_STYLES;

export function isScriptStyle(value: unknown): value is ScriptStyle {
  return typeof value === 'string' && value in SCRIPT_STYLES;
}

// Câu mở đầu gợi ý để mỗi lần sinh kịch bản khác nhau, AI chọn 1 trong số này làm cảm hứng
export const HOOK_IDEAS = [
  'đặt một câu hỏi trực tiếp tới chủ kho hàng',
  'nêu một con số ấn tượng về chiếc xe',
  'mô tả một khoảnh khắc làm việc thực tế trong kho',
  'một lời khẳng định táo bạo về chất lượng xe bãi Nhật',
  'một lời cảnh báo về sai lầm khi mua xe nâng cũ',
  'lời chào thân thiện như đang dẫn khách đi xem xe tại kho',
];

// ===== Khung hình xuất video =====
export const VIDEO_FORMATS = {
  vertical_blur: { label: '📱 Dọc 9:16 - nền mờ, giữ trọn khung hình (Reels/TikTok/Shorts)', transformation: 'b_blurred:400:15,c_pad,h_1920,w_1080' },
  vertical_fill: { label: '📱 Dọc 9:16 - cắt đầy khung', transformation: 'c_fill,g_center,h_1920,w_1080' },
  horizontal: { label: '🖥️ Ngang 16:9 (YouTube thường)', transformation: 'b_blurred:400:15,c_pad,h_1080,w_1920' },
} as const;
export type VideoFormat = keyof typeof VIDEO_FORMATS;
export const DEFAULT_VIDEO_FORMAT: VideoFormat = 'vertical_blur';

export function isVideoFormat(value: unknown): value is VideoFormat {
  return typeof value === 'string' && value in VIDEO_FORMATS;
}

// Giới hạn số clip ghép, URL biến đổi Cloudinary dài quá sẽ bị từ chối
export const MAX_CLIPS = 10;

// ".../video/upload/v1792497879/vietnhat_forklifts/abc.mp4" => "vietnhat_forklifts/abc"
export function cloudinaryPublicIdFromUrl(url: string): string | null {
  const parts = url.split('/upload/');
  if (parts.length !== 2 || !url.includes('cloudinary.com')) return null;
  const segments = parts[1].split('/');
  // Bỏ version vNNN và các đoạn transformation có dấu phẩy ở đầu (URL video gốc lưu trong DB không có transformation)
  while (segments.length > 1 && (/^v\d+$/.test(segments[0]) || segments[0].includes(','))) {
    segments.shift();
  }
  return segments.join('/').replace(/\.[a-z0-9]+$/i, '') || null;
}

export function cloudinaryCloudBase(url: string): string | null {
  const m = url.match(/^(https?:\/\/res\.cloudinary\.com\/[^/]+)\//);
  return m ? m[1] : null;
}

interface BuildVideoUrlOptions {
  clipPublicIds: string[];   // Theo đúng thứ tự phát
  format: VideoFormat;
  audioLayerId: string;      // public_id của file mp3, dạng "folder:name"
  audioMode: 'replace' | 'mix';
}

// Chuỗi biến đổi: chuẩn hóa khung hình clip đầu -> nối (splice) các clip sau cùng khung hình
// -> tắt / giảm tiếng gốc -> lồng giọng đọc -> xuất H.264/AAC
export function buildVideoTransformation({ clipPublicIds, format, audioLayerId, audioMode }: BuildVideoUrlOptions): string {
  const frame = VIDEO_FORMATS[format].transformation;
  const steps: string[] = [frame];
  for (const id of clipPublicIds.slice(1)) {
    steps.push(`fl_splice,l_video:${id.replace(/\//g, ':')},${frame}`, 'fl_layer_apply');
  }
  steps.push(audioMode === 'mix' ? 'e_volume:-30' : 'ac_none');
  steps.push(`l_audio:${audioLayerId}`, 'fl_layer_apply');
  steps.push('ac_aac,q_auto,vc_h264');
  return steps.join('/');
}

// ===== Giọng đọc ElevenLabs =====
export const DEFAULT_VOICE_ID = '7o71dj6r5wK2rRwMRJhN'; // "Xe Nâng MCK Japan" - Nam giọng Bắc

export interface VoiceOption {
  id: string;
  name: string;
  language: string | null;
  gender: string | null;
  accent: string | null;
  category: string;
  previewUrl: string | null;
}

// Dùng khi chưa tải được danh sách giọng từ ElevenLabs
export const FALLBACK_VOICES: VoiceOption[] = [
  { id: DEFAULT_VOICE_ID, name: 'Xe Nâng MCK Japan', language: 'vi', gender: 'male', accent: 'northern', category: 'professional', previewUrl: null },
];

const GENDER_LABELS: Record<string, string> = { male: 'Nam', female: 'Nữ', neutral: 'Trung tính' };
const ACCENT_LABELS: Record<string, string> = { northern: 'Bắc', 'vi-northern': 'Bắc', southern: 'Nam', central: 'Trung' };

export function voiceLabel(v: VoiceOption): string {
  const details = [
    v.gender ? GENDER_LABELS[v.gender] || v.gender : null,
    v.language === 'vi' && v.accent ? `giọng ${ACCENT_LABELS[v.accent] || v.accent}` : null,
    v.language && v.language !== 'vi' ? v.language.toUpperCase() : null,
  ].filter(Boolean).join(', ');
  return `${v.id === DEFAULT_VOICE_ID ? '⭐ ' : ''}${v.name}${details ? ` (${details})` : ''}`;
}
