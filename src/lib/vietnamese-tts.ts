// Tiện ích chuẩn hóa văn bản tiếng Việt cho Text-To-Speech (ElevenLabs)

// Model ElevenLabs hỗ trợ tiếng Việt và tốc độ đọc đo thực tế ở speed 0.95 với giọng "Xe Nâng MCK Japan"
// (đo ngày 2026-10-20 bằng đoạn 69 từ: v4 ~4.1 từ/giây, turbo v2.5 ~2.8 từ/giây)
export const TTS_MODELS = {
  eleven_v4: { label: 'Eleven v4 (Khuyên dùng - phát âm tiếng Việt chuẩn nhất)', wordsPerSec: 4.1 },
  eleven_v4_turbo: { label: 'Eleven v4 Turbo (Nhanh hơn)', wordsPerSec: 4.1 },
  eleven_turbo_v2_5: { label: 'Eleven Turbo v2.5 (Bản cũ - dễ bị ngọng tiếng Việt)', wordsPerSec: 2.8 },
} as const;
export type TtsModelId = keyof typeof TTS_MODELS;
export const DEFAULT_TTS_MODEL: TtsModelId = 'eleven_v4';
export const BASE_SPEED = 0.95;

export function isTtsModel(value: unknown): value is TtsModelId {
  return typeof value === 'string' && value in TTS_MODELS;
}

export function wordsPerSecond(speed: number, model: TtsModelId = DEFAULT_TTS_MODEL): number {
  const s = speed > 0 ? speed : BASE_SPEED;
  return TTS_MODELS[model].wordsPerSec * (s / BASE_SPEED);
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// Số từ thực sự được đọc (con số như "350.000.000" được tính theo số âm tiết khi đọc thành chữ)
export function countSpokenWords(text: string): number {
  return countWords(spellOutNumbers(text));
}

const DIGITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
const SCALES = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];

// Đọc một nhóm 3 chữ số. `full` = nhóm không đứng đầu (phải đọc cả "không trăm", "linh")
function readGroup(n: number, full: boolean): string {
  const h = Math.floor(n / 100);
  const t = Math.floor((n % 100) / 10);
  const u = n % 10;
  const words: string[] = [];

  if (full || h > 0) words.push(`${DIGITS[h]} trăm`);

  if (t === 0) {
    if (u > 0 && (full || h > 0)) words.push('linh');
  } else if (t === 1) {
    words.push('mười');
  } else {
    words.push(`${DIGITS[t]} mươi`);
  }

  if (u > 0) {
    if (u === 1 && t > 1) words.push('mốt');
    else if (u === 5 && t > 0) words.push('lăm');
    else words.push(DIGITS[u]);
  }

  return words.join(' ');
}

export function numberToVietnamese(value: number): string {
  if (!Number.isFinite(value)) return '';
  const n = Math.floor(Math.abs(value));
  if (n === 0) return 'không';

  const groups: number[] = [];
  let rest = n;
  while (rest > 0) {
    groups.push(rest % 1000);
    rest = Math.floor(rest / 1000);
  }
  if (groups.length > SCALES.length) return String(n);

  const parts: string[] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    const g = groups[i];
    if (g === 0) continue;
    const isLeading = i === groups.length - 1;
    parts.push(readGroup(g, !isLeading));
    if (SCALES[i]) parts.push(SCALES[i]);
  }
  return (value < 0 ? 'âm ' : '') + parts.join(' ');
}

// Đổi mọi con số trong văn bản sang chữ tiếng Việt.
// "350.000.000" / "1,500" (nhóm nghìn 3 chữ số) => số nguyên; "2.5" / "2,5" => "hai phẩy năm"; "%" => "phần trăm".
// "3000mm" => "ba nghìn mm". Mã model có chữ đứng trước số (FD25T-17, 7FBR15) được giữ nguyên.
export function spellOutNumbers(text: string): string {
  return text
    .replace(/(\d)\s*%/g, '$1 phần trăm')
    .replace(/[\p{L}\d]+(?:[-/.,][\p{L}\d]+)*/gu, (token) => {
      const m = token.match(/^(\d+(?:[.,]\d+)*)(\p{L}*)$/u);
      if (!m) return token;
      const [, num, unit] = m;
      return unit ? `${readNumberToken(num)} ${unit}` : readNumberToken(num);
    });
}

function readNumberToken(num: string): string {
  const groups = num.split(/[.,]/);
  const isThousands = groups.length > 1 && groups.slice(1).every(g => g.length === 3);
  if (groups.length === 1 || isThousands) {
    return numberToVietnamese(Number(groups.join('')));
  }
  if (groups.length === 2) {
    const decimals = groups[1].split('').map(d => DIGITS[Number(d)]).join(' ');
    return `${numberToVietnamese(Number(groups[0]))} phẩy ${decimals}`;
  }
  return groups.map(g => numberToVietnamese(Number(g))).join(' ');
}
