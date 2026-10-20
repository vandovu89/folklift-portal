import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';


export async function POST(request: Request) {
  try {
    const { forkliftId, duration } = await request.json();

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
    // Tốc độ đọc thực tế của phát thanh viên ElevenLabs: ~3.8 - 4.1 từ/giây (~230 - 245 từ/phút).
    const targetDuration = duration && Number(duration) > 10 ? Math.round(Number(duration)) : 60;
    const speechDuration = Math.max(15, targetDuration - 4); // Chừa 3-4s cuối cho câu kết / logo
    const minWords = Math.round(speechDuration * 3.6);
    const maxWords = Math.round(speechDuration * 4.1);
    const targetWords = Math.round(speechDuration * 3.85);

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
- Thời lượng đọc mục tiêu: Khoảng ${speechDuration} giây (lời đọc liên tục từ đầu đến gần cuối video, chừa 3-4 giây cuối để kết video).
- SỐ LƯỢNG TỪ BẮT BUỘC: Vì tiếng Việt là ngôn ngữ đơn âm tiết có tốc độ đọc khoảng 3.8 từ/giây, bạn PHẢI viết kịch bản có độ dài mục tiêu khoảng ${targetWords} từ (tối thiểu ${minWords} từ và tối đa ${maxWords} từ tiếng Việt). TUYỆT ĐỐI KHÔNG ĐƯỢC VIẾT NGẮN HƠN ${minWords} TỪ, nếu ngắn hơn video sẽ bị khoảng lặng kéo dài.
- CÁCH TRIỂN KHAI ĐỂ ĐỦ ĐỘ DÀI:
  + Mở đầu ấn tượng, nêu tên thương hiệu Xe Nâng MCK Japan và model xe ${forklift.maker} ${forklift.model}.
  + Đi sâu phân tích kỹ thuật: khung nâng, tải trọng, độ vững vàng khi nâng hạ, tầm nhìn thoáng cho tài xế.
  + Nhấn mạnh động cơ / bình điện bền bỉ, khả năng cơ động trong lối đi hẹp kho bãi, tiết kiệm chi phí nhiên liệu/điện năng.
  + Khẳng định xe bãi Nhật chính hãng, tình trạng kiểm định nghiêm ngặt, chính sách bảo hành chu đáo.
  + Kêu gọi hành động mạnh mẽ: báo giá ưu đãi, mời đến kho lái thử và liên hệ hotline tư vấn.

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
- Giá bán tham khảo: ${forklift.price ? forklift.price.toLocaleString('vi-VN') + ' VNĐ' : 'Liên hệ'}
- Càng: ${forklift.forkLength || 'Tiêu chuẩn'}
- Phụ kiện: ${forklift.attachment || 'Không'}
`;

    let text = '';
    let lastError: any = null;

    for (const modelName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        text = response.text()
          .replace(/\[.*?\]/g, '')
          .replace(/\(.*?\)/g, '')
          .replace(/[*#_~`]/g, '')
          .trim();

        // Kiểm tra số lượng từ thực tế
        if (text) {
          const currentWords = text.split(/\s+/).filter(Boolean).length;
          // Nếu ngắn hơn 85% của minWords, mở rộng kịch bản để đạt đủ thời lượng
          if (currentWords < minWords * 0.85) {
            try {
              const expandPrompt = `Kịch bản hiện tại chỉ có ${currentWords} từ, quá ngắn so với yêu cầu thời lượng video ${durationDesc} (cần tối thiểu ${minWords} từ, mục tiêu ${targetWords} từ).
Hãy bổ sung và mở rộng lời thoại thật chi tiết, phân tích sâu về hiệu suất vận hành thực tế, độ bền bỉ phụ tùng Nhật Bản, sự thoải mái và an toàn của người điều khiển, các cam kết hỗ trợ kỹ thuật và bảo hành từ Xe Nâng MCK Japan.
CHỈ trả về toàn bộ đoạn văn lời thoại hoàn chỉnh (Plain text), không thêm tiêu đề hay chú thích.

Kịch bản cần mở rộng:
${text}`;
              const expandResult = await model.generateContent(expandPrompt);
              const expandedText = (await expandResult.response).text()
                .replace(/\[.*?\]/g, '')
                .replace(/\(.*?\)/g, '')
                .replace(/[*#_~`]/g, '')
                .trim();
              const expandedWords = expandedText.split(/\s+/).filter(Boolean).length;
              if (expandedWords > currentWords) {
                text = expandedText;
              }
            } catch (expandErr) {
              console.warn('[AI Video Script] Expand step skipped:', expandErr);
            }
          }
          break;
        }
      } catch (err: any) {
        console.warn(`[AI Video Script] Model ${modelName} failed:`, err?.message || err);
        lastError = err;
      }
    }

    if (!text) {
      throw lastError || new Error('Không thể tạo kịch bản từ các model Gemini');
    }

    return NextResponse.json({ success: true, script: text });

  } catch (error: any) {
    console.error('AI Video Script Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Unknown error' }, { status: 500 });
  }
}
