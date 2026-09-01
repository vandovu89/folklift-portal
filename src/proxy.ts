import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const locales = ['en', 'vi'];
const defaultLocale = 'vi';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Bỏ qua static files và API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Kiểm tra xem URL đã có locale chưa
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  // Redirect nếu chưa có locale
  if (!pathnameHasLocale) {
    request.nextUrl.pathname = `/${defaultLocale}${pathname}`;
    return NextResponse.redirect(request.nextUrl);
  }

  // Auth logic cho trang admin (lưu ý pathname lúc này đã có dạng /vi/admin)
  if (pathname.includes('/admin')) {
    const token = request.cookies.get('auth_token')?.value;
    const currentLocale = locales.find((l) => pathname.startsWith(`/${l}/`) || pathname === `/${l}`) || defaultLocale;

    if (!token) {
      return NextResponse.redirect(new URL(`/${currentLocale}/login`, request.url));
    }

    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'super_secret_jwt_key_forlift_portal_2026');
      await jwtVerify(token, secret);
      return NextResponse.next();
    } catch (error) {
      const response = NextResponse.redirect(new URL(`/${currentLocale}/login`, request.url));
      response.cookies.delete('auth_token');
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
