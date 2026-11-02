export interface DirectUploadOptions {
  forkliftId: string;
  category?: string;
  isPublic?: boolean;
  // Tiến độ tải lên 0-100 (chỉ có khi tải lên R2)
  onProgress?: (percent: number) => void;
}

export interface DirectUploadResult {
  success: boolean;
  url: string;
  media: any;
  duration?: number;
}

const isVideoFile = (file: File) =>
  file.type.startsWith('video/') || /\.(mp4|mov|avi|wmv|flv|mkv|webm|m4v|3gp|ts)$/i.test(file.name);

// Một số điện thoại trả về type rỗng cho .mov / .heic: đoán theo đuôi file
function guessContentType(file: File): string {
  if (file.type) return file.type;
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    mov: 'video/quicktime', mp4: 'video/mp4', m4v: 'video/x-m4v', webm: 'video/webm', mkv: 'video/x-matroska', '3gp': 'video/3gpp', avi: 'video/x-msvideo',
    heic: 'image/heic', heif: 'image/heif', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', pdf: 'application/pdf'
  };
  return map[ext] || 'application/octet-stream';
}

// PUT trực tiếp lên R2 bằng XHR để có tiến độ tải lên (fetch chưa hỗ trợ upload progress)
function putWithProgress(url: string, file: File, contentType: string, onProgress?: (p: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.upload.onprogress = e => { if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Lỗi tải file lên kho lưu trữ (HTTP ${xhr.status})`)));
    xhr.onerror = () => reject(new Error('Mất kết nối khi tải file lên, vui lòng thử lại'));
    xhr.send(file);
  });
}

async function saveMediaRecord(data: Record<string, unknown>) {
  const saveRes = await fetch('/api/media/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!saveRes.ok) {
    const errorData = await saveRes.json().catch(() => ({}));
    throw new Error(errorData.error || 'Lỗi khi lưu thông tin file vào cơ sở dữ liệu');
  }
  return (await saveRes.json()).media;
}

/**
 * Tải file thẳng từ trình duyệt lên kho lưu trữ (Cloudflare R2, hoặc Cloudinary khi chưa cấu hình R2),
 * không đi qua serverless function của Vercel nên không bị giới hạn 4.5MB.
 */
export async function uploadMediaDirectly(
  file: File,
  options: DirectUploadOptions
): Promise<DirectUploadResult> {
  const isVideo = isVideoFile(file);
  const fileType = isVideo ? 'VIDEO' : (file.type.startsWith('image/') || /\.(heic|heif)$/i.test(file.name) ? 'IMAGE' : 'DOCUMENT');
  const category = options.category || (isVideo ? 'RAW_VIDEO' : 'Tổng thể');
  const contentType = guessContentType(file);

  // Bước 1: Xin đường dẫn tải lên (server chọn R2 hay Cloudinary)
  const urlRes = await fetch('/api/media/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ forkliftId: options.forkliftId, fileName: file.name, contentType, size: file.size, category })
  });
  const target = await urlRes.json().catch(() => ({}));
  if (!urlRes.ok) throw new Error(target.error || 'Không thể tạo đường dẫn tải lên');

  if (target.provider === 'r2') {
    // Bước 2 (R2): PUT file thẳng lên bucket, không giới hạn 100MB như Cloudinary Free
    await putWithProgress(target.uploadUrl, file, target.contentType, options.onProgress);
    // Bước 3: Lưu bản ghi Media (publicId = object key để xoá được sau này)
    const media = await saveMediaRecord({
      url: target.url, publicId: target.key, fileName: file.name, fileType, category,
      isPublic: Boolean(options.isPublic), forkliftId: options.forkliftId
    });
    return { success: true, url: target.url, media };
  }

  return uploadToCloudinary(file, options, { isVideo, fileType, category, maxBytes: target.maxBytes });
}

// Luồng cũ: Cloudinary (dùng khi chưa cấu hình R2)
async function uploadToCloudinary(
  file: File,
  options: DirectUploadOptions,
  meta: { isVideo: boolean; fileType: string; category: string; maxBytes?: number }
): Promise<DirectUploadResult> {
  const maxBytes = meta.maxBytes || 100 * 1024 * 1024;
  if (file.size > maxBytes) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    throw new Error(`File "${file.name}" (${sizeMb}MB) vượt quá giới hạn ${Math.round(maxBytes / 1024 / 1024)}MB của Cloudinary. Vui lòng nén video hoặc quay ở định dạng 1080p 30fps (clip 15-30s) trước khi tải lên.`);
  }

  const signRes = await fetch('/api/media/signature', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ folder: 'vietnhat_forklifts' })
  });
  if (!signRes.ok) {
    const errorData = await signRes.json().catch(() => ({}));
    throw new Error(errorData.error || 'Không thể tạo chữ ký tải lên');
  }
  const signData = await signRes.json();

  const cloudinaryFormData = new FormData();
  cloudinaryFormData.append('file', file);
  cloudinaryFormData.append('api_key', signData.apiKey);
  cloudinaryFormData.append('timestamp', signData.timestamp.toString());
  cloudinaryFormData.append('signature', signData.signature);
  cloudinaryFormData.append('folder', signData.folder);

  const cloudUploadRes = await fetch(
    `https://api.cloudinary.com/v1_1/${signData.cloudName}/${meta.isVideo ? 'video' : 'auto'}/upload`,
    { method: 'POST', body: cloudinaryFormData }
  );

  if (!cloudUploadRes.ok) {
    const errorData = await cloudUploadRes.json().catch(() => ({}));
    const rawMsg = errorData.error?.message || '';
    let errorMsg = 'Lỗi khi tải file lên máy chủ lưu trữ';
    if (rawMsg.includes('File size too large') || rawMsg.includes('Maximum is')) {
      errorMsg = `Dung lượng video vượt quá giới hạn tối đa 100MB của Cloudinary. Vui lòng nén file trước khi tải lên. (${rawMsg})`;
    } else if (rawMsg) {
      errorMsg = rawMsg;
    }
    throw new Error(errorMsg);
  }

  const cloudData = await cloudUploadRes.json();
  const fileUrl: string = cloudData.secure_url || cloudData.url;
  const media = await saveMediaRecord({
    url: fileUrl, publicId: cloudData.public_id, fileName: file.name, fileType: meta.fileType, category: meta.category,
    isPublic: Boolean(options.isPublic), forkliftId: options.forkliftId
  });

  return {
    success: true,
    url: fileUrl,
    media,
    duration: typeof cloudData.duration === 'number' ? Math.round(cloudData.duration) : undefined
  };
}
