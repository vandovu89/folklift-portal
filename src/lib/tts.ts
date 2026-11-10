// Tạo giọng đọc theo model đã chọn: ElevenLabs hoặc Vbee. Chỉ dùng phía server.
import { synthesizeSpeech, synthesizeSpeechWithTimestamps, type SpeechAlignment } from '@/lib/elevenlabs';
import { synthesizeVbee, vbeeCredentials } from '@/lib/vbee';
import { ttsProviderOf, type TtsModelId } from '@/lib/vietnamese-tts';

// Thông báo lỗi nếu nhà cung cấp của model chưa được cấu hình khóa API, null nếu đã sẵn sàng
export function ttsConfigError(model: TtsModelId): string | null {
  if (ttsProviderOf(model) === 'vbee') {
    return vbeeCredentials() ? null : 'VBEE_API_TOKEN / VBEE_APP_ID chưa được cấu hình';
  }
  return process.env.ELEVENLABS_API_KEY ? null : 'ELEVENLABS_API_KEY chưa được cấu hình';
}

function requireConfig(model: TtsModelId) {
  const error = ttsConfigError(model);
  if (error) throw new Error(error);
}

export async function synthesize(model: TtsModelId, voiceId: string, text: string, speed: number) {
  requireConfig(model);
  if (ttsProviderOf(model) === 'vbee') return synthesizeVbee(vbeeCredentials()!, voiceId, text, speed);
  return synthesizeSpeech(process.env.ELEVENLABS_API_KEY!, voiceId, text, speed, model);
}

// Giọng đọc + thời điểm từng ký tự (làm phụ đề). ElevenLabs trả thời điểm thật;
// Vbee không có nên ước tính theo độ dài chữ và khoảng nghỉ ở dấu câu.
export async function synthesizeWithTimestamps(model: TtsModelId, voiceId: string, text: string, speed: number) {
  requireConfig(model);
  if (ttsProviderOf(model) === 'vbee') {
    const tts = await synthesizeVbee(vbeeCredentials()!, voiceId, text, speed);
    return { ...tts, alignment: estimateAlignment(text, tts.duration) };
  }
  return synthesizeSpeechWithTimestamps(process.env.ELEVENLABS_API_KEY!, voiceId, text, speed, model);
}

// Khoảng nghỉ mặc định của Vbee (giây) sau dấu câu
const PAUSES: Record<string, number> = { ',': 0.25, ';': 0.3, ':': 0.3, '.': 0.45, '!': 0.45, '?': 0.45, '…': 0.45 };
const EDGE_SILENCE = 0.15; // Khoảng lặng ước tính ở đầu file

export function estimateAlignment(text: string, duration: number): SpeechAlignment {
  const characters = Array.from(text);
  const lastSpoken = characters.length - 1;
  let pauseTotal = characters.reduce((sum, ch, i) => sum + (i < lastSpoken ? PAUSES[ch] || 0 : 0), 0);
  let lead = EDGE_SILENCE;
  // Nếu file ngắn hơn dự kiến thì thu nhỏ các khoảng nghỉ để chữ vẫn có thời gian đọc
  const minSpeech = duration * 0.6;
  if (duration - pauseTotal - lead < minSpeech) {
    const scale = Math.max(0, (duration - minSpeech) / (pauseTotal + lead || 1));
    pauseTotal *= scale;
    lead *= scale;
  }
  const pauseScale = pauseTotal > 0 ? pauseTotal / characters.reduce((s, ch, i) => s + (i < lastSpoken ? PAUSES[ch] || 0 : 0), 0) : 0;
  const perChar = characters.length > 0 ? Math.max(0, duration - pauseTotal - lead) / characters.length : 0;

  const starts: number[] = [];
  const ends: number[] = [];
  let t = lead;
  characters.forEach((ch, i) => {
    starts.push(t);
    t += perChar;
    ends.push(t);
    if (i < lastSpoken) t += (PAUSES[ch] || 0) * pauseScale;
  });
  return { characters, character_start_times_seconds: starts, character_end_times_seconds: ends };
}
