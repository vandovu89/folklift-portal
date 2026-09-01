import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const forklifts = await prisma.forklift.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(forklifts);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch forklifts' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const forklift = await prisma.forklift.create({
      data: {
        internalCode: body.internalCode,
        stockNo: body.stockNo,
        serialNo: body.serialNo,
        maker: body.maker,
        model: body.model,
        year: body.year ? parseInt(body.year) : null,
        hour: body.hour ? parseInt(body.hour) : null,
        category: body.category,
        type: body.type,
        powerType: body.powerType,
        status: body.status || 'Published',
        price: body.price ? parseFloat(body.price) : null,
      },
    });
    
    return NextResponse.json(forklift, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create forklift' }, { status: 500 });
  }
}
