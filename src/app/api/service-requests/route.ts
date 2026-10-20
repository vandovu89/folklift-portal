import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStaffUser } from '@/lib/auth';

export async function GET(request: Request) {
  const { role } = await getStaffUser(request);
  if (role === 'GUEST') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const status = new URL(request.url).searchParams.get('status');
  const requests = await prisma.serviceRequest.findMany({
    where: status ? { status: { in: status.split(',') } } : undefined,
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      customer: { select: { id: true, name: true, phone: true, company: true } },
      forklift: { select: { id: true, maker: true, model: true, internalCode: true } }
    }
  });
  return NextResponse.json(requests);
}
