import { NextResponse } from 'next/server';
import { getStaffUser } from '@/lib/auth';
import { isR2Configured, buildObjectKey, presignUpload, r2PublicUrl } from '@/lib/storage';

// Giới hạn dung lượng mỗi file: R2 cho phép tới 5GB/lần PUT, hệ thống giới hạn 2GB cho an toàn;
// Cloudinary Free chỉ 100MB/file
const R2_MAX_BYTES = 2 * 1024 * 1024 * 1024;
const CLOUDINARY_MAX_BYTES = 100 * 1024 * 1024;

function uploadLimits() {
  const r2 = isR2Configured();
  return { provider: r2 ? 'r2' : 'cloudinary', maxBytes: r2 ? R2_MAX_BYTES : CLOUDINARY_MAX_BYTES };
}

// Cho trình duyệt biết đang tải lên đâu và giới hạn dung lượng bao nhiêu
export async function GET(request: Request) {
  const { role } = await getStaffUser(request);
  if (role === 'GUEST') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(uploadLimits());
}

// Cấp đường dẫn PUT có chữ ký để trình duyệt tải file thẳng lên R2
export async function POST(request: Request) {
  const { role } = await getStaffUser(request);
  if (role === 'GUEST' || role === 'VIEWER') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const limits = uploadLimits();
  if (limits.provider !== 'r2') return NextResponse.json(limits);

  const { forkliftId, fileName, contentType, size, category } = await request.json().catch(() => ({}));
  if (!forkliftId || typeof forkliftId !== 'string' || !fileName) {
    return NextResponse.json({ error: 'Thiếu forkliftId hoặc tên file' }, { status: 400 });
  }
  if (Number(size) > limits.maxBytes) {
    return NextResponse.json({ error: `File vượt quá ${Math.round(limits.maxBytes / 1024 / 1024)}MB` }, { status: 413 });
  }

  try {
    const type = typeof contentType === 'string' && contentType ? contentType : 'application/octet-stream';
    // Clip gốc của AI Video Studio để riêng thư mục raw-clips/ (có thể đặt quy tắc tự xoá trên R2 sau này)
    const folder = category === 'RAW_VIDEO' ? 'raw-clips' : 'forklifts';
    const key = buildObjectKey(`${folder}/${forkliftId.replace(/[^\w-]/g, '')}`, String(fileName));
    return NextResponse.json({
      ...limits,
      key,
      contentType: type,
      uploadUrl: await presignUpload(key, type),
      url: r2PublicUrl(key)
    });
  } catch (error) {
    console.error('Presign R2 upload error:', error);
    return NextResponse.json({ error: 'Không tạo được đường dẫn tải lên' }, { status: 500 });
  }
}
