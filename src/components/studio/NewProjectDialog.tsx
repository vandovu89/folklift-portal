'use client';

import { useEffect, useMemo, useState } from 'react';
import { FaTimes, FaMagic } from 'react-icons/fa';
import { SCRIPT_STYLES, VIDEO_FORMATS, DEFAULT_VIDEO_FORMAT, type ScriptStyle, type VideoFormat } from '@/lib/ai-video';
import { VIDEO_TEMPLATES, TARGET_DURATIONS, DEFAULT_SETTINGS, type VideoTemplate } from '@/lib/video-studio';
import { labelStyle, inputStyle } from '@/components/studio/styles';

interface ForkliftOption {
  id: string;
  maker: string;
  model: string;
  year: number | null;
  internalCode: string | null;
  loadCapacity: string | null;
  status: string;
}

interface Props {
  initialForkliftId?: string;
  onClose: () => void;
  onCreated: (projectId: string) => void;
}

const forkliftLabel = (f: ForkliftOption) =>
  `${f.maker} ${f.model}${f.year ? ` (${f.year})` : ''}${f.loadCapacity ? ` · ${f.loadCapacity}` : ''}${f.internalCode ? ` · ${f.internalCode}` : ''}`;

export default function NewProjectDialog({ initialForkliftId, onClose, onCreated }: Props) {
  const [template, setTemplate] = useState<VideoTemplate>('forklift_intro');
  const [forklifts, setForklifts] = useState<ForkliftOption[] | null>(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>(initialForkliftId ? [initialForkliftId] : []);
  const [format, setFormat] = useState<VideoFormat>(DEFAULT_VIDEO_FORMAT);
  const [targetDuration, setTargetDuration] = useState<number>(DEFAULT_SETTINGS.targetDuration);
  const [tone, setTone] = useState<ScriptStyle>('random');
  const [note, setNote] = useState('');
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/forklifts')
      .then(res => (res.ok ? res.json() : []))
      .then(data => setForklifts(Array.isArray(data) ? data : []))
      .catch(() => setForklifts([]));
  }, []);

  const limits = VIDEO_TEMPLATES[template].forklifts;
  const matches = useMemo(() => {
    if (!forklifts) return [];
    const q = search.trim().toLowerCase();
    const list = q
      ? forklifts.filter(f => forkliftLabel(f).toLowerCase().includes(q))
      : forklifts.filter(f => f.status !== 'Sold');
    return list.slice(0, 30);
  }, [forklifts, search]);

  const toggle = (id: string) => {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      return limits.max === 1 ? [id] : prev.length < limits.max ? [...prev, id] : prev;
    });
  };

  const handleCreate = async () => {
    setError('');
    try {
      setProgress('Đang tạo dự án...');
      const settings = { ...DEFAULT_SETTINGS, targetDuration, tone, note };
      const res = await fetch('/api/studio/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: template, forkliftIds: selected, format, settings })
      });
      const project = await res.json();
      if (!res.ok) throw new Error(project.error || `HTTP ${res.status}`);

      setProgress('AI đang lên storyboard (chia cảnh, chọn ảnh, viết lời đọc)...');
      const sbRes = await fetch(`/api/studio/projects/${project.id}/storyboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings })
      });
      // Storyboard lỗi vẫn mở dự án để người dùng tự thêm cảnh / bấm tạo lại
      if (!sbRes.ok) console.warn('Storyboard failed:', await sbRes.text());
      onCreated(project.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi tạo dự án');
      setProgress('');
    }
  };

  const selectedForklifts = selected.map(id => forklifts?.find(f => f.id === id)).filter(Boolean) as ForkliftOption[];
  const canCreate = selected.length >= limits.min && selected.length <= limits.max && !progress;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: '#fff', width: '100%', maxWidth: '760px', borderRadius: '12px', maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.2rem', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
          <h3 style={{ margin: 0, color: '#1e293b' }}>Tạo video mới</h3>
          <button onClick={onClose} disabled={Boolean(progress)} aria-label="Đóng" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#64748b' }}>
            <FaTimes />
          </button>
        </div>

        <div style={{ padding: '1.2rem', overflowY: 'auto', display: 'grid', gap: '1.2rem' }}>
          <section>
            <span style={labelStyle}>1. Loại video</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 200px), 1fr))', gap: '0.6rem' }}>
              {(Object.keys(VIDEO_TEMPLATES) as VideoTemplate[]).map(key => {
                const t = VIDEO_TEMPLATES[key];
                const active = template === key;
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={!t.enabled}
                    onClick={() => { setTemplate(key); setSelected(s => s.slice(0, t.forklifts.max)); }}
                    style={{
                      textAlign: 'left', padding: '0.7rem', borderRadius: '10px', cursor: t.enabled ? 'pointer' : 'not-allowed',
                      border: `2px solid ${active ? '#8b5cf6' : '#e2e8f0'}`, background: active ? '#f5f3ff' : '#fff', opacity: t.enabled ? 1 : 0.55
                    }}
                  >
                    <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.9rem' }}>
                      {t.icon} {t.label} {!t.enabled && <span style={{ fontSize: '0.68rem', color: '#7c3aed', fontWeight: 600 }}>· Sắp có</span>}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem', lineHeight: 1.4 }}>{t.description}</div>
                  </button>
                );
              })}
            </div>
          </section>

          {limits.max > 0 && (
            <section>
              <span style={labelStyle}>2. Chọn xe {limits.max === 1 ? '' : `(${limits.min}-${limits.max} xe, đã chọn ${selected.length})`}</span>
              {selectedForklifts.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.5rem' }}>
                  {selectedForklifts.map(f => (
                    <span key={f.id} style={{ background: '#ede9fe', color: '#5b21b6', borderRadius: '999px', padding: '0.2rem 0.6rem', fontSize: '0.78rem', display: 'inline-flex', gap: '0.4rem', alignItems: 'center' }}>
                      {f.maker} {f.model}
                      <button type="button" onClick={() => toggle(f.id)} aria-label="Bỏ chọn" style={{ background: 'none', border: 'none', color: '#7c3aed', cursor: 'pointer', padding: 0 }}><FaTimes size={10} /></button>
                    </span>
                  ))}
                </div>
              )}
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm theo hãng, model, mã nội bộ..." style={inputStyle} />
              <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', marginTop: '0.4rem' }}>
                {matches.length === 0 ? (
                  <div style={{ padding: '0.8rem', fontSize: '0.82rem', color: '#94a3b8' }}>{forklifts ? 'Không có xe phù hợp' : 'Đang tải danh sách xe...'}</div>
                ) : matches.map(f => (
                  <label key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 0.65rem', fontSize: '0.83rem', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', background: selected.includes(f.id) ? '#f5f3ff' : undefined }}>
                    <input type={limits.max === 1 ? 'radio' : 'checkbox'} checked={selected.includes(f.id)} onChange={() => toggle(f.id)} />
                    <span style={{ flex: 1, color: '#334155' }}>{forkliftLabel(f)}</span>
                    {f.status === 'Sold' && <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Đã bán</span>}
                  </label>
                ))}
              </div>
            </section>
          )}

          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '0.7rem' }}>
            <div>
              <label style={labelStyle}>Khung hình</label>
              <select value={format} onChange={e => setFormat(e.target.value as VideoFormat)} style={inputStyle}>
                {(Object.keys(VIDEO_FORMATS) as VideoFormat[]).map(k => <option key={k} value={k}>{VIDEO_FORMATS[k].label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Độ dài mong muốn</label>
              <select value={targetDuration} onChange={e => setTargetDuration(Number(e.target.value))} style={inputStyle}>
                {TARGET_DURATIONS.map(d => <option key={d} value={d}>{d} giây</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Phong cách lời đọc</label>
              <select value={tone} onChange={e => setTone(e.target.value as ScriptStyle)} style={inputStyle}>
                {(Object.keys(SCRIPT_STYLES) as ScriptStyle[]).map(k => <option key={k} value={k}>{SCRIPT_STYLES[k].label}</option>)}
              </select>
            </div>
          </section>

          <section>
            <label style={labelStyle}>Ý chính muốn AI nhắc thêm (không bắt buộc)</label>
            <input value={note} onChange={e => setNote(e.target.value)} maxLength={500} placeholder="VD: giảm 10 triệu trong tháng này, tặng bình điện mới..." style={inputStyle} />
          </section>

          {error && <div style={{ background: '#fee2e2', color: '#991b1b', padding: '0.6rem 0.8rem', borderRadius: '8px', fontSize: '0.85rem' }}>{error}</div>}
        </div>

        <div style={{ padding: '0.9rem 1.2rem', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {progress && <span style={{ fontSize: '0.82rem', color: '#7c3aed', marginRight: 'auto' }}>⏳ {progress}</span>}
          <button className="btn-secondary" onClick={onClose} disabled={Boolean(progress)}>Hủy</button>
          <button className="btn-primary" onClick={handleCreate} disabled={!canCreate} style={{ background: '#8b5cf6', borderColor: '#8b5cf6', display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
            <FaMagic /> Tạo & để AI lên storyboard
          </button>
        </div>
      </div>
    </div>
  );
}
