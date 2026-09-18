import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const sources = await prisma.purchaseSource.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(sources);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    if (!data.name || !data.abbreviation) {
      return NextResponse.json({ error: 'Missing name or abbreviation' }, { status: 400 });
    }

    const newSource = await prisma.purchaseSource.create({
      data: {
        name: data.name.trim(),
        abbreviation: data.abbreviation.trim().toUpperCase(),
        currentSeq: 0
      }
    });

    return NextResponse.json(newSource, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Tên nguồn hoặc Tên viết tắt đã tồn tại' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
  }
}
