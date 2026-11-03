import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStaffUser } from '@/lib/auth';
import { canEditStudio } from '@/lib/video-studio-server';
import { VIDEO_TEMPLATES, isVideoTemplate, sanitizeFormat, sanitizeSettings } from '@/lib/video-studio';

// Danh sách dự án AI Video Studio (mới nhất trước)
export async function GET(request: Request) {
  const { role } = await getStaffUser(request);
  if (role === 'GUEST') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const projects = await prisma.videoProject.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 100,
    select: { id: true, title: true, type: true, format: true, status: true, outputUrl: true, sources: true, createdAt: true, updatedAt: true }
  });
  return NextResponse.json(projects);
}

// Tạo dự án mới từ một mẫu video
export async function POST(request: Request) {
  const { role, id: userId } = await getStaffUser(request);
  if (!canEditStudio(role)) return NextResponse.json({ error: 'Bạn không có quyền tạo video AI' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const type: unknown = body.type;
  if (!isVideoTemplate(type) || !VIDEO_TEMPLATES[type].enabled) {
    return NextResponse.json({ error: 'Mẫu video không hợp lệ hoặc chưa hỗ trợ' }, { status: 400 });
  }
  const template = VIDEO_TEMPLATES[type];

  const requestedIds: string[] = Array.isArray(body.forkliftIds)
    ? [...new Set(body.forkliftIds.filter((id: unknown): id is string => typeof id === 'string'))] as string[]
    : [];
  const forklifts = requestedIds.length > 0
    ? await prisma.forklift.findMany({ where: { id: { in: requestedIds } }, select: { id: true, maker: true, model: true } })
    : [];
  if (forklifts.length < template.forklifts.min || forklifts.length > template.forklifts.max) {
    return NextResponse.json({
      error: template.forklifts.min === template.forklifts.max
        ? `Mẫu "${template.label}" cần chọn đúng ${template.forklifts.min} xe`
        : `Mẫu "${template.label}" cần chọn từ ${template.forklifts.min} đến ${template.forklifts.max} xe`
    }, { status: 400 });
  }

  // Giữ thứ tự xe như người dùng chọn
  const ordered = requestedIds.map(id => forklifts.find(f => f.id === id)).filter(Boolean) as typeof forklifts;
  const title = typeof body.title === 'string' && body.title.trim()
    ? body.title.trim().slice(0, 120)
    : `${template.label}${ordered[0] ? ` - ${ordered[0].maker} ${ordered[0].model}` : ''}`;

  const project = await prisma.videoProject.create({
    data: {
      title,
      type,
      format: sanitizeFormat(body.format),
      sources: { forkliftIds: ordered.map(f => f.id) },
      settings: { ...sanitizeSettings(body.settings) },
      storyboard: [],
      createdById: userId
    }
  });
  return NextResponse.json(project, { status: 201 });
}
