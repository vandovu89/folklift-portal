import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStaffUser } from '@/lib/auth';
import { logActivity } from '@/lib/activity-logger';
import { isMarkerType } from '@/lib/condition-markers';

const clampPercent = (v: unknown) => Math.max(0, Math.min(100, Number(v) || 0));

// Khách xem chỉ thấy điểm công khai, nhân viên thấy tất cả
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { role } = await getStaffUser(request);
  const markers = await prisma.conditionMarker.findMany({
    where: { forkliftId: id, ...(role === 'GUEST' ? { isPublic: true } : {}) },
    orderBy: { createdAt: 'asc' }
  });
  return NextResponse.json(markers);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { role, id: userId } = await getStaffUser(request);
    if (role !== 'ADMIN') return NextResponse.json({ error: 'Chỉ Admin được chỉnh bản đồ tình trạng xe' }, { status: 403 });

    const body = await request.json();
    if (!body.title?.trim()) return NextResponse.json({ error: 'Thiếu tiêu đề' }, { status: 400 });

    const marker = await prisma.conditionMarker.create({
      data: {
        forkliftId: id,
        x: clampPercent(body.x),
        y: clampPercent(body.y),
        type: isMarkerType(body.type) ? body.type : 'REPAIRED',
        title: body.title.trim(),
        note: body.note || null,
        imageUrl: body.imageUrl || null,
        isPublic: body.isPublic !== false
      }
    });

    await logActivity({
      action: 'UPDATED',
      entityType: 'FORKLIFT',
      entityId: id,
      userId,
      details: `Thêm điểm tình trạng: ${marker.title}`
    });

    return NextResponse.json(marker, { status: 201 });
  } catch (error) {
    console.error('Create condition marker error:', error);
    return NextResponse.json({ error: 'Failed to create marker' }, { status: 500 });
  }
}
