'use client';

import { useEffect, useRef, useState } from 'react';
import { FaMapMarkedAlt, FaTrash, FaUpload, FaTimes } from 'react-icons/fa';
import { uploadMediaDirectly } from '@/lib/upload';
import { MARKER_STYLES, MARKER_TYPES, isMarkerType, type ConditionMarkerData } from '@/lib/condition-markers';

interface ConditionMapProps {
  forkliftId: string;
  lang?: string;
  mode: 'view' | 'edit';
  initialMarkers?: ConditionMarkerData[];
}

type Draft = Omit<ConditionMarkerData, 'id'> & { id?: string };

// Sơ đồ xe nâng nhìn ngang (càng bên trái, đối trọng bên phải), viewBox 400 x 260
function ForkliftDiagram({ lang }: { lang: string }) {
  const t = (vi: string, en: string) => (lang === 'vi' ? vi : en);
  const stroke = '#334155';
  const label = { fontSize: 9, fill: '#94a3b8', fontFamily: 'sans-serif' };
  return (
    <svg viewBox="0 0 400 260" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} aria-hidden="true">
      <line x1="0" y1="242" x2="400" y2="242" stroke="#cbd5e1" strokeWidth="2" />
      {/* Khung nâng (Mast) */}
      <rect x="84" y="18" width="12" height="206" rx="2" fill="#94a3b8" stroke={stroke} strokeWidth="1.5" />
      <rect x="98" y="30" width="10" height="194" rx="2" fill="#cbd5e1" stroke={stroke} strokeWidth="1.5" />
      <line x1="102" y1="40" x2="102" y2="150" stroke="#475569" strokeWidth="1" strokeDasharray="3 2" />
      {/* Giá càng & Càng nâng */}
      <rect x="62" y="146" width="24" height="66" rx="2" fill="#64748b" stroke={stroke} strokeWidth="1.5" />
      <path d="M58 146 L66 146 L66 206 L10 206 L10 213 L66 213 Q72 213 72 207 L72 146 Z" fill="#475569" stroke={stroke} strokeWidth="1.5" />
      {/* Khung bảo vệ đầu (Overhead guard) */}
      <path d="M134 150 L150 46 L282 46 L292 128" fill="none" stroke={stroke} strokeWidth="5" strokeLinejoin="round" />
      <line x1="150" y1="46" x2="282" y2="46" stroke={stroke} strokeWidth="7" />
      {/* Thân xe & Nắp động cơ / Hộp ắc quy */}
      <path d="M112 150 L300 150 L300 128 L366 128 Q376 128 376 140 L376 206 L112 206 Z" fill="#fbbf24" stroke={stroke} strokeWidth="2" />
      <rect x="168" y="150" width="122" height="34" rx="3" fill="#f59e0b" stroke={stroke} strokeWidth="1.5" />
      {/* Đối trọng */}
      <path d="M300 128 L366 128 Q376 128 376 140 L376 206 L300 206 Z" fill="#d97706" stroke={stroke} strokeWidth="2" />
      {/* Ghế lái */}
      <path d="M232 150 L232 136 Q232 130 238 130 L262 130 L270 98 Q272 92 278 94 L282 96 L274 136 L274 150 Z" fill="#1e293b" stroke={stroke} strokeWidth="1.5" />
      {/* Vô lăng */}
      <line x1="176" y1="150" x2="196" y2="108" stroke={stroke} strokeWidth="4" />
      <ellipse cx="198" cy="104" rx="14" ry="4" transform="rotate(-25 198 104)" fill="none" stroke={stroke} strokeWidth="3" />
      {/* Bánh xe */}
      <circle cx="146" cy="214" r="28" fill="#1e293b" stroke={stroke} strokeWidth="2" />
      <circle cx="146" cy="214" r="11" fill="#94a3b8" />
      <circle cx="322" cy="218" r="24" fill="#1e293b" stroke={stroke} strokeWidth="2" />
      <circle cx="322" cy="218" r="9" fill="#94a3b8" />

      <text x="72" y="12" {...label}>{t('Khung nâng', 'Mast')}</text>
      <text x="12" y="228" {...label}>{t('Càng nâng', 'Forks')}</text>
      <text x="304" y="120" {...label}>{t('Đối trọng', 'Counterweight')}</text>
      <text x="186" y="40" {...label}>{t('Khung bảo vệ', 'Overhead guard')}</text>
      <text x="180" y="198" {...label}>{t('Động cơ / Ắc quy', 'Engine / Battery')}</text>
      <text x="124" y="256" {...label}>{t('Bánh trước', 'Drive wheel')}</text>
      <text x="300" y="256" {...label}>{t('Bánh lái', 'Steer wheel')}</text>
    </svg>
  );
}

