import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { jwtVerify } from 'jose';

// Helper để lấy quyền user
async function getUserRole(request: Request) {
  const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
  if (!token) return 'GUEST';
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'super_secret_jwt_key_forlift_portal_2026');
    const { payload } = await jwtVerify(token, secret);
    return payload.role as string;
  } catch (error) {
    return 'GUEST';
  }
}

export async function POST(request: Request) {
  try {
    const role = await getUserRole(request);
    if (role === 'GUEST') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { forkliftId, tone = 'chuyên nghiệp' } = body;

    if (!forkliftId) {
      return NextResponse.json({ error: 'Missing forkliftId' }, { status: 400 });
    }

    const forklift = await prisma.forklift.findUnique({
      where: { id: forkliftId },
      include: {
        media: {
          where: { fileType: 'IMAGE' },
          orderBy: [
            { isThumbnail: 'desc' },
            { order: 'asc' },
            { createdAt: 'asc' }
          ]
        }
      }
    });

    if (!forklift) {
      return NextResponse.json({ error: 'Forklift not found' }, { status: 404 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const candidateModels = ['gemini-3-flash-preview', 'gemini-3.1-flash-lite'];

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vietnhat-forklift.vercel.app';
    const detailUrl = `${baseUrl}/vi/machine/${forklift.id}`;

    const prompt = `
Bạn là chuyên gia Marketing trên mạng xã hội chuyên bán Xe nâng hàng tại Việt Nam (thương hiệu MCK / Xe nâng MCK Nhật Bản).
Hãy viết một bài đăng Facebook hấp dẫn để chào bán chiếc xe nâng sau đây.
Giọng điệu (tone): ${tone}.

THÔNG SỐ XE:
- Hãng sản xuất: ${forklift.maker}
- Model: ${forklift.model}
- Năm sản xuất: ${forklift.year || 'Đang cập nhật'}
- Tải trọng nâng: ${forklift.loadCapacity || 'Đang cập nhật'}
- Chiều cao nâng: ${forklift.liftHeight || 'Đang cập nhật'}
- Loại nhiên liệu: ${forklift.powerType || 'Đang cập nhật'}
- Tình trạng: ${forklift.condition || 'Xe bãi nhập khẩu, hoạt động hoàn hảo'}
- Mã định danh/nội bộ: ${forklift.internalCode || ''}
- Link xem chi tiết: ${detailUrl}

QUY TẮC ĐỊNH DẠNG BÀI VIẾT FACEBOOK (CỰC KỲ QUAN TRỌNG):
- TUYỆT ĐỐI KHÔNG sử dụng ký tự '*' hoặc '**' để in đậm hoặc làm bullet points. Mạng xã hội Facebook KHÔNG hỗ trợ định dạng Markdown dấu sao, nếu để lại dấu sao bài viết sẽ rất xấu và mất thẩm mỹ.
- Để nhấn mạnh tiêu đề hoặc đề mục, hãy VIẾT HOA tiêu đề kết hợp cùng emoji sinh động (Ví dụ: 💥 SIÊU PHẨM XE NÂNG ${forklift.maker.toUpperCase()}, ⚙️ THÔNG SỐ KỸ THUẬT, 💎 ĐẶC ĐIỂM NỔI BẬT, 📞 LIÊN HỆ NGAY).
- Để liệt kê thông số kỹ thuật hoặc điểm mạnh, dùng các emoji/icon trực quan như 🔹, 📌, ✅, 👉, ⚡ thay vì dùng dấu sao hay gạch đầu dòng thông thường.
- Ngắt dòng hợp lý, thoáng đãng, dễ đọc trên điện thoại di động.
- Thêm Call-to-Action (CTA) mạnh mẽ ở cuối bài (khuyến khích khách hàng gọi hotline, inbox hoặc bấm link xem chi tiết xe).
- Chèn link xem chi tiết xe rõ ràng: ${detailUrl}

YÊU CẦU HASHTAG:
- BẮT BUỘC luôn luôn bao gồm các hashtag thương hiệu: #xenangmckjp #xenangmck #MCK
- Kèm theo các hashtag thông dụng liên quan đến xe: #xenang #${forklift.maker.toLowerCase().replace(/\s+/g, '')} #xenang${forklift.maker.toLowerCase().replace(/\s+/g, '')} #xenangnhatbai #xenangcu #xenang${forklift.loadCapacity?.replace(/\D/g, '') || ''}kg

LƯU Ý: KHÔNG thêm các câu giải thích thừa như "Dưới đây là bài đăng của bạn", chỉ xuất ra duy nhất nội dung bài đăng Facebook.
    `.trim();

    let generatedText = '';
    let lastError: any = null;

    for (const modelName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        generatedText = result.response.text();
        if (generatedText) break;
      } catch (err: any) {
        console.warn(`[Facebook Post] Model ${modelName} failed:`, err?.message || err);
        lastError = err;
      }
    }

    if (!generatedText) {
      throw lastError || new Error('Không thể tạo bài viết từ các model Gemini');
    }

    // Làm sạch triệt để các ký tự markdown * / ** / bullet points
    let cleanContent = generatedText
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Xóa in đậm **text**
      .replace(/(^|[^*])\*([^*\n]+)\*([^*]|$)/g, '$1$2$3') // Xóa in nghiêng *text*
      .replace(/^[\s]*[\*\-]\s+/gm, '🔹 ') // Thay bullet point dấu * hoặc - thành emoji 🔹
      .replace(/\*/g, '') // Xóa bất kỳ dấu sao nào còn sót lại
      .trim();

    // Đảm bảo luôn kèm hashtag thương hiệu #xenangmckjp #xenangmck
    const brandHashtags = ['#xenangmckjp', '#xenangmck'];
    for (const tag of brandHashtags) {
      if (!cleanContent.toLowerCase().includes(tag.toLowerCase())) {
        cleanContent += ` ${tag}`;
      }
    }

    const images = forklift.media.map(m => m.url);

    return NextResponse.json({ 
      success: true, 
      content: cleanContent,
      images,
      imageUrl: images[0] || null
    });
  } catch (error: any) {
    console.error('[AI Content Generation Error]:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate content' }, { status: 500 });
  }
}
