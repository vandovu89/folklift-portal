'use client';

import { useState, useEffect } from 'react';
import { FaVideo, FaTimes, FaMagic, FaUpload, FaPlay, FaFacebook, FaRobot, FaArrowUp, FaArrowDown, FaTrash, FaVolumeUp, FaStop } from 'react-icons/fa';
import { uploadMediaDirectly } from '@/lib/upload';
import { countSpokenWords, wordsPerSecond, TTS_MODELS, DEFAULT_TTS_MODEL, type TtsModelId } from '@/lib/vietnamese-tts';
import { SCRIPT_STYLES, VIDEO_FORMATS, DEFAULT_VIDEO_FORMAT, MAX_CLIPS, DEFAULT_VOICE_ID, FALLBACK_VOICES, voiceLabel, type ScriptStyle, type VideoFormat, type VoiceOption } from '@/lib/ai-video';

interface AiVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  forkliftId: string;
}

// Một đoạn video gốc trong danh sách ghép (id = bản ghi Media RAW_VIDEO, có thể thiếu với dữ liệu cũ)
interface Clip {
  id?: string;
  url: string;
  duration: number;
}

interface MediaRecord {
  id: string;
  url: string;
  category: string | null;
  fileType: string;
  order: number;
  createdAt: string;
}

type VideoStatus = 'idle' | 'processing' | 'ready' | 'timeout';

function formatDuration(sec: number): string {
  if (!sec || isNaN(sec)) return '0s';
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  if (m > 0) return `${m}p ${s > 0 ? (s < 10 ? '0' : '') + s + 's' : ''}`;
  return `${s}s`;
}