export default function ConditionMap({ forkliftId, lang = 'vi', mode, initialMarkers = [] }: ConditionMapProps) {
  const t = (vi: string, en: string) => (lang === 'vi' ? vi : en);
  const isEdit = mode === 'edit';
  const [markers, setMarkers] = useState<ConditionMarkerData[]>(initialMarkers);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isEdit) return;
    fetch(`/api/forklifts/${forkliftId}/condition-markers`)
      .then(res => (res.ok ? res.json() : []))
      .then(setMarkers)
      .catch(console.error);
  }, [forkliftId, isEdit]);

  if (!isEdit && markers.length === 0) return null;

  const selected = markers.find(m => m.id === selectedId) || null;

  const handleDiagramClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isEdit || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 1000) / 10;
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 1000) / 10;
    setSelectedId(null);
    setDraft({ x, y, type: 'REPAIRED', title: '', note: '', imageUrl: '', isPublic: true });
  };

  const openMarker = (marker: ConditionMarkerData) => {
    setSelectedId(marker.id);
    if (isEdit) setDraft({ ...marker, note: marker.note || '', imageUrl: marker.imageUrl || '' });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !draft) return;
    setUploading(true);
    try {
      const result = await uploadMediaDirectly(file, { forkliftId, category: 'Tình trạng', isPublic: false });
      setDraft({ ...draft, imageUrl: result.url });
    } catch (err) {
      alert('Lỗi tải ảnh: ' + (err instanceof Error ? err.message : 'Không xác định'));
    }
    setUploading(false);
    e.target.value = '';
  };

  const saveDraft = async () => {
    if (!draft) return;
    if (!draft.title.trim()) return alert('Vui lòng nhập tên bộ phận / mô tả ngắn.');
    setSaving(true);
    try {
      const url = draft.id
        ? `/api/forklifts/${forkliftId}/condition-markers/${draft.id}`
        : `/api/forklifts/${forkliftId}/condition-markers`;
      const res = await fetch(url, {
        method: draft.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft)
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
      const saved: ConditionMarkerData = await res.json();
      setMarkers(prev => (draft.id ? prev.map(m => (m.id === saved.id ? saved : m)) : [...prev, saved]));
      setDraft(null);
      setSelectedId(null);
    } catch (err) {
      alert('Lỗi lưu điểm tình trạng: ' + (err instanceof Error ? err.message : 'Không xác định'));
    }
    setSaving(false);
  };

  const deleteMarker = async () => {
    if (!draft?.id || !confirm('Xóa điểm đánh dấu này?')) return;
    const res = await fetch(`/api/forklifts/${forkliftId}/condition-markers/${draft.id}`, { method: 'DELETE' });
    if (res.ok) {
      setMarkers(prev => prev.filter(m => m.id !== draft.id));
      setDraft(null);
      setSelectedId(null);
    } else {
      alert('Không xóa được điểm đánh dấu.');
    }
  };

  const styleOf = (type: string) => MARKER_STYLES[isMarkerType(type) ? type : 'REPAIRED'];

  const renderPin = (m: { x: number; y: number; type: string }, index: number | null, active: boolean, onClick?: () => void, key?: string) => (
    <button
      key={key}
      type="button"
      onClick={e => { e.stopPropagation(); onClick?.(); }}
      className={active ? undefined : 'condition-pin'}
      aria-label={index !== null ? `${t('Điểm', 'Point')} ${index + 1}` : t('Điểm mới', 'New point')}
      style={{
        position: 'absolute',
        left: `${m.x}%`,
        top: `${m.y}%`,
        transform: `translate(-50%, -50%) scale(${active ? 1.25 : 1})`,
        width: '24px',
        height: '24px',
        borderRadius: '50%',
        background: styleOf(m.type).color,
        color: 'white',
        border: '2px solid white',
        boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
        fontSize: '0.7rem',
        fontWeight: 800,
        cursor: 'pointer',
        padding: 0,
        zIndex: active ? 3 : 2,
        transition: 'transform 0.15s'
      }}
    >
      {index !== null ? index + 1 : '+'}
    </button>
  );

  const content = (
    <>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.8rem', marginBottom: '0.8rem' }}>
        {MARKER_TYPES.map(type => (
          <span key={type} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#475569' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: MARKER_STYLES[type].color }} />
            {lang === 'vi' ? MARKER_STYLES[type].vi : MARKER_STYLES[type].en}
          </span>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '1.5rem', alignItems: 'start' }}>
        <div
          ref={containerRef}
          onClick={handleDiagramClick}
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '400 / 260',
            background: 'linear-gradient(#f8fafc, #eef2f7)',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            cursor: isEdit ? 'crosshair' : 'default'
          }}
        >
          <ForkliftDiagram lang={lang} />
          {markers.map((m, i) => renderPin(m, i, selectedId === m.id, () => openMarker(m), m.id))}
          {draft && !draft.id && renderPin(draft, null, true)}
        </div>

        <div>
          {isEdit && draft ? (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem', display: 'grid', gap: '0.7rem' }}>
              <strong style={{ color: '#0f172a' }}>{draft.id ? 'Sửa điểm tình trạng' : 'Thêm điểm tình trạng mới'}</strong>
              <select value={draft.type} onChange={e => setDraft({ ...draft, type: e.target.value })} className="form-control">
                {MARKER_TYPES.map(type => <option key={type} value={type}>{MARKER_STYLES[type].vi}</option>)}
              </select>
              <input value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} className="form-control" placeholder="Bộ phận (VD: Xi lanh nâng, Lốp trước trái...)" />
              <textarea value={draft.note || ''} onChange={e => setDraft({ ...draft, note: e.target.value })} className="form-control" rows={3} placeholder="Mô tả chi tiết: đã thay phớt mới, xước nhẹ sơn..." style={{ resize: 'vertical', fontFamily: 'inherit' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                {draft.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={draft.imageUrl} alt="" style={{ width: '72px', height: '54px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #e2e8f0' }} />
                )}
                <label className="btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                  <FaUpload /> {uploading ? 'Đang tải...' : draft.imageUrl ? 'Đổi ảnh' : 'Tải ảnh thực tế'}
                  <input type="file" accept="image/*" hidden onChange={handleUpload} disabled={uploading} />
                </label>
                {draft.imageUrl && (
                  <button type="button" onClick={() => setDraft({ ...draft, imageUrl: '' })} className="btn-secondary" style={{ fontSize: '0.8rem' }}>Bỏ ảnh</button>
                )}
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: '#475569' }}>
                <input type="checkbox" checked={draft.isPublic} onChange={e => setDraft({ ...draft, isPublic: e.target.checked })} />
                Hiển thị cho khách trên trang chi tiết xe
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                {draft.id && (
                  <button type="button" onClick={deleteMarker} className="btn-danger" style={{ marginRight: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}><FaTrash /> Xóa</button>
                )}
                <button type="button" onClick={() => { setDraft(null); setSelectedId(null); }} className="btn-secondary">Hủy</button>
                <button type="button" onClick={saveDraft} disabled={saving || uploading} className="btn-primary">{saving ? 'Đang lưu...' : 'Lưu điểm'}</button>
              </div>
            </div>
          ) : selected && !isEdit ? (
            <div style={{ background: 'white', border: `2px solid ${styleOf(selected.type).color}`, borderRadius: '10px', overflow: 'hidden' }}>
              {selected.imageUrl && (
                <a href={selected.imageUrl} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={selected.imageUrl} alt={selected.title} style={{ width: '100%', maxHeight: '260px', objectFit: 'cover', display: 'block' }} />
                </a>
              )}
              <div style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: styleOf(selected.type).color, textTransform: 'uppercase' }}>
                      {lang === 'vi' ? styleOf(selected.type).vi : styleOf(selected.type).en}
                    </span>
                    <h4 style={{ margin: '0.2rem 0 0.4rem', color: '#0f172a' }}>{selected.title}</h4>
                  </div>
                  <button type="button" onClick={() => setSelectedId(null)} aria-label={t('Đóng', 'Close')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><FaTimes /></button>
                </div>
                {selected.note && <p style={{ color: '#475569', fontSize: '0.9rem', lineHeight: 1.5, margin: 0, whiteSpace: 'pre-line' }}>{selected.note}</p>}
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0 0 0.3rem' }}>
                {isEdit
                  ? 'Bấm vào vị trí bất kỳ trên sơ đồ để thêm điểm (sửa chữa, thay mới, trầy xước). Bấm vào điểm có sẵn để sửa.'
                  : t('Bấm vào các chấm trên sơ đồ để xem ảnh thực tế từng vị trí.', 'Tap the dots on the diagram to see real photos of each spot.')}
              </p>
              {markers.map((m, i) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => openMarker(m)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.5rem 0.7rem', cursor: 'pointer', textAlign: 'left', opacity: m.isPublic ? 1 : 0.6 }}
                >
                  <span style={{ flexShrink: 0, width: '22px', height: '22px', borderRadius: '50%', background: styleOf(m.type).color, color: 'white', fontSize: '0.7rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</span>
                  <span style={{ flex: 1, fontSize: '0.9rem', color: '#0f172a' }}>{m.title}</span>
                  {m.imageUrl && <span title={t('Có ảnh', 'Has photo')}>📷</span>}
                  {isEdit && !m.isPublic && <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Ẩn</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes conditionPulse { 0% { box-shadow: 0 0 0 0 rgba(220,38,38,0.55); } 70% { box-shadow: 0 0 0 10px rgba(220,38,38,0); } 100% { box-shadow: 0 0 0 0 rgba(220,38,38,0); } }
        .condition-pin { animation: conditionPulse 2s infinite; }
      `}</style>
    </>
  );

  if (isEdit) {
    return (
      <div style={{ marginTop: '2rem', padding: '1.5rem', border: '1px solid #e2e8f0', borderRadius: '12px', background: 'white' }}>
        <h3 style={{ margin: '0 0 0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FaMapMarkedAlt color="#dc2626" /> Bản đồ Minh bạch Tình trạng Xe
        </h3>
        {content}
      </div>
    );
  }

  return (
    <div className="glass-panel" style={{ marginTop: '2rem', padding: 'clamp(1.2rem, 3vw, 2rem)' }}>
      <h3 style={{ marginBottom: '0.4rem', fontSize: '1.4rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <FaMapMarkedAlt color="#dc2626" /> {t('Bản đồ Minh bạch Tình trạng Xe', 'Transparent Condition Map')}
      </h3>
      <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1rem' }}>
        {t(`Chúng tôi công khai ${markers.length} vị trí đã sửa chữa, thay thế hoặc trầy xước trên chiếc xe này.`,
          `We disclose ${markers.length} repaired, replaced or scratched spots on this forklift.`)}
      </p>
      {content}
    </div>
  );
}
