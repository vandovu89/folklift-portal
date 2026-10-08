import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { forkliftId, script, rawVideoUrl } = await request.json();

    if (!forkliftId || !script || !rawVideoUrl) {
      return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });
    }

    // Bước 1: Gọi API Text-To-Speech (Ví dụ: ElevenLabs)
    // Ở giai đoạn này (Phase 2 - Prototype), chúng ta sẽ giả lập quá trình lồng ghép âm thanh 
    // và sử dụng tính năng overlay của Cloudinary để tạo watermark chứng minh video đã được xử lý.

    let processedVideoUrl = rawVideoUrl;
    
    if (rawVideoUrl.includes('cloudinary.com')) {
      const parts = rawVideoUrl.split('/upload/');
      if (parts.length === 2) {
         // Chèn watermark "AI STUDIO" để phân biệt với video gốc, thực tế sẽ là: l_video:audio_file
         processedVideoUrl = `${parts[0]}/upload/l_text:Arial_40_bold:AI%20STUDIO,g_south_east,y_30,x_30,co_white/${parts[1]}`;
      }
    }

    // Giả lập thời gian render video (FFmpeg / Cloudinary API)
    await new Promise(r => setTimeout(r, 4000));

    // Lưu vào Database
    await prisma.forklift.update({
      where: { id: forkliftId },
      data: { aiVideoUrl: processedVideoUrl }
    });

    return NextResponse.json({ success: true, videoUrl: processedVideoUrl });

  } catch (error: any) {
    console.error('AI Video Render Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Unknown error' }, { status: 500 });
  }
}
