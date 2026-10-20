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
    // Tốc độ đọc tiếng Việt chuẩn: ~2.1 - 2.3 từ/giây (~130 từ/phút)
    const targetDuration = duration && Number(duration) > 10 ? Math.round(Number(duration)) : 60;
    const speechDuration = Math.max(15, targetDuration - 4); // Chừa 3-4s cuối cho câu kết / logo
    const minWords = Math.round(speechDuration * 2.0);
    const maxWords = Math.round(speechDuration * 2.35);

    const minutes = Math.floor(targetDuration / 60);
    const seconds = targetDuration % 60;
    const durationDesc = minutes > 0 
      ? `${minutes} phút ${seconds > 0 ? seconds + ' giây' : ''}` 
      : `${seconds} giây`;

    const genAI = new GoogleGenerativeAI(apiKey);
    const candidateModels = ['gemini-3-flash-preview', 'gemini-3.1-flash-lite'];

    const prompt = `Bạn là một chuyên gia marketing và bán hàng xuất sắc trong lĩnh vực Xe Nâng hàng cho thương hiệu Xe Nâng MCK Japan.
Khách hàng vừa quay một video thực tế về chiếc xe nâng này.
Bạn hãy viết một lời bình (Voice-over Script) để AI đọc lồng ghép khớp vừa vặn với toàn bộ thời lượng video.

YÊU CẦU BẮT BUỘC VỀ ĐỘ DÀI:
- Thời lượng video thực tế: ${durationDesc} (${targetDuration} giây).
- Thời lượng đọc mục tiêu: Khoảng ${speechDuration} giây (đọc khớp từ đầu đến gần cuối video, chừa 3-4 giây cuối để kết video).
- SỐ LƯỢNG TỪ BẮT BUỘC: Bạn PHẢI viết kịch bản có độ dài nằm trong khoảng từ ${minWords} đến ${maxWords} từ tiếng Việt (đây là điều kiện tiên quyết để lời đọc không bị cụt hay đọc xong quá sớm khi video vẫn còn dài).
- Nếu video dài (từ 1 phút trở lên): Hãy đi sâu phân tích từng chi tiết kỹ thuật, độ ổn định của bình điện/động cơ, khả năng cơ động trong lối đi hẹp, chi phí vận hành tiết kiệm, tình trạng xe thực tế, chính sách bảo hành uy tín và kêu gọi khách hàng liên hệ hotline hoặc đến bãi lái thử.

YÊU CẦU ĐỊNH DẠNG:
- CHỈ trả về đúng đoạn văn lời thoại đọc thuần túy (Plain text) của người thuyết minh.
- TUYỆT ĐỐI KHÔNG có tiêu đề, KHÔNG có bảng biểu, KHÔNG có hướng dẫn [Cảnh quay...] hay [Nhạc nền...], KHÔNG có ghi chú giải thích gì thêm. Nội dung này sẽ được chuyển thẳng vào công cụ Text-To-Speech.

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
        if (text) break;
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
