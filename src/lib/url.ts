/**
 * Tiện ích lấy Base URL của ứng dụng linh hoạt từ Environment Variables
 * Hỗ trợ các biến:
 * - APP_URL
 * - NEXT_PUBLIC_APP_URL
 * - VERCEL_PROJECT_PRODUCTION_URL (Tự động từ Vercel)
 * - VERCEL_URL (Tự động từ Vercel)
 * - Fallback: http://localhost:3000
 */
export function getBaseUrl(): string {
  const customUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (customUrl && customUrl.trim()) {
    let clean = customUrl.trim().replace(/\/+$/, '');
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = `https://${clean}`;
    }
    return clean;
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return 'http://localhost:3000';
}
