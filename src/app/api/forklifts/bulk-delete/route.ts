import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';

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

export async function POST(request: Request) {
  try {
    const { role } = await getUser(request);
    if (role !== 'ADMIN') {
      return NextResponse.json({ error: 'Chỉ có Admin mới có quyền xóa dữ liệu xe nâng' }, { status: 403 });
    }

    const { ids } = await request.json();
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No IDs provided' }, { status: 400 });
    }

    await prisma.forklift.deleteMany({
      where: {
        id: { in: ids }
      }
    });

    return NextResponse.json({ success: true, count: ids.length });
  } catch (error) {
    console.error('Bulk delete error:', error);
    return NextResponse.json({ error: 'Failed to delete items' }, { status: 500 });
  }
}
