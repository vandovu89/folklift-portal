export interface DirectUploadOptions {
  forkliftId: string;
  category?: string;
  isPublic?: boolean;
}

export interface DirectUploadResult {
  success: boolean;
  url: string;
  media: any;
  duration?: number;
}

/**
 * Upload a media file directly to Cloudinary from the browser using a server-generated signature.
 * This completely avoids sending large multipart/form-data files through Vercel serverless functions,
 * effectively bypassing Vercel's strict 4.5MB request payload limit (HTTP 413 Request Entity Too Large).
 */
export async function uploadMediaDirectly(
  file: File,
  options: DirectUploadOptions
): Promise<DirectUploadResult> {
  // Step 1: Request upload signature from server (<1KB JSON request)
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
  const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|avi|wmv|flv|mkv|webm|m4v|3gp|ts)$/i.test(file.name);
  const resourceType = isVideo ? 'video' : 'auto';

  // Step 2: Upload file directly from browser to Cloudinary CDN endpoint
  const cloudinaryFormData = new FormData();
  cloudinaryFormData.append('file', file);
  cloudinaryFormData.append('api_key', signData.apiKey);
  cloudinaryFormData.append('timestamp', signData.timestamp.toString());
  cloudinaryFormData.append('signature', signData.signature);
  cloudinaryFormData.append('folder', signData.folder);

  const cloudUploadRes = await fetch(
    `https://api.cloudinary.com/v1_1/${signData.cloudName}/${resourceType}/upload`,
    {
      method: 'POST',
      body: cloudinaryFormData
    }
  );

  if (!cloudUploadRes.ok) {
    const errorData = await cloudUploadRes.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Lỗi khi tải file lên máy chủ lưu trữ');
  }

  const cloudData = await cloudUploadRes.json();
  const fileUrl: string = cloudData.secure_url || cloudData.url;
  const fileType = isVideo ? 'VIDEO' : (file.type.startsWith('image/') ? 'IMAGE' : 'DOCUMENT');

  // Step 3: Save media record into database (<1KB JSON request)
  const saveRes = await fetch('/api/media/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: fileUrl,
      publicId: cloudData.public_id,
      fileName: file.name,
      fileType,
      category: options.category || (isVideo ? 'RAW_VIDEO' : 'Tổng thể'),
      isPublic: Boolean(options.isPublic),
      forkliftId: options.forkliftId
    })
  });

  if (!saveRes.ok) {
    const errorData = await saveRes.json().catch(() => ({}));
    throw new Error(errorData.error || 'Lỗi khi lưu thông tin file vào cơ sở dữ liệu');
  }

  const saveResult = await saveRes.json();

  return {
    success: true,
    url: fileUrl,
    media: saveResult.media,
    duration: typeof cloudData.duration === 'number' ? Math.round(cloudData.duration) : undefined
  };
}
