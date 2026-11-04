// Hướng dẫn cho Gemini lên storyboard theo từng mẫu video của AI Video Studio. Chỉ dùng phía server.
import type { Forklift, Testimonial } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { numberToVietnamese } from '@/lib/vietnamese-tts';
import { SCRIPT_STYLES, HOOK_IDEAS, type ScriptStyle } from '@/lib/ai-video';
import { loadForkliftAssets, testimonialAsset, type StudioAsset } from '@/lib/video-studio-server';
import {
  BRAND_NAME, BRAND_HOTLINE, IMAGE_MOTIONS, CARD_THEMES, VIDEO_TEMPLATES,
  type ProjectSettings, type ProjectSources, type VideoTemplate
} from '@/lib/video-studio';

export interface StoryboardBrief {
  prompt: string;
  codes: Map<string, StudioAsset>;
  style: ScriptStyle;
  targetWords: number;
}

const MAX_ASSETS = 24;
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

function forkliftSpecs(f: Forklift): string {
  return [
    `Hãng: ${f.maker}`,
    `Model: ${f.model}`,
    `Năm sản xuất: ${f.year || 'Đang cập nhật'}`,
    `Chủng loại: ${f.category || 'Không xác định'}`,
    `Tải trọng: ${f.loadCapacity || 'Đang cập nhật'}`,
    `Chiều cao nâng: ${f.liftHeight || 'Đang cập nhật'}`,
    `Nhiên liệu: ${f.powerType || 'Đang cập nhật'}`,
    `Giờ hoạt động: ${f.hour ? f.hour + ' giờ' : 'Đang cập nhật'}`,
    `Tình trạng: ${f.condition || 'Hoạt động tốt'}`,
    `Giá bán tham khảo: ${f.price ? `${numberToVietnamese(f.price)} đồng (${Math.round(f.price / 1e6)} triệu)` : 'Liên hệ'}`,
    `Càng: ${f.forkLength || 'Tiêu chuẩn'}`,
    `Phụ kiện: ${f.attachment || 'Không'}`,
  ].join('; ');
}

function assetLabel(asset: StudioAsset, code: string): string {
  return `${code}: ${asset.kind === 'clip' ? 'clip quay thực tế' : 'ảnh'}${asset.category ? ` (${asset.category})` : ''}${asset.isPublic ? ', đang hiển thị trên web' : ''}`;
}

// Gán mã cho ảnh/clip. 1 xe: A1, C1...; nhiều xe: X2A1 = ảnh 1 của xe thứ 2 (để AI không lấy ảnh xe này cho xe khác)
async function codeAssets(forklifts: Forklift[], testimonial: Testimonial | null) {
  const codes = new Map<string, StudioAsset>();
  const lines: string[] = [];
  const t = testimonial ? testimonialAsset(testimonial) : null;
  if (t) {
    codes.set('T1', t);
    lines.push('- T1: ảnh khách hàng / xe đã giao (từ đánh giá)');
  }
  const all = await loadForkliftAssets(forklifts.map(f => f.id));
  const perForklift = forklifts.length > 1 ? Math.max(4, Math.floor(MAX_ASSETS / forklifts.length)) : MAX_ASSETS;
  forklifts.forEach((f, fi) => {
    const prefix = forklifts.length > 1 ? `X${fi + 1}` : '';
    const own = all.filter(a => a.forkliftId === f.id);
    // Ưu tiên ảnh đang hiển thị trên web; tối đa 2 clip mỗi xe
    const images = own.filter(a => a.kind === 'image').sort((a, b) => Number(b.isPublic) - Number(a.isPublic));
    const clips = own.filter(a => a.kind === 'clip').slice(0, 2);
    const picked = [...clips, ...images].slice(0, perForklift);
    if (forklifts.length > 1) lines.push(`Xe ${fi + 1} (${f.maker} ${f.model}):${picked.length ? '' : ' (chưa có ảnh)'}`);
    picked.filter(a => a.kind === 'image').forEach((a, i) => {
      codes.set(`${prefix}A${i + 1}`, a);
      lines.push(`- ${assetLabel(a, `${prefix}A${i + 1}`)}`);
    });
    picked.filter(a => a.kind === 'clip').forEach((a, i) => {
      codes.set(`${prefix}C${i + 1}`, a);
      lines.push(`- ${assetLabel(a, `${prefix}C${i + 1}`)}`);
    });
  });
  return { codes, assetList: lines.join('\n') };
}

