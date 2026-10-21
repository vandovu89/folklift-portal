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
