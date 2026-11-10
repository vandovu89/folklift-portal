// Đo thời lượng file MP3 bằng cách đếm frame (đúng cho cả CBR lẫn VBR, không cần ffprobe). Chỉ dùng phía server.

const BITRATES_V1_L3 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
const BITRATES_V2_L3 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];
const SAMPLE_RATES_V1 = [44100, 48000, 32000];

function skipId3(buf: Buffer): number {
  if (buf.length < 10 || buf.toString('latin1', 0, 3) !== 'ID3') return 0;
  const size = (buf[6] << 21) | (buf[7] << 14) | (buf[8] << 7) | buf[9];
  const footer = buf[5] & 0x10 ? 10 : 0;
  return 10 + size + footer;
}

export function mp3Duration(buf: Buffer): number {
  let offset = skipId3(buf);
  let seconds = 0;
  while (offset + 4 <= buf.length) {
    const b1 = buf[offset + 1];
    const b2 = buf[offset + 2];
    if (buf[offset] !== 0xff || (b1 & 0xe0) !== 0xe0) { offset++; continue; }

    const version = (b1 >> 3) & 0x03; // 3 = MPEG1, 2 = MPEG2, 0 = MPEG2.5
    const layer = (b1 >> 1) & 0x03;   // 1 = Layer III
    const bitrateIndex = b2 >> 4;
    const rateIndex = (b2 >> 2) & 0x03;
    if (version === 1 || layer !== 1 || bitrateIndex === 0 || bitrateIndex === 15 || rateIndex === 3) { offset++; continue; }

    const mpeg1 = version === 3;
    const bitrate = (mpeg1 ? BITRATES_V1_L3 : BITRATES_V2_L3)[bitrateIndex] * 1000;
    const sampleRate = SAMPLE_RATES_V1[rateIndex] / (mpeg1 ? 1 : version === 2 ? 2 : 4);
    const padding = (b2 >> 1) & 0x01;
    const frameLength = Math.floor(((mpeg1 ? 144 : 72) * bitrate) / sampleRate) + padding;
    if (frameLength < 4) { offset++; continue; }

    seconds += (mpeg1 ? 1152 : 576) / sampleRate;
    offset += frameLength;
  }
  return seconds;
}
