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
    const featuredOnly = searchParams.get('featured') === 'true';

    const testimonials = await prisma.testimonial.findMany({
      where: featuredOnly ? { isFeatured: true } : {},
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(testimonials);
  } catch (error: any) {
    console.error('[GET /api/testimonials error]:', error);
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
    const { customerName, companyName, location, forkliftModel, imageUrl, videoUrl, content, rating, deliveryDate, isFeatured } = body;

    if (!customerName || !content) {
      return NextResponse.json({ error: 'Missing required fields (customerName, content)' }, { status: 400 });
    }

    const newTestimonial = await prisma.testimonial.create({
      data: {
        customerName,
        companyName: companyName || null,
        location: location || null,
        forkliftModel: forkliftModel || null,
        imageUrl: imageUrl || null,
        videoUrl: videoUrl || null,
        content,
        rating: rating ? parseInt(rating) : 5,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
        isFeatured: isFeatured !== undefined ? Boolean(isFeatured) : true,
      }
    });

    return NextResponse.json(newTestimonial, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/testimonials error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
