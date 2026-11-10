import { NextResponse } from 'next/server';

// Vbee bắt buộc có webhookUrl khi tạo giọng đọc ở chế độ async. Hệ thống tự hỏi trạng thái
// (GET /v1/tts/requests/:id) nên endpoint này chỉ xác nhận đã nhận, không xử lý dữ liệu.
export async function POST() {
  return NextResponse.json({ ok: true });
}
