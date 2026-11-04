'use client';

import { useRef, useState } from 'react';
import { FaTimes, FaUpload, FaFont } from 'react-icons/fa';
import { uploadStudioAsset } from '@/lib/upload';
import AiMediaPanel from '@/components/studio/AiMediaPanel';
import { BRAND_NAME, type SceneVisual } from '@/lib/video-studio';

export interface StudioAssetItem {
  id: string;
  kind: 'image' | 'clip';
  url: string;
  category: string | null;
  isPublic: boolean;
  ai?: boolean;
}

interface Props {
  projectId: string;
  assets: StudioAssetItem[];
  // Lời đọc / chữ trên màn hình của cảnh đang chọn hình (để AI gợi ý mô tả)
  narration?: string;
  onScreenText?: string;
  onPick: (visual: SceneVisual) => void;
  onUploaded: (asset: StudioAssetItem) => void;
  onClose: () => void;
}

const ACCEPT = 'image/*,.heic,.heif,video/*,.mp4,.mov,.m4v,.webm';

// HEIC từ iPhone: đổi sang JPEG trước khi tải lên (FFmpeg của worker không đọc được HEIC)
async function normalizeImage(file: File): Promise<File> {
  if (!/\.(heic|heif)$/i.test(file.name) && !/heic|heif/i.test(file.type)) return file;
  const heic2anyModule = await import('heic2any');
  const heic2any = heic2anyModule.default || heic2anyModule;
  const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.85 });
  const blob = Array.isArray(converted) ? converted[0] : converted;
  return new File([blob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), { type: 'image/jpeg' });
}

const toVisual = (a: { kind: 'image' | 'clip'; url: string; ai?: boolean }): SceneVisual => {
  const ai = a.ai ? { ai: true } : {};
  return a.kind === 'clip' ? { kind: 'clip', url: a.url, trimStart: 0, ...ai } : { kind: 'image', url: a.url, motion: 'zoom_in', ...ai };
};

export default function AssetPicker({ projectId, assets, narration = '', onScreenText = '', onPick, onUploaded, onClose }: Props) {
  const [uploading, setUploading] = useState('');
  const [animateSource, setAnimateSource] = useState<string | null>(null);
  const aiPanelRef = useRef<HTMLDivElement>(null);

  // "Làm ảnh này chuyển động": đưa ảnh vào khung tạo clip AI ở trên
  const startAnimate = (url: string) => {
    setAnimateSource(url);
    aiPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setUploading('Đang chuẩn bị file...');
      const ready = await normalizeImage(file);
      const result = await uploadStudioAsset(ready, projectId, p => setUploading(`Đang tải lên... ${p}%`));
      const asset: StudioAssetItem = { id: result.url, kind: result.kind, url: result.url, category: 'Tải lên cho dự án', isPublic: false };
      onUploaded(asset);
      onPick(toVisual(result));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Lỗi tải file');
    } finally {
      setUploading('');
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: '#fff', width: '100%', maxWidth: '820px', borderRadius: '12px', maxHeight: '88vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '0.9rem 1.1rem', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
          <h4 style={{ margin: 0, color: '#1e293b' }}>Chọn hình ảnh cho cảnh</h4>
          <button onClick={onClose} aria-label="Đóng" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: '#64748b' }}><FaTimes /></button>
        </div>

        <div style={{ padding: '1rem 1.1rem', overflowY: 'auto' }}>
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <label className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', cursor: uploading ? 'wait' : 'pointer' }}>
              <FaUpload /> {uploading || 'Tải ảnh / clip mới'}
              <input type="file" accept={ACCEPT} hidden onChange={handleUpload} disabled={Boolean(uploading)} />
            </label>
            <button type="button" className="btn-secondary" onClick={() => onPick({ kind: 'card', title: BRAND_NAME, subtitle: '', theme: 'brand' })} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <FaFont /> Dùng thẻ chữ
            </button>
          </div>

          <div ref={aiPanelRef}>
          <AiMediaPanel
            key={animateSource || 'new'}
            projectId={projectId}
            narration={narration}
            onScreenText={onScreenText}
            sourceImage={animateSource}
            onClearSource={() => setAnimateSource(null)}
            onCreated={result => {
              const asset: StudioAssetItem = { id: result.id, kind: result.kind, url: result.url, category: result.kind === 'clip' ? 'Clip AI' : 'Ảnh AI', isPublic: false, ai: true };
              onUploaded(asset);
              onPick(toVisual(asset));
            }}
          />
          </div>

          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>
            Kho hình của dự án ({assets.length})
          </div>
          {assets.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Xe chưa có ảnh hoặc clip. Hãy tải lên ở trang sửa xe hoặc tải file riêng cho dự án.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.5rem' }}>
              {assets.map(a => (
                <div key={a.id} style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => onPick(toVisual(a))}
                  style={{ position: 'relative', width: '100%', display: 'block', padding: 0, border: `2px solid ${animateSource === a.url ? '#8b5cf6' : '#e2e8f0'}`, borderRadius: '8px', overflow: 'hidden', cursor: 'pointer', background: '#0f172a', aspectRatio: '1 / 1' }}
                >
                  {a.kind === 'clip'
                    ? <video src={`${a.url}#t=0.5`} preload="metadata" muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    // eslint-disable-next-line @next/next/no-img-element
                    : <img src={a.url} alt={a.category || 'Ảnh xe'} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                  <span style={{ position: 'absolute', left: 4, bottom: 4, background: 'rgba(15,23,42,0.75)', color: '#fff', fontSize: '0.65rem', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>
                    {a.ai ? `🤖 ${a.category || 'AI'}` : a.kind === 'clip' ? '🎬 Clip' : a.category || 'Ảnh'}{a.isPublic ? ' · web' : ''}
                  </span>
                </button>
                {a.kind === 'image' && (
                  <button
                    type="button"
                    onClick={() => startAnimate(a.url)}
                    title="Dùng AI làm ảnh này chuyển động thành clip"
                    style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(91,33,182,0.85)', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '0.65rem', padding: '0.15rem 0.35rem', cursor: 'pointer' }}
                  >
                    🎬 Chuyển động
                  </button>
                )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
