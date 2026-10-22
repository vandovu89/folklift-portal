import { NextResponse } from 'next/server';
import { getStaffUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(request: Request) {
  const { role } = await getStaffUser(request);
  if (role === 'GUEST' || role === 'VIEWER') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { items } = await request.json();

    // items should be an array of { id: string, order: number }
    if (!Array.isArray(items)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Sales chỉ được sắp xếp thứ tự clip gốc của AI Video Studio
    if (role !== 'ADMIN') {
      const nonClip = await prisma.media.count({ where: { id: { in: items.map((item: { id: string }) => item.id) }, category: { not: 'RAW_VIDEO' } } });
      if (nonClip > 0) return NextResponse.json({ error: 'Chỉ Admin được sắp xếp ảnh của xe' }, { status: 403 });
    }

    // Execute updates in a transaction
    await prisma.$transaction(
      items.map((item) =>
        prisma.media.update({
          where: { id: item.id },
          data: { order: item.order },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to reorder media:', error);
    return NextResponse.json({ error: 'Failed to reorder media' }, { status: 500 });
  }
}
