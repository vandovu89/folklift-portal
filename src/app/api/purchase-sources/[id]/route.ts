import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  try {
    const data = await request.json();
    if (!data.name || !data.abbreviation) {
      return NextResponse.json({ error: 'Missing name or abbreviation' }, { status: 400 });
    }

    const updated = await prisma.purchaseSource.update({
      where: { id: resolvedParams.id },
      data: {
        name: data.name.trim(),
        abbreviation: data.abbreviation.trim().toUpperCase(),
      }
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Tên nguồn hoặc Tên viết tắt đã tồn tại' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  try {
    await prisma.purchaseSource.delete({
      where: { id: resolvedParams.id }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
