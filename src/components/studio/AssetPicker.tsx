'use client';

import { useState } from 'react';
import { FaTimes, FaUpload, FaFont } from 'react-icons/fa';
import { uploadStudioAsset } from '@/lib/upload';
import { BRAND_NAME, type SceneVisual } from '@/lib/video-studio';

export interface StudioAssetItem {
  id: string;
  kind: 'image' | 'clip';
  url: string;
  category: string | null;
  isPublic: boolean;
}

interface Props {
  projectId: string;
  assets: StudioAssetItem[];
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

export default function AssetPicker({ projectId, assets, onPick, onUploaded, onClose }: Props) {
  const [uploading, setUploading] = useState('');

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
      onPick(result.kind === 'clip' ? { kind: 'clip', url: result.url, trimStart: 0 } : { kind: 'image', url: result.url, motion: 'zoom_in' });
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

          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>
            Ảnh & clip thật của xe ({assets.length})
          </div>
          {assets.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Xe chưa có ảnh hoặc clip. Hãy tải lên ở trang sửa xe hoặc tải file riêng cho dự án.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.5rem' }}>
              {assets.map(a => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => onPick(a.kind === 'clip' ? { kind: 'clip', url: a.url, trimStart: 0 } : { kind: 'image', url: a.url, motion: 'zoom_in' })}
                  style={{ position: 'relative', padding: 0, border: '2px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer', background: '#0f172a', aspectRatio: '1 / 1' }}
                >
                  {a.kind === 'clip'
                    ? <video src={`${a.url}#t=0.5`} preload="metadata" muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    // eslint-disable-next-line @next/next/no-img-element
                    : <img src={a.url} alt={a.category || 'Ảnh xe'} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                  <span style={{ position: 'absolute', left: 4, bottom: 4, background: 'rgba(15,23,42,0.75)', color: '#fff', fontSize: '0.65rem', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>
                    {a.kind === 'clip' ? '🎬 Clip' : a.category || 'Ảnh'}{a.isPublic ? ' · web' : ''}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
