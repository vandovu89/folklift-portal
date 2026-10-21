import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getStaffUser } from '@/lib/auth';
import { countSpokenWords, numberToVietnamese, wordsPerSecond, BASE_SPEED, DEFAULT_TTS_MODEL, isTtsModel } from '@/lib/vietnamese-tts';
import { SCRIPT_STYLES, HOOK_IDEAS, isScriptStyle, type ScriptStyle } from '@/lib/ai-video';

function cleanGeminiText(raw: string): string {
  return raw
    .replace(/\[.*?\]/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/[*#_~`]/g, '')
    .trim();
}

export async function POST(request: Request) {
  try {
    const { role } = await getStaffUser(request);
    if (role === 'GUEST' || role === 'VIEWER') {
      return NextResponse.json({ success: false, error: 'Bạn không có quyền tạo kịch bản AI' }, { status: 401 });
    }

    const { forkliftId, duration, speed, ttsModel, style, note } = await request.json();

    if (!forkliftId) {
      return NextResponse.json({ success: false, error: 'Missing forkliftId' }, { status: 400 });
    }

    const forklift = await prisma.forklift.findUnique({
      where: { id: forkliftId }
    });

    if (!forklift) {
      return NextResponse.json({ success: false, error: 'Forklift not found' }, { status: 404 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'GEMINI_API_KEY not configured' }, { status: 500 });
    }

    // Tính toán thời lượng đọc mục tiêu và số từ tiếng Việt tương ứng
    // Tiếng Việt là ngôn ngữ đơn âm tiết (mỗi từ là 1 âm tiết ngắn).
    // Tốc độ đọc phụ thuộc model ElevenLabs (v4 ~4.1 từ/giây ở speed 0.95), tỉ lệ thuận theo speed người dùng chọn.
    const targetDuration = Number(duration) > 0 ? Math.round(Number(duration)) : 60;
    const speechSpeed = Number(speed) > 0 ? Math.max(0.7, Math.min(1.2, Number(speed))) : BASE_SPEED;
    const wps = wordsPerSecond(speechSpeed, isTtsModel(ttsModel) ? ttsModel : DEFAULT_TTS_MODEL);

    // Phong cách kịch bản: "random" bốc ngẫu nhiên 1 phong cách cụ thể để mỗi lần sinh một kiểu khác nhau
    const concreteStyles = (Object.keys(SCRIPT_STYLES) as ScriptStyle[]).filter(k => k !== 'random');
    const requestedStyle: ScriptStyle = isScriptStyle(style) ? style : 'random';
    const appliedStyle = requestedStyle === 'random'
      ? concreteStyles[Math.floor(Math.random() * concreteStyles.length)]
      : requestedStyle;
    const hookIdea = HOOK_IDEAS[Math.floor(Math.random() * HOOK_IDEAS.length)];
    const extraNote = typeof note === 'string' ? note.trim().slice(0, 500) : '';
    // Chừa ~10% (tối đa 4s) cuối video cho câu kết / logo
    const tailSeconds = Math.min(4, Math.round(targetDuration * 0.1));
    const speechDuration = Math.max(3, targetDuration - tailSeconds);
    const targetWords = Math.round(speechDuration * wps);
    const minWords = Math.round(targetWords * 0.93);
    const maxWords = Math.round(targetWords * 1.05);

    const minutes = Math.floor(targetDuration / 60);
    const seconds = targetDuration % 60;
    const durationDesc = minutes > 0 
      ? `${minutes} phút ${seconds > 0 ? seconds + ' giây' : ''}` 
      : `${seconds} giây`;

    const genAI = new GoogleGenerativeAI(apiKey);
    const candidateModels = ['gemini-3.8-flash', 'gemini-3-flash-preview', 'gemini-3.1-flash-lite'];

    const prompt = `Bạn là một chuyên gia marketing và bán hàng xuất sắc trong lĩnh vực Xe Nâng hàng cho thương hiệu Xe Nâng MCK Japan.
Khách hàng vừa quay một video thực tế về chiếc xe nâng này.
Bạn hãy viết một lời bình (Voice-over Script) để AI đọc lồng ghép khớp vừa vặn với toàn bộ thời lượng video.

YÊU CẦU BẮT BUỘC VỀ ĐỘ DÀI VÀ THỜI GIAN:
- Thời lượng video thực tế: ${durationDesc} (${targetDuration} giây).
- Thời lượng đọc mục tiêu: Khoảng ${speechDuration} giây (lời đọc liên tục từ đầu đến gần cuối video, chừa ${tailSeconds} giây cuối để kết video).
- SỐ LƯỢNG TỪ BẮT BUỘC: Vì tiếng Việt là ngôn ngữ đơn âm tiết có tốc độ đọc khoảng ${wps.toFixed(1)} từ/giây, bạn PHẢI viết kịch bản có độ dài mục tiêu khoảng ${targetWords} từ (tối thiểu ${minWords} từ và tối đa ${maxWords} từ tiếng Việt). Ngắn hơn thì video bị khoảng lặng, dài hơn thì giọng đọc bị cắt ngang khi video kết thúc.
- VIẾT TẤT CẢ CON SỐ BẰNG CHỮ tiếng Việt (VD: "hai phẩy năm tấn", "ba trăm năm mươi triệu đồng", "ba nghìn giờ"), không dùng chữ số. Riêng tên model xe giữ nguyên ký hiệu.

PHONG CÁCH KỊCH BẢN: ${SCRIPT_STYLES[appliedStyle].label}
${SCRIPT_STYLES[appliedStyle].structure}
- Luôn nhắc tên thương hiệu Xe Nâng MCK Japan và model xe ${forklift.maker} ${forklift.model} (lược bớt ý nếu video ngắn).
- Gợi ý câu mở đầu lần này: ${hookIdea}. Tránh lối mở đầu sáo rỗng kiểu "Chào mừng quý khách đến với...".
${extraNote ? `- THÔNG TIN BỔ SUNG TỪ NGƯỜI BÁN (bắt buộc lồng vào kịch bản): ${extraNote}
` : ''}
YÊU CẦU ĐỊNH DẠNG:
- CHỈ trả về một đoạn văn thuần lời thoại đọc (Plain text) của phát thanh viên.
- TUYỆT ĐỐI KHÔNG có tiêu đề, KHÔNG có bảng biểu, KHÔNG có hướng dẫn [Cảnh quay...] hay [Nhạc nền...], KHÔNG có số thứ tự phân đoạn hay ghi chú gì thêm. Văn bản này sẽ được đưa thẳng vào hệ thống Text-To-Speech để đọc.

Thông số xe:
- Hãng: ${forklift.maker}
- Model: ${forklift.model}
- Chủng loại: ${forklift.category || 'Không xác định'}
- Tải trọng: ${forklift.loadCapacity || 'Đang cập nhật'}
- Chiều cao nâng: ${forklift.liftHeight || 'Đang cập nhật'}
- Nhiên liệu: ${forklift.powerType || 'Đang cập nhật'}
- Giờ hoạt động: ${forklift.hour ? forklift.hour + ' giờ' : 'Đang cập nhật'}
- Tình trạng: ${forklift.condition || 'Hoạt động tốt'}
- Giá bán tham khảo: ${forklift.price ? numberToVietnamese(forklift.price) + ' đồng' : 'Liên hệ'}
- Càng: ${forklift.forkLength || 'Tiêu chuẩn'}
- Phụ kiện: ${forklift.attachment || 'Không'}
`;

    let text = '';
    let lastError: any = null;

    for (const modelName of candidateModels) {
      try {
        // Nhiệt độ cao để mỗi lần sinh ra lời thoại khác nhau
        const model = genAI.getGenerativeModel({ model: modelName, generationConfig: { temperature: 1.1 } });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        text = cleanGeminiText(response.text());
        if (!text) continue;

        // Kiểm tra số lượng từ thực tế, mở rộng / rút gọn tối đa 2 lần để khớp thời lượng video
        for (let attempt = 0; attempt < 2; attempt++) {
          const currentWords = countSpokenWords(text);
          const tooShort = currentWords < minWords;
          const tooLong = currentWords > maxWords;
          if (!tooShort && !tooLong) break;

          const adjustPrompt = tooShort
            ? `Kịch bản hiện tại chỉ có ${currentWords} từ, quá ngắn so với video ${durationDesc} (cần khoảng ${targetWords} từ, trong khoảng ${minWords}-${maxWords} từ).
Hãy bổ sung lời thoại chi tiết hơn (VD: hiệu suất vận hành thực tế, độ bền phụ tùng Nhật Bản, sự an toàn của người điều khiển, cam kết bảo hành từ Xe Nâng MCK Japan).`
            : `Kịch bản hiện tại có ${currentWords} từ, quá dài so với video ${durationDesc} (cần khoảng ${targetWords} từ, trong khoảng ${minWords}-${maxWords} từ).
Hãy rút gọn, bỏ bớt ý phụ nhưng giữ phần mở đầu thương hiệu và lời kêu gọi liên hệ ở cuối.`;

          try {
            const adjustResult = await model.generateContent(`${adjustPrompt}
Giữ nguyên phong cách "${SCRIPT_STYLES[appliedStyle].label}". Viết tất cả con số bằng chữ tiếng Việt. CHỈ trả về toàn bộ đoạn văn lời thoại hoàn chỉnh (Plain text), không thêm tiêu đề hay chú thích.

Kịch bản cần chỉnh:
${text}`);
            const adjustedText = cleanGeminiText((await adjustResult.response).text());
            if (!adjustedText) break;
            const adjustedWords = countSpokenWords(adjustedText);
            // Chỉ nhận bản chỉnh nếu nó gần mục tiêu hơn bản cũ
            if (Math.abs(adjustedWords - targetWords) < Math.abs(currentWords - targetWords)) {
              text = adjustedText;
            } else {
              break;
            }
          } catch (adjustErr) {
            console.warn('[AI Video Script] Adjust step skipped:', adjustErr);
            break;
          }
        }
        break;
      } catch (err: any) {
        console.warn(`[AI Video Script] Model ${modelName} failed:`, err?.message || err);
        lastError = err;
      }
    }

    if (!text) {
      throw lastError || new Error('Không thể tạo kịch bản từ các model Gemini');
    }

    return NextResponse.json({
      success: true,
      script: text,
      wordCount: countSpokenWords(text),
      targetWords,
      estimatedSeconds: Math.round(countSpokenWords(text) / wps),
      style: appliedStyle
    });

  } catch (error: any) {
    console.error('AI Video Script Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Unknown error' }, { status: 500 });
  }
}
