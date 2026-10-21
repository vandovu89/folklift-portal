import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { v2 as cloudinary } from 'cloudinary';
import { spellOutNumbers, wordsPerSecond, DEFAULT_TTS_MODEL, isTtsModel, type TtsModelId } from '@/lib/vietnamese-tts';
import { buildVideoTransformation, cloudinaryCloudBase, cloudinaryPublicIdFromUrl, isVideoFormat, DEFAULT_VIDEO_FORMAT, MAX_CLIPS, DEFAULT_VOICE_ID } from '@/lib/ai-video';
import { getStaffUser } from '@/lib/auth';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

function cleanScriptForTts(text: string): string {
  return spellOutNumbers(text)
    .replace(/\[.*?\]/g, '') // Bỏ các chỉ dẫn kịch bản [Cảnh quay...]
    .replace(/\(.*?\)/g, '') // Bỏ các ghi chú trong ngoặc đơn (cười)...
    .replace(/[*_#`~>]/g, '') // Bỏ ký tự markdown
    .replace(/\s+/g, ' ')
    .trim();
}

const MIN_SPEED = 0.85; // Chậm hơn nữa giọng đọc bị lê thê, không tự động giảm dưới mức này
const MAX_SPEED = 1.2;  // Giới hạn tối đa của ElevenLabs
const TTS_BITRATE = 128_000; // output_format=mp3_44100_128 (CBR) => tính được thời lượng từ dung lượng file

async function synthesizeSpeech(apiKey: string, voiceId: string, text: string, speed: number, model: TtsModelId) {
  const ttsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text,
      model_id: model, // Mặc định eleven_v4: phát âm tiếng Việt chuẩn nhất
      language_code: 'vi', // Ép đọc tiếng Việt có dấu, không bị ngọng
      voice_settings: {
        stability: 0.55,
        similarity_boost: 0.85,
        style: 0.0,
        use_speaker_boost: true,
        speed
      }
    })
  });

  if (!ttsResponse.ok) {
    const errorText = await ttsResponse.text();
    console.error('ElevenLabs TTS failed:', ttsResponse.status, errorText);
    throw new Error(`Lỗi tạo giọng đọc từ ElevenLabs (${ttsResponse.status}): ${errorText}`);
  }

  const buffer = Buffer.from(await ttsResponse.arrayBuffer());
  return { buffer, duration: (buffer.length * 8) / TTS_BITRATE };
}

