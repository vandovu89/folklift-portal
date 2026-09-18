import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const body = await request.json();
    
    // Extract expenses if present to handle it via relations
    const expenses = body.expenses;
    delete body.expenses;

    // Convert numbers if present
    if (body.year !== undefined) body.year = body.year ? parseInt(body.year) : null;
    if (body.hour !== undefined) body.hour = body.hour ? parseInt(body.hour) : null;
    if (body.price !== undefined) body.price = body.price ? parseFloat(body.price) : null;
    if (body.costPrice !== undefined) body.costPrice = body.costPrice ? parseFloat(body.costPrice) : null;

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
    const resolvedParams = await params;
    await prisma.forklift.delete({
      where: { id: resolvedParams.id }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
