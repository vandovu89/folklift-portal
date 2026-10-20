'use client';

import { useState, useEffect } from 'react';
import { FaVideo, FaTimes, FaMagic, FaUpload, FaPlay, FaFacebook, FaRobot } from 'react-icons/fa';
import { uploadMediaDirectly } from '@/lib/upload';

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
  const [aiAudioUrl, setAiAudioUrl] = useState('');
  const [selectedVoice, setSelectedVoice] = useState('7o71dj6r5wK2rRwMRJhN');
  const [audioMode, setAudioMode] = useState('replace');

  // Fetch current data
  useEffect(() => {
    if (isOpen && forkliftId) {
      fetch(`/api/forklifts/${forkliftId}`)
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then(data => {
          if (data && !data.error) {
            setScript(data.aiVideoScript || '');
            setRawVideoUrl(data.rawVideoUrl || '');
            setAiVideoUrl(data.aiVideoUrl || '');
            const voiceoverMedia = data.media?.find((m: any) => m.category === 'AI_VOICEOVER');
            if (voiceoverMedia?.url) {
              setAiAudioUrl(voiceoverMedia.url);
            }
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

    try {
      // Tải trực tiếp lên Cloudinary CDN để không bị giới hạn 4.5MB của serverless (Vercel)
      const result = await uploadMediaDirectly(file, {
        forkliftId,
        category: 'RAW_VIDEO',
        isPublic: false
      });

      if (result.success && result.url) {
        setRawVideoUrl(result.url);
        await fetch(`/api/forklifts/${forkliftId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rawVideoUrl: result.url })
        });
      }
    } catch (error: any) {
      console.error('Upload video error:', error);
      alert('Lỗi tải video: ' + (error.message || 'Lỗi hệ thống khi tải video lên'));
    } finally {
      setUploadingRaw(false);
      e.target.value = '';
    }
  };

  const handleCreateVideo = async () => {
    if (!rawVideoUrl) return alert('Vui lòng upload video gốc trước.');
    if (!script) return alert('Vui lòng sinh kịch bản trước.');

    setLoadingVideo(true);
    try {
      const res = await fetch('/api/ai/video-render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          forkliftId,
          script,
          rawVideoUrl,
          voiceId: selectedVoice,
          audioMode
        })
      });
      const data = await res.json();
      if (data.success) {
        setAiVideoUrl(data.videoUrl);
        if (data.audioUrl) {
          setAiAudioUrl(data.audioUrl);
        }
      } else {
        alert('Lỗi tạo video: ' + data.error);
      }
    } catch (error: any) {
      alert('Lỗi hệ thống: ' + (error.message || 'Lỗi không xác định'));
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

        <div style={{ padding: 'clamp(1rem, 3vw, 1.5rem)', overflowY: 'auto', flex: 1, color: '#333' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '1.5rem' }}>
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

              {/* Bước 2: Kịch bản & Giọng đọc */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <h4 style={{ margin: 0, color: '#475569' }}>Bước 2: Lên kịch bản & Chọn giọng đọc</h4>
                  <button onClick={handleGenerateScript} disabled={loadingScript} style={{ background: 'none', border: 'none', color: '#8b5cf6', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem', fontWeight: 600 }}>
                    <FaMagic /> {loadingScript ? 'Đang viết...' : 'AI Viết Kịch Bản'}
                  </button>
                </div>
                <textarea 
                  value={script}
                  onChange={e => setScript(e.target.value)}
                  placeholder="Kịch bản lời thoại sẽ được AI tự động sinh ra dựa trên thông số của chiếc xe này..."
                  style={{ 
                    width: '100%', height: '140px', padding: '0.8rem', 
                    borderRadius: '8px', border: '1px solid #cbd5e1',
                    resize: 'vertical', fontFamily: 'inherit', fontSize: '0.9rem'
                  }}
                />

                <div style={{ marginTop: '0.8rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>
                      🎙️ Giọng đọc AI:
                    </label>
                    <select
                      value={selectedVoice}
                      onChange={e => setSelectedVoice(e.target.value)}
                      style={{
                        width: '100%', padding: '0.5rem', borderRadius: '6px',
                        border: '1px solid #cbd5e1', fontSize: '0.82rem', background: '#fff'
                      }}
                    >
                      <option value="7o71dj6r5wK2rRwMRJhN">Xe Nâng MCK (Nam - Giọng Bắc)</option>
                      <option value="EXAVITQu4vr4xnSDxMaL">Sarah (Nữ - Truyền cảm & Tự nhiên)</option>
                      <option value="IKne3meq5aSn9XLyUdCD">Charlie (Nam - Trầm ấm, Quyết đoán)</option>
                      <option value="hpp4J3VqNfWAUOO0d1Us">Bella (Nữ - Tươi sáng, Chuyên nghiệp)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>
                      🔊 Xử lý âm thanh xe:
                    </label>
                    <select
                      value={audioMode}
                      onChange={e => setAudioMode(e.target.value)}
                      style={{
                        width: '100%', padding: '0.5rem', borderRadius: '6px',
                        border: '1px solid #cbd5e1', fontSize: '0.82rem', background: '#fff'
                      }}
                    >
                      <option value="replace">Tắt tiếng ồn gốc (Chỉ giữ lời đọc AI)</option>
                      <option value="mix">Hòa âm (-30% tiếng máy xe + Lời đọc AI)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Cột phải: Output */}
            <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
              <h4 style={{ margin: '0 0 1rem 0', color: '#475569' }}>Bước 3: Thành phẩm Video AI</h4>
              
              {!aiVideoUrl ? (
                <div style={{ textAlign: 'center', padding: '2.5rem 1rem', margin: 'auto 0' }}>
                  <div style={{ 
                    width: '60px', height: '60px', borderRadius: '50%', background: '#ede9fe', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto'
                  }}>
                    <FaRobot size={30} color="#8b5cf6" />
                  </div>
                  <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.9rem', lineHeight: 1.5 }}>
                    {loadingVideo 
                      ? 'Đang gọi ElevenLabs tạo giọng đọc chuẩn tiếng Việt & lồng ghép âm thanh vào video qua Cloudinary...' 
                      : 'AI sẽ tự động đọc kịch bản bằng giọng nói truyền cảm (Voice Cloning) và lồng ghép âm thanh chuẩn vào video xe của bạn.'}
                  </p>
                  <button 
                    onClick={handleCreateVideo}
                    disabled={loadingVideo || !rawVideoUrl || !script}
                    className="btn-primary"
                    style={{ background: '#8b5cf6', borderColor: '#8b5cf6', padding: '0.8rem 2rem', fontSize: '0.95rem', width: '100%', display: 'flex', justifyContent: 'center', gap: '0.5rem', alignItems: 'center' }}
                  >
                    {loadingVideo ? 'Đang tạo giọng đọc & lồng tiếng video...' : <><FaPlay /> Tạo Video Lồng Tiếng AI</>}
                  </button>
                </div>
              ) : (
                <div>
                  <video src={aiVideoUrl} controls autoPlay style={{ width: '100%', borderRadius: '8px', background: '#000', marginBottom: '0.8rem', maxHeight: '240px' }} />
                  
                  {aiAudioUrl && (
                    <div style={{ background: '#f1f5f9', padding: '0.75rem', borderRadius: '8px', marginBottom: '0.8rem', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>
                          🎧 File thu âm giọng đọc AI (MP3):
                        </span>
                        <a href={aiAudioUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', color: '#8b5cf6', textDecoration: 'underline' }}>
                          Nghe / Tải MP3
                        </a>
                      </div>
                      <audio src={aiAudioUrl} controls style={{ width: '100%', height: '36px' }} />
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', marginBottom: '0.8rem' }}>
                    <button 
                      onClick={handleCreateVideo}
                      disabled={loadingVideo}
                      className="btn-secondary"
                      style={{ width: '100%', fontSize: '0.85rem' }}
                    >
                      {loadingVideo ? 'Đang xử lý...' : 'Tạo lại Video'}
                    </button>
                    
                    <button 
                      className="btn-primary"
                      style={{ background: '#1877f2', borderColor: '#1877f2', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.85rem' }}
                      onClick={() => alert('Chức năng đang được tích hợp Facebook API')}
                    >
                      <FaFacebook /> Đăng lên Reels
                    </button>
                  </div>

                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch(`/api/forklifts/${forkliftId}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ videoUrl: aiVideoUrl })
                        });
                        if (res.ok) {
                          alert('Đã gắn video thành công làm Video Review chính thức của xe!');
                          onClose();
                        } else {
                          alert('Lỗi cập nhật');
                        }
                      } catch (e) {
                        alert('Lỗi kết nối');
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      boxShadow: '0 4px 12px rgba(16,185,129,0.25)'
                    }}
                  >
                    🎬 Gắn Làm Video Review Chính Của Xe (Xem trên web & Bot)
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
