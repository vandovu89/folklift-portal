'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import JSZip from 'jszip';
import { FaDownload, FaSpinner, FaCheck, FaTimes } from 'react-icons/fa';

interface DownloadForkliftImagesButtonProps {
  forkliftId?: string;
  images?: string[];
  forkliftName: string;
  internalCode?: string;
  lang?: string;
  variant?: 'detail' | 'card' | 'icon';
  className?: string;
  style?: React.CSSProperties;
}

const cleanFilename = (name: string) =>
  name
    .replace(/[^a-zA-Z0-9_À-ɏẠ-ỹ-]/g, '_')
    .replace(/_+/g, '_')
    .trim();

const extFor = (url: string, type: string) => {
  if (type === 'image/png' || /\.png(\?|$)/i.test(url)) return 'png';
  if (type === 'image/webp' || /\.webp(\?|$)/i.test(url)) return 'webp';
  return 'jpg';
};

const mimeFor = (ext: string) => (ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg');

// Touch-first devices (phones/tablets) get the picker + save-to-gallery flow; desktops keep the ZIP.
const isTouchDevice = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(pointer: coarse)').matches &&
  window.matchMedia('(hover: none)').matches;

// iOS/iPadOS: the share sheet offers "Save N Images" which writes straight into Photos.
const isIOS = () =>
  typeof navigator !== 'undefined' &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1));

