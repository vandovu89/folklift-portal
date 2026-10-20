import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCustomerId } from '@/lib/auth';
import { SERVICE_TYPES, SERVICE_TYPE_LABELS, parseOptionalDate, type ServiceType } from '@/lib/customer';

// Khách hàng gửi yêu cầu Bảo dưỡng / Gọi thợ / Mua phụ tùng cho xe của mình
export async function POST(request: Request) {
  try {
    const customerId = await getCustomerId(request);
    if (!customerId) return NextResponse.json({ error: 'Vui lòng đăng nhập lại' }, { status: 401 });

    const body = await request.json();
    if (!(SERVICE_TYPES as readonly string[]).includes(body.type)) {
      return NextResponse.json({ error: 'Loại yêu cầu không hợp lệ' }, { status: 400 });
    }

    let forkliftId: string | null = null;
    if (body.forkliftId) {
      const owned = await prisma.forklift.findFirst({ where: { id: body.forkliftId, customerId }, select: { id: true } });
      if (!owned) return NextResponse.json({ error: 'Xe không thuộc tài khoản của bạn' }, { status: 403 });
      forkliftId = owned.id;
    }

    // Chặn gửi trùng: cùng xe + cùng loại yêu cầu vẫn đang chờ xử lý
    const pending = await prisma.serviceRequest.findFirst({
      where: { customerId, forkliftId, type: body.type, status: { in: ['New', 'InProgress'] } }
    });
    if (pending) {
      return NextResponse.json({
        error: `Bạn đã có yêu cầu "${SERVICE_TYPE_LABELS[body.type as ServiceType]}" đang được xử lý. MCK Japan sẽ sớm liên hệ!`
      }, { status: 409 });
    }

    const created = await prisma.serviceRequest.create({
      data: {
        customerId,
        forkliftId,
        type: body.type,
        message: body.message ? String(body.message).slice(0, 2000) : null,
        preferredDate: parseOptionalDate(body.preferredDate)
      }
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('Create service request error:', error);
    return NextResponse.json({ error: 'Lỗi hệ thống' }, { status: 500 });
  }
}
