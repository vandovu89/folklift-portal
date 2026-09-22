import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';

async function getUser(request: Request) {
  const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
  if (!token) return { role: 'GUEST', id: null };
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'super_secret_jwt_key_forlift_portal_2026');
    const { payload } = await jwtVerify(token, secret);
    return { role: payload.role as string, id: payload.id as string };
  } catch (error) {
    return { role: 'GUEST', id: null };
  }
}

export async function GET(request: Request) {
  try {
    const { role } = await getUser(request);
    if (role === 'GUEST') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const locked = searchParams.get('locked') === 'true';

    // Lấy danh sách các xe đã bán (hoặc tất cả các xe có trạng thái Sold).
    // Ở đây ta lấy những xe có trạng thái Sold để tổng hợp doanh thu.
    const forklifts = await prisma.forklift.findMany({
      where: {
        status: 'Sold',
        lockedForAccounting: locked
      },
      include: {
        expenses: true
      },
      orderBy: { soldDate: 'desc' }
    });

    return NextResponse.json(forklifts);
  } catch (error: any) {
    console.error('[Accounting GET Error]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
