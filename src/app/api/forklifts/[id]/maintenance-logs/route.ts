import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStaffUser } from '@/lib/auth';
import { addMonths, parseOptionalDate } from '@/lib/customer';

type Params = { params: Promise<{ id: string }> };

// Ghi nhận một lần bảo dưỡng và tự lùi lịch bảo dưỡng tiếp theo theo chu kỳ của xe
export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const { role } = await getStaffUser(request);
    if (role !== 'ADMIN' && role !== 'SALES') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const body = await request.json();
    if (!body.description?.trim()) return NextResponse.json({ error: 'Cần nhập nội dung bảo dưỡng' }, { status: 400 });

    const forklift = await prisma.forklift.findUnique({ where: { id }, select: { maintenanceIntervalMonths: true, hour: true } });
    if (!forklift) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const date = parseOptionalDate(body.date) || new Date();
    const hourMeter = body.hourMeter ? parseInt(body.hourMeter) : null;

    const [log] = await prisma.$transaction([
      prisma.maintenanceLog.create({
        data: { forkliftId: id, date, hourMeter, description: body.description.trim(), performedBy: body.performedBy || null }
      }),
      prisma.forklift.update({
        where: { id },
        data: {
          nextMaintenanceDate: addMonths(date, forklift.maintenanceIntervalMonths || 3),
          ...(hourMeter && (!forklift.hour || hourMeter > forklift.hour) ? { hour: hourMeter } : {})
        }
      })
    ]);

    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    console.error('Create maintenance log error:', error);
    return NextResponse.json({ error: 'Failed to create maintenance log' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const { id } = await params;
  const { role } = await getStaffUser(request);
  if (role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  const logId = new URL(request.url).searchParams.get('logId');
  if (!logId) return NextResponse.json({ error: 'Missing logId' }, { status: 400 });
  const result = await prisma.maintenanceLog.deleteMany({ where: { id: logId, forkliftId: id } });
  if (result.count === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
