'use client';

import { useState, useEffect } from 'react';
import { FaVideo, FaTimes, FaMagic, FaUpload, FaPlay, FaFacebook, FaRobot } from 'react-icons/fa';

interface AiVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  forkliftId: string;
}

export default function AiVideoModal({ isOpen, onClose, forkliftId }: AiVideoModalProps) {
  const [loadingScript, setLoadingScript] = useState(false);
  const [loadingVideo, setLoadingVideo] = useState(false);
  const [uploadingRaw, setUploadingRaw] = useState(false);
  
  const [script, setScript] = useState('');
  const [rawVideoUrl, setRawVideoUrl] = useState('');
  const [aiVideoUrl, setAiVideoUrl] = useState('');

  // Fetch current data
  useEffect(() => {
    if (isOpen && forkliftId) {
      fetch(`/api/forklifts/${forkliftId}`)
        .then(res => res.json())
        .then(data => {
          if (data) {
            setScript(data.aiVideoScript || '');
            setRawVideoUrl(data.rawVideoUrl || '');
            setAiVideoUrl(data.aiVideoUrl || '');
          }
        })
        .catch(console.error);
    }
  }, [isOpen, forkliftId]);

  const handleGenerateScript = async () => {
    setLoadingScript(true);
    try {
      const res = await fetch('/api/ai/video-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forkliftId })
      });
      const data = await res.json();
      if (data.success) {
        setScript(data.script);
        // Save to DB
        await fetch(`/api/forklifts/${forkliftId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ aiVideoScript: data.script })
        });
      } else {
        alert('Lỗi: ' + data.error);
      }
    } catch (error) {
      alert('Lỗi hệ thống');
    }
    setLoadingScript(false);
  };

  const handleUploadRawVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setUploadingRaw(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('forkliftId', forkliftId);
    formData.append('category', 'RAW_VIDEO');
    formData.append('isPublic', 'false');

    try {
      const res = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setRawVideoUrl(data.media.url);
        await fetch(`/api/forklifts/${forkliftId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rawVideoUrl: data.media.url })
        });
      } else {
        alert('Lỗi upload: ' + data.error);
      }
    } catch (error) {
      alert('Lỗi hệ thống khi upload');
    }
    setUploadingRaw(false);
  };

  const handleCreateVideo = async () => {
    if (!rawVideoUrl) return alert('Vui lòng upload video gốc trước.');
    if (!script) return alert('Vui lòng sinh kịch bản trước.');

    setLoadingVideo(true);
    try {
      const res = await fetch('/api/ai/video-render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forkliftId, script, rawVideoUrl })
      });
      const data = await res.json();
      if (data.success) {
        setAiVideoUrl(data.videoUrl);
      } else {
        alert('Lỗi tạo video: ' + data.error);
      }
    } catch (error) {
      alert('Lỗi hệ thống');
    }
    setLoadingVideo(false);
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
        background: '#fff', width: '100%', maxWidth: '900px',
        borderRadius: '12px', display: 'flex', flexDirection: 'column',
        maxHeight: '90vh', overflow: 'hidden'
      }}>
        <div style={{ 
          padding: '1.2rem', borderBottom: '1px solid #eee', 
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          backgroundColor: '#f8fafc'
        }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e293b' }}>
            <FaVideo color="#8b5cf6" /> AI Video Sales Assistant
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#64748b' }}>
            <FaTimes />
          </button>
        </div>

        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, color: '#333' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            {/* Cột trái: Input */}
            <div>
              {/* Bước 1: Video gốc */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#475569' }}>Bước 1: Video quay xe thực tế</h4>
                {rawVideoUrl ? (
                  <div style={{ position: 'relative' }}>
                    <video src={rawVideoUrl} controls style={{ width: '100%', borderRadius: '8px', background: '#000' }} />
                    <label className="btn-secondary" style={{ display: 'block', textAlign: 'center', marginTop: '0.5rem', cursor: 'pointer' }}>
                      {uploadingRaw ? 'Đang tải lên...' : 'Thay đổi video gốc'}
                      <input type="file" accept="video/*" hidden onChange={handleUploadRawVideo} disabled={uploadingRaw} />
                    </label>
                  </div>
                ) : (
                  <div style={{ 
                    border: '2px dashed #cbd5e1', padding: '2rem', textAlign: 'center', 
                    borderRadius: '8px', background: '#f8fafc' 
                  }}>
                    <FaUpload size={24} color="#94a3b8" style={{ marginBottom: '0.5rem' }} />
                    <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: '#64748b' }}>Tải lên video thô bạn vừa quay bằng điện thoại</p>
                    <label className="btn-secondary" style={{ cursor: 'pointer' }}>
                      {uploadingRaw ? 'Đang tải lên...' : 'Chọn Video'}
                      <input type="file" accept="video/*" hidden onChange={handleUploadRawVideo} disabled={uploadingRaw} />
                    </label>
                  </div>
                )}
              </div>

              {/* Bước 2: Kịch bản */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <h4 style={{ margin: 0, color: '#475569' }}>Bước 2: Lên kịch bản lồng tiếng</h4>
                  <button onClick={handleGenerateScript} disabled={loadingScript} style={{ background: 'none', border: 'none', color: '#8b5cf6', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem', fontWeight: 600 }}>
                    <FaMagic /> {loadingScript ? 'Đang viết...' : 'AI Viết Kịch Bản'}
                  </button>
                </div>
                <textarea 
                  value={script}
                  onChange={e => setScript(e.target.value)}
                  placeholder="Kịch bản lời thoại sẽ được AI tự động sinh ra dựa trên thông số của chiếc xe này..."
                  style={{ 
                    width: '100%', height: '180px', padding: '1rem', 
                    borderRadius: '8px', border: '1px solid #cbd5e1',
                    resize: 'vertical', fontFamily: 'inherit', fontSize: '0.95rem'
                  }}
                />
              </div>
            </div>

            {/* Cột phải: Output */}
            <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <h4 style={{ margin: '0 0 1rem 0', color: '#475569' }}>Bước 3: Thành phẩm Video AI</h4>
              
              {!aiVideoUrl ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                  <div style={{ 
                    width: '60px', height: '60px', borderRadius: '50%', background: '#ede9fe', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto'
                  }}>
                    <FaRobot size={30} color="#8b5cf6" />
                  </div>
                  <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
                    AI sẽ tự động đọc kịch bản bằng giọng nói chuẩn (Voice Cloning) và lồng ghép vào video gốc của bạn.
                  </p>
                  <button 
                    onClick={handleCreateVideo}
                    disabled={loadingVideo || !rawVideoUrl || !script}
                    className="btn-primary"
                    style={{ background: '#8b5cf6', borderColor: '#8b5cf6', padding: '0.8rem 2rem', fontSize: '1rem', width: '100%', display: 'flex', justifyContent: 'center', gap: '0.5rem', alignItems: 'center' }}
                  >
                    {loadingVideo ? 'Đang xử lý Video...' : <><FaPlay /> Tạo Video AI Ngay</>}
                  </button>
                </div>
              ) : (
                <div>
                  <video src={aiVideoUrl} controls autoPlay style={{ width: '100%', borderRadius: '8px', background: '#000', marginBottom: '1rem' }} />
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <button 
                      onClick={handleCreateVideo}
                      disabled={loadingVideo}
                      className="btn-secondary"
                      style={{ width: '100%' }}
                    >
                      {loadingVideo ? 'Đang xử lý...' : 'Tạo lại Video'}
                    </button>
                    
                    <button 
                      className="btn-primary"
                      style={{ background: '#1877f2', borderColor: '#1877f2', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                      onClick={() => alert('Chức năng đang được tích hợp Facebook API')}
                    >
                      <FaFacebook /> Đăng lên Reels
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
