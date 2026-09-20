import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';

async function getUserRole(request: Request) {
  const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
  if (!token) return 'GUEST';
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'super_secret_jwt_key_forlift_portal_2026');
    const { payload } = await jwtVerify(token, secret);
    return payload.role as string;
  } catch (error) {
    return 'GUEST';
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const body = await request.json();
    const role = await getUserRole(request);
    if (role === 'GUEST') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
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

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const role = await getUserRole(request);
    if (role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const resolvedParams = await params;
    await prisma.forklift.delete({
      where: { id: resolvedParams.id }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
