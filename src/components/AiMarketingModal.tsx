'use client';

import { useState, useEffect } from 'react';
import { FaRobot, FaFacebook, FaTimes, FaMagic } from 'react-icons/fa';

interface AiMarketingModalProps {
  isOpen: boolean;
  onClose: () => void;
  forkliftId: string;
}

export default function AiMarketingModal({ isOpen, onClose, forkliftId }: AiMarketingModalProps) {
  const [loadingAi, setLoadingAi] = useState(false);
  const [loadingPublish, setLoadingPublish] = useState(false);
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [pages, setPages] = useState<any[]>([]);
  const [selectedPageId, setSelectedPageId] = useState('');
  const [tone, setTone] = useState('chuyên nghiệp và thuyết phục');
  const [publishStatus, setPublishStatus] = useState<{ success: boolean; message: string } | null>(null);

  // Fetch available pages
  useEffect(() => {
    if (isOpen) {
      fetch('/api/facebook-pages')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setPages(data);
            if (data.length > 0) setSelectedPageId(data[0].pageId);
          }
        })
        .catch(console.error);
    } else {
      // Reset state when closed
      setContent('');
      setPublishStatus(null);
    }
  }, [isOpen]);

  const handleGenerate = async () => {
    setLoadingAi(true);
    setPublishStatus(null);
    try {
      const res = await fetch('/api/ai/facebook-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forkliftId, tone })
      });
      const data = await res.json();
      if (data.success) {
        setContent(data.content);
        setImageUrl(data.imageUrl);
      } else {
        alert('Lỗi khi sinh nội dung: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error(error);
      alert('Lỗi hệ thống khi sinh nội dung AI.');
    }
    setLoadingAi(false);
  };

  const handlePublish = async () => {
    if (!selectedPageId) {
      alert('Vui lòng chọn Fanpage đích');
      return;
    }
    if (!content.trim()) {
      alert('Nội dung bài viết không được để trống');
      return;
    }

    setLoadingPublish(true);
    setPublishStatus(null);
    try {
      const res = await fetch('/api/facebook/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageId: selectedPageId,
          message: content,
          imageUrl: imageUrl
        })
      });
      const data = await res.json();
      if (data.success) {
        setPublishStatus({ success: true, message: 'Đăng bài thành công lên Fanpage!' });
      } else {
        setPublishStatus({ success: false, message: 'Lỗi đăng bài: ' + (data.error || 'Unknown error') });
      }
    } catch (error) {
      console.error(error);
      setPublishStatus({ success: false, message: 'Lỗi hệ thống khi đăng bài.' });
    }
    setLoadingPublish(false);
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem'
    }}>
      <div className="glass-panel" style={{
        background: '#fff', width: '100%', maxWidth: '700px',
        borderRadius: '12px', display: 'flex', flexDirection: 'column',
        maxHeight: '90vh', overflow: 'hidden'
      }}>
        <div style={{ 
          padding: '1.2rem', borderBottom: '1px solid #eee', 
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          backgroundColor: '#f8fafc'
        }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e293b' }}>
            <FaRobot color="#3b82f6" /> AI Marketing Assistant
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#64748b' }}>
            <FaTimes />
          </button>
        </div>

        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, color: '#333' }}>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 600 }}>Giọng điệu (Tone):</label>
              <select value={tone} onChange={e => setTone(e.target.value)} className="form-control" style={{ background: '#fff' }}>
                <option value="chuyên nghiệp và thuyết phục">Chuyên nghiệp, uy tín</option>
                <option value="hấp dẫn, thúc đẩy mua hàng (chương trình khuyến mãi)">Khuyến mãi, thúc đẩy chốt sale</option>
                <option value="ngắn gọn, tập trung vào thông số kỹ thuật">Ngắn gọn, thuần kỹ thuật</option>
                <option value="thân thiện, gần gũi">Thân thiện, gần gũi</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button 
                onClick={handleGenerate} 
                disabled={loadingAi}
                className="btn-primary" 
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', height: '42px', padding: '0 1.5rem' }}
              >
                {loadingAi ? 'Đang viết...' : <><FaMagic /> Tự động viết bài</>}
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 600 }}>
              Nội dung bài viết (Có thể chỉnh sửa):
            </label>
            <textarea 
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Bấm nút 'Tự động viết bài' ở trên để AI tạo nội dung cho chiếc xe này..."
              style={{ 
                width: '100%', height: '250px', padding: '1rem', 
                borderRadius: '8px', border: '1px solid #cbd5e1',
                resize: 'vertical', fontFamily: 'inherit', fontSize: '0.95rem'
              }}
            />
            {imageUrl && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#64748b' }}>
                <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓</span> Bài đăng sẽ kèm theo ảnh chính của xe: <a href={imageUrl} target="_blank" rel="noreferrer">Xem ảnh</a>
              </div>
            )}
          </div>

          <div style={{ background: '#f0f9ff', padding: '1rem', borderRadius: '8px', border: '1px solid #bae6fd' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 600, color: '#0369a1' }}>
              Đăng lên Fanpage đích:
            </label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <select 
                value={selectedPageId} 
                onChange={e => setSelectedPageId(e.target.value)} 
                className="form-control" 
                style={{ flex: 1, background: '#fff' }}
              >
                <option value="">-- Chọn Fanpage --</option>
                {pages.map(p => (
                  <option key={p.pageId} value={p.pageId}>{p.pageName}</option>
                ))}
              </select>
              <button 
                onClick={handlePublish}
                disabled={loadingPublish || !content || !selectedPageId}
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#1877f2', borderColor: '#1877f2' }}
              >
                {loadingPublish ? 'Đang đăng...' : <><FaFacebook /> Đăng ngay</>}
              </button>
            </div>
          </div>

          {publishStatus && (
            <div style={{ 
              marginTop: '1rem', padding: '1rem', borderRadius: '8px',
              backgroundColor: publishStatus.success ? '#dcfce7' : '#fee2e2',
              color: publishStatus.success ? '#166534' : '#991b1b',
              fontWeight: 500
            }}>
              {publishStatus.message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
