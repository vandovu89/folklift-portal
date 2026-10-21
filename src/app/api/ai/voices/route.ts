import { NextResponse } from 'next/server';
import { getStaffUser } from '@/lib/auth';
import { DEFAULT_VOICE_ID, type VoiceOption } from '@/lib/ai-video';

interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category?: string;
  labels?: Record<string, string>;
  preview_url?: string | null;
}

const CACHE_TTL_MS = 5 * 60 * 1000;
let cache: { at: number; voices: VoiceOption[] } | null = null;

// Danh sách giọng trong tài khoản ElevenLabs (gồm giọng tự thêm / clone), giọng tiếng Việt xếp trước
export async function GET(request: Request) {
  const { role } = await getStaffUser(request);
  if (role === 'GUEST') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'ELEVENLABS_API_KEY chưa được cấu hình' }, { status: 500 });

  const refresh = new URL(request.url).searchParams.get('refresh') === '1';
  if (cache && !refresh && Date.now() - cache.at < CACHE_TTL_MS) {
    return NextResponse.json({ voices: cache.voices, defaultVoiceId: DEFAULT_VOICE_ID });
  }

  try {
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
    voices.sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, 'vi'));

    cache = { at: Date.now(), voices };
    return NextResponse.json({ voices, defaultVoiceId: DEFAULT_VOICE_ID });
  } catch (error) {
    console.error('Fetch ElevenLabs voices error:', error);
    return NextResponse.json({ error: 'Không lấy được danh sách giọng từ ElevenLabs' }, { status: 502 });
  }
}
