'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { FaArrowLeft, FaMagic, FaPlay, FaPlus, FaDownload, FaCheck, FaFacebook } from 'react-icons/fa';
import SceneCard from '@/components/studio/SceneCard';
import AssetPicker, { type StudioAssetItem } from '@/components/studio/AssetPicker';
import FacebookPublishDialog from '@/components/studio/FacebookPublishDialog';
import { getFbPublishDict } from '@/components/studio/facebook-publish-i18n';
import { labelStyle, inputStyle } from '@/components/studio/styles';
import { countSpokenWords, wordsPerSecond, TTS_MODELS, type TtsModelId } from '@/lib/vietnamese-tts';
import { SCRIPT_STYLES, VIDEO_FORMATS, FALLBACK_VOICES, voiceLabel, type ScriptStyle, type VideoFormat, type VoiceOption } from '@/lib/ai-video';
import {
  BRAND_NAME, BRAND_HOTLINE, TARGET_DURATIONS, VIDEO_TEMPLATES, MAX_SCENES, PROJECT_STATUS_LABELS, SUBTITLE_STYLES, TRANSITIONS,
  estimateSceneSeconds, estimateTotalSeconds, isVideoTemplate, newSceneId,
  type ProjectSettings, type Scene, type SceneVisual, type SubtitleStyle, type Transition
} from '@/lib/video-studio';

interface ProjectData {
  id: string;
  title: string;
  type: string;
  format: VideoFormat;
  status: string;
  outputUrl: string | null;
  storyboard: Scene[];
  settings: ProjectSettings;
  forkliftIds: string[];
  sources: { topic: string };
}

interface ForkliftSummary { id: string; maker: string; model: string; year: number | null }
interface JobSummary { id: string; status: string; outputUrl: string | null; error: string | null; durationSec: number | null }

type SaveState = 'saved' | 'dirty' | 'saving' | 'error';

