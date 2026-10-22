// Quy tắc phân quyền dùng chung cho API và giao diện quản trị
// ADMIN: toàn quyền. SALES: xem thông tin xe (không giá vốn, không nguồn nhập), chỉ được đổi trạng thái
// và dùng công cụ AI. VIEWER: chỉ xem.

export const isAdmin = (role?: string | null) => role === 'ADMIN';

// Trường chỉ ADMIN được xem: giá vốn & nguồn hàng nội bộ (mã nội bộ vẫn hiển thị)
export const COST_FIELDS = ['costPrice'] as const;
export const SOURCE_FIELDS = ['purchaseSource', 'supplier', 'sourceUrl', 'purchaseDate', 'offerDeadline'] as const;
export const ADMIN_ONLY_FIELDS = [...COST_FIELDS, ...SOURCE_FIELDS] as const;

// Nhóm tài liệu chỉ ADMIN được xem (hóa đơn mua xe có thể lộ giá vốn / nguồn nhập)
export const ADMIN_ONLY_MEDIA_CATEGORIES = ['Invoice'];

// Trang quản trị chỉ ADMIN được vào
export const ADMIN_ONLY_PAGES = ['/admin/users', '/admin/purchase-sources', '/admin/settings', '/admin/accounting', '/admin/forklifts/import', '/admin/forklifts/add'];

// Cột Excel chỉ ADMIN được xuất
export const ADMIN_ONLY_EXPORT_COLUMNS = ['costPrice', 'expenses', 'purchaseSource'];

// Trường SALES được phép cập nhật trên xe: trạng thái + các trường do AI Video Studio lưu lại
export const SALES_EDITABLE_FIELDS = ['status', 'aiVideoScript', 'rawVideoUrl', 'aiVideoUrl', 'videoUrl'] as const;
// Thông tin chốt đơn: SALES chỉ được ghi khi chuyển xe sang "Đã bán" (luồng chốt đơn trong CRM)
export const SALES_CLOSING_FIELDS = ['soldPrice', 'soldDate', 'contractUrl'] as const;

// Bỏ các trường nội bộ khỏi dữ liệu xe trả về cho người không phải ADMIN
export function stripInternalFields<T extends Record<string, unknown>>(forklift: T, role?: string | null): T {
  if (isAdmin(role)) return forklift;
  const copy: Record<string, unknown> = { ...forklift };
  for (const key of ADMIN_ONLY_FIELDS) delete copy[key];
  delete copy.expenses;
  return copy as T;
}