async function fetchAsFile(url: string, baseName: string, index: number): Promise<File | null> {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();
    const ext = extFor(url, blob.type);
    return new File([blob], `${baseName}_${index + 1}.${ext}`, { type: blob.type || mimeFor(ext) });
  } catch (err) {
    console.error(`Error downloading image ${url}:`, err);
    return null;
  }
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Mobile browsers read the blob asynchronously; revoking right away can cancel the save.
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export default function DownloadForkliftImagesButton({
  forkliftId,
  images: initialImages,
  forkliftName,
  internalCode,
  lang = 'vi',
  variant = 'detail',
  className = '',
  style = {}
}: DownloadForkliftImagesButtonProps) {
  const vi = lang === 'vi';
  const [downloading, setDownloading] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [isDone, setIsDone] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const baseName = cleanFilename(`${internalCode ? `${internalCode}_` : ''}${forkliftName}`);

  const loadImageUrls = useCallback(async (): Promise<string[]> => {
    if (initialImages && initialImages.length > 0) return initialImages;
    if (!forkliftId) return [];
    const res = await fetch(`/api/forklifts/${forkliftId}/images`);
    const data = await res.json();
    return data.images || [];
  }, [initialImages, forkliftId]);

  const flashDone = () => {
    setIsDone(true);
    setProgressText(vi ? 'Đã tải xong!' : 'Downloaded!');
    setTimeout(() => {
      setIsDone(false);
      setProgressText('');
    }, 3000);
  };

  const downloadZip = async () => {
    try {
      setDownloading(true);
      setIsDone(false);
      setProgressText(vi ? 'Đang lấy ảnh...' : 'Fetching images...');

      const imageUrls = await loadImageUrls();
      if (imageUrls.length === 0) {
        alert(vi ? 'Chiếc xe này chưa có hình ảnh công khai để tải về.' : 'No public images available for this forklift.');
        return;
      }

      const zip = new JSZip();
      let count = 0;
      for (let i = 0; i < imageUrls.length; i++) {
        setProgressText(vi ? `Tải ảnh ${i + 1}/${imageUrls.length}...` : `Downloading ${i + 1}/${imageUrls.length}...`);
        const file = await fetchAsFile(imageUrls[i], baseName, i);
        if (file) {
          zip.file(file.name, file);
          count++;
        }
      }

      if (count === 0) {
        alert(vi ? 'Không thể tải ảnh, vui lòng thử lại sau.' : 'Failed to download images.');
        return;
      }

      setProgressText(vi ? 'Đang nén ZIP...' : 'Compressing ZIP...');
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      triggerDownload(zipBlob, `${baseName}_Images.zip`);
      flashDone();
    } catch (error) {
      console.error('Download error:', error);
      alert(vi ? 'Có lỗi xảy ra khi tải ảnh.' : 'Error occurred while downloading.');
    } finally {
      setDownloading(false);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (downloading) return;
    if (isTouchDevice()) setPickerOpen(true);
    else downloadZip();
  };

  const picker = pickerOpen
    ? createPortal(
        <MobileImagePicker
          vi={vi}
          title={`${internalCode ? `${internalCode} · ` : ''}${forkliftName}`}
          baseName={baseName}
          loadImageUrls={loadImageUrls}
          onClose={() => setPickerOpen(false)}
          onSaved={() => {
            setPickerOpen(false);
            flashDone();
          }}
        />,
        document.body
      )
    : null;

  const mobileLabel = vi ? 'Tải ảnh' : 'Save Photos';

  // Variant: Trên card sản phẩm trang Catalog
  if (variant === 'card') {
    return (
      <>
        <button
          type="button"
          onClick={handleClick}
          disabled={downloading}
          title={vi ? 'Tải ảnh xe này về máy' : 'Download photos'}
          style={{
            flex: '0 0 auto',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            background: isDone ? '#dcfce7' : (downloading ? '#f1f5f9' : 'white'),
            color: isDone ? '#15803d' : (downloading ? '#64748b' : '#334155'),
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: downloading ? 'wait' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem',
            transition: 'all 0.2s',
            ...style
          }}
          className={className}
        >
          {downloading ? (
            <>
              <FaSpinner style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: '0.75rem' }}>{progressText || 'Đang tải...'}</span>
            </>
          ) : isDone ? (
            <>
              <FaCheck color="#16a34a" />
              <span>{vi ? 'Đã tải' : 'Done'}</span>
            </>
          ) : (
            <>
              <FaDownload />
              <span>{vi ? 'Tải ảnh' : 'Download Photos'}</span>
            </>
          )}
        </button>
        {picker}
      </>
    );
  }

  // Variant: Icon nhỏ gọn
  if (variant === 'icon') {
    return (
      <>
        <button
          type="button"
          onClick={handleClick}
          disabled={downloading}
          title={vi ? 'Tải ảnh xe' : 'Download photos'}
          style={{
            padding: '0.5rem',
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
            background: 'white',
            color: '#334155',
            cursor: downloading ? 'wait' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            ...style
          }}
          className={className}
        >
          {downloading ? <FaSpinner style={{ animation: 'spin 1s linear infinite' }} /> : <FaDownload />}
        </button>
        {picker}
      </>
    );
  }

  // Variant mặc định: Nút lớn trên trang chi tiết xe (Detail page)
  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={downloading}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.6rem',
          padding: '0.8rem 1.4rem',
          borderRadius: '8px',
          border: '1px solid #cbd5e1',
          background: isDone ? '#dcfce7' : (downloading ? '#f8fafc' : 'white'),
          color: isDone ? '#166534' : '#1e293b',
          fontWeight: 700,
          fontSize: '0.95rem',
          cursor: downloading ? 'wait' : 'pointer',
          boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          ...style
        }}
        className={`hover-lift-sm ${className}`}
      >
        {downloading ? (
          <>
            <FaSpinner style={{ animation: 'spin 1s linear infinite' }} />
            <span>{progressText || (vi ? 'Đang nén ảnh...' : 'Processing...')}</span>
          </>
        ) : isDone ? (
          <>
            <FaCheck color="#16a34a" size={16} />
            <span>{vi ? 'Tải ảnh hoàn tất!' : 'Download complete!'}</span>
          </>
        ) : (
          <>
            <FaDownload color="var(--primary)" size={16} />
            <span className="dl-label-desktop">{vi ? '📥 Tải Trọn Bộ Ảnh Xe (ZIP)' : '📥 Download All Photos (ZIP)'}</span>
            <span className="dl-label-mobile">📥 {mobileLabel}</span>
          </>
        )}
      </button>
      <style>{`
        .dl-label-mobile { display: none; }
        @media (hover: none) and (pointer: coarse) {
          .dl-label-desktop { display: none; }
          .dl-label-mobile { display: inline; }
        }
      `}</style>
      {picker}
    </>
  );
}

