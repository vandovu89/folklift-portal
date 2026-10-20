export const MARKER_TYPES = ['REPAIRED', 'REPLACED', 'SCRATCH'] as const;
export type MarkerType = (typeof MARKER_TYPES)[number];

export const MARKER_STYLES: Record<MarkerType, { color: string; vi: string; en: string }> = {
  REPAIRED: { color: '#dc2626', vi: 'Đã sửa chữa', en: 'Repaired' },
  REPLACED: { color: '#2563eb', vi: 'Thay mới', en: 'Replaced' },
  SCRATCH: { color: '#f59e0b', vi: 'Trầy xước / Móp', en: 'Scratch / Dent' },
};

export function isMarkerType(value: unknown): value is MarkerType {
  return typeof value === 'string' && (MARKER_TYPES as readonly string[]).includes(value);
}

export interface ConditionMarkerData {
  id: string;
  x: number;
  y: number;
  type: string;
  title: string;
  note: string | null;
  imageUrl: string | null;
  isPublic: boolean;
}
