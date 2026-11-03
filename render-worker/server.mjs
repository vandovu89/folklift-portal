// Worker render video AI cho Xe Nâng MCK: ghép clip + chuẩn hóa khung hình + lồng giọng đọc bằng FFmpeg,
// hoặc dựng video theo timeline nhiều cảnh của AI Video Studio (ảnh / clip / thẻ chữ),
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
function wrapText(text, maxChars) {
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
  return lines.slice(0, 4);
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

async function buildTimelineArgs({ dir, scenes, sceneFiles, sceneInfo, format, clipAudio, output }) {
  const { w, h, mode } = FORMATS[format] || FORMATS.vertical_blur;
  const vertical = h > w;
  const inputs = [];
  const filters = [];
  const concatInputs = [];
  let inputCount = 0;
  const addInput = (...args) => { inputs.push(...args); return inputCount++; };

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const { visual } = scene;
    const D = sceneInfo[i].duration.toFixed(3);
    const frames = Math.round(sceneInfo[i].duration * 30);
    let videoChain;
    let clipIndex = -1;

    if (visual.kind === 'image') {
      const idx = addInput('-i', sceneFiles[i].visual);
      // Dựng khung hình ở độ phân giải gấp đôi rồi zoompan về kích thước đầu ra để chuyển động mượt
      filters.push(...fitFilters(`[${idx}:v]`, `base${i}`, w * 2, h * 2, mode));
      const z = zoompanExpr(visual.motion, frames);
      videoChain = `[base${i}]zoompan=z='${z.z}':x='${z.x}':y='${z.y}':d=${frames}:s=${w}x${h}:fps=30,trim=duration=${D},setpts=PTS-STARTPTS`;
    } else if (visual.kind === 'clip') {
      clipIndex = addInput('-ss', String(Number(visual.trimStart) || 0), '-i', sceneFiles[i].visual);
      filters.push(`[${clipIndex}:v]fps=30[raw${i}]`, ...fitFilters(`[raw${i}]`, `base${i}`, w, h, mode));
      // Clip ngắn hơn cảnh thì giữ khung hình cuối
      videoChain = `[base${i}]tpad=stop_mode=clone:stop_duration=${D},trim=duration=${D},setpts=PTS-STARTPTS`;
    } else {
      const idx = addInput('-f', 'lavfi', '-i', `color=c=${hex(visual.bg)}:s=${w}x${h}:r=30:d=${D}`);
      const titleSize = Math.round(w * (vertical ? 0.085 : 0.06));
      const subSize = Math.round(titleSize * 0.55);
      const titleLines = wrapText(visual.title, vertical ? 16 : 28);
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
      videoChain = `[${idx}:v]setsar=1${parts.length ? ',' + parts.join(',') : ''},trim=duration=${D},setpts=PTS-STARTPTS`;
    }

    // Chữ to trên màn hình (phần trên khung hình), không áp dụng cho thẻ chữ
    if (scene.onScreenText && visual.kind !== 'card') {
      const size = Math.round(w * (vertical ? 0.075 : 0.05));
      const parts = await drawLines(dir, `ost${i}`, wrapText(scene.onScreenText, vertical ? 16 : 30), { size, color: 'white', centerY: h * 0.16, box: true });
      videoChain += ',' + parts.join(',');
    }
    filters.push(`${videoChain},format=yuv420p[v${i}]`);

    // Âm thanh của cảnh: giọng đọc (trễ 0.15s cho tự nhiên) + tiếng gốc của clip nếu chọn hòa âm
    const audioParts = [];
    if (sceneFiles[i].audio) {
      const idx = addInput('-i', sceneFiles[i].audio);
      filters.push(`[${idx}:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,adelay=150|150,apad,atrim=0:${D},asetpts=PTS-STARTPTS[na${i}]`);
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
    concatInputs.push(`[v${i}][a${i}]`);
  }

  filters.push(`${concatInputs.join('')}concat=n=${scenes.length}:v=1:a=1[vout][aout]`);
  return [
    '-hide_banner', '-y',
    ...inputs,
    '-filter_complex', filters.join(';'),
    '-map', '[vout]', '-map', '[aout]',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-r', '30',
    '-c:a', 'aac', '-b:a', '160k',
    '-movflags', '+faststart',
    output,
  ];
}

async function processTimelineJob(job) {
  const { jobId, scenes, format, clipAudio, outputKey, callbackUrl } = job;
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
      visual: s.visual.kind === 'card' ? null : await fetchOnce(s.visual.url),
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
    log(jobId, `FFmpeg timeline: ${scenes.length} cảnh, ${totalDuration.toFixed(1)}s, ${format}, tiếng clip ${clipAudio}`);
    await run('ffmpeg', await buildTimelineArgs({ dir, scenes, sceneFiles, sceneInfo, format, clipAudio, output }));

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

function validateTimeline(body) {
  if (!Array.isArray(body.scenes) || body.scenes.length === 0 || body.scenes.length > MAX_SCENES) return 'scenes không hợp lệ';
  if (!['mute', 'mix'].includes(body.clipAudio)) return 'clipAudio không hợp lệ';
  for (const [i, s] of body.scenes.entries()) {
    const v = s?.visual;
    if (!v || !Number.isFinite(Number(s.minDuration))) return `Cảnh ${i + 1} không hợp lệ`;
    if (s.audioUrl !== undefined && typeof s.audioUrl !== 'string') return `Cảnh ${i + 1}: audioUrl không hợp lệ`;
    if (!isText(s.onScreenText, 200)) return `Cảnh ${i + 1}: onScreenText không hợp lệ`;
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