const ACCEPT_VIDEO = 'video/*,video/mp4,video/quicktime,.mp4,.mov,.avi,.mkv,.webm,.m4v,.3gp';
const selectStyle = {
  width: '100%', padding: '0.45rem', borderRadius: '6px',
  border: '1px solid #cbd5e1', fontSize: '0.82rem', background: '#fff'
};
const labelStyle = { fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.25rem' } as const;

function readLocalDuration(file: File): Promise<number> {
  return new Promise(resolve => {
    const el = document.createElement('video');
    el.preload = 'metadata';
    el.src = URL.createObjectURL(file);
    el.onloadedmetadata = () => {
      URL.revokeObjectURL(el.src);
      resolve(Math.round(el.duration) || 0);
    };
    el.onerror = () => resolve(0);
  });
}

export default function AiVideoModal({ isOpen, onClose, forkliftId }: AiVideoModalProps) {
  const [loadingScript, setLoadingScript] = useState(false);
  const [loadingVideo, setLoadingVideo] = useState(false);
  const [uploadingRaw, setUploadingRaw] = useState('');

  const [script, setScript] = useState('');
  const [clips, setClips] = useState<Clip[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [aiVideoUrl, setAiVideoUrl] = useState('');
  const [videoStatus, setVideoStatus] = useState<VideoStatus>('idle');
  const [aiAudioUrl, setAiAudioUrl] = useState('');
  const [selectedVoice, setSelectedVoice] = useState(DEFAULT_VOICE_ID);
  const [voices, setVoices] = useState<VoiceOption[]>(FALLBACK_VOICES);
  const [voicesError, setVoicesError] = useState('');
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);
  const [ttsModel, setTtsModel] = useState<TtsModelId>(DEFAULT_TTS_MODEL);
  const [audioMode, setAudioMode] = useState('replace');
  const [speed, setSpeed] = useState('0.95');
  const [videoFormat, setVideoFormat] = useState<VideoFormat>(DEFAULT_VIDEO_FORMAT);
  const [scriptStyle, setScriptStyle] = useState<ScriptStyle>('random');
  const [scriptNote, setScriptNote] = useState('');
  const [appliedStyle, setAppliedStyle] = useState<ScriptStyle | null>(null);
  const [targetDurationOption, setTargetDurationOption] = useState<string>('auto');
  const [renderInfo, setRenderInfo] = useState<{ audioDuration?: number; appliedSpeed?: number; warning?: string } | null>(null);

  // Tổng thời lượng các clip sẽ ghép = thời lượng video thành phẩm
  const videoDuration = clips.reduce((sum, c) => sum + (c.duration || 0), 0);

  // Tải dữ liệu hiện có: kịch bản, danh sách clip gốc (Media RAW_VIDEO), video AI & giọng đọc gần nhất
  useEffect(() => {
    if (!isOpen || !forkliftId) return;
    fetch(`/api/forklifts/${forkliftId}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (!data || data.error) return;
        const media: MediaRecord[] = data.media || [];
        setScript(data.aiVideoScript || '');
        setAiVideoUrl(data.aiVideoUrl || '');
        setVideoStatus(data.aiVideoUrl ? 'ready' : 'idle');

        const rawClips = media
          .filter(m => m.category === 'RAW_VIDEO' && m.fileType === 'VIDEO')
          .sort((a, b) => a.order - b.order || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
          .map(m => ({ id: m.id, url: m.url, duration: 0 }));
        setClips(rawClips.length > 0 ? rawClips : data.rawVideoUrl ? [{ url: data.rawVideoUrl, duration: 0 }] : []);
        setPreviewIndex(0);

        const latestVoiceover = media
          .filter(m => m.category === 'AI_VOICEOVER')
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
        if (latestVoiceover?.url) setAiAudioUrl(latestVoiceover.url);
      })
      .catch(console.error);
  }, [isOpen, forkliftId]);

  // Danh sách giọng trong tài khoản ElevenLabs (gồm các giọng mới thêm / clone)
  const loadVoices = (refresh = false) =>
    fetch(`/api/ai/voices${refresh ? '?refresh=1' : ''}`)
      .then(async res => {
        const data = await res.json();
        if (!res.ok || !Array.isArray(data.voices)) throw new Error(data.error || `HTTP ${res.status}`);
        setVoices(data.voices.length > 0 ? data.voices : FALLBACK_VOICES);
        setVoicesError('');
      })
      .catch(err => setVoicesError(err instanceof Error ? err.message : 'Không tải được danh sách giọng'));

  useEffect(() => {
    if (isOpen) loadVoices();
  }, [isOpen]);

  // Dừng nghe thử khi đóng modal
  useEffect(() => {
    if (!isOpen && previewAudio) previewAudio.pause();
  }, [isOpen, previewAudio]);

  const togglePreviewVoice = () => {
    if (previewAudio && !previewAudio.paused) {
      previewAudio.pause();
      setPreviewAudio(null);
      return;
    }
    const url = voices.find(v => v.id === selectedVoice)?.previewUrl;
    if (!url) return;
    const audio = new Audio(url);
    audio.onended = () => setPreviewAudio(null);
    audio.play().catch(() => setPreviewAudio(null));
    setPreviewAudio(audio);
  };

  // Đo thời lượng các clip chưa biết duration từ metadata video
  useEffect(() => {
    const pending = clips.filter(c => !c.duration);
    const elements = pending.map(clip => {
      const el = document.createElement('video');
      el.preload = 'metadata';
      el.src = clip.url;
      el.onloadedmetadata = () => {
        const dur = Math.round(el.duration);
        if (dur > 0) setClips(prev => prev.map(c => (c.url === clip.url && !c.duration ? { ...c, duration: dur } : c)));
      };
      return el;
    });
    return () => elements.forEach(el => { el.onloadedmetadata = null; el.src = ''; });
  }, [clips]);

  // Lưu thứ tự clip (Media.order) và giữ rawVideoUrl = clip đầu tiên để tương thích dữ liệu cũ
  const persistClips = async (next: Clip[]) => {
    const withId = next.filter((c): c is Clip & { id: string } => Boolean(c.id));
    try {
      if (withId.length > 0) {
        await fetch('/api/media/reorder', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: withId.map((c, i) => ({ id: c.id, order: i })) })
        });
      }
      await fetch(`/api/forklifts/${forkliftId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawVideoUrl: next[0]?.url || null })
      });
    } catch (err) {
      console.error('Persist clips error:', err);
    }
  };

  const handleUploadClips = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;
    if (clips.length + files.length > MAX_CLIPS) {
      alert(`Chỉ ghép tối đa ${MAX_CLIPS} clip cho một video.`);
      return;
    }

    let next = [...clips];
    try {
      for (let i = 0; i < files.length; i++) {
        setUploadingRaw(`Đang tải clip ${i + 1}/${files.length}...`);
        const localDuration = await readLocalDuration(files[i]);
        // Tải trực tiếp lên Cloudinary CDN để không bị giới hạn 4.5MB của serverless (Vercel)
        const result = await uploadMediaDirectly(files[i], { forkliftId, category: 'RAW_VIDEO', isPublic: false });
        if (result.success && result.url) {
          next = [...next, { id: result.media?.id, url: result.url, duration: result.duration || localDuration }];
          setClips(next);
        }
      }
    } catch (error) {
      console.error('Upload video error:', error);
      alert('Lỗi tải video: ' + (error instanceof Error ? error.message : 'Lỗi hệ thống khi tải video lên'));
    } finally {
      setUploadingRaw('');
      await persistClips(next);
    }
  };

  const moveClip = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= clips.length) return;
    const next = [...clips];
    [next[index], next[target]] = [next[target], next[index]];
    setClips(next);
    setPreviewIndex(target);
    persistClips(next);
  };

  const removeClip = async (index: number) => {
    const clip = clips[index];
    if (!confirm(`Xóa clip #${index + 1} khỏi danh sách ghép? File video gốc sẽ bị xóa khỏi thư viện.`)) return;
    if (clip.id) {
      const res = await fetch(`/api/media/${clip.id}`, { method: 'DELETE' });
      if (!res.ok) return alert('Không xóa được clip.');
    }
    const next = clips.filter((_, i) => i !== index);
    setClips(next);
    setPreviewIndex(0);
    persistClips(next);
  };

  const handleGenerateScript = async () => {
    setLoadingScript(true);
    try {
      const effectiveDuration = targetDurationOption === 'auto'
        ? (videoDuration > 0 ? videoDuration : 60)
        : (parseInt(targetDurationOption) || videoDuration || 60);

      const res = await fetch('/api/ai/video-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forkliftId, duration: effectiveDuration, speed, ttsModel, style: scriptStyle, note: scriptNote })
      });
      const data = await res.json();
      if (data.success) {
        setScript(data.script);
        setAppliedStyle(data.style || null);
        await fetch(`/api/forklifts/${forkliftId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ aiVideoScript: data.script })
        });
      } else {
        alert('Lỗi: ' + data.error);
      }
    } catch {
      alert('Lỗi hệ thống');
    }
    setLoadingScript(false);
  };

  // Video ghép được Cloudinary dựng lần đầu (có thể mất 1-3 phút, trong lúc đó URL trả lỗi 423):
  // thăm dò bằng thẻ <video> ẩn (không vướng CORS) đến khi đọc được metadata rồi mới hiển thị trình phát
  const probeVideo = (url: string) => new Promise<boolean>(resolve => {
    const el = document.createElement('video');
    el.preload = 'metadata';
    const done = (ok: boolean) => { el.onloadedmetadata = null; el.onerror = null; el.src = ''; resolve(ok); };
    el.onloadedmetadata = () => done(true);
    el.onerror = () => done(false);
    el.src = url;
  });

  const waitForVideo = async (url: string) => {
    setVideoStatus('processing');
    // Thử tối đa ~45 lần x 8 giây (~6 phút)
    for (let attempt = 0; attempt < 45; attempt++) {
      if (await probeVideo(url)) {
        setVideoStatus('ready');
        return;
      }
      await new Promise(r => setTimeout(r, 8000));
    }
    setVideoStatus('timeout');
  };

  const handleCreateVideo = async () => {
    if (clips.length === 0) return alert('Vui lòng upload video gốc trước.');
    if (!script) return alert('Vui lòng sinh kịch bản trước.');

    setLoadingVideo(true);
    setRenderInfo(null);
    try {
      const res = await fetch('/api/ai/video-render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          forkliftId,
          script,
          clips: clips.map(c => c.url),
          voiceId: selectedVoice,
          ttsModel,
          audioMode,
          speed,
          videoFormat,
          videoDuration
        })
      });
      const data = await res.json();
      if (data.success) {
        setAiVideoUrl(data.videoUrl);
        if (data.audioUrl) setAiAudioUrl(data.audioUrl);
        setRenderInfo({ audioDuration: data.audioDuration, appliedSpeed: data.appliedSpeed, warning: data.warning });
        setLoadingVideo(false);
        await waitForVideo(data.videoUrl);
        return;
      }
      alert('Lỗi tạo video: ' + data.error);
    } catch (error) {
      alert('Lỗi hệ thống: ' + (error instanceof Error ? error.message : 'Lỗi không xác định'));
    }
    setLoadingVideo(false);
  };

  const spokenWords = script ? countSpokenWords(script) : 0;
  const estimatedSeconds = Math.round(spokenWords / wordsPerSecond(parseFloat(speed), ttsModel));
  const previewClip = clips[Math.min(previewIndex, clips.length - 1)];
  const isVertical = videoFormat !== 'horizontal';

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem'
    }}>
      <div className="glass-panel" style={{
        background: '#fff', width: '100%', maxWidth: '960px',
        borderRadius: '12px', display: 'flex', flexDirection: 'column',
        maxHeight: '92vh', overflow: 'hidden'
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
              {/* Bước 1: Các clip gốc */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ margin: '0 0 0.3rem 0', color: '#475569' }}>Bước 1: Các clip quay xe thực tế</h4>
                <p style={{ margin: '0 0 0.6rem', fontSize: '0.8rem', color: '#64748b' }}>
                  Tải lên nhiều clip ngắn ở các góc khác nhau, hệ thống sẽ ghép theo thứ tự bên dưới (tối đa {MAX_CLIPS} clip).
                </p>

                {previewClip && (
                  <video
                    key={previewClip.url}
                    src={previewClip.url}
                    controls
                    preload="metadata"
                    style={{ width: '100%', maxHeight: '260px', borderRadius: '8px', background: '#000', objectFit: 'contain' }}
                  />
                )}

                {clips.length > 0 && (
                  <div style={{ display: 'grid', gap: '0.35rem', marginTop: '0.5rem' }}>
                    {clips.map((clip, i) => (
                      <div
                        key={clip.id || clip.url}
                        onClick={() => setPreviewIndex(i)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.5rem',
                          borderRadius: '6px', cursor: 'pointer', fontSize: '0.82rem',
                          border: `1px solid ${i === previewIndex ? '#8b5cf6' : '#e2e8f0'}`,
                          background: i === previewIndex ? '#f5f3ff' : '#fff'
                        }}
                      >
                        <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#8b5cf6', color: '#fff', fontWeight: 700, fontSize: '0.72rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                        <span style={{ flex: 1, color: '#334155' }}>Clip {i + 1}</span>
                        <span style={{ color: '#64748b' }}>{clip.duration ? formatDuration(clip.duration) : '...'}</span>
                        <button type="button" title="Lên trước" disabled={i === 0} onClick={e => { e.stopPropagation(); moveClip(i, -1); }} style={{ background: 'none', border: 'none', cursor: i === 0 ? 'default' : 'pointer', color: i === 0 ? '#cbd5e1' : '#475569' }}><FaArrowUp /></button>
                        <button type="button" title="Xuống sau" disabled={i === clips.length - 1} onClick={e => { e.stopPropagation(); moveClip(i, 1); }} style={{ background: 'none', border: 'none', cursor: i === clips.length - 1 ? 'default' : 'pointer', color: i === clips.length - 1 ? '#cbd5e1' : '#475569' }}><FaArrowDown /></button>
                        <button type="button" title="Xóa clip" onClick={e => { e.stopPropagation(); removeClip(i); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}><FaTrash /></button>
                      </div>
                    ))}
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.35rem 0.6rem',
                      background: '#ede9fe', borderRadius: '6px', fontSize: '0.8rem', color: '#6d28d9', fontWeight: 600
                    }}>
                      <span>⏱️ Tổng thời lượng sau ghép: {formatDuration(videoDuration)} ({videoDuration} giây)</span>
                      <span style={{ fontSize: '0.75rem', color: '#7c3aed', fontWeight: 500 }}>Sẽ tự khớp kịch bản</span>
                    </div>
                  </div>
                )}

                <label
                  className="btn-secondary"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', marginTop: '0.5rem', cursor: 'pointer',
                    ...(clips.length === 0 ? { border: '2px dashed #cbd5e1', padding: '1.5rem', background: '#f8fafc' } : {})
                  }}
                >
                  <FaUpload /> {uploadingRaw || (clips.length === 0 ? 'Chọn video (có thể chọn nhiều clip cùng lúc)' : '+ Thêm clip')}
                  <input type="file" accept={ACCEPT_VIDEO} multiple hidden onChange={handleUploadClips} disabled={Boolean(uploadingRaw)} />
                </label>
              </div>

              {/* Bước 2: Kịch bản & Giọng đọc */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <h4 style={{ margin: 0, color: '#475569' }}>Bước 2: Lên kịch bản & Chọn giọng đọc</h4>
                  <button onClick={handleGenerateScript} disabled={loadingScript} style={{ background: 'none', border: 'none', color: '#8b5cf6', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem', fontWeight: 600 }}>
                    <FaMagic /> {loadingScript ? 'Đang viết...' : script ? 'Viết kiểu khác' : 'AI Viết Kịch Bản'}
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.6rem', marginBottom: '0.5rem' }}>
                  <div>
                    <label style={labelStyle}>🎨 Phong cách lời thoại:</label>
                    <select value={scriptStyle} onChange={e => setScriptStyle(e.target.value as ScriptStyle)} style={selectStyle}>
                      {(Object.keys(SCRIPT_STYLES) as ScriptStyle[]).map(key => (
                        <option key={key} value={key}>{SCRIPT_STYLES[key].label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>🎯 Độ dài kịch bản:</label>
                    <select value={targetDurationOption} onChange={e => setTargetDurationOption(e.target.value)} style={selectStyle}>
                      <option value="auto">
                        {videoDuration > 0 ? `Khớp tự động theo video (${formatDuration(videoDuration)})` : 'Khớp tự động theo video'}
                      </option>
                      <option value="30">30 giây (Ngắn gọn / Reels)</option>
                      <option value="60">60 giây (1 phút tiêu chuẩn)</option>
                      <option value="90">90 giây (1 phút 30s - Chi tiết)</option>
                      <option value="120">120 giây (2 phút - Đầy đủ)</option>
                    </select>
                  </div>
                </div>
                <input
                  value={scriptNote}
                  onChange={e => setScriptNote(e.target.value)}
                  maxLength={500}
                  placeholder="Ý chính muốn AI nhắc thêm (không bắt buộc): VD giảm 10 triệu tháng này, tặng máy lọc nước..."
                  style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', marginBottom: '0.5rem' }}
                />
                {appliedStyle && (
                  <div style={{ fontSize: '0.75rem', color: '#7c3aed', marginBottom: '0.35rem' }}>
                    Kịch bản vừa viết theo phong cách: <strong>{SCRIPT_STYLES[appliedStyle]?.label}</strong>
                  </div>
                )}

                <textarea
                  value={script}
                  onChange={e => setScript(e.target.value)}
                  placeholder="Kịch bản lời thoại sẽ được AI tự động sinh ra khớp chính xác với độ dài video..."
                  style={{
                    width: '100%', height: '130px', padding: '0.8rem',
                    borderRadius: '8px', border: '1px solid #cbd5e1',
                    resize: 'vertical', fontFamily: 'inherit', fontSize: '0.9rem'
                  }}
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                  <span>Độ dài: <strong>{spokenWords}</strong> từ</span>
                  <span style={{ color: estimatedSeconds > videoDuration && videoDuration > 0 ? '#dc2626' : undefined }}>
                    Ước tính đọc: ~<strong>{estimatedSeconds}s</strong> {videoDuration > 0 ? `(Video: ${formatDuration(videoDuration)})` : ''}
                  </span>
                </div>

                <div style={{ marginTop: '0.8rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.6rem' }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ ...labelStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>🎙️ Giọng đọc AI ({voices.length}):</span>
                      <button
                        type="button"
                        onClick={() => loadVoices(true)}
                        title="Tải lại danh sách giọng từ ElevenLabs (sau khi thêm giọng mới)"
                        style={{ background: 'none', border: 'none', color: '#8b5cf6', cursor: 'pointer', fontSize: '0.72rem', padding: 0 }}
                      >
                        ↻ Tải lại
                      </button>
                    </label>
                    <div style={{ display: 'flex', gap: '0.3rem' }}>
                      <select value={selectedVoice} onChange={e => { previewAudio?.pause(); setPreviewAudio(null); setSelectedVoice(e.target.value); }} style={{ ...selectStyle, flex: 1, minWidth: 0 }}>
                        {voices.some(v => v.language === 'vi') && (
                          <optgroup label="Giọng tiếng Việt">
                            {voices.filter(v => v.language === 'vi').map(v => <option key={v.id} value={v.id}>{voiceLabel(v)}</option>)}
                          </optgroup>
                        )}
                        {voices.some(v => v.language !== 'vi') && (
                          <optgroup label="Giọng khác (đọc tiếng Việt có thể lơ lớ)">
                            {voices.filter(v => v.language !== 'vi').map(v => <option key={v.id} value={v.id}>{voiceLabel(v)}</option>)}
                          </optgroup>
                        )}
                      </select>
                      <button
                        type="button"
                        onClick={togglePreviewVoice}
                        disabled={!voices.find(v => v.id === selectedVoice)?.previewUrl}
                        title="Nghe thử giọng mẫu"
                        style={{ flexShrink: 0, width: '34px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', color: '#8b5cf6', cursor: 'pointer' }}
                      >
                        {previewAudio ? <FaStop /> : <FaVolumeUp />}
                      </button>
                    </div>
                    {voicesError && <div style={{ fontSize: '0.7rem', color: '#dc2626', marginTop: '0.2rem' }}>{voicesError}</div>}
                  </div>

                  <div>
                    <label style={labelStyle}>🧠 Model giọng đọc:</label>
                    <select value={ttsModel} onChange={e => setTtsModel(e.target.value as TtsModelId)} style={selectStyle}>
                      {(Object.keys(TTS_MODELS) as TtsModelId[]).map(key => (
                        <option key={key} value={key}>{TTS_MODELS[key].label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={labelStyle}>⚡ Tốc độ đọc:</label>
                    <select value={speed} onChange={e => setSpeed(e.target.value)} style={selectStyle}>
                      <option value="0.95">Rõ chữ (0.95x - Chuẩn)</option>
                      <option value="1.0">Bình thường (1.0x)</option>
                      <option value="0.90">Chậm rãi (0.90x)</option>
                      <option value="1.05">Sôi nổi (1.05x)</option>
                    </select>
                  </div>

                  <div>
                    <label style={labelStyle}>🔊 Âm thanh xe:</label>
                    <select value={audioMode} onChange={e => setAudioMode(e.target.value)} style={selectStyle}>
                      <option value="replace">Tắt tiếng ồn gốc (Khuyên dùng)</option>
                      <option value="mix">Hòa âm (-30% máy xe)</option>
                    </select>
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>🖼️ Khung hình video:</label>
                    <select value={videoFormat} onChange={e => setVideoFormat(e.target.value as VideoFormat)} style={selectStyle}>
                      {(Object.keys(VIDEO_FORMATS) as VideoFormat[]).map(key => (
                        <option key={key} value={key}>{VIDEO_FORMATS[key].label}</option>
                      ))}
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
                      ? 'Đang gọi ElevenLabs tạo giọng đọc tiếng Việt, ghép clip & lồng tiếng video qua Cloudinary...'
                      : `AI sẽ đọc kịch bản, ghép ${clips.length > 1 ? `${clips.length} clip` : 'video'} theo thứ tự và xuất ${isVertical ? 'video dọc 9:16 sẵn sàng đăng Reels / TikTok / Shorts' : 'video ngang 16:9'}.`}
                  </p>
                  <button
                    onClick={handleCreateVideo}
                    disabled={loadingVideo || clips.length === 0 || !script || Boolean(uploadingRaw)}
                    className="btn-primary"
                    style={{ background: '#8b5cf6', borderColor: '#8b5cf6', padding: '0.8rem 2rem', fontSize: '0.95rem', width: '100%', display: 'flex', justifyContent: 'center', gap: '0.5rem', alignItems: 'center' }}
                  >
                    {loadingVideo ? 'Đang tạo giọng đọc & lồng tiếng video...' : <><FaPlay /> Tạo Video Lồng Tiếng AI</>}
                  </button>
                </div>
              ) : (
                <div>
                  {videoStatus === 'processing' ? (
                    <div style={{ background: '#0f172a', color: '#e2e8f0', borderRadius: '8px', padding: '2.5rem 1rem', textAlign: 'center', marginBottom: '0.8rem', fontSize: '0.85rem', lineHeight: 1.6 }}>
                      ⏳ Cloudinary đang ghép clip & dựng video...<br />
                      <span style={{ color: '#94a3b8' }}>Video dài có thể mất 1-3 phút, vui lòng không đóng cửa sổ.</span>
                    </div>
                  ) : videoStatus === 'timeout' ? (
                    <div style={{ background: '#fef3c7', color: '#92400e', borderRadius: '8px', padding: '1rem', marginBottom: '0.8rem', fontSize: '0.85rem' }}>
                      Video vẫn đang được xử lý lâu hơn dự kiến. <button type="button" onClick={() => waitForVideo(aiVideoUrl)} style={{ background: 'none', border: 'none', color: '#b45309', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>Kiểm tra lại</button>
                    </div>
                  ) : (
                    <video
                      key={aiVideoUrl}
                      src={aiVideoUrl}
                      controls
                      autoPlay
                      style={{ width: '100%', borderRadius: '8px', background: '#000', marginBottom: '0.8rem', maxHeight: '420px', objectFit: 'contain' }}
                    />
                  )}

                  {renderInfo?.audioDuration && (
                    <div style={{
                      padding: '0.5rem 0.65rem', borderRadius: '6px', marginBottom: '0.8rem', fontSize: '0.8rem',
                      background: renderInfo.warning ? '#fef3c7' : '#dcfce7',
                      color: renderInfo.warning ? '#92400e' : '#166534'
                    }}>
                      🎙️ Giọng đọc {renderInfo.audioDuration}s{videoDuration > 0 ? ` / video ${videoDuration}s` : ''}
                      {renderInfo.appliedSpeed && renderInfo.appliedSpeed !== parseFloat(speed) ? ` · đã tự chỉnh tốc độ ${speed}x → ${renderInfo.appliedSpeed}x` : ''}
                      {renderInfo.warning && <div style={{ marginTop: '0.25rem' }}>⚠️ {renderInfo.warning}</div>}
                    </div>
                  )}

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
                      disabled={loadingVideo || videoStatus === 'processing'}
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
                      } catch {
                        alert('Lỗi kết nối');
                      }
                    }}
                    disabled={videoStatus !== 'ready'}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 700,
                      cursor: videoStatus === 'ready' ? 'pointer' : 'not-allowed',
                      opacity: videoStatus === 'ready' ? 1 : 0.6,
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
