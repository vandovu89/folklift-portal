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
  const [availableImages, setAvailableImages] = useState<string[]>([]);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [attachImages, setAttachImages] = useState(true);
  const [pages, setPages] = useState<any[]>([]);
  const [selectedPageId, setSelectedPageId] = useState('');
  const [tone, setTone] = useState('chuyên nghiệp và thuyết phục');
  const [publishStatus, setPublishStatus] = useState<{ success: boolean; message: string } | null>(null);

  // Fetch available pages and forklift images on open
  useEffect(() => {
    if (isOpen) {
      fetch('/api/facebook-pages')
        .then(res => res.json())
        .then(data => {
          if (data.success && Array.isArray(data.pages)) {
            setPages(data.pages);
            if (data.pages.length > 0) setSelectedPageId(data.pages[0].pageId);
          }
        })
        .catch(console.error);

      if (forkliftId) {
        fetch(`/api/forklifts/${forkliftId}/images`)
          .then(res => res.json())
          .then(data => {
            if (data.success && Array.isArray(data.images)) {
              setAvailableImages(data.images);
              setSelectedImages(data.images);
            }
          })
          .catch(console.error);
      }
    } else {
      setContent('');
      setPublishStatus(null);
    }
  }, [isOpen, forkliftId]);

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
        if (Array.isArray(data.images) && data.images.length > 0) {
          setAvailableImages(data.images);
          if (selectedImages.length === 0) {
            setSelectedImages(data.images);
          }
        }
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
      const targetImages = attachImages ? selectedImages : [];
      const res = await fetch('/api/facebook/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageId: selectedPageId,
          message: content,
          images: targetImages,
          imageUrl: targetImages[0] || null
        })
      });
      const data = await res.json();
      if (data.success) {
        setPublishStatus({ success: true, message: `Đăng bài thành công lên Fanpage! (${targetImages.length > 0 ? `Đã kèm ${targetImages.length} ảnh` : 'Bài viết dạng chữ'})` });
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
        background: '#fff', width: '100%', maxWidth: '720px',
        borderRadius: '12px', display: 'flex', flexDirection: 'column',
        maxHeight: '92vh', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)'
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
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.2rem' }}>
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

          <div style={{ marginBottom: '1.2rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 600 }}>
              Nội dung bài viết Facebook (Có thể chỉnh sửa):
            </label>
            <textarea 
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Bấm nút 'Tự động viết bài' ở trên để AI tạo nội dung cho chiếc xe này..."
              style={{ 
                width: '100%', height: '220px', padding: '1rem', 
                borderRadius: '8px', border: '1px solid #cbd5e1',
                resize: 'vertical', fontFamily: 'inherit', fontSize: '0.95rem',
                lineHeight: '1.5'
              }}
            />
          </div>

          {/* Khu vực chọn hình ảnh đính kèm */}
          <div style={{ 
            marginBottom: '1.2rem', 
            background: '#f8fafc', 
            padding: '1rem', 
            borderRadius: '8px', 
            border: '1px solid #e2e8f0' 
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: attachImages && availableImages.length > 0 ? '0.75rem' : '0' 
            }}>
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem', 
                cursor: 'pointer', 
                fontWeight: 600, 
                fontSize: '0.9rem', 
                color: '#1e293b', 
                margin: 0,
                userSelect: 'none'
              }}>
                <input 
                  type="checkbox" 
                  checked={attachImages} 
                  onChange={e => setAttachImages(e.target.checked)} 
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <span>Đăng kèm hình ảnh xe nâng ({selectedImages.length}/{availableImages.length} ảnh đã chọn)</span>
              </label>

              {attachImages && availableImages.length > 0 && (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    type="button" 
                    onClick={() => setSelectedImages([...availableImages])}
                    style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', color: '#475569' }}
                  >
                    Chọn tất cả
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setSelectedImages([])}
                    style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', color: '#475569' }}
                  >
                    Bỏ chọn
                  </button>
                </div>
              )}
            </div>

            {attachImages && (
              <div>
                {availableImages.length === 0 ? (
                  <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic', marginTop: '0.25rem' }}>
                    Xe chưa có hình ảnh nào trong thư viện media.
                  </div>
                ) : (
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(75px, 1fr))', 
                    gap: '0.5rem', 
                    maxHeight: '160px', 
                    overflowY: 'auto',
                    padding: '0.25rem 0.1rem'
                  }}>
                    {availableImages.map((imgUrl, idx) => {
                      const isSelected = selectedImages.includes(imgUrl);
                      return (
                        <div 
                          key={idx}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedImages(selectedImages.filter(url => url !== imgUrl));
                            } else {
                              setSelectedImages([...selectedImages, imgUrl]);
                            }
                          }}
                          style={{
                            position: 'relative',
                            aspectRatio: '1',
                            borderRadius: '6px',
                            overflow: 'hidden',
                            cursor: 'pointer',
                            border: isSelected ? '3px solid #2563eb' : '1px solid #cbd5e1',
                            opacity: isSelected ? 1 : 0.45,
                            transition: 'all 0.15s ease-in-out'
                          }}
                          title={isSelected ? 'Nhấn để bỏ chọn' : 'Nhấn để chọn ảnh này'}
                        >
                          <img 
                            src={imgUrl} 
                            alt={`Xe nâng ${idx + 1}`} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                          />
                          {isSelected && (
                            <div style={{
                              position: 'absolute',
                              top: '3px',
                              right: '3px',
                              background: '#2563eb',
                              color: '#fff',
                              borderRadius: '50%',
                              width: '18px',
                              height: '18px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '11px',
                              fontWeight: 'bold',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                            }}>
                              ✓
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
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