function sceneCountFor(template: VideoTemplate, target: number, forkliftCount: number): number {
  switch (template) {
    case 'catalog': return clamp(Math.round(target / 4), forkliftCount + 2, Math.min(18, forkliftCount * 2 + 2));
    case 'promo': return clamp(Math.round(target / 5), Math.min(12, forkliftCount + 2), 12);
    case 'howto': return clamp(Math.round(target / 6), 4, 10);
    case 'testimonial': return clamp(Math.round(target / 6), 4, 8);
    default: return clamp(Math.round(target / 5), 3, 12);
  }
}

// Phần hướng dẫn riêng của từng mẫu: nội dung, cấu trúc cảnh, dữ liệu nguồn
function templateBrief(template: VideoTemplate, ctx: {
  forklifts: Forklift[]; testimonial: Testimonial | null; sources: ProjectSources; style: ScriptStyle; hookIdea: string; sceneCount: number; target: number;
}): string {
  const { forklifts, testimonial, sources, style, hookIdea, sceneCount, target } = ctx;
  const tone = `GIỌNG ĐIỆU: ${SCRIPT_STYLES[style].label}. Gợi ý mở đầu: ${hookIdea}. Tránh mở đầu sáo rỗng kiểu "Chào mừng quý khách đến với...".`;
  const forkliftList = forklifts.map((f, i) => `- Xe ${i + 1}: ${forkliftSpecs(f)}`).join('\n');

  switch (template) {
    case 'catalog':
      return `NHIỆM VỤ: video catalog "XE MỚI VỀ KHO", điểm nhanh ${forklifts.length} xe nâng, dài khoảng ${target} giây, gồm ${sceneCount} cảnh.
CẤU TRÚC:
- Cảnh 1: câu hook gây tò mò về lô xe mới về (CARD, hoặc ảnh đẹp nhất của một xe).
- Sau đó giới thiệu LẦN LƯỢT TỪNG XE theo đúng thứ tự danh sách, mỗi xe 1-2 cảnh liền nhau. Cảnh của xe nào CHỈ được dùng mã ảnh/clip của chính xe đó (VD xe 2 dùng X2A1, X2C1).
- Lời đọc mỗi xe 1-2 câu: tên hãng + model, điểm nổi bật nhất (tải trọng, năm, nhiên liệu, giá nếu có).
- onScreenText mỗi xe: tên ngắn + tải trọng hoặc giá, VD "TOYOTA 8FB15 · 1.5 TẤN", "Giá 250 triệu".
- Cảnh cuối: CARD kêu gọi liên hệ xem xe / giữ xe.
${tone}

DANH SÁCH XE:
${forkliftList}`;

    case 'promo':
      return `NHIỆM VỤ: video quảng bá CHƯƠNG TRÌNH ƯU ĐÃI, dài khoảng ${target} giây, gồm ${sceneCount} cảnh.
NỘI DUNG ƯU ĐÃI (bắt buộc nêu đúng, không thêm bớt điều kiện, giữ nguyên thời hạn): ${sources.topic}
CẤU TRÚC:
- Cảnh 1: câu giật tít về ưu đãi (CARD nổi bật hoặc ảnh xe đẹp nhất), tạo cảm giác khan hiếm.
- Các cảnh giữa: lần lượt các xe áp dụng ưu đãi (cảnh của xe nào chỉ dùng ảnh/clip của xe đó), nhấn mạnh giá trị nhận được.
- Một CARD tóm tắt ưu đãi và thời hạn.
- Cảnh cuối: CARD kêu gọi gọi ngay / nhắn Zalo giữ suất.
${tone}

XE ÁP DỤNG:
${forkliftList}`;

    case 'howto':
      return `NHIỆM VỤ: video CHIA SẺ KIẾN THỨC xe nâng cho chủ kho / quản lý xưởng, dài khoảng ${target} giây, gồm ${sceneCount} cảnh.
CHỦ ĐỀ: ${sources.topic}
CẤU TRÚC:
- Cảnh 1: câu hook nêu vấn đề hoặc sai lầm phổ biến liên quan tới chủ đề.
- Các cảnh giữa: từng ý / mẹo, MỖI Ý ĐÚNG MỘT CẢNH, ghi số thứ tự của ý vào trường "point" (1, 2, 3...; cảnh mở đầu và cảnh kết để 0). Lời đọc của cảnh nói đúng ý mang số đó.
- Cảnh của một ý: dùng CARD với cardTitle là ý chính ngắn gọn KHÔNG kèm số (VD "Kiểm tra bình điện"), có thể đổi cardTheme cho sinh động${forklifts.length ? '; hoặc dùng ảnh xe trong kho nếu minh họa được, khi đó ghi ý chính vào onScreenText (không kèm số)' : ''}. Hệ thống sẽ tự thêm số thứ tự lên màn hình.
- Cảnh cuối: CARD mời liên hệ ${BRAND_NAME} để được tư vấn miễn phí.
- Chỉ đưa kiến thức phổ thông chính xác, KHÔNG bịa số liệu kỹ thuật, giá cả hay quy định pháp luật cụ thể.
${tone}
${forklifts.length ? `\nXE CÓ ẢNH MINH HỌA (chỉ nhắc tên xe nếu thật sự liên quan tới ý đang nói):\n${forkliftList}` : ''}`;

    case 'testimonial':
      return `NHIỆM VỤ: video "KHÁCH HÀNG NÓI VỀ ${BRAND_NAME.toUpperCase()}", dựng từ một đánh giá thật, dài khoảng ${target} giây, gồm ${sceneCount} cảnh.
CẤU TRÚC:
- Cảnh 1: hook bằng câu ấn tượng nhất trong lời khách (CARD, cardTheme "light").
- Giới thiệu khách hàng (tên, công ty / khu vực, xe đã mua)${testimonial && testimonialAsset(testimonial) ? ', dùng ảnh T1' : ''}.
- 2-3 cảnh trích lời khách: CARD với cardTitle là trích dẫn NGUYÊN VĂN, ngắn (tối đa 12 từ, đặt trong dấu ngoặc kép), cardSubtitle là "— " + tên khách và công ty (VD "— Anh Minh, Công ty ABC").${forklifts.length ? '\n- Có thể chèn ảnh/clip của xe đã giao giữa các trích dẫn.' : ''}
- Cảnh cuối: CARD kêu gọi liên hệ.
- Lời đọc là người dẫn chuyện kể lại ở ngôi thứ ba (VD "Anh Minh, chủ kho ở Bình Dương chia sẻ..."), KHÔNG đóng vai khách hàng, KHÔNG bịa thêm lời khách hay chi tiết không có trong đánh giá.
- Nếu đánh giá được gõ không dấu, hãy viết lại tên và trích dẫn có dấu tiếng Việt đầy đủ nhưng giữ nguyên từ ngữ.
${tone}

ĐÁNH GIÁ CỦA KHÁCH:
- Khách hàng: ${testimonial?.customerName || ''}${testimonial?.companyName ? ` - ${testimonial.companyName}` : ''}${testimonial?.location ? ` (${testimonial.location})` : ''}
- Xe đã mua: ${testimonial?.forkliftModel || 'Không ghi'}${testimonial?.deliveryDate ? `, giao ngày ${testimonial.deliveryDate.toLocaleDateString('vi-VN')}` : ''}
- Số sao: ${testimonial?.rating ?? 5}/5
- Nội dung: ${testimonial?.content || ''}
${forklifts.length ? `\nXE LIÊN QUAN:\n${forkliftList}` : ''}`;

    default: {
      const f = forklifts[0];
      return `NHIỆM VỤ: video giới thiệu chiếc xe nâng bên dưới, dài khoảng ${target} giây, gồm ${sceneCount} cảnh.
PHONG CÁCH LỜI ĐỌC: ${SCRIPT_STYLES[style].label}
${SCRIPT_STYLES[style].structure}
- Gợi ý mở đầu: ${hookIdea}. Tránh mở đầu sáo rỗng kiểu "Chào mừng quý khách đến với...".
- Cảnh cuối là CARD kêu gọi liên hệ.

THÔNG SỐ XE: ${f ? forkliftSpecs(f) : ''}`;
    }
  }
}

