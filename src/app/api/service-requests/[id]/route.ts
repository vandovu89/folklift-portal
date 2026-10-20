import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStaffUser } from '@/lib/auth';
import { SERVICE_STATUSES } from '@/lib/customer';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { role } = await getStaffUser(request);
  if (role !== 'ADMIN' && role !== 'SALES') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const { status } = await request.json();
  if (!(SERVICE_STATUSES as readonly string[]).includes(status)) {
    return NextResponse.json({ error: 'Trạng thái không hợp lệ' }, { status: 400 });
  }
  const updated = await prisma.serviceRequest.update({ where: { id }, data: { status } });
  return NextResponse.json(updated);
}
