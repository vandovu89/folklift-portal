import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getStaffUser } from '@/lib/auth';
import { normalizePhone } from '@/lib/customer';

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const { role } = await getStaffUser(request);
  if (role === 'GUEST') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const customer = await prisma.customer.findUnique({
    where: { id },
    select: {
      id: true, name: true, phone: true, email: true, company: true, address: true, note: true,
      isActive: true, lastLoginAt: true, createdAt: true,
      forklifts: {
        select: {
          id: true, maker: true, model: true, internalCode: true, serialNo: true, year: true, hour: true,
          soldDate: true, warrantyEndDate: true, maintenanceIntervalMonths: true, nextMaintenanceDate: true,
          maintenanceLogs: { orderBy: { date: 'desc' } }
        }
      },
      serviceRequests: {
        orderBy: { createdAt: 'desc' },
        include: { forklift: { select: { id: true, maker: true, model: true, internalCode: true } } }
      }
    }
  });
  if (!customer) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(customer);
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const { role } = await getStaffUser(request);
    if (role !== 'ADMIN' && role !== 'SALES') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const body = await request.json();
    const data: Record<string, unknown> = {};
    for (const key of ['name', 'email', 'company', 'address', 'note'] as const) {
      if (body[key] !== undefined) data[key] = body[key] || null;
    }
    if (data.name === null) return NextResponse.json({ error: 'Tên không được để trống' }, { status: 400 });
    if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);
    if (body.phone !== undefined) {
      const phone = normalizePhone(body.phone);
      if (phone.length < 9) return NextResponse.json({ error: 'Số điện thoại không hợp lệ' }, { status: 400 });
      const dup = await prisma.customer.findFirst({ where: { phone, NOT: { id } } });
      if (dup) return NextResponse.json({ error: 'Số điện thoại này đã có tài khoản khác' }, { status: 409 });
      data.phone = phone;
    }
    if (body.password) {
      if (String(body.password).length < 6) return NextResponse.json({ error: 'Mật khẩu tối thiểu 6 ký tự' }, { status: 400 });
      data.passwordHash = await bcrypt.hash(String(body.password), 10);
    }

    const customer = await prisma.customer.update({ where: { id }, data, select: { id: true, name: true, phone: true, isActive: true } });
    return NextResponse.json(customer);
  } catch (error) {
    console.error('Update customer error:', error);
    return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const { id } = await params;
  const { role } = await getStaffUser(request);
  if (role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  // Xe của khách được giữ lại (customerId => null), yêu cầu dịch vụ bị xóa theo
  await prisma.customer.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
