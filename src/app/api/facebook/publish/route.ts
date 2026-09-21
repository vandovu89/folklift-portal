import { NextResponse } from 'next/server';
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

export async function POST(request: Request) {
  try {
    const role = await getUserRole(request);
    // Tính năng này thường dành cho Marketing/Admin, nhưng hiện tại cứ check role không phải GUEST
    if (role === 'GUEST') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { pageId, message, imageUrl } = body;

    if (!pageId || !message) {
      return NextResponse.json({ error: 'Missing pageId or message' }, { status: 400 });
    }

    // Lấy Page Access Token từ DB
    const fbPage = await prisma.facebookPage.findUnique({
      where: { pageId }
    });

    if (!fbPage || !fbPage.accessToken) {
      return NextResponse.json({ error: 'Fanpage not found or missing access token' }, { status: 404 });
    }

    let url = '';
    let payload: any = {};

    if (imageUrl) {
      // Đăng ảnh kèm caption
      url = `https://graph.facebook.com/v20.0/${pageId}/photos?access_token=${fbPage.accessToken}`;
      payload = {
        url: imageUrl,
        caption: message
      };
    } else {
      // Đăng chữ (status update)
      url = `https://graph.facebook.com/v20.0/${pageId}/feed?access_token=${fbPage.accessToken}`;
      payload = {
        message: message
      };
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('[Facebook Publish API Error]:', data);
      return NextResponse.json({ error: data.error?.message || 'Failed to publish to Facebook' }, { status: res.status });
    }

    return NextResponse.json({ success: true, postId: data.id });
  } catch (error: any) {
    console.error('[Facebook Publish Route Error]:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
