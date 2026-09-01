import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const forkliftId = formData.get('forkliftId') as string;
    const category = formData.get('category') as string;
    const isPublic = formData.get('isPublic') === 'true';

    if (!file || !forkliftId) {
      return NextResponse.json({ error: 'Missing file or forkliftId' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileType = file.type.startsWith('image/') ? 'IMAGE' : 'DOCUMENT';

    // Upload to Cloudinary using stream
    const uploadResult = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'kyowa_forklifts' },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(buffer);
    });

    const media = await prisma.media.create({
      data: {
        url: uploadResult.secure_url,
        fileName: file.name,
        fileType,
        category,
        isPublic,
        publicId: uploadResult.public_id,
        forkliftId
      }
    });

    return NextResponse.json({ success: true, media });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
