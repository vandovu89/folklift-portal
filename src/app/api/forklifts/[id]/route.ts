import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStaffUser } from '@/lib/auth';
import { isAdmin, stripInternalFields, SALES_EDITABLE_FIELDS, SALES_CLOSING_FIELDS, ADMIN_ONLY_MEDIA_CATEGORIES } from '@/lib/permissions';

import { logActivity } from '@/lib/activity-logger';

// Trạng thái được phép hiển thị cho khách (khớp với trang catalog public)
const PUBLIC_STATUSES = ['Available', 'Incoming', 'Reserved', 'Unpacking', 'InJapan'];

// Các trường an toàn cho khách chưa đăng nhập: không có giá vốn, nguồn hàng, hợp đồng, khách hàng, kịch bản AI...
const PUBLIC_FORKLIFT_SELECT = {
  id: true,
  maker: true,
  model: true,
  year: true,
  hour: true,
  category: true,
  type: true,
  powerType: true,
  productGroup: true,
  mast: true,
  liftHeight: true,
  loadCapacity: true,
  attachment: true,
  forkLength: true,
  dimensions: true,
  weight: true,
  otherSpecs: true,
  location: true,
  status: true,
  condition: true,
  engineCondition: true,
  price: true,
  videoUrl: true,
  aiVideoUrl: true,
  createdAt: true,
  updatedAt: true,
  media: {
    where: { isPublic: true },
    orderBy: { order: 'asc' as const },
    select: { id: true, url: true, fileName: true, fileType: true, category: true, isThumbnail: true, order: true }
  }
};

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const { role } = await getStaffUser(request);

    // Khách chưa đăng nhập: chỉ trả về trường public và xe đang ở trạng thái public
    if (role === 'GUEST') {
      const publicForklift = await prisma.forklift.findFirst({
        where: { id: resolvedParams.id, status: { in: PUBLIC_STATUSES } },
        select: PUBLIC_FORKLIFT_SELECT
      });
      if (!publicForklift) {
        return NextResponse.json({ error: 'Forklift not found' }, { status: 404 });
      }
      return NextResponse.json(publicForklift);
    }

    const forklift = await prisma.forklift.findUnique({
      where: { id: resolvedParams.id },
      include: {
        media: isAdmin(role) ? true : { where: { OR: [{ category: null }, { category: { notIn: ADMIN_ONLY_MEDIA_CATEGORIES } }] } },
        expenses: role === 'ADMIN' ? { orderBy: { createdAt: 'asc' } } : false
      }
    });

    if (!forklift) {
      return NextResponse.json({ error: 'Forklift not found' }, { status: 404 });
    }

    // SALES/VIEWER không được xem giá vốn, chi phí & nguồn nhập
    return NextResponse.json(stripInternalFields(forklift, role));
  } catch (error) {
    console.error('Fetch forklift error:', error);
    return NextResponse.json({ error: 'Failed to fetch forklift' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const body = await request.json();
    const { role, id: userId } = await getStaffUser(request);
    if (role === 'GUEST') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (role === 'VIEWER') return NextResponse.json({ error: 'Tài khoản chỉ có quyền xem' }, { status: 403 });

    const forklift = await prisma.forklift.findUnique({ where: { id: resolvedParams.id } });
    if (!forklift) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    
    // Kiểm tra khóa sổ
    if (forklift.lockedForAccounting && role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forklift is locked for accounting and cannot be modified' }, { status: 403 });
    }

    // SALES chỉ được đổi trạng thái xe, ghi thông tin chốt đơn khi chuyển sang "Đã bán"
    // và lưu kết quả AI Video Studio; mọi trường khác bị bỏ qua
    if (!isAdmin(role)) {
      const allowed: readonly string[] = body.status === 'Sold'
        ? [...SALES_EDITABLE_FIELDS, ...SALES_CLOSING_FIELDS]
        : SALES_EDITABLE_FIELDS;
      for (const key of Object.keys(body)) {
        if (!allowed.includes(key)) delete body[key];
      }
      if (Object.keys(body).length === 0) {
        return NextResponse.json({ error: 'Tài khoản Sales chỉ được cập nhật trạng thái xe' }, { status: 403 });
      }
      // Chuyển sang "Đã bán" mà chưa có ngày bán thì ghi nhận ngày hôm nay (giá bán thực tế do Admin nhập)
      if (body.status === 'Sold' && !forklift.soldDate) body.soldDate = new Date().toISOString();
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
    const { role, id: userId } = await getStaffUser(request);
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
