import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getStaffUser } from '@/lib/auth';
import { normalizePhone } from '@/lib/customer';

export async function GET(request: Request) {
  const { role } = await getStaffUser(request);
  if (role === 'GUEST') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const customers = await prisma.customer.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, name: true, phone: true, email: true, company: true, address: true, note: true,
      isActive: true, lastLoginAt: true, createdAt: true,
      forklifts: { select: { id: true, maker: true, model: true, internalCode: true, nextMaintenanceDate: true, warrantyEndDate: true } },
      _count: { select: { serviceRequests: { where: { status: { in: ['New', 'InProgress'] } } } } }
    }
  });
  return NextResponse.json(customers);
}

export async function POST(request: Request) {
  try {
    const { role } = await getStaffUser(request);
    if (role !== 'ADMIN' && role !== 'SALES') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const body = await request.json();
    const phone = normalizePhone(body.phone);
    if (!body.name?.trim() || phone.length < 9) {
      return NextResponse.json({ error: 'Cần nhập tên và số điện thoại hợp lệ' }, { status: 400 });
    }
    if (!body.password || String(body.password).length < 6) {
      return NextResponse.json({ error: 'Mật khẩu tối thiểu 6 ký tự' }, { status: 400 });
    }

    const existing = await prisma.customer.findUnique({ where: { phone } });
    if (existing) return NextResponse.json({ error: 'Số điện thoại này đã có tài khoản' }, { status: 409 });

    const customer = await prisma.customer.create({
      data: {
        name: body.name.trim(),
        phone,
        email: body.email || null,
        company: body.company || null,
        address: body.address || null,
        note: body.note || null,
        passwordHash: await bcrypt.hash(String(body.password), 10)
      },
      select: { id: true, name: true, phone: true }
    });
    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    console.error('Create customer error:', error);
    return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 });
  }
}
