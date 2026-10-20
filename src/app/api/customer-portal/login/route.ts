import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { CUSTOMER_COOKIE, signCustomerToken } from '@/lib/auth';
import { normalizePhone } from '@/lib/customer';

export async function POST(request: Request) {
  try {
    const { phone, password } = await request.json();
    const normalized = normalizePhone(phone || '');
    const customer = normalized ? await prisma.customer.findUnique({ where: { phone: normalized } }) : null;

    if (!customer || !customer.isActive || !password || !(await bcrypt.compare(String(password), customer.passwordHash))) {
      return NextResponse.json({ error: 'Sai số điện thoại hoặc mật khẩu' }, { status: 401 });
    }

    await prisma.customer.update({ where: { id: customer.id }, data: { lastLoginAt: new Date() } });

    const response = NextResponse.json({ success: true, name: customer.name });
    response.cookies.set({
      name: CUSTOMER_COOKIE,
      value: await signCustomerToken(customer.id),
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 30
    });
    return response;
  } catch (error) {
    console.error('Customer login error:', error);
    return NextResponse.json({ error: 'Lỗi hệ thống' }, { status: 500 });
  }
}
