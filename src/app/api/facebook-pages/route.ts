import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPageAccessToken } from '@/lib/messenger';

// GET: Lấy danh sách toàn bộ Facebook Page kèm số lượng phiên chat & inquiries
export async function GET() {
  try {
    const pages = await prisma.facebookPage.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            sessions: true,
            inquiries: true
          }
        }
      }
    });

    // Ẩn bớt token khi trả về frontend (chỉ hiển thị 6 ký tự đầu & 4 ký tự cuối)
    const maskedPages = pages.map(p => ({
      ...p,
      accessTokenMasked: p.accessToken ? `${p.accessToken.slice(0, 8)}••••••••${p.accessToken.slice(-4)}` : ''
    }));

    return NextResponse.json({ success: true, pages: maskedPages });
  } catch (error: any) {
    console.error('[API Facebook Pages GET Error]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Thêm mới một Facebook Page
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pageName, pageId, accessToken, isActive, greeting } = body;

    if (!pageName || !pageId || !accessToken) {
      return NextResponse.json(
        { success: false, error: 'Vui lòng điền đầy đủ Tên Fanpage, Page ID và Page Access Token' },
        { status: 400 }
      );
    }

    // Kiểm tra xem Page ID này đã tồn tại chưa
    const existing = await prisma.facebookPage.findUnique({
      where: { pageId: pageId.trim() }
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: `Fanpage với Page ID "${pageId}" đã tồn tại trên hệ thống!` },
        { status: 409 }
      );
    }

    // Tự động kiểm tra token qua Facebook Graph API nếu có thể
    const testResult = await verifyPageAccessToken(accessToken.trim());
    let verifiedName = pageName.trim();
    if (testResult.valid && testResult.pageName) {
      verifiedName = pageName.trim() || testResult.pageName;
    }

    const newPage = await prisma.facebookPage.create({
      data: {
        pageName: verifiedName,
        pageId: pageId.trim(),
        accessToken: accessToken.trim(),
        isActive: typeof isActive === 'boolean' ? isActive : true,
        greeting: greeting ? greeting.trim() : null
      }
    });

    return NextResponse.json({
      success: true,
      page: newPage,
      tokenVerified: testResult.valid
    });
  } catch (error: any) {
    console.error('[API Facebook Pages POST Error]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
