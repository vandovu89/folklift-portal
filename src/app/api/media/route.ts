import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const forkliftId = searchParams.get('forkliftId');

  if (!forkliftId) {
    return NextResponse.json({ error: 'Missing forkliftId' }, { status: 400 });
  }

  try {
    const mediaList = await prisma.media.findMany({
      where: { forkliftId },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(mediaList);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch media' }, { status: 500 });
  }
}
