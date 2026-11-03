// Gọi ElevenLabs Text-to-Speech. Chỉ dùng phía server.
import { spellOutNumbers, type TtsModelId } from '@/lib/vietnamese-tts';

const TTS_BITRATE = 128_000; // output_format=mp3_44100_128 (CBR) => tính được thời lượng từ dung lượng file

export function cleanScriptForTts(text: string): string {
  return spellOutNumbers(text)
    .replace(/\[.*?\]/g, '') // Bỏ các chỉ dẫn kịch bản [Cảnh quay...]
    .replace(/\(.*?\)/g, '') // Bỏ các ghi chú trong ngoặc đơn (cười)...
    .replace(/[*_#`~>]/g, '') // Bỏ ký tự markdown
    .replace(/\s+/g, ' ')
    .trim();
}

export async function synthesizeSpeech(apiKey: string, voiceId: string, text: string, speed: number, model: TtsModelId) {
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
