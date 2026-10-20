import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getCustomerId } from '@/lib/auth';

export async function PUT(request: Request) {
  const customerId = await getCustomerId(request);
  if (!customerId) return NextResponse.json({ error: 'Vui lòng đăng nhập lại' }, { status: 401 });

  const { currentPassword, newPassword } = await request.json();
  if (!newPassword || String(newPassword).length < 6) {
    return NextResponse.json({ error: 'Mật khẩu mới tối thiểu 6 ký tự' }, { status: 400 });
  }

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer || !(await bcrypt.compare(String(currentPassword || ''), customer.passwordHash))) {
    return NextResponse.json({ error: 'Mật khẩu hiện tại không đúng' }, { status: 400 });
  }

  await prisma.customer.update({ where: { id: customerId }, data: { passwordHash: await bcrypt.hash(String(newPassword), 10) } });
  return NextResponse.json({ success: true });
}
