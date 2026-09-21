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

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const role = await getUserRole(request);
    if (role === 'GUEST') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resolvedParams = await params;
    
    const activities = await prisma.activityLog.findMany({
      where: {
        entityType: 'FORKLIFT',
        entityId: resolvedParams.id
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, username: true } }
      }
    });

    return NextResponse.json(activities);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 });
  }
}
