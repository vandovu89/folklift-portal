import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { ADMIN_ONLY_PAGES } from '@/lib/permissions';

const locales = ['en', 'vi'];
const defaultLocale = 'vi';

export async function proxy(request: NextRequest) {
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
      const { payload } = await jwtVerify(token, secret);
      
      const role = payload.role as string;
      
      // Role-Based Access Control: trang quản trị chỉ ADMIN (người dùng, nguồn nhập, cài đặt, kế toán, nhập Excel, thêm xe)
      if (role !== 'ADMIN' && ADMIN_ONLY_PAGES.some(page => pathname.includes(page))) {
        return NextResponse.redirect(new URL(`/${currentLocale}/admin`, request.url));
      }

      return NextResponse.next();
    } catch (error) {
      const response = NextResponse.redirect(new URL(`/${currentLocale}/login`, request.url));
      response.cookies.delete('auth_token');
      return response;
    }
  }

  return NextResponse.next();
}

export default proxy;

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