export default function StudioEditorPage() {
  const { id } = useParams<{ id: string }>();
  const pathname = usePathname();
  const lang = pathname.split('/')[1] === 'en' ? 'en' : 'vi';

  const [project, setProject] = useState<ProjectData | null>(null);
  const [forklifts, setForklifts] = useState<ForkliftSummary[]>([]);
  const [testimonial, setTestimonial] = useState<{ customerName: string; companyName: string | null } | null>(null);
  const [assets, setAssets] = useState<StudioAssetItem[]>([]);
  const [job, setJob] = useState<JobSummary | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [voices, setVoices] = useState<VoiceOption[]>(FALLBACK_VOICES);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [busy, setBusy] = useState('');
  const [voiceBusy, setVoiceBusy] = useState<string | null>(null);
  const [pickerFor, setPickerFor] = useState<number | null>(null);
  const [showFacebook, setShowFacebook] = useState(false);
  const [message, setMessage] = useState<{ kind: 'error' | 'info'; text: string } | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollingJob = useRef<string | null>(null);

  // ===== Tải dự án =====
  useEffect(() => {
    fetch(`/api/studio/projects/${id}`)
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        setProject(data.project);
        setForklifts(data.forklifts || []);
        setTestimonial(data.testimonial || null);
        setAssets(data.assets || []);
        setJob(data.latestJob);
        setCanEdit(Boolean(data.canEdit));
      })
      .catch(err => setLoadError(err instanceof Error ? err.message : 'Không tải được dự án'));
    fetch('/api/ai/voices')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data.voices) && data.voices.length > 0) setVoices(data.voices); })
      .catch(() => {});
    return () => { pollingJob.current = null; };
  }, [id]);

  // ===== Tự lưu sau 1.2 giây kể từ lần sửa cuối =====
  const persist = useCallback(async (next: ProjectData) => {
    setSaveState('saving');
    try {
      const res = await fetch(`/api/studio/projects/${next.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: next.title, format: next.format, settings: next.settings, storyboard: next.storyboard })
      });
      setSaveState(res.ok ? 'saved' : 'error');
    } catch {
      setSaveState('error');
    }
  }, []);

  const update = (patch: Partial<ProjectData>) => {
    if (!project) return;
    const next = { ...project, ...patch };
    setProject(next);
    setSaveState('dirty');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persist(next), 1200);
  };

  const flushSave = async () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (project && saveState !== 'saved') await persist(project);
  };

  const updateSettings = (patch: Partial<ProjectSettings>) => project && update({ settings: { ...project.settings, ...patch } });
  const setScenes = (scenes: Scene[]) => update({ storyboard: scenes });
  const updateScene = (index: number, scene: Scene) => project && setScenes(project.storyboard.map((s, i) => (i === index ? scene : s)));

  // ===== Theo dõi job render =====
  const waitForJob = useCallback(async (jobId: string) => {
    pollingJob.current = jobId;
    for (let attempt = 0; attempt < 240 && pollingJob.current === jobId; attempt++) {
      await new Promise(r => setTimeout(r, 5000));
      if (pollingJob.current !== jobId) return;
      try {
        const res = await fetch(`/api/ai/render-jobs/${jobId}`, { cache: 'no-store' });
        if (!res.ok) continue;
        const data: JobSummary = await res.json();
        setJob(data);
        if (data.status === 'done' || data.status === 'failed') {
          setProject(prev => prev && { ...prev, status: data.status, outputUrl: data.status === 'done' ? data.outputUrl : prev.outputUrl });
          return;
        }
      } catch {
        // Lỗi mạng tạm thời: thử lại
      }
    }
  }, []);

  useEffect(() => {
    if (job && (job.status === 'queued' || job.status === 'processing') && pollingJob.current !== job.id) waitForJob(job.id);
  }, [job, waitForJob]);

  if (loadError) {
    return <div className="glass-panel" style={{ padding: '2rem', color: '#991b1b' }}>Lỗi: {loadError} · <Link href={`/${lang}/admin/studio`}>Quay lại Studio</Link></div>;
  }
  if (!project) return <p style={{ color: '#64748b' }}>Đang tải dự án...</p>;

  const { settings, storyboard } = project;
  const wps = wordsPerSecond(settings.speed, settings.ttsModel);
  const sceneSeconds = storyboard.map(s => estimateSceneSeconds(s, wps, countSpokenWords(s.narration)));
  const totalSeconds = estimateTotalSeconds(sceneSeconds, settings);
  const vertical = project.format !== 'horizontal';
  const template = isVideoTemplate(project.type) ? VIDEO_TEMPLATES[project.type] : null;
  const rendering = job?.status === 'queued' || job?.status === 'processing';
  const readOnly = !canEdit || Boolean(busy);

  // ===== Thao tác =====
  const handleRegenerate = async () => {
    if (storyboard.length > 0 && !confirm('AI sẽ viết lại toàn bộ storyboard, các chỉnh sửa hiện tại sẽ mất. Tiếp tục?')) return;
    setBusy('AI đang lên storyboard...');
    setMessage(null);
    await flushSave();
    try {
      const res = await fetch(`/api/studio/projects/${project.id}/storyboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setProject(prev => prev && { ...prev, storyboard: data.storyboard, title: prev.storyboard.length === 0 && data.title ? data.title : prev.title });
      setSaveState('saved');
      setMessage({ kind: 'info', text: `Đã viết storyboard ${data.storyboard.length} cảnh theo phong cách "${SCRIPT_STYLES[data.style as ScriptStyle]?.label || data.style}".` });
    } catch (err) {
      setMessage({ kind: 'error', text: err instanceof Error ? err.message : 'Lỗi tạo storyboard' });
    }
    setBusy('');
  };

  const handlePreviewVoice = async (scene: Scene) => {
    setVoiceBusy(scene.id);
    setMessage(null);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    try {
      const res = await fetch(`/api/studio/projects/${project.id}/voice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sceneId: scene.id, storyboard, settings })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      // Server đã lưu cả storyboard đang hiển thị; chỉ ghép thông tin giọng đọc của cảnh vào bản hiện tại
      setProject(prev => prev && { ...prev, storyboard: prev.storyboard.map(s => (s.id === scene.id ? { ...s, ...data.scene, narration: s.narration } : s)) });
      setSaveState('saved');
    } catch (err) {
      setMessage({ kind: 'error', text: err instanceof Error ? err.message : 'Lỗi tạo giọng đọc' });
    }
    setVoiceBusy(null);
  };

  const handleRender = async () => {
    setBusy('Đang tạo giọng đọc cho các cảnh & gửi sang máy chủ dựng video...');
    setMessage(null);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    try {
      const res = await fetch(`/api/studio/projects/${project.id}/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyboard, settings, format: project.format })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setProject(prev => prev && { ...prev, storyboard: data.storyboard, status: 'rendering' });
      setSaveState('saved');
      const queued: JobSummary = { id: data.jobId, status: 'queued', outputUrl: null, error: null, durationSec: null };
      setJob(queued);
      setBusy('');
      waitForJob(data.jobId);
      return;
    } catch (err) {
      setMessage({ kind: 'error', text: err instanceof Error ? err.message : 'Lỗi dựng video' });
    }
    setBusy('');
  };

  const handleAttachToForklift = async () => {
    const forkliftId = project.forkliftIds[0];
    if (!forkliftId || !project.outputUrl) return;
    const res = await fetch(`/api/forklifts/${forkliftId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoUrl: project.outputUrl })
    });
    setMessage(res.ok
      ? { kind: 'info', text: 'Đã gắn video làm Video Review chính thức của xe (hiển thị trên web & bot).' }
      : { kind: 'error', text: 'Không gắn được video vào xe.' });
  };

  const addScene = (visual: SceneVisual) => {
    if (storyboard.length >= MAX_SCENES) return;
    setScenes([...storyboard, { id: newSceneId(), visual, narration: '', onScreenText: '', minDuration: 3 }]);
  };

  const moveScene = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= storyboard.length) return;
    const next = [...storyboard];
    [next[index], next[target]] = [next[target], next[index]];
    setScenes(next);
  };

  const pickVisual = (visual: SceneVisual) => {
    if (pickerFor === null) return;
    if (pickerFor >= storyboard.length) addScene(visual);
    else updateScene(pickerFor, { ...storyboard[pickerFor], visual });
    setPickerFor(null);
  };

  const saveLabel = { saved: '✓ Đã lưu', dirty: 'Chưa lưu...', saving: 'Đang lưu...', error: '⚠ Lỗi lưu' }[saveState];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <Link href={`/${lang}/admin/studio`} style={{ color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', textDecoration: 'none' }}>
          <FaArrowLeft /> Studio
        </Link>
        <input
          value={project.title}
          disabled={readOnly}
          onChange={e => update({ title: e.target.value })}
          aria-label="Tên dự án"
          style={{ flex: '1 1 260px', minWidth: 0, fontSize: '1.15rem', fontWeight: 700, border: '1px solid transparent', borderRadius: '6px', padding: '0.3rem 0.5rem', background: 'transparent', color: '#1e293b' }}
        />
        <span style={{ fontSize: '0.78rem', color: saveState === 'error' ? '#dc2626' : '#94a3b8' }}>{saveLabel}</span>
      </div>

      <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '1rem' }}>
        {template?.icon} {template?.label}
        {project.sources.topic && <> · {project.sources.topic}</>}
        {testimonial && <> · Khách hàng: {testimonial.customerName}{testimonial.companyName ? ` (${testimonial.companyName})` : ''}</>}
        {forklifts.length > 0 && <> · {forklifts.map((f, i) => (
          <span key={f.id}>{i > 0 && ', '}<Link href={`/${lang}/admin/forklifts/${f.id}/edit`} style={{ color: '#7c3aed' }}>{f.maker} {f.model}{f.year ? ` (${f.year})` : ''}</Link></span>
        ))}</>}
        {' '}· {PROJECT_STATUS_LABELS[project.status] || project.status}
      </div>

      {message && (
        <div style={{ padding: '0.6rem 0.8rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem', background: message.kind === 'error' ? '#fee2e2' : '#ede9fe', color: message.kind === 'error' ? '#991b1b' : '#5b21b6' }}>
          {message.text}
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', alignItems: 'flex-start' }}>
        {/* Cột trái: storyboard */}
        <div style={{ display: 'grid', gap: '0.75rem', flex: '999 1 480px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0, color: '#334155', fontSize: '1rem' }}>Storyboard · {storyboard.length} cảnh · ~{Math.round(totalSeconds)}s</h3>
            {canEdit && (
              <button type="button" onClick={handleRegenerate} disabled={Boolean(busy)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#7c3aed', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <FaMagic /> {storyboard.length ? 'AI viết lại storyboard' : 'AI lên storyboard'}
              </button>
            )}
          </div>

          {storyboard.length === 0 && (
            <div className="glass-panel" style={{ padding: '2rem 1rem', textAlign: 'center', color: '#64748b', background: '#fff' }}>
              {busy || 'Chưa có cảnh nào. Bấm "AI lên storyboard" hoặc thêm cảnh thủ công.'}
            </div>
          )}

          {storyboard.map((scene, i) => (
            <SceneCard
              key={scene.id}
              scene={scene}
              index={i}
              total={storyboard.length}
              seconds={sceneSeconds[i]}
              wordsPerSec={wps}
              vertical={vertical}
              settings={settings}
              readOnly={readOnly}
              voiceBusy={voiceBusy === scene.id}
              onChange={s => updateScene(i, s)}
              onMove={delta => moveScene(i, delta)}
              onDuplicate={() => storyboard.length < MAX_SCENES && setScenes([...storyboard.slice(0, i + 1), { ...scene, id: newSceneId() }, ...storyboard.slice(i + 1)])}
              onRemove={() => setScenes(storyboard.filter((_, j) => j !== i))}
              onChangeVisual={() => setPickerFor(i)}
              onPreviewVoice={() => handlePreviewVoice(scene)}
            />
          ))}

          {canEdit && storyboard.length < MAX_SCENES && (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button type="button" className="btn-secondary" disabled={readOnly} onClick={() => setPickerFor(storyboard.length)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <FaPlus /> Thêm cảnh ảnh / clip
              </button>
              <button type="button" className="btn-secondary" disabled={readOnly} onClick={() => addScene({ kind: 'card', title: BRAND_NAME, subtitle: `Hotline / Zalo: ${BRAND_HOTLINE}`, theme: 'brand' })} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <FaPlus /> Thêm thẻ chữ
              </button>
            </div>
          )}
        </div>

        {/* Cột phải: cài đặt & thành phẩm */}
        <div style={{ display: 'grid', gap: '1rem', position: 'sticky', top: '1rem', flex: '1 1 300px', minWidth: 0 }}>
          <div className="glass-panel" style={{ background: '#fff', borderRadius: '12px', padding: '1rem', display: 'grid', gap: '0.7rem' }}>
            <h4 style={{ margin: 0, color: '#334155' }}>Cài đặt video</h4>
            <div>
              <label style={labelStyle}>Khung hình</label>
              <select value={project.format} disabled={readOnly} onChange={e => update({ format: e.target.value as VideoFormat })} style={inputStyle}>
                {(Object.keys(VIDEO_FORMATS) as VideoFormat[]).map(k => <option key={k} value={k}>{VIDEO_FORMATS[k].label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Giọng đọc</label>
              <select value={settings.voiceId} disabled={readOnly} onChange={e => updateSettings({ voiceId: e.target.value })} style={inputStyle}>
                {voices.map(v => <option key={v.id} value={v.id}>{voiceLabel(v)}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div>
                <label style={labelStyle}>Model giọng</label>
                <select value={settings.ttsModel} disabled={readOnly} onChange={e => updateSettings({ ttsModel: e.target.value as TtsModelId })} style={inputStyle}>
                  {(Object.keys(TTS_MODELS) as TtsModelId[]).map(k => <option key={k} value={k}>{TTS_MODELS[k].label.split(' (')[0]}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Tốc độ đọc</label>
                <select value={settings.speed} disabled={readOnly} onChange={e => updateSettings({ speed: Number(e.target.value) })} style={inputStyle}>
                  {[0.9, 0.95, 1.0, 1.05, 1.1].map(s => <option key={s} value={s}>{s.toFixed(2)}x</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={labelStyle}>Tiếng gốc của clip</label>
              <select value={settings.clipAudio} disabled={readOnly} onChange={e => updateSettings({ clipAudio: e.target.value === 'mix' ? 'mix' : 'mute' })} style={inputStyle}>
                <option value="mute">Tắt tiếng gốc (khuyên dùng)</option>
                <option value="mix">Hòa âm 30% tiếng máy xe</option>
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div>
                <label style={labelStyle}>Phụ đề</label>
                <select value={settings.subtitles} disabled={readOnly} onChange={e => updateSettings({ subtitles: e.target.value as SubtitleStyle })} style={inputStyle}>
                  {(Object.keys(SUBTITLE_STYLES) as SubtitleStyle[]).map(k => <option key={k} value={k}>{SUBTITLE_STYLES[k]}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Chuyển cảnh</label>
                <select value={settings.transition} disabled={readOnly} onChange={e => updateSettings({ transition: e.target.value as Transition })} style={inputStyle}>
                  {(Object.keys(TRANSITIONS) as Transition[]).map(k => <option key={k} value={k}>{TRANSITIONS[k]}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gap: '0.3rem', fontSize: '0.82rem', color: '#334155' }}>
              {([
                ['logo', 'Logo MCK ở góc màn hình'],
                ['intro', 'Mở đầu bằng logo (1.5 giây)'],
                ['outro', 'Kết thúc bằng logo + hotline (3 giây)'],
              ] as const).map(([key, label]) => (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', cursor: readOnly ? 'default' : 'pointer' }}>
                  <input type="checkbox" checked={settings[key]} disabled={readOnly} onChange={e => updateSettings({ [key]: e.target.checked })} />
                  {label}
                </label>
              ))}
            </div>
            <details>
              <summary style={{ fontSize: '0.8rem', color: '#7c3aed', cursor: 'pointer' }}>Tùy chọn cho AI viết storyboard</summary>
              <div style={{ display: 'grid', gap: '0.5rem', marginTop: '0.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <label style={labelStyle}>Độ dài</label>
                    <select value={settings.targetDuration} disabled={readOnly} onChange={e => updateSettings({ targetDuration: Number(e.target.value) })} style={inputStyle}>
                      {TARGET_DURATIONS.map(d => <option key={d} value={d}>{d} giây</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Phong cách</label>
                    <select value={settings.tone} disabled={readOnly} onChange={e => updateSettings({ tone: e.target.value as ScriptStyle })} style={inputStyle}>
                      {(Object.keys(SCRIPT_STYLES) as ScriptStyle[]).map(k => <option key={k} value={k}>{SCRIPT_STYLES[k].label}</option>)}
                    </select>
                  </div>
                </div>
                <input value={settings.note} disabled={readOnly} maxLength={500} onChange={e => updateSettings({ note: e.target.value })} placeholder="Ý chính muốn AI nhắc thêm" style={inputStyle} />
              </div>
            </details>
          </div>

          <div className="glass-panel" style={{ background: '#f8fafc', borderRadius: '12px', padding: '1rem', border: '1px solid #e2e8f0', display: 'grid', gap: '0.7rem' }}>
            <h4 style={{ margin: 0, color: '#334155' }}>Thành phẩm</h4>
            {rendering ? (
              <div style={{ background: '#0f172a', color: '#e2e8f0', borderRadius: '8px', padding: '2rem 1rem', textAlign: 'center', fontSize: '0.85rem', lineHeight: 1.6 }}>
                ⏳ {job?.status === 'processing' ? 'Đang dựng video...' : 'Đang chờ máy chủ dựng video...'}<br />
                <span style={{ color: '#94a3b8' }}>Thường mất 1-3 phút. Có thể rời trang, quay lại sau.</span>
              </div>
            ) : job?.status === 'failed' ? (
              <div style={{ background: '#fee2e2', color: '#991b1b', borderRadius: '8px', padding: '0.8rem', fontSize: '0.82rem', lineHeight: 1.5, wordBreak: 'break-word' }}>
                ❌ Dựng video thất bại: {job.error}
              </div>
            ) : null}

            {project.outputUrl && !rendering && (
              <video key={project.outputUrl} src={project.outputUrl} controls style={{ width: '100%', borderRadius: '8px', background: '#000', maxHeight: '460px' }} />
            )}

            {busy && <div style={{ fontSize: '0.82rem', color: '#7c3aed' }}>⏳ {busy}</div>}

            {canEdit && (
              <button
                className="btn-primary"
                onClick={handleRender}
                disabled={Boolean(busy) || rendering || storyboard.length === 0}
                style={{ background: '#8b5cf6', borderColor: '#8b5cf6', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', padding: '0.75rem' }}
              >
                <FaPlay /> {project.outputUrl ? 'Dựng lại video' : 'Dựng video'} (~{Math.round(totalSeconds)}s)
              </button>
            )}

            {project.outputUrl && !rendering && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <a href={project.outputUrl} target="_blank" rel="noopener noreferrer" download className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', textDecoration: 'none', fontSize: '0.82rem' }}>
                  <FaDownload /> Tải MP4
                </a>
                {canEdit && project.type === 'forklift_intro' && project.forkliftIds.length === 1 && (
                  <button type="button" className="btn-secondary" onClick={handleAttachToForklift} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.82rem', color: '#047857' }}>
                    <FaCheck /> Gắn vào xe
                  </button>
                )}
                {canEdit && (
                  <button type="button" className="btn-secondary" onClick={() => setShowFacebook(true)} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.82rem', color: '#1877f2' }}>
                    <FaFacebook /> {getFbPublishDict(lang).openBtn}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showFacebook && project.outputUrl && (
        <FacebookPublishDialog
          projectId={project.id}
          title={project.title}
          vertical={project.format !== 'horizontal'}
          hasAiVisuals={storyboard.some(s => s.visual.kind !== 'card' && s.visual.ai === true)}
          lang={lang}
          onClose={() => setShowFacebook(false)}
        />
      )}

      {pickerFor !== null && (
        <AssetPicker
          projectId={project.id}
          assets={assets}
          narration={storyboard[pickerFor]?.narration}
          onScreenText={storyboard[pickerFor]?.onScreenText}
          onPick={pickVisual}
          onUploaded={asset => setAssets(prev => [asset, ...prev])}
          onClose={() => setPickerFor(null)}
        />
      )}
    </div>
  );
}
