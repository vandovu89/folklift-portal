import { NextResponse } from 'next/server';
import { SignJWT } from 'jose';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    const validUsername = process.env.ADMIN_USERNAME || 'admin';
    const validPassword = process.env.ADMIN_PASSWORD || 'admin';
    const jwtSecret = process.env.JWT_SECRET || 'super_secret_jwt_key_forlift_portal_2026';

    if (username === validUsername && password === validPassword) {
      const secret = new TextEncoder().encode(jwtSecret);
      const token = await new SignJWT({ user: username })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(secret);

      const response = NextResponse.json({ success: true });
      response.cookies.set({
        name: 'auth_token',
        value: token,
        httpOnly: true,
        path: '/',
        maxAge: 60 * 60 * 24, // 1 day
      });
      return response;
    }

    return NextResponse.json({ error: 'Sai tài khoản hoặc mật khẩu' }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ error: 'Lỗi hệ thống' }, { status: 500 });
  }
}
