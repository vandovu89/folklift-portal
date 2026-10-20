// Tiện ích dùng chung cho Cổng Hậu mãi Khách hàng (Post-Sale Customer Portal)

export const SERVICE_TYPES = ['MAINTENANCE', 'REPAIR', 'PARTS'] as const;
export type ServiceType = (typeof SERVICE_TYPES)[number];

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  MAINTENANCE: 'Bảo dưỡng định kỳ',
  REPAIR: 'Gọi thợ sửa chữa',
  PARTS: 'Mua phụ tùng',
};

export const SERVICE_STATUSES = ['New', 'InProgress', 'Done', 'Cancelled'] as const;

export const SERVICE_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  New: { label: 'Mới gửi', color: '#f97316' },
  InProgress: { label: 'Đang xử lý', color: '#0284c7' },
  Done: { label: 'Hoàn thành', color: '#16a34a' },
  Cancelled: { label: 'Đã hủy', color: '#64748b' },
};

// Số ngày trước hạn bảo dưỡng thì bắt đầu nhắc
export const MAINTENANCE_REMINDER_DAYS = 14;

// Chuẩn hóa số điện thoại làm tên đăng nhập: "+84 912 345 678" / "84912345678" => "0912345678"
export function normalizePhone(input: string): string {
  const digits = (input || '').replace(/\D/g, '');
  if (digits.startsWith('84') && digits.length >= 11) return '0' + digits.slice(2);
  return digits;
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < day) d.setDate(0); // 31/01 + 1 tháng => 28/02 thay vì 03/03
  return d;
}

export type MaintenanceState = 'overdue' | 'due_soon' | 'ok' | 'unknown';

export function maintenanceState(nextDate: Date | string | null | undefined, now = new Date()): MaintenanceState {
  if (!nextDate) return 'unknown';
  const diffDays = (new Date(nextDate).getTime() - now.getTime()) / 86_400_000;
  if (diffDays < 0) return 'overdue';
  if (diffDays <= MAINTENANCE_REMINDER_DAYS) return 'due_soon';
  return 'ok';
}

export function isUnderWarranty(warrantyEnd: Date | string | null | undefined, now = new Date()): boolean {
  return Boolean(warrantyEnd) && new Date(warrantyEnd as string).getTime() >= now.getTime();
}

export function parseOptionalDate(value: unknown): Date | null {
  if (!value) return null;
  const d = new Date(value as string);
  return isNaN(d.getTime()) ? null : d;
}