export async function POST(request: Request) {
  try {
    const { role } = await getStaffUser(request);
    if (role === 'GUEST' || role === 'VIEWER') {
      return NextResponse.json({ success: false, error: 'Bạn không có quyền tạo video AI' }, { status: 401 });
    }

    const { forkliftId, script, rawVideoUrl, clips, voiceId, audioMode, speed, videoDuration, ttsModel, videoFormat } = await request.json();

    // Danh sách clip ghép theo thứ tự; tương thích ngược với bản cũ chỉ gửi 1 rawVideoUrl
    const clipUrls: string[] = Array.isArray(clips) && clips.length > 0
      ? clips.filter((u: unknown): u is string => typeof u === 'string' && u.length > 0)
      : rawVideoUrl ? [rawVideoUrl] : [];

    if (!forkliftId || !script || clipUrls.length === 0) {
      return NextResponse.json({ success: false, error: 'Thiếu thông tin bắt buộc (forkliftId, script, video gốc)' }, { status: 400 });
    }
    if (clipUrls.length > MAX_CLIPS) {
      return NextResponse.json({ success: false, error: `Chỉ ghép tối đa ${MAX_CLIPS} clip mỗi video` }, { status: 400 });
    }
    const clipPublicIds = clipUrls.map(cloudinaryPublicIdFromUrl);
    const cloudBase = cloudinaryCloudBase(clipUrls[0]);
    if (clipPublicIds.some(id => !id) || !cloudBase) {
      return NextResponse.json({ success: false, error: 'Video gốc phải được tải lên Cloudinary của hệ thống' }, { status: 400 });
    }
    const model: TtsModelId = isTtsModel(ttsModel) ? ttsModel : DEFAULT_TTS_MODEL;
    const format = isVideoFormat(videoFormat) ? videoFormat : DEFAULT_VIDEO_FORMAT;

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
    // Giọng chọn từ danh sách ElevenLabs của tài khoản, mặc định "Xe Nâng MCK Japan" - Nam giọng Bắc
    const selectedVoiceId = typeof voiceId === 'string' && /^[A-Za-z0-9]{10,40}$/.test(voiceId) ? voiceId : DEFAULT_VOICE_ID;
    const requestedSpeed = speed ? Math.max(0.7, Math.min(MAX_SPEED, parseFloat(speed))) : 0.95;
    const videoSeconds = Number(videoDuration) > 0 ? Number(videoDuration) : 0;

    let appliedSpeed = requestedSpeed;
    let tts;
    try {
      tts = await synthesizeSpeech(elevenLabsApiKey, selectedVoiceId, cleanedScript, appliedSpeed, model);

      // 2b. Đo thời lượng giọng đọc thật, nếu lệch so với video thì tạo lại 1 lần với tốc độ đã hiệu chỉnh
      if (videoSeconds > 0) {
        const maxSpeech = Math.max(1, videoSeconds - 0.5);   // Không được dài hơn video
        const minSpeech = videoSeconds * 0.85;               // Tránh khoảng lặng dài cuối video
        let adjustedSpeed = appliedSpeed;
        if (tts.duration > maxSpeech) {
          adjustedSpeed = Math.min(MAX_SPEED, appliedSpeed * (tts.duration / (videoSeconds * 0.95)));
        } else if (tts.duration < minSpeech) {
          adjustedSpeed = Math.max(Math.min(MIN_SPEED, appliedSpeed), appliedSpeed * (tts.duration / (videoSeconds * 0.9)));
        }
        adjustedSpeed = Math.round(adjustedSpeed * 100) / 100;
        if (Math.abs(adjustedSpeed - appliedSpeed) >= 0.02) {
          console.log(`[AI Video Render] Audio ${tts.duration.toFixed(1)}s vs video ${videoSeconds}s => speed ${appliedSpeed} -> ${adjustedSpeed}`);
          tts = await synthesizeSpeech(elevenLabsApiKey, selectedVoiceId, cleanedScript, adjustedSpeed, model);
          appliedSpeed = adjustedSpeed;
        }
      }
    } catch (ttsErr) {
      const message = ttsErr instanceof Error ? ttsErr.message : 'Lỗi tạo giọng đọc từ ElevenLabs';
      return NextResponse.json({ success: false, error: message }, { status: 500 });
    }

    const audioBuffer = tts.buffer;
    const audioDuration = Math.round(tts.duration * 10) / 10;

    let warning: string | undefined;
    if (videoSeconds > 0) {
      if (audioDuration > videoSeconds) {
        warning = `Giọng đọc dài ${audioDuration}s, vượt video ${videoSeconds}s dù đã tăng tốc lên ${appliedSpeed}x. Hãy rút gọn kịch bản khoảng ${Math.ceil((audioDuration - videoSeconds) * wordsPerSecond(appliedSpeed, model))} từ.`;
      } else if (audioDuration < videoSeconds * 0.75) {
        warning = `Giọng đọc chỉ dài ${audioDuration}s trên video ${videoSeconds}s, cuối video sẽ có khoảng lặng. Hãy viết thêm kịch bản.`;
      }
    }

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

    // 4. Ghép các clip, chuẩn hóa khung hình (mặc định dọc 9:16) và lồng giọng đọc trên Cloudinary
    // Luôn xuất MP4 (H.264/AAC) để video quay từ iPhone (.mov HEVC) vẫn phát được trên mọi trình duyệt
    const transformation = buildVideoTransformation({
      clipPublicIds: clipPublicIds as string[],
      format,
      audioLayerId,
      audioMode: audioMode === 'mix' ? 'mix' : 'replace'
    });
    const baseClipId = clipPublicIds[0] as string;
    const processedVideoUrl = `${cloudBase}/video/upload/${transformation}/${baseClipId}.mp4`;

    // Video ghép dài có thể mất 1-2 phút để xử lý lần đầu: yêu cầu Cloudinary dựng sẵn ở chế độ nền (eager async)
    // để khi người dùng mở video thì đã có bản hoàn chỉnh. Lỗi ở bước này không chặn kết quả trả về.
    try {
      await cloudinary.uploader.explicit(baseClipId, {
        type: 'upload',
        resource_type: 'video',
        eager: [{ raw_transformation: transformation, format: 'mp4' }],
        eager_async: true
      });
    } catch (eagerErr) {
      console.warn('[AI Video Render] Eager generation request failed:', eagerErr);
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
      audioUrl: audioUrl,
      clipCount: clipUrls.length,
      videoFormat: format,
      ttsModel: model,
      audioDuration,
      videoDuration: videoSeconds || undefined,
      appliedSpeed,
      warning
    });

  } catch (error: any) {
    console.error('AI Video Render Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Lỗi xử lý video' }, { status: 500 });
  }
}

