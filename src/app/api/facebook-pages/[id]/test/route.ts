import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPageAccessToken } from '@/lib/messenger';

// POST: Kiểm tra kết nối token của Fanpage với Meta Graph API
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const page = await prisma.facebookPage.findUnique({
      where: { id }
    });

    if (!page) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy Fanpage' }, { status: 404 });
    }

    const testResult = await verifyPageAccessToken(page.accessToken);
    return NextResponse.json({
      success: testResult.valid,
      pageId: testResult.pageId,
      pageName: testResult.pageName,
      error: testResult.error
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
