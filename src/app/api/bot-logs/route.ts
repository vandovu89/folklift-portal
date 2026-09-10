import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Lấy danh sách 100 log gần nhất
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const pageId = searchParams.get('pageId');

    const where: any = {};
    if (pageId) {
      where.pageId = pageId;
    }

    const logs = await prisma.botLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    return NextResponse.json({ success: true, logs });
  } catch (error: any) {
    console.error('[API Bot Logs GET Error]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Xóa lịch sử logs
export async function DELETE() {
  try {
    await prisma.botLog.deleteMany({});
    return NextResponse.json({ success: true, message: 'Đã xóa toàn bộ nhật ký log' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
