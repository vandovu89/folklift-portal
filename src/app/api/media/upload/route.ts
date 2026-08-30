import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

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
    const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '')}`;
    const filePath = path.join(process.cwd(), 'public', 'uploads', fileName);

    fs.writeFileSync(filePath, buffer);

    const fileType = file.type.startsWith('image/') ? 'IMAGE' : 'DOCUMENT';

    const media = await prisma.media.create({
      data: {
        url: `/uploads/${fileName}`,
        fileName: file.name,
        fileType,
        category,
        isPublic,
        forkliftId
      }
    });

    return NextResponse.json({ success: true, media });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
