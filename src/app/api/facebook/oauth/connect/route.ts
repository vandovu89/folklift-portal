import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStaffUser } from '@/lib/auth';
import { listManagedPages, readFacebookSession, subscribePageWebhooks, FB_USER_COOKIE } from '@/lib/facebook-oauth';

// POST: Kết nối các Page người dùng đã chọn — lưu Page Access Token và đăng ký Webhook (pages_manage_metadata)
export async function POST(req: NextRequest) {
  const { role } = await getStaffUser(req);
  if (role !== 'ADMIN') return NextResponse.json({ success: false, error: 'Only ADMIN can connect Facebook Pages' }, { status: 403 });

  const session = await readFacebookSession(req.cookies.get(FB_USER_COOKIE)?.value);
  if (!session) return NextResponse.json({ success: false, error: 'Facebook session expired, please log in again' }, { status: 401 });

  const { pageIds } = await req.json();
  if (!Array.isArray(pageIds) || pageIds.length === 0) {
    return NextResponse.json({ success: false, error: 'Please select at least one Page' }, { status: 400 });
  }

  try {
    const managed = await listManagedPages(session.userToken);
    const results = [];

    for (const pageId of pageIds) {
      const page = managed.find(p => p.id === pageId);
      if (!page) {
        results.push({ pageId, success: false, error: 'Page not found in your Facebook account' });
        continue;
      }

      await prisma.facebookPage.upsert({
        where: { pageId: page.id },
        update: { pageName: page.name, accessToken: page.access_token },
        create: { pageId: page.id, pageName: page.name, accessToken: page.access_token, isActive: true }
      });

      try {
        await subscribePageWebhooks(page.id, page.access_token);
        results.push({ pageId, pageName: page.name, success: true, subscribed: true });
      } catch (error: any) {
        results.push({ pageId, pageName: page.name, success: true, subscribed: false, error: error.message });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
