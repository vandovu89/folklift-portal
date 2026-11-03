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

function ttsBody(text: string, speed: number, model: TtsModelId) {
  return JSON.stringify({
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
  });
}

async function callTts(apiKey: string, voiceId: string, path: string, text: string, speed: number, model: TtsModelId) {
  const ttsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}${path}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json'
    },
    body: ttsBody(text, speed, model)
  });

  if (!ttsResponse.ok) {
    const errorText = await ttsResponse.text();
    console.error('ElevenLabs TTS failed:', ttsResponse.status, errorText);
    throw new Error(`Lỗi tạo giọng đọc từ ElevenLabs (${ttsResponse.status}): ${errorText}`);
  }
  return ttsResponse;
}

export async function synthesizeSpeech(apiKey: string, voiceId: string, text: string, speed: number, model: TtsModelId) {
  const ttsResponse = await callTts(apiKey, voiceId, '', text, speed, model);
  const buffer = Buffer.from(await ttsResponse.arrayBuffer());
  return { buffer, duration: (buffer.length * 8) / TTS_BITRATE };
}

export interface SpeechAlignment {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
}

// Như synthesizeSpeech, kèm thời điểm đọc từng ký tự (dùng làm phụ đề chạy theo giọng đọc)
export async function synthesizeSpeechWithTimestamps(apiKey: string, voiceId: string, text: string, speed: number, model: TtsModelId) {
  const ttsResponse = await callTts(apiKey, voiceId, '/with-timestamps', text, speed, model);
  const data = await ttsResponse.json() as { audio_base64: string; alignment?: SpeechAlignment | null };
  const buffer = Buffer.from(data.audio_base64, 'base64');
  return { buffer, duration: (buffer.length * 8) / TTS_BITRATE, alignment: data.alignment || null };
}
