import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStaffUser } from '@/lib/auth';
import { isMarkerType } from '@/lib/condition-markers';

type Params = { params: Promise<{ id: string; markerId: string }> };

export async function PUT(request: Request, { params }: Params) {
  try {
    const { id, markerId } = await params;
    const { role } = await getStaffUser(request);
    if (role === 'GUEST' || role === 'VIEWER') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const data: Record<string, unknown> = {};
    if (body.x !== undefined) data.x = Math.max(0, Math.min(100, Number(body.x) || 0));
    if (body.y !== undefined) data.y = Math.max(0, Math.min(100, Number(body.y) || 0));
    if (isMarkerType(body.type)) data.type = body.type;
    if (body.title !== undefined) data.title = String(body.title).trim();
    if (body.note !== undefined) data.note = body.note || null;
    if (body.imageUrl !== undefined) data.imageUrl = body.imageUrl || null;
    if (body.isPublic !== undefined) data.isPublic = Boolean(body.isPublic);

    const result = await prisma.conditionMarker.updateMany({ where: { id: markerId, forkliftId: id }, data });
    if (result.count === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const marker = await prisma.conditionMarker.findUnique({ where: { id: markerId } });
    return NextResponse.json(marker);
  } catch (error) {
    console.error('Update condition marker error:', error);
    return NextResponse.json({ error: 'Failed to update marker' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const { id, markerId } = await params;
  const { role } = await getStaffUser(request);
  if (role === 'GUEST' || role === 'VIEWER') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const result = await prisma.conditionMarker.deleteMany({ where: { id: markerId, forkliftId: id } });
  if (result.count === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
