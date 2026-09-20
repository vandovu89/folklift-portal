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

export async function GET(request: Request) {
  try {
    const role = await getUserRole(request);
    
    const forklifts = await prisma.forklift.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        expenses: role === 'ADMIN' ? {
          orderBy: { createdAt: 'asc' }
        } : false
      }
    });

    const sanitizedForklifts = role === 'ADMIN' 
      ? forklifts 
      : forklifts.map(f => {
          const { costPrice, ...rest } = f;
          return rest;
        });

    return NextResponse.json(sanitizedForklifts);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch forklifts' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const role = await getUserRole(request);
    if (role === 'GUEST') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    let internalCode = null;

    if (body.purchaseSource) {
      const source = await prisma.purchaseSource.findUnique({ where: { name: body.purchaseSource } });
      if (source) {
        const nextSeq = source.currentSeq + 1;
        internalCode = `${source.abbreviation}-${nextSeq}`;
        await prisma.purchaseSource.update({
          where: { id: source.id },
          data: { currentSeq: nextSeq }
        });
      }
    }
    
      const forklift = await prisma.forklift.create({
        data: {
          purchaseSource: body.purchaseSource || null,
          internalCode: internalCode,
          serialNo: body.serialNo,
        maker: body.maker,
        model: body.model,
        year: body.year ? parseInt(body.year) : null,
        hour: body.hour ? parseInt(body.hour) : null,
        category: body.category,
        type: body.type,
        powerType: body.powerType,
        status: body.status || 'Available',
        price: body.price ? parseFloat(body.price) : null,
        costPrice: role === 'ADMIN' && body.costPrice ? parseFloat(body.costPrice) : null,
        expenses: role === 'ADMIN' && body.expenses && body.expenses.length > 0 ? {
          create: body.expenses.map((exp: any) => ({
            title: exp.title,
            amount: parseFloat(exp.amount),
            date: exp.date ? new Date(exp.date) : null,
            note: exp.note
          }))
        } : undefined
      },
    });
    
    return NextResponse.json(forklift, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create forklift' }, { status: 500 });
  }
}
