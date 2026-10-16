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
    const { pageId, message, imageUrl, images } = body;

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

    const targetImages: string[] = Array.isArray(images) && images.length > 0
      ? images
      : (imageUrl ? [imageUrl] : []);

    // Trường hợp 1: Không có ảnh (Đăng bài status dạng Text thông thường)
    if (targetImages.length === 0) {
      const url = `https://graph.facebook.com/v20.0/${pageId}/feed?access_token=${fbPage.accessToken}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
      const data = await res.json();
      if (!res.ok) {
        console.error('[Facebook Publish API Error]:', data);
        return NextResponse.json({ error: data.error?.message || 'Failed to publish to Facebook' }, { status: res.status });
      }
      return NextResponse.json({ success: true, postId: data.id });
    }

    // Trường hợp 2: Có đúng 1 ảnh (Đăng ảnh kèm Caption)
    if (targetImages.length === 1) {
      const url = `https://graph.facebook.com/v20.0/${pageId}/photos?access_token=${fbPage.accessToken}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: targetImages[0],
          caption: message
        })
      });
      const data = await res.json();
      if (!res.ok) {
        console.error('[Facebook Publish Single Photo API Error]:', data);
        return NextResponse.json({ error: data.error?.message || 'Failed to publish photo to Facebook' }, { status: res.status });
      }
      return NextResponse.json({ success: true, postId: data.id || data.post_id });
    }

    // Trường hợp 3: Nhiều ảnh (Đăng bài kèm album ảnh multi-photo)
    const uploadedMediaIds: string[] = [];
    for (const imgUrl of targetImages) {
      try {
        const uploadRes = await fetch(`https://graph.facebook.com/v20.0/${pageId}/photos?access_token=${fbPage.accessToken}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: imgUrl,
            published: false
          })
        });
        const uploadData = await uploadRes.json();
        if (uploadRes.ok && uploadData.id) {
          uploadedMediaIds.push(uploadData.id);
        } else {
          console.warn('[Facebook Multi-Photo Upload Warning]:', uploadData);
        }
      } catch (err) {
        console.error('[Facebook Multi-Photo Upload Error]:', err);
      }
    }

    if (uploadedMediaIds.length > 0) {
      const feedUrl = `https://graph.facebook.com/v20.0/${pageId}/feed?access_token=${fbPage.accessToken}`;
      const feedRes = await fetch(feedUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          attached_media: uploadedMediaIds.map(id => ({ media_fbid: id }))
        })
      });
      const feedData = await feedRes.json();
      if (!feedRes.ok) {
        console.error('[Facebook Publish Multi-Photo Feed Error]:', feedData);
        return NextResponse.json({ error: feedData.error?.message || 'Failed to publish multi-photo post' }, { status: feedRes.status });
      }
      return NextResponse.json({ success: true, postId: feedData.id });
    } else {
      return NextResponse.json({ 
        error: 'Không thể upload ảnh lên Facebook. Vui lòng kiểm tra lại đường dẫn ảnh công khai.' 
      }, { status: 400 });
    }
  } catch (error: any) {
    console.error('[Facebook Publish Route Error]:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
