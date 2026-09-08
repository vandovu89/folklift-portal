import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Chi tiết 1 Facebook Page
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const page = await prisma.facebookPage.findUnique({
      where: { id },
      include: {
        _count: {
          select: { sessions: true, inquiries: true }
        }
      }
    });

    if (!page) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy Fanpage' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      page: {
        ...page,
        accessTokenMasked: page.accessToken ? `${page.accessToken.slice(0, 8)}••••••••${page.accessToken.slice(-4)}` : ''
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Cập nhật thông tin Fanpage
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { pageName, pageId, accessToken, isActive, greeting } = body;

    const dataToUpdate: any = {};
    if (pageName !== undefined) dataToUpdate.pageName = pageName.trim();
    if (pageId !== undefined) dataToUpdate.pageId = pageId.trim();
    // Chỉ cập nhật accessToken nếu người dùng nhập token mới (không để trống)
    if (accessToken && accessToken.trim().length > 10 && !accessToken.includes('••••')) {
      dataToUpdate.accessToken = accessToken.trim();
    }
    if (isActive !== undefined) dataToUpdate.isActive = Boolean(isActive);
    if (greeting !== undefined) dataToUpdate.greeting = greeting ? greeting.trim() : null;

    const updated = await prisma.facebookPage.update({
      where: { id },
      data: dataToUpdate
    });

    return NextResponse.json({ success: true, page: updated });
  } catch (error: any) {
    console.error('[API Facebook Page PUT Error]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Xóa Fanpage
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.facebookPage.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API Facebook Page DELETE Error]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
