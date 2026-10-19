import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';

async function getUserRole(request: Request) {
  const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
  if (!token) return 'GUEST';
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'super_secret_jwt_key_forlift_portal_2026');
    const { payload } = await jwtVerify(token, secret);
    return payload.role as string;
  } catch (error) {
    return 'GUEST';
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const video = await prisma.mediaVideo.findUnique({
      where: { id }
    });

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    return NextResponse.json(video);
  } catch (error: any) {
    console.error('[GET /api/media-videos/[id] error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const role = await getUserRole(req);
    if (role === 'GUEST') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { title, videoUrl, thumbnailUrl, category, description, isFeatured } = body;

    const updated = await prisma.mediaVideo.update({
      where: { id },
      data: {
        title,
        videoUrl,
        thumbnailUrl: thumbnailUrl !== undefined ? thumbnailUrl : undefined,
        category: category !== undefined ? category : undefined,
        description: description !== undefined ? description : undefined,
        isFeatured: isFeatured !== undefined ? Boolean(isFeatured) : undefined,
      }
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('[PUT /api/media-videos/[id] error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const role = await getUserRole(req);
    if (role !== 'ADMIN' && role !== 'SALES') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await prisma.mediaVideo.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[DELETE /api/media-videos/[id] error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
