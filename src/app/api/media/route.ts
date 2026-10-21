import { NextResponse } from 'next/server';
import { getStaffUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  // Chỉ nhân viên đã đăng nhập mới được xem thư viện media (gồm cả file nội bộ)
  const { role } = await getStaffUser(request);
  if (role === 'GUEST') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const forkliftId = searchParams.get('forkliftId');

  if (!forkliftId) {
    return NextResponse.json({ error: 'Missing forkliftId' }, { status: 400 });
  }

  try {
    const mediaList = await prisma.media.findMany({
      where: { forkliftId },
      orderBy: [
        { order: 'asc' },
        { createdAt: 'desc' }
      ]
    });
    return NextResponse.json(mediaList);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch media' }, { status: 500 });
  }
}