interface MobileImagePickerProps {
  vi: boolean;
  title: string;
  baseName: string;
  loadImageUrls: () => Promise<string[]>;
  onClose: () => void;
  onSaved: () => void;
}

function MobileImagePicker({ vi, title, baseName, loadImageUrls, onClose, onSaved }: MobileImagePickerProps) {
  const [urls, setUrls] = useState<string[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  // Files are prefetched as soon as the sheet opens: iOS only allows navigator.share() while the
  // tap's user activation is still fresh, so nothing slow may run between the tap and share().
  const [files, setFiles] = useState<(File | null | undefined)[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const ios = isIOS();

  useEffect(() => {
    let cancelled = false;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    (async () => {
      try {
        const list = await loadImageUrls();
        if (cancelled) return;
        setUrls(list);
        setSelected(new Set(list.map((_, i) => i)));
        setFiles(list.map(() => undefined));
        list.forEach((url, i) => {
          fetchAsFile(url, baseName, i).then(file => {
            if (cancelled) return;
            setFiles(prev => {
              const next = [...prev];
              next[i] = file;
              return next;
            });
          });
        });
      } catch {
        if (!cancelled) {
          setUrls([]);
          setError(vi ? 'Không lấy được danh sách ảnh.' : 'Could not load images.');
        }
      }
    })();

    return () => {
      cancelled = true;
      document.body.style.overflow = prevOverflow;
    };
  }, [loadImageUrls, baseName, vi]);

  const toggle = (i: number) =>
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  const allSelected = !!urls && urls.length > 0 && selected.size === urls.length;
  const selectedIdx = [...selected].sort((a, b) => a - b);
  const pending = selectedIdx.filter(i => files[i] === undefined).length;
  const ready = selectedIdx.map(i => files[i]).filter((f): f is File => !!f);
  const failed = selectedIdx.length - pending - ready.length;

  const saveByDownload = async (list: File[]) => {
    for (const f of list) {
      triggerDownload(f, f.name);
      // Space out downloads so the browser doesn't drop all but the first.
      await new Promise(r => setTimeout(r, 400));
    }
  };

  const handleSave = async () => {
    if (saving || pending > 0 || ready.length === 0) return;
    setError('');
    setSaving(true);
    try {
      if (ios && navigator.canShare?.({ files: ready })) {
        try {
          await navigator.share({ files: ready });
        } catch (err) {
          if ((err as DOMException)?.name === 'AbortError') {
            setSaving(false);
            return; // user dismissed the share sheet
          }
          await saveByDownload(ready);
        }
      } else {
        await saveByDownload(ready);
      }
      onSaved();
    } catch (err) {
      console.error('Save images error:', err);
      setError(vi ? 'Có lỗi xảy ra khi lưu ảnh.' : 'Error while saving images.');
      setSaving(false);
    }
  };

  const hint = ios
    ? vi
      ? 'Bấm "Lưu ảnh" rồi chọn "Lưu hình ảnh" để lưu vào ứng dụng Ảnh.'
      : 'Tap "Save" then choose "Save Images" to add them to Photos.'
    : vi
      ? 'Ảnh sẽ được lưu vào thư viện ảnh (thư mục Download).'
      : 'Photos are saved to your gallery (Download folder).';

  let saveLabel: string;
  if (saving) saveLabel = vi ? 'Đang lưu...' : 'Saving...';
  else if (pending > 0) saveLabel = vi ? `Đang chuẩn bị ${selectedIdx.length - pending}/${selectedIdx.length}...` : `Preparing ${selectedIdx.length - pending}/${selectedIdx.length}...`;
  else saveLabel = vi ? `Lưu ${ready.length} ảnh` : `Save ${ready.length} photo${ready.length === 1 ? '' : 's'}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      // Portal events still bubble through the React tree (e.g. into a parent <Link>).
      onClick={e => {
        e.stopPropagation();
        if (e.target === e.currentTarget && !saving) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(15,23,42,0.55)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center'
      }}
    >
      <div
        style={{
          background: 'white',
          width: '100%',
          maxWidth: 560,
          maxHeight: '88vh',
          borderRadius: '16px 16px 0 0',
          display: 'flex',
          flexDirection: 'column',
          paddingBottom: 'env(safe-area-inset-bottom)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.9rem 1rem', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>{vi ? 'Chọn ảnh để lưu' : 'Choose photos to save'}</div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
          </div>
          {urls && urls.length > 0 && (
            <button
              type="button"
              onClick={() => setSelected(allSelected ? new Set() : new Set(urls.map((_, i) => i)))}
              style={{ border: 'none', background: 'none', color: '#2563eb', fontWeight: 700, fontSize: '0.85rem', padding: '0.4rem' }}
            >
              {allSelected ? (vi ? 'Bỏ chọn' : 'Clear') : (vi ? 'Chọn tất cả' : 'Select all')}
            </button>
          )}
          <button
            type="button"
            aria-label={vi ? 'Đóng' : 'Close'}
            onClick={onClose}
            disabled={saving}
            style={{ border: 'none', background: '#f1f5f9', borderRadius: '999px', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155' }}
          >
            <FaTimes />
          </button>
        </div>

        <div style={{ overflowY: 'auto', padding: '0.75rem', flex: 1 }}>
          {urls === null ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
              <FaSpinner style={{ animation: 'spin 1s linear infinite' }} /> {vi ? 'Đang lấy ảnh...' : 'Loading photos...'}
            </div>
          ) : urls.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
              {error || (vi ? 'Chiếc xe này chưa có hình ảnh công khai để tải về.' : 'No public images available for this forklift.')}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem' }}>
              {urls.map((url, i) => {
                const on = selected.has(i);
                return (
                  <button
                    key={url + i}
                    type="button"
                    onClick={() => toggle(i)}
                    aria-pressed={on}
                    style={{
                      position: 'relative',
                      padding: 0,
                      border: on ? '3px solid #2563eb' : '3px solid transparent',
                      borderRadius: 10,
                      overflow: 'hidden',
                      aspectRatio: '1 / 1',
                      background: '#f1f5f9'
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`${title} ${i + 1}`}
                      loading="lazy"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: on ? 1 : 0.55 }}
                    />
                    <span
                      style={{
                        position: 'absolute',
                        top: 6,
                        right: 6,
                        width: 22,
                        height: 22,
                        borderRadius: '999px',
                        background: on ? '#2563eb' : 'rgba(255,255,255,0.85)',
                        border: on ? 'none' : '2px solid #94a3b8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: 11
                      }}
                    >
                      {on && <FaCheck />}
                    </span>
                    {files[i] === null && (
                      <span style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(220,38,38,0.85)', color: 'white', fontSize: 10, padding: '2px 0' }}>
                        {vi ? 'Lỗi tải' : 'Failed'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {urls && urls.length > 0 && (
          <div style={{ borderTop: '1px solid #e2e8f0', padding: '0.75rem 1rem' }}>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '0.5rem' }}>
              {error ? <span style={{ color: '#dc2626' }}>{error}</span> : hint}
              {failed > 0 && !error && (
                <span style={{ color: '#dc2626' }}>{vi ? ` (${failed} ảnh lỗi sẽ bị bỏ qua)` : ` (${failed} failed, skipped)`}</span>
              )}
            </div>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || pending > 0 || ready.length === 0}
              style={{
                width: '100%',
                padding: '0.85rem',
                borderRadius: 10,
                border: 'none',
                background: saving || pending > 0 || ready.length === 0 ? '#94a3b8' : '#2563eb',
                color: 'white',
                fontWeight: 800,
                fontSize: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              {saving || pending > 0 ? <FaSpinner style={{ animation: 'spin 1s linear infinite' }} /> : <FaDownload />}
              {selectedIdx.length === 0 ? (vi ? 'Chưa chọn ảnh nào' : 'No photos selected') : saveLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
