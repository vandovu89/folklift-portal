import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStaffUser } from '@/lib/auth';
import { logActivity } from '@/lib/activity-logger';
import { addMonths, parseOptionalDate } from '@/lib/customer';

type Params = { params: Promise<{ id: string }> };

// Gán xe cho khách / cập nhật thông tin bảo hành & chu kỳ bảo dưỡng của xe
export async function POST(request: Request, { params }: Params) {
  try {
    const { id: customerId } = await params;
    const { role, id: userId } = await getStaffUser(request);
    if (role !== 'ADMIN' && role !== 'SALES') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const body = await request.json();
    const forklift = await prisma.forklift.findUnique({ where: { id: body.forkliftId } });
    if (!forklift) return NextResponse.json({ error: 'Không tìm thấy xe' }, { status: 404 });
    if (forklift.customerId && forklift.customerId !== customerId) {
      return NextResponse.json({ error: 'Xe này đang thuộc về khách hàng khác' }, { status: 409 });
    }

    const interval = body.maintenanceIntervalMonths !== undefined
      ? Math.max(1, parseInt(body.maintenanceIntervalMonths) || 3)
      : forklift.maintenanceIntervalMonths || 3;
    const handoverDate = forklift.soldDate || new Date();

    const warrantyEndDate = body.warrantyEndDate !== undefined
      ? parseOptionalDate(body.warrantyEndDate)
      : forklift.warrantyEndDate || addMonths(handoverDate, 3);
    const nextMaintenanceDate = body.nextMaintenanceDate !== undefined
      ? parseOptionalDate(body.nextMaintenanceDate)
      : forklift.nextMaintenanceDate || addMonths(handoverDate, interval);

    const updated = await prisma.forklift.update({
      where: { id: forklift.id },
      data: { customerId, maintenanceIntervalMonths: interval, warrantyEndDate, nextMaintenanceDate },
      select: { id: true, warrantyEndDate: true, maintenanceIntervalMonths: true, nextMaintenanceDate: true }
    });

    if (forklift.customerId !== customerId) {
      const customer = await prisma.customer.findUnique({ where: { id: customerId }, select: { name: true } });
      await logActivity({
        action: 'UPDATED',
        entityType: 'FORKLIFT',
        entityId: forklift.id,
        userId,
        details: `Gán xe cho khách hàng hậu mãi: ${customer?.name || customerId}`
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Assign forklift error:', error);
    return NextResponse.json({ error: 'Failed to assign forklift' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const { id: customerId } = await params;
  const { role } = await getStaffUser(request);
  if (role !== 'ADMIN' && role !== 'SALES') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const forkliftId = new URL(request.url).searchParams.get('forkliftId');
  if (!forkliftId) return NextResponse.json({ error: 'Missing forkliftId' }, { status: 400 });

  const result = await prisma.forklift.updateMany({ where: { id: forkliftId, customerId }, data: { customerId: null } });
  if (result.count === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
