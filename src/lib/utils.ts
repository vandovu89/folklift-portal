/**
 * Trích xuất số kg từ tải trọng (ví dụ: "2.5 tấn" -> 2500, "1500kg" -> 1500, "3 tấn" -> 3000)
 */
export function parseCapacityKg(input?: string | number | null): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === 'number') return input;
  const clean = input.toString().toLowerCase().trim();
  const tonMatch = clean.match(/(\d+(\.\d+)?)\s*(tấn|t|tan)/);
  if (tonMatch) return Math.round(parseFloat(tonMatch[1]) * 1000);
  const numMatch = clean.match(/\d+(\.\d+)?/);
  if (numMatch) {
    const val = parseFloat(numMatch[0]);
    if (val < 20) return Math.round(val * 1000); // Nhập số tấn viết tắt như "2", "2.5", "3"
    return Math.round(val);
  }
  return null;
}

/**
 * Trích xuất milimet (mm) từ chiều cao nâng (ví dụ: "3m" -> 3000, "4.5 mét" -> 4500, "4000" -> 4000)
 */
export function parseLiftHeightMm(input?: string | number | null): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === 'number') return input;
  const clean = input.toString().toLowerCase().trim();
  const mMatch = clean.match(/(\d+(\.\d+)?)\s*(m|mét|met)/);
  if (mMatch) return Math.round(parseFloat(mMatch[1]) * 1000);
  const numMatch = clean.match(/\d+(\.\d+)?/);
  if (numMatch) {
    const val = parseFloat(numMatch[0]);
    if (val < 20) return Math.round(val * 1000); // Ví dụ "3", "4.5"
    return Math.round(val);
  }
  return null;
}

/**
 * Chuyển đổi số kg sang định dạng dễ đọc (ví dụ: 1500 -> "1.5 tấn", "1500kg")
 */
export function formatCapacity(input?: string | number | null, lang: 'vi' | 'en' = 'vi'): string {
  const kg = parseCapacityKg(input);
  if (kg === null) return input ? input.toString() : '';
  
  if (kg >= 1000) {
    const ton = kg / 1000;
    const tonStr = Number(ton.toFixed(2));
    return lang === 'vi' ? `${tonStr} tấn` : `${tonStr} tons`;
  }
  return `${kg} kg`;
}
