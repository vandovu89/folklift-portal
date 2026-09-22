import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';

import { logActivity } from '@/lib/activity-logger';

async function getUser(request: Request) {
  const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
  if (!token) return { role: 'GUEST', id: null };
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'super_secret_jwt_key_forlift_portal_2026');
    const { payload } = await jwtVerify(token, secret);
    return { role: payload.role as string, id: payload.id as string };
  } catch (error) {
    return { role: 'GUEST', id: null };
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const body = await request.json();
    const { role, id: userId } = await getUser(request);
    if (role === 'GUEST') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const forklift = await prisma.forklift.findUnique({ where: { id: resolvedParams.id } });
    if (!forklift) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    
    // Kiểm tra khóa sổ
    if (forklift.lockedForAccounting && role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forklift is locked for accounting and cannot be modified' }, { status: 403 });
    }

    // Nếu không phải ADMIN, cấm sửa giá vốn & chi phí
    if (role !== 'ADMIN') {
      delete body.costPrice;
      delete body.expenses;
    }

    // Extract expenses if present to handle it via relations
    const expenses = body.expenses;
    delete body.expenses;

    // Convert numbers if present
    if (body.year !== undefined) body.year = body.year ? parseInt(body.year) : null;
    if (body.hour !== undefined) body.hour = body.hour ? parseInt(body.hour) : null;
    if (body.price !== undefined) body.price = body.price ? parseFloat(body.price) : null;
    if (body.costPrice !== undefined) body.costPrice = body.costPrice ? parseFloat(body.costPrice) : null;
    if (body.soldPrice !== undefined) body.soldPrice = body.soldPrice ? parseFloat(body.soldPrice) : null;
    if (body.soldDate !== undefined) body.soldDate = body.soldDate ? new Date(body.soldDate) : null;

    const updated = await prisma.forklift.update({
      where: { id: resolvedParams.id },
      data: body
    });

    if (expenses !== undefined) {
      // replace expenses:
      await prisma.expense.deleteMany({ where: { forkliftId: resolvedParams.id } });
      if (expenses.length > 0) {
        await prisma.expense.createMany({
          data: expenses.map((exp: any) => ({
            forkliftId: resolvedParams.id,
            title: exp.title,
            amount: parseFloat(exp.amount),
            date: exp.date ? new Date(exp.date) : null,
            note: exp.note
          }))
        });
      }
    }

    // Determine the type of update based on fields changed
    let actionType = 'UPDATED';
    let detailMsg = 'Cập nhật thông tin xe';
    if (body.status) {
      actionType = 'UPDATED_STATUS';
      detailMsg = `Cập nhật trạng thái thành ${body.status}`;
    }

    // Ghi log
    await logActivity({
      action: actionType,
      entityType: 'FORKLIFT',
      entityId: resolvedParams.id,
      userId: userId,
      details: detailMsg
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { role, id: userId } = await getUser(request);
    if (role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const resolvedParams = await params;
    const forklift = await prisma.forklift.findUnique({ where: { id: resolvedParams.id } });
    if (!forklift) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    
    // Mặc dù ADMIN được phép xoá, nhưng ta có thể cảnh báo hoặc ngăn chặn xoá xe đã khóa kế toán.
    // Tạm thời cho ADMIN xoá nhưng ghi log chi tiết.

    await prisma.forklift.delete({
      where: { id: resolvedParams.id }
    });

    // Ghi log
    await logActivity({
      action: 'DELETED',
      entityType: 'FORKLIFT',
      entityId: resolvedParams.id,
      userId: userId,
      details: `Đã xóa xe nâng`
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
