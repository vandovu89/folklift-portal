import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { jwtVerify } from 'jose';

async function isAdmin(request: Request) {
  const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
  if (!token) return false;
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'super_secret_jwt_key_forlift_portal_2026');
    const { payload } = await jwtVerify(token, secret);
    return payload.role === 'ADMIN';
  } catch (error) {
    return false;
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    const body = await request.json();
    const { username, password, name, role, isActive } = body;

    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      return NextResponse.json({ error: 'Người dùng không tồn tại' }, { status: 404 });
    }

    // Không cho phép vô hiệu hóa hoặc hạ quyền Admin duy nhất
    if (existingUser.role === 'ADMIN' && ((role && role !== 'ADMIN') || isActive === false)) {
      const adminCount = await prisma.user.count({ where: { role: 'ADMIN', isActive: true } });
      if (adminCount <= 1) {
        return NextResponse.json({ error: 'Không thể hạ quyền hoặc vô hiệu hóa Admin duy nhất' }, { status: 400 });
      }
    }

    const data: any = {};
    if (name !== undefined) data.name = name;
    if (role !== undefined) data.role = role;
    if (isActive !== undefined) data.isActive = isActive;

    if (username && username.trim() !== '' && username !== existingUser.username) {
      const duplicate = await prisma.user.findUnique({ where: { username: username.trim() } });
      if (duplicate && duplicate.id !== id) {
        return NextResponse.json({ error: 'Tên đăng nhập đã được sử dụng bởi người khác' }, { status: 400 });
      }
      data.username = username.trim();
    }

    if (password && password.trim() !== '') {
      data.passwordHash = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        isActive: true,
      }
    });

    return NextResponse.json(updatedUser);
  } catch (error: any) {
    console.error('Update user error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    // Prevent deleting the last admin
    const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
    const userToDelete = await prisma.user.findUnique({ where: { id } });

    if (userToDelete?.role === 'ADMIN' && adminCount <= 1) {
      return NextResponse.json({ error: 'Không thể xóa Admin duy nhất' }, { status: 400 });
    }

    await prisma.user.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
