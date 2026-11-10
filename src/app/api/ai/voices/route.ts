import { NextResponse } from 'next/server';
import { getStaffUser } from '@/lib/auth';
import { DEFAULT_VOICE_ID, DEFAULT_VBEE_VOICE_ID, type VoiceOption } from '@/lib/ai-video';
import { vbeeCredentials, vbeeHeaders } from '@/lib/vbee';
import type { TtsProvider } from '@/lib/vietnamese-tts';

interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category?: string;
  labels?: Record<string, string>;
  preview_url?: string | null;
}

interface VbeeVoice {
  code: string;
  name: string;
  gender?: string;
  language_code?: string;
  demo?: string | null;
}

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache: Partial<Record<TtsProvider, { at: number; voices: VoiceOption[] }>> = {};

async function fetchElevenLabsVoices(apiKey: string): Promise<VoiceOption[]> {
  const voices: VoiceOption[] = [];
  let pageToken: string | null = null;
  // v2 trả theo trang, gom tối đa 5 trang x 100 giọng
  for (let page = 0; page < 5; page++) {
    const url = new URL('https://api.elevenlabs.io/v2/voices');
    url.searchParams.set('page_size', '100');
    if (pageToken) url.searchParams.set('next_page_token', pageToken);
    const res = await fetch(url, { headers: { 'xi-api-key': apiKey }, cache: 'no-store' });
    if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`);
    const data: { voices: ElevenLabsVoice[]; has_more?: boolean; next_page_token?: string | null } = await res.json();
    for (const v of data.voices) {
      voices.push({
        id: v.voice_id,
        name: v.name,
        language: v.labels?.language || null,
        gender: v.labels?.gender || null,
        accent: v.labels?.accent || null,
        category: v.category || 'premade',
        previewUrl: v.preview_url || null
      });
    }
    if (!data.has_more || !data.next_page_token) break;
    pageToken = data.next_page_token;
  }

  // Thứ tự: giọng mặc định MCK -> giọng tiếng Việt -> giọng tự thêm khác -> giọng có sẵn của ElevenLabs
  const rank = (v: VoiceOption) =>
    v.id === DEFAULT_VOICE_ID ? 0 : v.language === 'vi' ? 1 : v.category !== 'premade' ? 2 : 3;
  return voices.sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, 'vi'));
}

// Vùng miền suy ra từ tiền tố tên giọng Vbee ("HN - Ngọc Huyền", "SG - Trung Kiên", "Huế - ...")
function vbeeAccent(name: string): string | null {
  const prefix = name.split(' - ')[0]?.trim().toLowerCase();
  if (prefix === 'hn') return 'northern';
  if (prefix === 'sg') return 'southern';
  if (prefix === 'huế' || prefix === 'hue') return 'central';
  return null;
}

async function fetchVbeeVoices(): Promise<VoiceOption[]> {
  const creds = vbeeCredentials();
  if (!creds) throw new Error('VBEE_API_TOKEN / VBEE_APP_ID chưa được cấu hình');
  const voices: VoiceOption[] = [];
  // Giọng của Vbee + giọng riêng của tài khoản (nếu có), tối đa 5 trang x 100 giọng mỗi loại
  for (const ownership of ['PERSONAL', 'VBEE'] as const) {
    let cursor: string | null = null;
    for (let page = 0; page < 5; page++) {
      const url = new URL('https://vbee.vn/api/public/v1/voices');
      // Tài liệu Vbee ghi cả 2 kiểu tên tham số (voice_ownership / voiceOwnership): gửi cả hai
      url.searchParams.set('voice_ownership', ownership);
      url.searchParams.set('voiceOwnership', ownership);
      url.searchParams.set('language_code', 'vi-VN');
      url.searchParams.set('languageCode', 'vi-VN');
      url.searchParams.set('limit', '100');
      if (cursor) url.searchParams.set('cursor', cursor);
      const res = await fetch(url, { headers: vbeeHeaders(creds), cache: 'no-store' });
      if (!res.ok) throw new Error(`Vbee ${res.status}: ${(await res.text()).slice(0, 300)}`);
      const data: { status?: number; result?: { voices?: VbeeVoice[]; pagination?: { has_next_page?: boolean; next_cursor?: string | null } } } = await res.json();
      for (const v of data.result?.voices || []) {
        if (voices.some(x => x.id === v.code)) continue;
        voices.push({
          id: v.code,
          name: v.name,
          language: v.language_code?.startsWith('vi') ? 'vi' : v.language_code || null,
          gender: v.gender || null,
          accent: vbeeAccent(v.name),
          category: ownership === 'PERSONAL' ? 'cloned' : 'vbee',
          previewUrl: v.demo || null
        });
      }
      const next = data.result?.pagination;
      if (!next?.has_next_page || !next.next_cursor) break;
      cursor = next.next_cursor;
    }
  }
  // Thứ tự: giọng mặc định -> giọng riêng của tài khoản -> giọng miền Bắc -> còn lại
  const rank = (v: VoiceOption) =>
    v.id === DEFAULT_VBEE_VOICE_ID ? 0 : v.category === 'cloned' ? 1 : v.accent === 'northern' ? 2 : 3;
  return voices.sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, 'vi'));
}

// Danh sách giọng của nhà cung cấp (?provider=elevenlabs | vbee), giọng tiếng Việt / giọng mặc định xếp trước
export async function GET(request: Request) {
  const { role } = await getStaffUser(request);
  if (role === 'GUEST') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const provider: TtsProvider = params.get('provider') === 'vbee' ? 'vbee' : 'elevenlabs';
  const defaultVoiceId = provider === 'vbee' ? DEFAULT_VBEE_VOICE_ID : DEFAULT_VOICE_ID;
  const providerName = provider === 'vbee' ? 'Vbee' : 'ElevenLabs';

  const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
  if (provider === 'elevenlabs' && !elevenLabsKey) return NextResponse.json({ error: 'ELEVENLABS_API_KEY chưa được cấu hình' }, { status: 500 });
  if (provider === 'vbee' && !vbeeCredentials()) return NextResponse.json({ error: 'VBEE_API_TOKEN / VBEE_APP_ID chưa được cấu hình' }, { status: 500 });

  const cached = cache[provider];
  if (cached && params.get('refresh') !== '1' && Date.now() - cached.at < CACHE_TTL_MS) {
    return NextResponse.json({ provider, voices: cached.voices, defaultVoiceId });
  }

  try {
    const voices = provider === 'vbee' ? await fetchVbeeVoices() : await fetchElevenLabsVoices(elevenLabsKey!);
    cache[provider] = { at: Date.now(), voices };
    return NextResponse.json({ provider, voices, defaultVoiceId });
  } catch (error) {
    console.error(`Fetch ${providerName} voices error:`, error);
    return NextResponse.json({ error: `Không lấy được danh sách giọng từ ${providerName}` }, { status: 502 });
  }
}
