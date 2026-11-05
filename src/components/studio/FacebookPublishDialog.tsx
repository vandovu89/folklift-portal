'use client';

import { useEffect, useRef, useState } from 'react';
import { FaFacebook, FaMagic, FaTimes } from 'react-icons/fa';
import { inputStyle, labelStyle } from '@/components/studio/styles';
import { BRAND_HOTLINE } from '@/lib/video-studio';

interface Props {
  projectId: string;
  title: string;
  vertical: boolean;
  hasAiVisuals: boolean;
  onClose: () => void;
}

interface FacebookPage { pageId: string; pageName: string }
interface Published { videoId: string; pageId: string; pageName: string; draft: boolean }
interface VideoStatus { state: 'processing' | 'ready' | 'error'; published: boolean; error: string | null; permalink: string | null }

// Đăng video đã dựng lên Fanpage: chọn Page, dạng Reels / video thường, nội dung bài (AI viết giúp), đăng ngay hoặc lưu nháp
export default function FacebookPublishDialog({ projectId, title, vertical, hasAiVisuals, onClose }: Props) {
  const [pages, setPages] = useState<FacebookPage[] | null>(null);
  const [pageId, setPageId] = useState('');
  const [mode, setMode] = useState<'reel' | 'video'>(vertical ? 'reel' : 'video');
  const [message, setMessage] = useState(`${title}\n\n📞 Hotline: ${BRAND_HOTLINE}`);
  const [draft, setDraft] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [published, setPublished] = useState<Published | null>(null);
  const [status, setStatus] = useState<VideoStatus | null>(null);
  const closed = useRef(false);

  useEffect(() => {
    fetch(`/api/studio/projects/${projectId}/facebook`)
      .then(res => res.json())
      .then(data => {
        const list: FacebookPage[] = data.pages || [];
        setPages(list);
        if (list[0]) setPageId(list[0].pageId);
      })
      .catch(() => setPages([]));
    return () => { closed.current = true; };
  }, [projectId]);

  // Facebook xử lý video thêm vài phút sau khi nhận: hỏi tiến độ mỗi 10 giây (tối đa ~6 phút)
  const watchStatus = async (result: Published) => {
    for (let attempt = 0; attempt < 36 && !closed.current; attempt++) {
      await new Promise(r => setTimeout(r, 10_000));
      const res = await fetch(`/api/studio/projects/${projectId}/facebook?videoId=${result.videoId}&pageId=${result.pageId}`, { cache: 'no-store' });
      if (!res.ok) continue;
      const data: VideoStatus = await res.json();
      setStatus(data);
      if (data.state !== 'processing') return;
    }
  };

  const writeCaption = async () => {
    setError('');
    setBusy('AI đang viết nội dung bài đăng...');
    try {
      const res = await fetch(`/api/studio/projects/${projectId}/facebook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'caption' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setMessage(data.caption);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi viết nội dung');
    }
    setBusy('');
  };

  const publish = async () => {
    const page = pages?.find(p => p.pageId === pageId);
    if (!page) return;
    if (!draft && !confirm(`Đăng công khai ${mode === 'reel' ? 'Reels' : 'video'} này lên Fanpage "${page.pageName}"?`)) return;
    setError('');
    setBusy('Đang gửi video sang Facebook...');
    try {
      const res = await fetch(`/api/studio/projects/${projectId}/facebook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'publish', pageId, mode, message, draft })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      const result: Published = { videoId: data.videoId, pageId: data.pageId, pageName: data.pageName, draft };
      setPublished(result);
      setBusy('');
      watchStatus(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi đăng video');
      setBusy('');
    }
  };

  const videoLink = status?.permalink || (published ? `https://www.facebook.com/${published.videoId}` : '');

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: '#fff', width: '100%', maxWidth: '560px', borderRadius: '12px', maxHeight: '88vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '0.9rem 1.1rem', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
          <h4 style={{ margin: 0, color: '#1e293b', display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}><FaFacebook color="#1877f2" /> Đăng video lên Fanpage</h4>
          <button onClick={onClose} aria-label="Đóng" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: '#64748b' }}><FaTimes /></button>
        </div>

        <div style={{ padding: '1rem 1.1rem', overflowY: 'auto', display: 'grid', gap: '0.85rem' }}>
          {published ? (
            <div style={{ display: 'grid', gap: '0.6rem', fontSize: '0.88rem', lineHeight: 1.55 }}>
              <div style={{ background: '#ecfdf5', color: '#065f46', borderRadius: '8px', padding: '0.8rem' }}>
                ✅ Facebook đã nhận video {published.draft ? 'dạng nháp' : ''} trên Fanpage <strong>{published.pageName}</strong>.
              </div>
              {!status || status.state === 'processing' ? (
                <div style={{ color: '#7c3aed' }}>⏳ Facebook đang xử lý video (thường 1-5 phút)... Có thể đóng cửa sổ này.</div>
              ) : status.state === 'error' ? (
                <div style={{ color: '#b91c1c' }}>❌ {status.error}</div>
              ) : (
                <div style={{ color: '#065f46' }}>
                  {published.draft ? '📝 Video đã xử lý xong, đang ở dạng nháp. Vào Meta Business Suite để xem và đăng.' : status.published ? '🎉 Video đã được đăng.' : 'Video đã xử lý xong.'}
                </div>
              )}
              {videoLink && !published.draft && (
                <a href={videoLink} target="_blank" rel="noopener noreferrer" style={{ color: '#1877f2', fontWeight: 600 }}>Mở bài trên Facebook →</a>
              )}
            </div>
          ) : pages === null ? (
            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Đang tải danh sách Fanpage...</div>
          ) : pages.length === 0 ? (
            <div style={{ fontSize: '0.85rem', color: '#b91c1c' }}>Chưa kết nối Fanpage nào. Vào mục &quot;Fanpage &amp; Bot&quot; để kết nối trước.</div>
          ) : (
            <>
              <div>
                <label style={labelStyle}>Fanpage</label>
                <select value={pageId} onChange={e => setPageId(e.target.value)} style={inputStyle} disabled={Boolean(busy)}>
                  {pages.map(p => <option key={p.pageId} value={p.pageId}>{p.pageName}</option>)}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Dạng đăng</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {([['reel', '🎞️ Reels'], ['video', '🎬 Bài video thường']] as const).map(([value, label]) => {
                    const disabled = value === 'reel' && !vertical;
                    return (
                      <button
                        key={value}
                        type="button"
                        disabled={disabled || Boolean(busy)}
                        onClick={() => setMode(value)}
                        title={disabled ? 'Reels cần video khung dọc 9:16' : undefined}
                        style={{
                          padding: '0.4rem 0.8rem', borderRadius: '999px', fontSize: '0.82rem', cursor: disabled ? 'not-allowed' : 'pointer',
                          border: `1px solid ${mode === value ? '#1877f2' : '#d1d5db'}`, background: mode === value ? '#e7f0fd' : '#fff', color: disabled ? '#9ca3af' : '#1e3a8a'
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                {mode === 'reel' && <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.3rem' }}>Reels: video dọc 3-90 giây, Facebook ưu tiên đề xuất cho người chưa theo dõi Page.</div>}
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <label style={labelStyle}>Nội dung bài đăng</label>
                  <button type="button" onClick={writeCaption} disabled={Boolean(busy)} style={{ background: 'none', border: 'none', color: '#7c3aed', fontSize: '0.8rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                    <FaMagic /> AI viết nội dung
                  </button>
                </div>
                <textarea value={message} onChange={e => setMessage(e.target.value)} rows={7} maxLength={2000} disabled={Boolean(busy)} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.84rem', color: '#334155', cursor: 'pointer' }}>
                <input type="checkbox" checked={draft} onChange={e => setDraft(e.target.checked)} disabled={Boolean(busy)} />
                Chỉ lưu nháp (chưa công khai, xem lại trong Meta Business Suite rồi đăng)
              </label>

              {hasAiVisuals && (
                <div style={{ fontSize: '0.75rem', color: '#6b7280', lineHeight: 1.45 }}>
                  Video có cảnh dùng hình AI{mode === 'reel' ? ': bài Reels sẽ được khai báo "nội dung tạo bằng AI" với Facebook.' : '.'}
                </div>
              )}
            </>
          )}

          {error && <div style={{ fontSize: '0.82rem', color: '#b91c1c', lineHeight: 1.45 }}>{error}</div>}
          {busy && <div style={{ fontSize: '0.82rem', color: '#7c3aed' }}>⏳ {busy}</div>}
        </div>

        <div style={{ padding: '0.8rem 1.1rem', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button type="button" className="btn-secondary" onClick={onClose}>{published ? 'Đóng' : 'Huỷ'}</button>
          {!published && pages && pages.length > 0 && (
            <button
              type="button"
              className="btn-primary"
              onClick={publish}
              disabled={Boolean(busy) || !pageId || !message.trim()}
              style={{ background: '#1877f2', borderColor: '#1877f2', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <FaFacebook /> {draft ? 'Lưu nháp lên Facebook' : 'Đăng lên Fanpage'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
