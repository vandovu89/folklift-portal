import { NextRequest, NextResponse } from 'next/server';
import { getStaffUser } from '@/lib/auth';
import {
  exchangeCodeForUserToken,
  getFacebookUser,
  signFacebookSession,
  FB_STATE_COOKIE,
  FB_USER_COOKIE
} from '@/lib/facebook-oauth';

// GET: Meta chuyển hướng về đây sau khi người dùng đăng nhập & cấp quyền
export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const params = req.nextUrl.searchParams;
  const state = params.get('state') || '';
  const lang = state.endsWith('.en') ? 'en' : 'vi';
  const backUrl = new URL(`/${lang}/admin/facebook-pages`, origin);

  const fail = (message: string) => {
    backUrl.searchParams.set('fb_error', message);
    const res = NextResponse.redirect(backUrl);
    res.cookies.delete(FB_STATE_COOKIE);
    return res;
  };

  const { role } = await getStaffUser(req);
  if (role !== 'ADMIN') return fail('Only ADMIN can connect Facebook Pages');

  const savedState = req.cookies.get(FB_STATE_COOKIE)?.value;
  if (!state || !savedState || state !== savedState) return fail('Invalid login state, please try again');

  // Người dùng bấm "Cancel" / từ chối trên hộp thoại Meta
  if (params.get('error')) {
    return fail(params.get('error_description') || params.get('error_reason') || 'Facebook Login was cancelled');
  }

  const code = params.get('code');
  if (!code) return fail('Missing authorization code from Facebook');

  try {
    const userToken = await exchangeCodeForUserToken(code, origin);
    const fbUser = await getFacebookUser(userToken);
    const session = await signFacebookSession({ userToken, userId: fbUser.id, userName: fbUser.name });

    backUrl.searchParams.set('fb_connected', '1');
    const res = NextResponse.redirect(backUrl);
    res.cookies.delete(FB_STATE_COOKIE);
    res.cookies.set(FB_USER_COOKIE, session, {
      httpOnly: true,
      secure: origin.startsWith('https://'),
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 60
    });
    return res;
  } catch (error: any) {
    console.error('[Facebook OAuth Callback Error]:', error);
    return fail(error.message || 'Facebook Login failed');
  }
}