export async function buildStoryboardBrief(
  template: VideoTemplate, sources: ProjectSources, settings: ProjectSettings, wordsPerSec: number
): Promise<StoryboardBrief | { error: string }> {
  const config = VIDEO_TEMPLATES[template];
  const found = sources.forkliftIds.length
    ? await prisma.forklift.findMany({ where: { id: { in: sources.forkliftIds } } })
    : [];
  const forklifts = sources.forkliftIds.map(id => found.find(f => f.id === id)).filter((f): f is Forklift => Boolean(f));
  if (forklifts.length < config.forklifts.min) return { error: `Mẫu "${config.label}" cần ít nhất ${config.forklifts.min} xe (có xe đã bị xóa?)` };
  if (config.topic && !sources.topic) return { error: `Mẫu "${config.label}" cần nhập ${config.topic.label.toLowerCase()}` };
  const testimonial = config.testimonial && sources.testimonialId
    ? await prisma.testimonial.findUnique({ where: { id: sources.testimonialId } })
    : null;
  if (config.testimonial && !testimonial) return { error: 'Chưa chọn đánh giá khách hàng hoặc đánh giá đã bị xóa' };

  const target = settings.targetDuration;
  const sceneCount = sceneCountFor(template, target, forklifts.length);
  // Mỗi cảnh có ~0.5s nghỉ sau lời đọc
  const targetWords = Math.round(Math.max(5, target - sceneCount * 0.5) * wordsPerSec);

  const concreteStyles = (Object.keys(SCRIPT_STYLES) as ScriptStyle[]).filter(k => k !== 'random');
  const style: ScriptStyle = settings.tone === 'random'
    ? concreteStyles[Math.floor(Math.random() * concreteStyles.length)]
    : settings.tone;
  const hookIdea = HOOK_IDEAS[Math.floor(Math.random() * HOOK_IDEAS.length)];
  const { codes, assetList } = await codeAssets(forklifts, testimonial);
  const motions = Object.keys(IMAGE_MOTIONS).filter(m => m !== 'none').join(', ');
  const themes = Object.keys(CARD_THEMES).join(', ');

  const prompt = `Bạn là đạo diễn video marketing ngắn (Reels/TikTok) cho thương hiệu ${BRAND_NAME}, chuyên xe nâng bãi Nhật Bản. Hãy lên STORYBOARD (được phép lệch 1-2 cảnh so với số cảnh yêu cầu).

${templateBrief(template, { forklifts, testimonial, sources, style, hookIdea, sceneCount, target })}

KHO HÌNH ẢNH THẬT (chỉ được dùng các mã này):
${assetList || '- (chưa có ảnh/clip nào, hãy dùng toàn bộ là thẻ chữ CARD)'}
- CARD: thẻ chữ trên nền màu (cardTheme: ${themes}; mặc định brand)

QUY TẮC CHUNG:
- Mỗi cảnh chọn "asset" là một mã trong kho ở trên hoặc "CARD". Ưu tiên ảnh đang hiển thị trên web và clip thực tế; tránh hai cảnh liền nhau trùng mã.
- CARD kêu gọi liên hệ ở cuối: cardTitle "${BRAND_NAME}", cardSubtitle có hotline/Zalo ${BRAND_HOTLINE}.
- "narration": lời đọc của cảnh, 1-2 câu ngắn, tiếng Việt tự nhiên. TỔNG số từ lời đọc của mọi cảnh khoảng ${targetWords} từ (tốc độ đọc ~${wordsPerSec.toFixed(1)} từ/giây). VIẾT CON SỐ BẰNG CHỮ (VD "hai phẩy năm tấn"), tên model giữ nguyên ký hiệu. Không có chỉ dẫn [cảnh quay], không markdown.
- "onScreenText": chữ to hiện trên ảnh/clip, tối đa 6 từ, có thể dùng chữ số. Để trống với CARD hoặc khi không cần.
- "motion" (chỉ cho ảnh): một trong ${motions}.
- Không bịa thông số, tình trạng hay giá xe ngoài dữ liệu được cung cấp.
${settings.note ? `- THÔNG TIN BỔ SUNG TỪ NGƯỜI BÁN (bắt buộc lồng vào): ${settings.note}\n` : ''}
Trả về JSON đúng dạng:
{"title": "tiêu đề ngắn cho video", "scenes": [{"asset": "A1", "narration": "...", "onScreenText": "...", "motion": "zoom_in", "cardTitle": "", "cardSubtitle": "", "cardTheme": "brand"}]}`;

  return { prompt, codes, style, targetWords };
}
