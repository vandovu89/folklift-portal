// Worker render video AI cho Xe Nâng MCK: ghép clip + chuẩn hóa khung hình + lồng giọng đọc bằng FFmpeg,
// hoặc dựng video theo timeline nhiều cảnh của AI Video Studio (ảnh / clip / thẻ chữ / logo, chuyển cảnh, phụ đề),
// tải MP4 thành phẩm lên Cloudflare R2 rồi báo kết quả về web (callback).
// Chạy trên Google Cloud Run (xem docs/r2-cloud-run.md).
import http from 'node:http';
import { spawn } from 'node:child_process';
import { createWriteStream, createReadStream } from 'node:fs';
import { mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const env = name => (process.env[name] || '').trim().replace(/^["']|["']$/g, '');
const PORT = Number(env('PORT')) || 8080;
const WORKER_SECRET = env('WORKER_SECRET');
const MAX_DOWNLOAD_BYTES = 3 * 1024 * 1024 * 1024; // 3GB / clip
const MAX_CLIPS = 10;
const MAX_SCENES = 30;
const MAX_SCENE_SECONDS = 60;
// Font có đủ dấu tiếng Việt (gói fonts-noto-core trong Dockerfile)
const FONT_FILE = env('FONT_FILE') || '/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf';
// Logo thương hiệu đóng gói kèm image: huy hiệu tròn (góc màn hình) và logo đầy đủ (cảnh mở đầu / kết thúc)
const ASSETS_DIR = path.join(path.dirname(new URL(import.meta.url).pathname), 'assets');
const LOGO_MARK = path.join(ASSETS_DIR, 'logo-mark.png');
const LOGO_FULL = path.join(ASSETS_DIR, 'logo-full.png');

// Chỉ tải clip / audio từ các host tin cậy (tránh bị lợi dụng tải URL bất kỳ)
const R2_PUBLIC_URL = env('R2_PUBLIC_URL').replace(/\/+$/, '');
const ALLOWED_HOSTS = new Set(
  ['res.cloudinary.com', R2_PUBLIC_URL && new URL(R2_PUBLIC_URL).host, ...env('ALLOWED_MEDIA_HOSTS').split(',')]
    .map(h => (h || '').trim()).filter(Boolean)
);
// Chỉ gọi callback về web của hệ thống
const CALLBACK_PREFIXES = env('CALLBACK_URL_PREFIXES').split(',').map(s => s.trim()).filter(Boolean);

const s3 = new S3Client({
  region: 'auto',
  endpoint: env('R2_ENDPOINT') || `https://${env('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
  forcePathStyle: Boolean(env('R2_ENDPOINT')),
  // SDK mới tự thêm checksum CRC32 (tính theo thân rỗng) vào URL presigned => R2 / trình duyệt PUT bị lỗi BadDigest
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
  credentials: { accessKeyId: env('R2_ACCESS_KEY_ID'), secretAccessKey: env('R2_SECRET_ACCESS_KEY') }
});

// Khung hình đầu ra
const FORMATS = {
  vertical_blur: { w: 1080, h: 1920, mode: 'blur' },
  vertical_fill: { w: 1080, h: 1920, mode: 'fill' },
  horizontal: { w: 1920, h: 1080, mode: 'blur' },
};

const log = (jobId, ...args) => console.log(`[${new Date().toISOString()}] [${jobId}]`, ...args);

function run(cmd, args, { collect = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    child.stdout.on('data', d => { if (collect) out += d; });
    child.stderr.on('data', d => { err = (err + d).slice(-8000); });
    child.on('error', reject);
    child.on('close', code => (code === 0 ? resolve(out) : reject(new Error(`${cmd} exited ${code}: ${err.slice(-2000)}`))));
  });
}

async function download(url, dest) {
  const u = new URL(url);
  if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new Error(`URL không hợp lệ: ${url}`);
  if (!ALLOWED_HOSTS.has(u.host)) throw new Error(`Host không được phép: ${u.host}`);
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`Tải ${url} thất bại: HTTP ${res.status}`);
  const len = Number(res.headers.get('content-length') || 0);
  if (len > MAX_DOWNLOAD_BYTES) throw new Error(`File quá lớn: ${url}`);
  let total = 0;
  const limited = Readable.fromWeb(res.body).on('data', chunk => {
    total += chunk.length;
    if (total > MAX_DOWNLOAD_BYTES) limited.destroy(new Error(`File quá lớn: ${url}`));
  });
  await pipeline(limited, createWriteStream(dest));
}

async function probe(file) {
  const json = JSON.parse(await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type', '-of', 'json', file], { collect: true }));
  return {
    duration: Number(json.format?.duration) || 0,
    hasAudio: (json.streams || []).some(s => s.codec_type === 'audio'),
  };
}

// Dựng lệnh FFmpeg: chuẩn hóa từng clip về cùng khung hình / 30fps, nối lại, rồi lồng giọng đọc
function buildFfmpegArgs({ clipFiles, clipInfo, audioFile, format, audioMode, output, totalDuration }) {
  const { w, h, mode } = FORMATS[format] || FORMATS.vertical_blur;
  const n = clipFiles.length;
  const filters = [];
  const concatInputs = [];

  clipFiles.forEach((_, i) => {
    if (mode === 'fill') {
      filters.push(`[${i}:v]fps=30,scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},setsar=1,format=yuv420p[v${i}]`);
    } else {
      // Nền mờ phóng to + khung hình gốc giữ trọn ở giữa (video ngang vẫn đăng Reels/TikTok đẹp)
      filters.push(
        `[${i}:v]fps=30,split=2[bg${i}][fg${i}]`,
        `[bg${i}]scale=${Math.round(w / 4)}:${Math.round(h / 4)}:force_original_aspect_ratio=increase,crop=${Math.round(w / 4)}:${Math.round(h / 4)},boxblur=10:2,scale=${w}:${h}[bgb${i}]`,
        `[fg${i}]scale=${w}:${h}:force_original_aspect_ratio=decrease[fgs${i}]`,
        `[bgb${i}][fgs${i}]overlay=(W-w)/2:(H-h)/2,setsar=1,format=yuv420p[v${i}]`
      );
    }
    if (audioMode === 'mix') {
      // Giữ tiếng máy xe ở 30%; clip không có tiếng thì chèn khoảng lặng cùng độ dài
      filters.push(clipInfo[i].hasAudio
        ? `[${i}:a]aresample=48000,aformat=channel_layouts=stereo,volume=0.3,atrim=0:${clipInfo[i].duration},asetpts=PTS-STARTPTS[a${i}]`
        : `aevalsrc=0:c=stereo:s=48000:d=${clipInfo[i].duration}[a${i}]`);
      concatInputs.push(`[v${i}][a${i}]`);
    } else {
      concatInputs.push(`[v${i}]`);
    }
  });

  if (audioMode === 'mix') {
    filters.push(`${concatInputs.join('')}concat=n=${n}:v=1:a=1[vcat][acat]`);
    filters.push(`[${n}:a]aresample=48000,aformat=channel_layouts=stereo,apad[voice]`);
    filters.push(`[acat][voice]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[aout]`);
  } else {
    filters.push(`${concatInputs.join('')}concat=n=${n}:v=1:a=0[vcat]`);
    filters.push(`[${n}:a]aresample=48000,aformat=channel_layouts=stereo,apad[aout]`);
  }

  return [
    '-hide_banner', '-y',
    ...clipFiles.flatMap(f => ['-i', f]),
    '-i', audioFile,
    '-filter_complex', filters.join(';'),
    '-map', '[vcat]', '-map', '[aout]',
    '-t', totalDuration.toFixed(3),
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-r', '30',
    '-c:a', 'aac', '-b:a', '160k',
    '-movflags', '+faststart',
    output,
  ];
}

// ===== Timeline của AI Video Studio: mỗi cảnh = ảnh (zoom/lia) | clip | thẻ chữ, kèm giọng đọc & chữ trên màn hình =====

// Xuống dòng theo số ký tự (drawtext không tự xuống dòng)
function wrapText(text, maxChars, maxLines = 4) {
  const lines = [];
  let line = '';
  for (const word of String(text).split(/\s+/).filter(Boolean)) {
    if (line && (line + ' ' + word).length > maxChars) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, maxLines);
}

// Mỗi dòng chữ là một drawtext đọc từ file riêng (tránh phải escape ký tự đặc biệt), căn giữa theo chiều ngang
async function drawLines(dir, prefix, lines, { size, color, centerY, box }) {
  const lineHeight = Math.round(size * 1.3);
  const top = Math.round(centerY - (lines.length * lineHeight) / 2);
  const parts = [];
  for (let i = 0; i < lines.length; i++) {
    const file = path.join(dir, `${prefix}-${i}.txt`);
    await writeFile(file, lines[i], 'utf8');
    parts.push(
      `drawtext=fontfile=${FONT_FILE}:textfile=${file}:expansion=none:fontsize=${size}:fontcolor=${color}` +
      `:x=(w-text_w)/2:y=${top + i * lineHeight}` +
      (box ? `:box=1:boxcolor=black@0.5:boxborderw=${Math.round(size * 0.3)}` : '')
    );
  }
  return parts;
}

const hex = c => `0x${String(c).replace('#', '')}`;

function zoompanExpr(motion, frames) {
  const p = `(on/${frames})`;
  const center = { x: 'iw/2-(iw/zoom/2)', y: 'ih/2-(ih/zoom/2)' };
  switch (motion) {
    case 'zoom_out': return { z: `1.15-0.15*${p}`, ...center };
    case 'pan_left': return { z: '1.15', x: `(iw-iw/zoom)*(1-${p})`, y: center.y };
    case 'pan_right': return { z: '1.15', x: `(iw-iw/zoom)*${p}`, y: center.y };
    case 'none': return { z: '1', ...center };
    default: return { z: `1+0.15*${p}`, ...center };
  }
}

// Khung hình gốc -> khung đầu ra: "fill" cắt đầy khung, còn lại giữ trọn khung hình trên nền mờ
function fitFilters(input, label, w, h, mode) {
  if (mode === 'fill') {
    return [`${input}scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},setsar=1[${label}]`];
  }
  const sw = Math.round(w / 4), sh = Math.round(h / 4);
  return [
    `${input}split=2[${label}bg][${label}fg]`,
    `[${label}bg]scale=${sw}:${sh}:force_original_aspect_ratio=increase,crop=${sw}:${sh},boxblur=10:2,scale=${w}:${h}[${label}bgb]`,
    `[${label}fg]scale=${w}:${h}:force_original_aspect_ratio=decrease[${label}fgs]`,
    `[${label}bgb][${label}fgs]overlay=(W-w)/2:(H-h)/2,setsar=1[${label}]`,
  ];
}

// Kiểu chuyển cảnh của xfade; "mix" xoay vòng các kiểu dưới đây
const TRANSITION_SECONDS = 0.4;
const MIXED_TRANSITIONS = ['fade', 'slideleft', 'smoothleft', 'circleopen', 'wipeleft', 'slideup'];
function transitionAt(transition, i) {
  if (transition === 'slide') return 'slideleft';
  if (transition === 'mix') return MIXED_TRANSITIONS[i % MIXED_TRANSITIONS.length];
  return 'fade';
}

// Giọng đọc được lùi 0.15s cho tự nhiên; phụ đề lùi theo
const VOICE_DELAY = 0.15;

// ===== Phụ đề ASS (libass) =====
const assTime = t => {
  const cs = Math.max(0, Math.round(t * 100));
  const h = Math.floor(cs / 360000), m = Math.floor(cs / 6000) % 60, s = Math.floor(cs / 100) % 60, c = cs % 100;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(c).padStart(2, '0')}`;
};
const assText = t => String(t).replace(/[\\{}]/g, '').replace(/\s+/g, ' ');

function buildAss({ w, h, style, scenes, starts, durations }) {
  const vertical = h > w;
  const size = Math.round(vertical ? w * 0.078 : h * 0.072);
  // Đặt phụ đề ở khoảng 1/5 dưới khung dọc để không bị nút / chú thích của Reels, TikTok che
  const marginV = Math.round(vertical ? h * 0.2 : h * 0.08);
  const marginLR = Math.round(w * 0.08);
  // Màu ASS dạng &HAABBGGRR. Karaoke: chữ trắng, từ đang đọc chuyển sang vàng
  const primary = style === 'karaoke' ? '&H0000E5FF' : '&H00FFFFFF';
  const lines = [
    '[Script Info]', 'ScriptType: v4.00+', `PlayResX: ${w}`, `PlayResY: ${h}`, 'WrapStyle: 0', 'ScaledBorderAndShadow: yes', '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    `Style: Default,Noto Sans,${size},${primary},&H00FFFFFF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,${Math.max(3, Math.round(size * 0.08))},${Math.round(size * 0.04)},2,${marginLR},${marginLR},${marginV},1`,
    '', '[Events]', 'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
  ];
  let count = 0;
  scenes.forEach((scene, i) => {
    const sceneEnd = starts[i] + durations[i];
    for (const chunk of scene.captions || []) {
      const start = starts[i] + VOICE_DELAY + Number(chunk.s);
      const end = Math.min(sceneEnd, starts[i] + VOICE_DELAY + Number(chunk.e) + 0.1);
      if (!(end > start)) continue;
      const words = chunk.words.map((word, k) => {
        const next = chunk.words[k + 1];
        const cs = Math.max(1, Math.round(((next ? Number(next.s) : Number(chunk.e)) - Number(word.s)) * 100));
        return style === 'karaoke' ? `{\\k${cs}}${assText(word.w)}` : assText(word.w);
      });
      lines.push(`Dialogue: 0,${assTime(start)},${assTime(end)},Default,,0,0,0,,${words.join(' ')}`);
      count++;
    }
  });
  return count > 0 ? lines.join('\n') + '\n' : null;
}

async function buildTimelineArgs({ dir, scenes, sceneFiles, sceneInfo, format, clipAudio, subtitles, transition, logo, output }) {
  const { w, h, mode } = FORMATS[format] || FORMATS.vertical_blur;
  const vertical = h > w;
  const n = scenes.length;
  const T = transition && transition !== 'none' && n > 1 ? TRANSITION_SECONDS : 0;
  const inputs = [];
  const filters = [];
  let inputCount = 0;
  const addInput = (...args) => { inputs.push(...args); return inputCount++; };

  const durations = sceneInfo.map(s => s.duration);
  const starts = durations.map((_, i) => durations.slice(0, i).reduce((a, b) => a + b, 0));
  const total = durations.reduce((a, b) => a + b, 0);

  for (let i = 0; i < n; i++) {
    const scene = scenes[i];
    const { visual } = scene;
    // Video của cảnh dài thêm T giây để chồng lên cảnh sau khi chuyển cảnh; âm thanh giữ đúng D
    const D = durations[i].toFixed(3);
    const videoSeconds = durations[i] + (i < n - 1 ? T : 0);
    const DV = videoSeconds.toFixed(3);
    const frames = Math.round(videoSeconds * 30);
    let videoChain;
    let clipIndex = -1;

    if (visual.kind === 'image') {
      const idx = addInput('-i', sceneFiles[i].visual);
      // Dựng khung hình ở độ phân giải gấp đôi rồi zoompan về kích thước đầu ra để chuyển động mượt
      filters.push(...fitFilters(`[${idx}:v]`, `base${i}`, w * 2, h * 2, mode));
      const z = zoompanExpr(visual.motion, frames);
      videoChain = `[base${i}]zoompan=z='${z.z}':x='${z.x}':y='${z.y}':d=${frames}:s=${w}x${h}:fps=30,trim=duration=${DV},setpts=PTS-STARTPTS`;
    } else if (visual.kind === 'clip') {
      clipIndex = addInput('-ss', String(Number(visual.trimStart) || 0), '-i', sceneFiles[i].visual);
      filters.push(`[${clipIndex}:v]fps=30[raw${i}]`, ...fitFilters(`[raw${i}]`, `base${i}`, w, h, mode));
      // Clip ngắn hơn cảnh thì giữ khung hình cuối
      videoChain = `[base${i}]tpad=stop_mode=clone:stop_duration=${DV},trim=duration=${DV},setpts=PTS-STARTPTS`;
    } else if (visual.kind === 'brand') {
      // Logo đầy đủ trên nền trắng, hiện dần; cảnh kết có thêm dòng hotline
      const bg = addInput('-f', 'lavfi', '-i', `color=c=white:s=${w}x${h}:r=30:d=${DV}`);
      const logoIdx = addInput('-loop', '1', '-t', DV, '-i', LOGO_FULL);
      const logoSize = Math.round((vertical ? w : h) * 0.62);
      const subSize = Math.round((vertical ? w : h) * 0.05);
      const subLines = wrapText(visual.subtitle || '', vertical ? 30 : 48);
      const logoTop = Math.round((h - logoSize - (subLines.length ? subSize * 2 : 0)) / 2);
      filters.push(`[${logoIdx}:v]scale=${logoSize}:${logoSize},format=yuva420p,fade=t=in:st=0:d=0.5:alpha=1,setsar=1[blogo${i}]`);
      const parts = await drawLines(dir, `brand${i}`, subLines, { size: subSize, color: '0x1e3a8a', centerY: logoTop + logoSize + subSize * 0.6 });
      videoChain = `[${bg}:v][blogo${i}]overlay=(W-w)/2:${logoTop}:shortest=1,setsar=1${parts.length ? ',' + parts.join(',') : ''},trim=duration=${DV},setpts=PTS-STARTPTS`;
    } else {
      const idx = addInput('-f', 'lavfi', '-i', `color=c=${hex(visual.bg)}:s=${w}x${h}:r=30:d=${DV}`);
      // Tiêu đề dài (VD trích dẫn lời khách) dùng chữ nhỏ hơn để không bị cắt
      const longTitle = String(visual.title).length > 40;
      const titleSize = Math.round(w * (vertical ? (longTitle ? 0.066 : 0.085) : (longTitle ? 0.047 : 0.06)));
      const subSize = Math.round(w * (vertical ? 0.047 : 0.033));
      const titleLines = wrapText(visual.title, vertical ? (longTitle ? 21 : 16) : (longTitle ? 36 : 28), 6);
      const subLines = wrapText(visual.subtitle || '', vertical ? 28 : 48);
      const titleBlock = titleLines.length * Math.round(titleSize * 1.3);
      const subBlock = subLines.length * Math.round(subSize * 1.3);
      const gap = subLines.length ? subSize : 0;
      // Căn giữa cả khối tiêu đề + phụ đề theo chiều dọc
      const top = (h - titleBlock - gap - subBlock) / 2;
      const parts = [
        ...await drawLines(dir, `card${i}-t`, titleLines, { size: titleSize, color: hex(visual.fg), centerY: top + titleBlock / 2 }),
        ...await drawLines(dir, `card${i}-s`, subLines, { size: subSize, color: hex(visual.accent), centerY: top + titleBlock + gap + subBlock / 2 }),
      ];
      videoChain = `[${idx}:v]setsar=1${parts.length ? ',' + parts.join(',') : ''},trim=duration=${DV},setpts=PTS-STARTPTS`;
    }

    // Chữ to trên màn hình (phần trên khung hình), chỉ cho cảnh ảnh / clip
    if (scene.onScreenText && (visual.kind === 'image' || visual.kind === 'clip')) {
      const size = Math.round(w * (vertical ? 0.075 : 0.05));
      const parts = await drawLines(dir, `ost${i}`, wrapText(scene.onScreenText, vertical ? 16 : 30), { size, color: 'white', centerY: h * 0.16, box: true });
      videoChain += ',' + parts.join(',');
    }
    // Hình do AI tạo: ghi rõ "Hình minh họa AI" ở góc trên bên trái (đối diện logo)
    if ((visual.kind === 'image' || visual.kind === 'clip') && visual.ai === true) {
      const size = Math.round(w * (vertical ? 0.03 : 0.018));
      const file = path.join(dir, `ai-label${i}.txt`);
      await writeFile(file, 'Hình minh họa AI', 'utf8');
      videoChain += `,drawtext=fontfile=${FONT_FILE}:textfile=${file}:expansion=none:fontsize=${size}:fontcolor=white@0.9` +
        `:x=${Math.round(w * 0.035)}:y=${Math.round(w * 0.035)}:box=1:boxcolor=black@0.4:boxborderw=${Math.round(size * 0.4)}`;
    }
    // Cùng fps / định dạng / timebase để xfade ghép được
    filters.push(`${videoChain},fps=30,format=yuv420p,settb=AVTB[v${i}]`);

    // Âm thanh của cảnh: giọng đọc + tiếng gốc của clip nếu chọn hòa âm
    const audioParts = [];
    if (sceneFiles[i].audio) {
      const idx = addInput('-i', sceneFiles[i].audio);
      const delay = Math.round(VOICE_DELAY * 1000);
      filters.push(`[${idx}:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,adelay=${delay}|${delay},apad,atrim=0:${D},asetpts=PTS-STARTPTS[na${i}]`);
      audioParts.push(`[na${i}]`);
    }
    if (clipIndex >= 0 && clipAudio === 'mix' && sceneInfo[i].clipHasAudio) {
      filters.push(`[${clipIndex}:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,volume=0.3,apad,atrim=0:${D},asetpts=PTS-STARTPTS[ca${i}]`);
      audioParts.push(`[ca${i}]`);
    }
    if (audioParts.length === 0) {
      filters.push(`aevalsrc=0:c=stereo:s=48000:d=${D}[a${i}]`);
    } else if (audioParts.length === 1) {
      filters.push(`${audioParts[0]}anull[a${i}]`);
    } else {
      filters.push(`${audioParts.join('')}amix=inputs=2:duration=first:dropout_transition=0:normalize=0[a${i}]`);
    }
  }

  // Video: nối bằng xfade (cảnh sau bắt đầu đúng lúc giọng đọc của nó bắt đầu) hoặc concat khi cắt thẳng
  let video = 'v0';
  if (T > 0) {
    for (let i = 1; i < n; i++) {
      const out = i === n - 1 ? 'vjoin' : `x${i}`;
      filters.push(`[${video}][v${i}]xfade=transition=${transitionAt(transition, i - 1)}:duration=${T}:offset=${starts[i].toFixed(3)}[${out}]`);
      video = out;
    }
  } else if (n > 1) {
    filters.push(`${scenes.map((_, i) => `[v${i}]`).join('')}concat=n=${n}:v=1:a=0[vjoin]`);
    video = 'vjoin';
  }
  filters.push(`${scenes.map((_, i) => `[a${i}]`).join('')}concat=n=${n}:v=0:a=1[aout]`);

  // Logo góc trên bên phải, ẩn trong cảnh thương hiệu (đã có logo lớn)
  if (logo) {
    const logoIdx = addInput('-i', LOGO_MARK);
    const size = Math.round(w * (vertical ? 0.13 : 0.075));
    const margin = Math.round(w * 0.035);
    const hidden = scenes
      .map((s, i) => (s.visual.kind === 'brand' ? `between(t,${starts[i].toFixed(3)},${(starts[i] + durations[i]).toFixed(3)})` : null))
      .filter(Boolean);
    filters.push(`[${logoIdx}:v]scale=${size}:${size},format=rgba,colorchannelmixer=aa=0.92[wm]`);
    filters.push(`[${video}][wm]overlay=W-w-${margin}:${margin}${hidden.length ? `:enable='not(${hidden.join('+')})'` : ''}[vlogo]`);
    video = 'vlogo';
  }

  // Phụ đề chạy theo giọng đọc
  if (subtitles && subtitles !== 'off') {
    const ass = buildAss({ w, h, style: subtitles, scenes, starts, durations });
    if (ass) {
      const assFile = path.join(dir, 'captions.ass');
      await writeFile(assFile, ass, 'utf8');
      filters.push(`[${video}]subtitles=filename=${assFile}:fontsdir=${path.dirname(FONT_FILE)}[vsub]`);
      video = 'vsub';
    }
  }

  return [
    '-hide_banner', '-y',
    ...inputs,
    '-filter_complex', filters.join(';'),
    '-map', `[${video}]`, '-map', '[aout]',
    '-t', total.toFixed(3),
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-r', '30',
    '-c:a', 'aac', '-b:a', '160k',
    '-movflags', '+faststart',
    output,
  ];
}

async function processTimelineJob(job) {
  const { jobId, scenes, format, clipAudio, subtitles, transition, logo, outputKey, callbackUrl } = job;
  const dir = await mkdtemp(path.join(tmpdir(), `render-${jobId}-`));
  const started = Date.now();
  try {
    await callback(callbackUrl, { jobId, status: 'processing' });

    log(jobId, `Tải tư liệu cho ${scenes.length} cảnh`);
    // Một ảnh/clip dùng cho nhiều cảnh chỉ tải một lần
    const downloads = new Map();
    const fetchOnce = url => {
      if (!downloads.has(url)) {
        const dest = path.join(dir, `asset${downloads.size}`);
        downloads.set(url, download(url, dest).then(() => dest));
      }
      return downloads.get(url);
    };
    const sceneFiles = await Promise.all(scenes.map(async s => ({
      visual: s.visual.kind === 'image' || s.visual.kind === 'clip' ? await fetchOnce(s.visual.url) : null,
      audio: s.audioUrl ? await fetchOnce(s.audioUrl) : null,
    })));

    // Thời lượng cảnh = max(tối thiểu, giọng đọc + 0.6s)
    const sceneInfo = await Promise.all(scenes.map(async (s, i) => {
      const voice = sceneFiles[i].audio ? (await probe(sceneFiles[i].audio)).duration : 0;
      const clip = s.visual.kind === 'clip' ? await probe(sceneFiles[i].visual) : null;
      const duration = Math.min(MAX_SCENE_SECONDS, Math.max(Number(s.minDuration) || 2, voice > 0 ? voice + 0.6 : 0, 1));
      return { duration, clipHasAudio: Boolean(clip?.hasAudio) };
    }));
    const totalDuration = sceneInfo.reduce((sum, c) => sum + c.duration, 0);

    const output = path.join(dir, 'output.mp4');
    log(jobId, `FFmpeg timeline: ${scenes.length} cảnh, ${totalDuration.toFixed(1)}s, ${format}, chuyển cảnh ${transition}, phụ đề ${subtitles}, logo ${logo}`);
    await run('ffmpeg', await buildTimelineArgs({ dir, scenes, sceneFiles, sceneInfo, format, clipAudio, subtitles, transition, logo, output }));

    const { size } = await stat(output);
    log(jobId, `Tải lên R2: ${outputKey} (${(size / 1e6).toFixed(1)}MB)`);
    await s3.send(new PutObjectCommand({
      Bucket: env('R2_BUCKET'), Key: outputKey, Body: createReadStream(output), ContentLength: size,
      ContentType: 'video/mp4', CacheControl: 'public, max-age=31536000, immutable',
    }));

    log(jobId, `Xong sau ${((Date.now() - started) / 1000).toFixed(0)}s`);
    await callback(callbackUrl, { jobId, status: 'done', outputKey, durationSec: Math.round(totalDuration * 10) / 10, sizeBytes: size });
  } catch (err) {
    log(jobId, 'Lỗi:', err.message);
    await callback(callbackUrl, { jobId, status: 'failed', error: String(err.message || err).slice(0, 2000) });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function callback(url, payload) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${WORKER_SECRET}` },
        body: JSON.stringify(payload),
      });
      if (res.ok) return;
      console.warn(`Callback HTTP ${res.status} (lần ${attempt})`);
    } catch (err) {
      console.warn(`Callback lỗi (lần ${attempt}):`, err.message);
    }
    await new Promise(r => setTimeout(r, attempt * 3000));
  }
}

async function processJob(job) {
  const { jobId, clips, audioUrl, format, audioMode, outputKey, callbackUrl } = job;
  const dir = await mkdtemp(path.join(tmpdir(), `render-${jobId}-`));
  const started = Date.now();
  try {
    await callback(callbackUrl, { jobId, status: 'processing' });

    log(jobId, `Tải ${clips.length} clip + giọng đọc`);
    const clipFiles = clips.map((_, i) => path.join(dir, `clip${i}`));
    const audioFile = path.join(dir, 'voice.mp3');
    await Promise.all([...clips.map((url, i) => download(url, clipFiles[i])), download(audioUrl, audioFile)]);

    const clipInfo = await Promise.all(clipFiles.map(probe));
    const totalDuration = clipInfo.reduce((sum, c) => sum + c.duration, 0);
    if (!(totalDuration > 0)) throw new Error('Không đọc được thời lượng clip');

    const output = path.join(dir, 'output.mp4');
    log(jobId, `FFmpeg: ${clips.length} clip, ${totalDuration.toFixed(1)}s, ${format}, ${audioMode}`);
    await run('ffmpeg', buildFfmpegArgs({ clipFiles, clipInfo, audioFile, format, audioMode, output, totalDuration }));

    const { size } = await stat(output);
    log(jobId, `Tải lên R2: ${outputKey} (${(size / 1e6).toFixed(1)}MB)`);
    await s3.send(new PutObjectCommand({
      Bucket: env('R2_BUCKET'), Key: outputKey, Body: createReadStream(output), ContentLength: size,
      ContentType: 'video/mp4', CacheControl: 'public, max-age=31536000, immutable',
    }));

    log(jobId, `Xong sau ${((Date.now() - started) / 1000).toFixed(0)}s`);
    await callback(callbackUrl, { jobId, status: 'done', outputKey, durationSec: Math.round(totalDuration * 10) / 10, sizeBytes: size });
  } catch (err) {
    log(jobId, 'Lỗi:', err.message);
    await callback(callbackUrl, { jobId, status: 'failed', error: String(err.message || err).slice(0, 2000) });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

// Hàng đợi trong tiến trình: mỗi instance render lần lượt từng video (FFmpeg dùng hết CPU)
const queue = [];
let busy = false;
async function drain() {
  if (busy) return;
  busy = true;
  while (queue.length) {
    const job = queue.shift();
    await (job.kind === 'timeline' ? processTimelineJob(job) : processJob(job));
  }
  busy = false;
}

const COLOR_RE = /^#[0-9a-f]{6}$/i;
const MOTIONS = ['zoom_in', 'zoom_out', 'pan_left', 'pan_right', 'none'];
const isText = (v, max) => v === undefined || (typeof v === 'string' && v.length <= max);

const isTime = v => Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= 600;
function validCaptions(captions) {
  if (captions === undefined) return true;
  return Array.isArray(captions) && captions.length <= 80 && captions.every(c =>
    c && isTime(c.s) && isTime(c.e) && Array.isArray(c.words) && c.words.length <= 12 &&
    c.words.every(w => w && isText(w.w, 40) && isTime(w.s) && isTime(w.e)));
}

function validateTimeline(body) {
  // Thêm 2 cảnh thương hiệu (mở đầu / kết thúc) ngoài giới hạn số cảnh của storyboard
  if (!Array.isArray(body.scenes) || body.scenes.length === 0 || body.scenes.length > MAX_SCENES + 2) return 'scenes không hợp lệ';
  if (!['mute', 'mix'].includes(body.clipAudio)) return 'clipAudio không hợp lệ';
  // Job tạo từ web bản cũ không gửi các trường dưới đây
  if (body.subtitles !== undefined && !['karaoke', 'plain', 'off'].includes(body.subtitles)) return 'subtitles không hợp lệ';
  if (body.transition !== undefined && !['fade', 'slide', 'mix', 'none'].includes(body.transition)) return 'transition không hợp lệ';
  if (body.logo !== undefined && typeof body.logo !== 'boolean') return 'logo không hợp lệ';
  for (const [i, s] of body.scenes.entries()) {
    const v = s?.visual;
    if (!v || !Number.isFinite(Number(s.minDuration))) return `Cảnh ${i + 1} không hợp lệ`;
    if (s.audioUrl !== undefined && typeof s.audioUrl !== 'string') return `Cảnh ${i + 1}: audioUrl không hợp lệ`;
    if (!isText(s.onScreenText, 200)) return `Cảnh ${i + 1}: onScreenText không hợp lệ`;
    if (!validCaptions(s.captions)) return `Cảnh ${i + 1}: captions không hợp lệ`;
    if (v.kind === 'brand' && isText(v.subtitle, 300)) continue;
    if (v.kind === 'image' && typeof v.url === 'string' && MOTIONS.includes(v.motion)) continue;
    if (v.kind === 'clip' && typeof v.url === 'string' && Number.isFinite(Number(v.trimStart))) continue;
    if (v.kind === 'card' && isText(v.title, 200) && isText(v.subtitle, 300) && [v.bg, v.fg, v.accent].every(c => COLOR_RE.test(c))) continue;
    return `Cảnh ${i + 1}: visual không hợp lệ`;
  }
  return null;
}

function validate(body) {
  if (!body || typeof body.jobId !== 'string' || !/^[\w-]{1,64}$/.test(body.jobId)) return 'jobId không hợp lệ';
  if (!FORMATS[body.format]) return 'format không hợp lệ';
  if (body.kind === 'timeline') {
    const problem = validateTimeline(body);
    if (problem) return problem;
  } else {
    if (!Array.isArray(body.clips) || body.clips.length === 0 || body.clips.length > MAX_CLIPS) return 'clips không hợp lệ';
    if (typeof body.audioUrl !== 'string') return 'audioUrl không hợp lệ';
    if (!['replace', 'mix'].includes(body.audioMode)) return 'audioMode không hợp lệ';
  }
  if (typeof body.outputKey !== 'string' || !/^renders\/[\w\-/.]+\.mp4$/.test(body.outputKey)) return 'outputKey không hợp lệ';
  if (typeof body.callbackUrl !== 'string' || (CALLBACK_PREFIXES.length && !CALLBACK_PREFIXES.some(p => body.callbackUrl.startsWith(p)))) return 'callbackUrl không được phép';
  return null;
}

const server = http.createServer(async (req, res) => {
  const send = (code, data) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)); };

  if (req.method === 'GET' && req.url === '/healthz') return send(200, { ok: true, queue: queue.length, busy });
  if (req.method !== 'POST' || req.url !== '/render') return send(404, { error: 'Not found' });
  if (!WORKER_SECRET || req.headers.authorization !== `Bearer ${WORKER_SECRET}`) return send(401, { error: 'Unauthorized' });

  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 100_000) return send(413, { error: 'Payload quá lớn' });
  }
  let body;
  try { body = JSON.parse(raw); } catch { return send(400, { error: 'JSON không hợp lệ' }); }
  const problem = validate(body);
  if (problem) return send(400, { error: problem });

  queue.push(body);
  drain().catch(err => console.error('Queue error:', err));
  send(202, { accepted: true, position: queue.length });
});

server.listen(PORT, () => console.log(`Render worker listening on :${PORT} (allowed hosts: ${[...ALLOWED_HOSTS].join(', ')})`));
