import { NextRequest, NextResponse } from 'next/server';
import { getStaffUser } from '@/lib/auth';
import { buildLoginDialogUrl, getFacebookAppConfig, FB_STATE_COOKIE } from '@/lib/facebook-oauth';

// GET: Bắt đầu Facebook Login — chuyển hướng sang hộp thoại cấp quyền của Meta
export async function GET(req: NextRequest) {
  const lang = req.nextUrl.searchParams.get('lang') === 'en' ? 'en' : 'vi';
  const origin = req.nextUrl.origin;
  const backUrl = new URL(`/${lang}/admin/facebook-pages`, origin);

  const { role } = await getStaffUser(req);
  if (role !== 'ADMIN') {
    backUrl.searchParams.set('fb_error', 'Only ADMIN can connect Facebook Pages');
    return NextResponse.redirect(backUrl);
  }

  if (!getFacebookAppConfig().configured) {
    backUrl.searchParams.set('fb_error', 'FACEBOOK_APP_ID / FACEBOOK_APP_SECRET are not configured on the server');
    return NextResponse.redirect(backUrl);
  }

  const state = `${crypto.randomUUID()}.${lang}`;
  const res = NextResponse.redirect(buildLoginDialogUrl(origin, state));
  res.cookies.set(FB_STATE_COOKIE, state, {
    httpOnly: true,
    secure: origin.startsWith('https://'),
    sameSite: 'lax',
    path: '/',
    maxAge: 600
  });
  return res;
}
