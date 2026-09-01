import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const mediaId = resolvedParams.id;

    const media = await prisma.media.findUnique({ where: { id: mediaId } });
    if (!media) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Xóa file trên Cloudinary
    if (media.publicId) {
      await cloudinary.uploader.destroy(media.publicId);
    }

    await prisma.media.delete({ where: { id: mediaId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
