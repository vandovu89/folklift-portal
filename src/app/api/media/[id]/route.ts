import { NextResponse } from 'next/server';
import { getStaffUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { v2 as cloudinary } from 'cloudinary';
import { isR2Url, r2KeyFromUrl, deleteObject } from '@/lib/storage';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { role } = await getStaffUser(request);
  if (role === 'GUEST' || role === 'VIEWER') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const resolvedParams = await params;
    const mediaId = resolvedParams.id;

    const media = await prisma.media.findUnique({ where: { id: mediaId } });
    if (!media) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    // Tránh xoá nhầm ảnh/tài liệu xe: Sales chỉ được xoá clip gốc do mình tải lên trong AI Video Studio
    if (role !== 'ADMIN' && media.category !== 'RAW_VIDEO') {
      return NextResponse.json({ error: 'Chỉ Admin được xoá ảnh / tài liệu của xe' }, { status: 403 });
    }

    if (isR2Url(media.url)) {
      // File trên Cloudflare R2: publicId lưu object key
      const key = media.publicId || r2KeyFromUrl(media.url);
      if (key) await deleteObject(key);
    } else if (media.publicId) {
      // Video AI cũ trên Cloudinary được dựng trực tiếp từ clip gốc (derived asset):
      // xoá clip gốc thì video thành phẩm sẽ hỏng => chặn lại
      const forklift = await prisma.forklift.findUnique({ where: { id: media.forkliftId }, select: { aiVideoUrl: true, videoUrl: true } });
      const layerId = media.publicId.replace(/\//g, ':');
      const inUse = [forklift?.aiVideoUrl, forklift?.videoUrl].some(url =>
        url && url.includes('res.cloudinary.com') && (url.includes(`/${media.publicId}.`) || url.includes(`l_video:${layerId}`))
      );
      if (inUse) {
        return NextResponse.json({ error: 'Clip này đang được dùng để dựng video AI hiện tại của xe (Cloudinary). Hãy tạo lại video AI trước khi xoá clip.' }, { status: 409 });
      }
      // Video / âm thanh phải xóa với resource_type 'video', nếu không file vẫn nằm lại trên Cloudinary
      const resourceType = ['VIDEO', 'AUDIO'].includes(media.fileType) ? 'video' : 'image';
      await cloudinary.uploader.destroy(media.publicId, { resource_type: resourceType });
    }

    await prisma.media.delete({ where: { id: mediaId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { role } = await getStaffUser(request);
  if (role !== 'ADMIN') return NextResponse.json({ error: 'Chỉ Admin được chỉnh ảnh của xe' }, { status: 403 });
  try {
    const resolvedParams = await params;
    const mediaId = resolvedParams.id;
    const body = await request.json();

    if (body.action === 'set_thumbnail') {
      const media = await prisma.media.findUnique({ where: { id: mediaId } });
      if (!media) return NextResponse.json({ error: 'Not found' }, { status: 404 });

      // Unset all others for this forklift
      await prisma.media.updateMany({
        where: { forkliftId: media.forkliftId },
        data: { isThumbnail: false }
      });

      // Set this one
      await prisma.media.update({
        where: { id: mediaId },
        data: { isThumbnail: true }
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Update error:', error);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}
