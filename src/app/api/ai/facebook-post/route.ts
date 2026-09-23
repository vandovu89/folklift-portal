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
        media: { where: { fileType: 'IMAGE' }, take: 1 }
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
    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vietnhat-forklift.vercel.app';
    const detailUrl = `${baseUrl}/vi/machine/${forklift.id}`;

    const prompt = `
Bạn là chuyên gia Marketing trên mạng xã hội chuyên bán Xe nâng hàng.
Hãy viết một bài đăng Facebook hấp dẫn để bán chiếc xe nâng sau đây.
Giọng điệu (tone): ${tone}.

THÔNG SỐ XE:
- Hãng: ${forklift.maker}
- Model: ${forklift.model}
- Năm sản xuất: ${forklift.year || 'Đang cập nhật'}
- Tải trọng nâng: ${forklift.loadCapacity || 'Đang cập nhật'}
- Chiều cao nâng: ${forklift.liftHeight || 'Đang cập nhật'}
- Loại nhiên liệu: ${forklift.powerType || 'Đang cập nhật'}
- Tình trạng: ${forklift.condition || 'Hoạt động tốt'}
- Link xem chi tiết: ${detailUrl}

YÊU CẦU:
- Bắt đầu bằng một tiêu đề giật tít, thu hút sự chú ý kèm emoji.
- Nêu bật các thông số kỹ thuật chính một cách dễ đọc (dùng bullet point hoặc icon).
- Thêm Call-to-Action (CTA) mạnh mẽ ở cuối bài (khuyến khích khách inbox hoặc xem link chi tiết).
- Chèn link xem chi tiết ở cuối bài.
- Sử dụng hashtag phù hợp (VD: #xenang #xenangcu #xenangnhatbai #${forklift.maker.toLowerCase()} #xenang${forklift.loadCapacity?.replace(/\D/g, '')}kg).
- KHÔNG thêm các câu giải thích thừa như "Dưới đây là bài đăng của bạn", chỉ xuất ra nội dung bài đăng.
    `.trim();

    const result = await model.generateContent(prompt);
    const generatedText = result.response.text();

    return NextResponse.json({ 
      success: true, 
      content: generatedText,
      imageUrl: forklift.media[0]?.url || null
    });
  } catch (error: any) {
    console.error('[AI Content Generation Error]:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate content' }, { status: 500 });
  }
}
