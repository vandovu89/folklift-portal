// Worker render video AI cho Xe Nâng MCK: ghép clip + chuẩn hóa khung hình + lồng giọng đọc bằng FFmpeg,
// tải MP4 thành phẩm lên Cloudflare R2 rồi báo kết quả về web (callback).
// Chạy trên Google Cloud Run (xem docs/r2-cloud-run.md).
import http from 'node:http';
import { spawn } from 'node:child_process';
import { createWriteStream, createReadStream } from 'node:fs';
import { mkdtemp, rm, stat } from 'node:fs/promises';
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
  while (queue.length) await processJob(queue.shift());
  busy = false;
}

function validate(body) {
  if (!body || typeof body.jobId !== 'string' || !/^[\w-]{1,64}$/.test(body.jobId)) return 'jobId không hợp lệ';
  if (!Array.isArray(body.clips) || body.clips.length === 0 || body.clips.length > MAX_CLIPS) return 'clips không hợp lệ';
  if (typeof body.audioUrl !== 'string') return 'audioUrl không hợp lệ';
  if (!FORMATS[body.format]) return 'format không hợp lệ';
  if (!['replace', 'mix'].includes(body.audioMode)) return 'audioMode không hợp lệ';
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
