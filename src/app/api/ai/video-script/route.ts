import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';


export async function POST(request: Request) {
  try {
    const { forkliftId } = await request.json();

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

    const genAI = new GoogleGenerativeAI(apiKey);
    const candidateModels = ['gemini-3-flash-preview', 'gemini-3.1-flash-lite'];

    const prompt = `Bạn là một chuyên gia marketing và bán hàng xuất sắc trong lĩnh vực Xe Nâng hàng. 
Khách hàng vừa quay một video ngắn về chiếc xe nâng này bằng điện thoại. 
Bạn hãy viết một lời bình (Voice-over Script) để AI đọc lồng ghép vào video.
Giọng điệu: Hào hứng, chuyên nghiệp, tự tin và thúc đẩy khách hàng hành động.
Thời lượng đọc ước tính: Khoảng 30 giây đến 1 phút (Ngắn gọn, đi thẳng vào điểm nổi bật).
Vui lòng chỉ trả về nội dung text lời đọc, không kèm các hướng dẫn như [Cảnh quay...] hay [Nhạc nền...]. Nội dung thuần text để chuyển thẳng vào công cụ Text-To-Speech.

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
        text = response.text().replace(/\[.*?\]/g, '').trim();
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
