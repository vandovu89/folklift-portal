import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

function cleanScriptForTts(text: string): string {
  return text
    .replace(/\[.*?\]/g, '') // Bỏ các chỉ dẫn kịch bản [Cảnh quay...]
    .replace(/\(.*?\)/g, '') // Bỏ các ghi chú trong ngoặc đơn (cười)...
    .replace(/[*_#`~>]/g, '') // Bỏ ký tự markdown
    .replace(/\s+/g, ' ')
    .trim();
}

export async function POST(request: Request) {
  try {
    const { forkliftId, script, rawVideoUrl, voiceId, audioMode } = await request.json();

    if (!forkliftId || !script || !rawVideoUrl) {
      return NextResponse.json({ success: false, error: 'Thiếu thông tin bắt buộc (forkliftId, script, rawVideoUrl)' }, { status: 400 });
    }

    const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
    if (!elevenLabsApiKey) {
      return NextResponse.json({
        success: false,
        error: 'ELEVENLABS_API_KEY chưa được cấu hình trong biến môi trường.'
      }, { status: 500 });
    }

    // 1. Chuẩn hóa nội dung lời thoại
    const cleanedScript = cleanScriptForTts(script);
    if (!cleanedScript) {
      return NextResponse.json({ success: false, error: 'Kịch bản không có nội dung chữ hợp lệ để đọc.' }, { status: 400 });
    }

    // 2. Gọi ElevenLabs Text-to-Speech API
    // Mặc định: Giọng "Xe Nâng MCK Japan" (7o71dj6r5wK2rRwMRJhN) - Nam giọng Bắc chuẩn
    const selectedVoiceId = voiceId || '7o71dj6r5wK2rRwMRJhN';

    const ttsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': elevenLabsApiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: cleanedScript,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      })
    });

    if (!ttsResponse.ok) {
      const errorText = await ttsResponse.text();
      console.error('ElevenLabs TTS failed:', ttsResponse.status, errorText);
      return NextResponse.json({
        success: false,
        error: `Lỗi tạo giọng đọc từ ElevenLabs (${ttsResponse.status}): ${errorText}`
      }, { status: 500 });
    }

    const audioArrayBuffer = await ttsResponse.arrayBuffer();
    const audioBuffer = Buffer.from(audioArrayBuffer);

    // 3. Upload file âm thanh (MP3) lên Cloudinary
    // Cloudinary xử lý file âm thanh dưới dạng resource_type: 'video'
    const audioUploadResult = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'vietnhat_audio',
          resource_type: 'video',
          format: 'mp3'
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(audioBuffer);
    });

    const audioPublicId = audioUploadResult.public_id;
    const audioLayerId = audioPublicId.replace(/\//g, ':');
    const audioUrl = audioUploadResult.secure_url;

    // 4. Lồng ghép âm thanh và watermark vào video gốc trên Cloudinary
    let processedVideoUrl = rawVideoUrl;

    if (rawVideoUrl.includes('cloudinary.com')) {
      const parts = rawVideoUrl.split('/upload/');
      if (parts.length === 2) {
        // audioMode:
        // - 'replace' (mặc định): Tắt âm thanh gốc của video (ac_none), lồng giọng đọc AI với codec AAC
        // - 'mix': Giảm âm thanh gốc của xe 30% (e_volume:-30), hòa âm cùng giọng đọc AI
        const audioTransformation = audioMode === 'mix'
          ? `e_volume:-30/l_audio:${audioLayerId}/fl_layer_apply/ac_aac`
          : `ac_none/l_audio:${audioLayerId}/fl_layer_apply/ac_aac`;

        const watermarkTransformation = `l_text:Arial_32_bold:MCK%20AI%20STUDIO,g_south_east,y_25,x_25,co_white`;

        processedVideoUrl = `${parts[0]}/upload/${audioTransformation}/${watermarkTransformation}/${parts[1]}`;
      }
    }

    // 5. Cập nhật URL video AI vào bảng Forklift
    await prisma.forklift.update({
      where: { id: forkliftId },
      data: {
        aiVideoUrl: processedVideoUrl,
        aiVideoScript: script
      }
    });

    // 6. Lưu file âm thanh giọng đọc vào thư viện Media của xe
    try {
      await prisma.media.create({
        data: {
          url: audioUrl,
          publicId: audioPublicId,
          fileName: `voiceover_${selectedVoiceId}_${Date.now()}.mp3`,
          fileType: 'AUDIO',
          category: 'AI_VOICEOVER',
          isPublic: false,
          forkliftId
        }
      });
    } catch (mediaErr) {
      console.warn('Could not save media record for audio:', mediaErr);
    }

    return NextResponse.json({
      success: true,
      videoUrl: processedVideoUrl,
      audioUrl: audioUrl
    });

  } catch (error: any) {
    console.error('AI Video Render Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Lỗi xử lý video' }, { status: 500 });
  }
}

