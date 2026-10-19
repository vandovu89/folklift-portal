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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const featuredOnly = searchParams.get('featured') === 'true';

    const where: any = {};
    if (category && category !== 'ALL') {
      where.category = category;
    }
    if (featuredOnly) {
      where.isFeatured = true;
    }

    const videos = await prisma.mediaVideo.findMany({
      where,
      orderBy: [
        { isFeatured: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    return NextResponse.json(videos);
  } catch (error: any) {
    console.error('[GET /api/media-videos error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const role = await getUserRole(req);
    if (role === 'GUEST') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { title, videoUrl, thumbnailUrl, category, description, isFeatured } = body;

    if (!title || !videoUrl) {
      return NextResponse.json({ error: 'Missing required fields (title, videoUrl)' }, { status: 400 });
    }

    const newVideo = await prisma.mediaVideo.create({
      data: {
        title,
        videoUrl,
        thumbnailUrl: thumbnailUrl || null,
        category: category || 'DELIVERY',
        description: description || null,
        isFeatured: isFeatured !== undefined ? Boolean(isFeatured) : false,
      }
    });

    return NextResponse.json(newVideo, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/media-videos error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
