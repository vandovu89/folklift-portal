// Lưu trữ file trên Cloudflare R2 (giao thức S3). Chỉ dùng phía server.
// Khi chưa cấu hình R2, hệ thống tự quay về Cloudinary như cũ (isR2Configured() = false).
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

// Biến môi trường:
// R2_ACCOUNT_ID       ID tài khoản Cloudflare (hoặc đặt R2_ENDPOINT trực tiếp, VD MinIO khi test local)
// R2_ACCESS_KEY_ID    Access Key của R2 API Token
// R2_SECRET_ACCESS_KEY
// R2_BUCKET           Tên bucket
// R2_PUBLIC_URL       Đường dẫn public của bucket (r2.dev hoặc tên miền riêng), VD https://media.xenangmck.jp
const env = (name: string) => process.env[name]?.trim().replace(/^["']|["']$/g, '') || '';

export function isR2Configured(): boolean {
  return Boolean((env('R2_ENDPOINT') || env('R2_ACCOUNT_ID')) && env('R2_ACCESS_KEY_ID') && env('R2_SECRET_ACCESS_KEY') && env('R2_BUCKET') && env('R2_PUBLIC_URL'));
}

let client: S3Client | null = null;
function r2(): S3Client {
  if (!client) {
    client = new S3Client({
      region: 'auto',
      endpoint: env('R2_ENDPOINT') || `https://${env('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
      forcePathStyle: Boolean(env('R2_ENDPOINT')), // MinIO cần path-style
      // SDK mới tự thêm checksum CRC32 (tính theo thân rỗng) vào URL presigned => R2 / trình duyệt PUT bị lỗi BadDigest
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
      credentials: { accessKeyId: env('R2_ACCESS_KEY_ID'), secretAccessKey: env('R2_SECRET_ACCESS_KEY') }
    });
  }
  return client;
}

const publicBase = () => env('R2_PUBLIC_URL').replace(/\/+$/, '');

export function r2PublicUrl(key: string): string {
  return `${publicBase()}/${key.split('/').map(encodeURIComponent).join('/')}`;
}

// URL có thuộc bucket R2 của hệ thống không (để phân biệt với file cũ trên Cloudinary)
export function isR2Url(url: string | null | undefined): boolean {
  return Boolean(url && isR2Configured() && url.startsWith(publicBase() + '/'));
}

export function r2KeyFromUrl(url: string): string | null {
  if (!isR2Url(url)) return null;
  return url.slice(publicBase().length + 1).split('/').map(decodeURIComponent).join('/');
}

// "Ảnh xe (1).HEIC" => "anh-xe-1.heic"
function safeFileName(name: string): string {
  const dot = name.lastIndexOf('.');
  const base = (dot > 0 ? name.slice(0, dot) : name)
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'file';
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) : '';
  return ext ? `${base}.${ext}` : base;
}

export function buildObjectKey(folder: string, fileName: string): string {
  return `${folder.replace(/^\/+|\/+$/g, '')}/${randomUUID()}-${safeFileName(fileName)}`;
}

// Đường dẫn tải lên có chữ ký (trình duyệt PUT file thẳng lên R2, không qua Vercel => không giới hạn 4.5MB / 100MB)
export async function presignUpload(key: string, contentType: string, expiresInSeconds = 3600): Promise<string> {
  return getSignedUrl(r2(), new PutObjectCommand({ Bucket: env('R2_BUCKET'), Key: key, ContentType: contentType }), { expiresIn: expiresInSeconds });
}

export async function putObject(key: string, body: Buffer, contentType: string): Promise<string> {
  await r2().send(new PutObjectCommand({ Bucket: env('R2_BUCKET'), Key: key, Body: body, ContentType: contentType }));
  return r2PublicUrl(key);
}

export async function deleteObject(key: string): Promise<void> {
  await r2().send(new DeleteObjectCommand({ Bucket: env('R2_BUCKET'), Key: key }));
}
