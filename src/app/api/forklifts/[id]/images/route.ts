import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const forklift = await prisma.forklift.findUnique({
      where: { id },
      select: {
        id: true,
        maker: true,
        model: true,
        internalCode: true,
        media: {
          where: { isPublic: true, fileType: 'IMAGE' },
          orderBy: [
            { isThumbnail: 'desc' },
            { order: 'asc' },
            { createdAt: 'asc' }
          ],
          select: { url: true }
        }
      }
    });

    if (!forklift) {
      return NextResponse.json({ error: 'Forklift not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      forkliftId: forklift.id,
      forkliftName: `${forklift.maker} ${forklift.model}`,
      internalCode: forklift.internalCode || '',
      images: forklift.media.map(m => m.url)
    });
  } catch (error: any) {
    console.error('[GET /api/forklifts/[id]/images error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
