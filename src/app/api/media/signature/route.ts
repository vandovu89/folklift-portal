import { NextResponse } from 'next/server';
import { getStaffUser } from '@/lib/auth';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export async function POST(request: Request) {
  const { role } = await getStaffUser(request);
  if (role === 'GUEST' || role === 'VIEWER') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json().catch(() => ({}));
    const folder = body.folder || 'vietnhat_forklifts';
    const timestamp = Math.round(new Date().getTime() / 1000);

    const signature = cloudinary.utils.api_sign_request(
      { timestamp, folder },
      process.env.CLOUDINARY_API_SECRET!
    );

    return NextResponse.json({
      success: true,
      signature,
      timestamp,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      folder
    });
  } catch (error: any) {
    console.error('Signature generation error:', error);
    return NextResponse.json({ error: 'Failed to generate signature' }, { status: 500 });
  }
}
