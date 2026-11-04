'use client';

import { FaArrowUp, FaArrowDown, FaTrash, FaClone, FaExchangeAlt, FaVolumeUp, FaSpinner } from 'react-icons/fa';
import { countSpokenWords } from '@/lib/vietnamese-tts';
import {
  CARD_THEMES, IMAGE_MOTIONS, MAX_CARD_TITLE_CHARS, MAX_NARRATION_CHARS, MAX_SCREEN_TEXT_CHARS, MAX_SCENE_SECONDS, sceneAudioKey,
  type CardTheme, type ImageMotion, type ProjectSettings, type Scene, type SceneVisual
} from '@/lib/video-studio';
import { inputStyle, iconButtonStyle } from '@/components/studio/styles';

interface Props {
  scene: Scene;
  index: number;
  total: number;
  seconds: number;
  wordsPerSec: number;
  vertical: boolean;
  settings: ProjectSettings;
  readOnly: boolean;
  voiceBusy: boolean;
  onChange: (scene: Scene) => void;
  onMove: (delta: number) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onChangeVisual: () => void;
  onPreviewVoice: () => void;
}

function VisualPreview({ visual, vertical }: { visual: SceneVisual; vertical: boolean }) {
  const box = { width: '100%', aspectRatio: vertical ? '9 / 16' : '16 / 9', borderRadius: '8px', overflow: 'hidden', background: '#0f172a' } as const;
  if (visual.kind === 'card') {
    const theme = CARD_THEMES[visual.theme];
    return (
      <div style={{ ...box, background: theme.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0.5rem' }}>
        <div style={{ color: theme.fg, fontWeight: 800, fontSize: '0.85rem', lineHeight: 1.25 }}>{visual.title}</div>
        {visual.subtitle && <div style={{ color: theme.accent, fontSize: '0.65rem', marginTop: '0.3rem' }}>{visual.subtitle}</div>}
      </div>
    );
  }
  if (visual.kind === 'clip') {
    return <video src={`${visual.url}#t=${visual.trimStart + 0.5}`} preload="metadata" muted style={{ ...box, objectFit: 'cover' }} />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={visual.url} alt="" loading="lazy" style={{ ...box, objectFit: 'cover' }} />;
}

export default function SceneCard(props: Props) {
  const { scene, index, total, seconds, wordsPerSec, vertical, settings, readOnly, voiceBusy } = props;
  const { visual } = scene;
  const words = countSpokenWords(scene.narration);
  const voiceFresh = Boolean(scene.audioUrl) && scene.audioKey === sceneAudioKey(scene.narration, settings);
  const update = (patch: Partial<Scene>) => props.onChange({ ...scene, ...patch });
  const updateVisual = (patch: Partial<SceneVisual>) => props.onChange({ ...scene, visual: { ...visual, ...patch } as SceneVisual });

  return (
    <div className="glass-panel" style={{ background: '#fff', borderRadius: '12px', padding: '0.8rem', display: 'grid', gridTemplateColumns: vertical ? '110px 1fr' : '170px 1fr', gap: '0.9rem', alignItems: 'start' }}>
      <div>
        <div style={{ position: 'relative' }}>
          <VisualPreview visual={visual} vertical={vertical} />
          <span style={{ position: 'absolute', top: 4, left: 4, background: '#8b5cf6', color: '#fff', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700, padding: '0.1rem 0.45rem' }}>{index + 1}</span>
        </div>
        {!readOnly && (
          <button type="button" onClick={props.onChangeVisual} style={{ ...iconButtonStyle, fontSize: '0.75rem', color: '#7c3aed', marginTop: '0.35rem', gap: '0.3rem', alignItems: 'center' }}>
            <FaExchangeAlt /> Đổi hình
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gap: '0.5rem', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.78rem', color: '#64748b' }}>
          <strong style={{ color: '#334155' }}>{visual.kind === 'card' ? 'Thẻ chữ' : visual.kind === 'clip' ? 'Clip' : 'Ảnh'}</strong>
          <span>· ~{seconds.toFixed(1)}s</span>
          {!readOnly && (
            <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: '0.15rem' }}>
              <button type="button" title="Lên trước" disabled={index === 0} onClick={() => props.onMove(-1)} style={{ ...iconButtonStyle, opacity: index === 0 ? 0.3 : 1 }}><FaArrowUp /></button>
              <button type="button" title="Xuống sau" disabled={index === total - 1} onClick={() => props.onMove(1)} style={{ ...iconButtonStyle, opacity: index === total - 1 ? 0.3 : 1 }}><FaArrowDown /></button>
              <button type="button" title="Nhân bản cảnh" onClick={props.onDuplicate} style={iconButtonStyle}><FaClone /></button>
              <button type="button" title="Xóa cảnh" onClick={props.onRemove} style={{ ...iconButtonStyle, color: '#dc2626' }}><FaTrash /></button>
            </span>
          )}
        </div>

        {visual.kind === 'card' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))', gap: '0.4rem' }}>
            <input value={visual.title} disabled={readOnly} maxLength={MAX_CARD_TITLE_CHARS} onChange={e => updateVisual({ title: e.target.value })} placeholder="Tiêu đề thẻ" style={inputStyle} />
            <input value={visual.subtitle} disabled={readOnly} maxLength={120} onChange={e => updateVisual({ subtitle: e.target.value })} placeholder="Dòng phụ (hotline, giá...)" style={inputStyle} />
            <select value={visual.theme} disabled={readOnly} onChange={e => updateVisual({ theme: e.target.value as CardTheme })} style={inputStyle}>
              {(Object.keys(CARD_THEMES) as CardTheme[]).map(k => <option key={k} value={k}>{CARD_THEMES[k].label}</option>)}
            </select>
          </div>
        )}

        <textarea
          value={scene.narration}
          disabled={readOnly}
          maxLength={MAX_NARRATION_CHARS}
          onChange={e => update({ narration: e.target.value })}
          placeholder="Lời đọc của cảnh (để trống nếu cảnh không có lời)"
          rows={2}
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.45 }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', fontSize: '0.75rem', color: '#64748b' }}>
          <span>{words} từ · đọc ~{scene.narration ? (scene.audioDuration && voiceFresh ? scene.audioDuration : words / wordsPerSec).toFixed(1) : 0}s</span>
          {scene.narration.trim() && (
            voiceFresh && scene.audioUrl
              ? <audio src={scene.audioUrl} controls style={{ height: '28px', maxWidth: '220px' }} />
              : !readOnly && (
                <button type="button" onClick={props.onPreviewVoice} disabled={voiceBusy} style={{ ...iconButtonStyle, color: '#7c3aed', fontSize: '0.75rem', gap: '0.3rem', alignItems: 'center' }}>
                  {voiceBusy ? <FaSpinner /> : <FaVolumeUp />} {voiceBusy ? 'Đang tạo giọng...' : 'Nghe thử giọng đọc'}
                </button>
              )
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))', gap: '0.4rem' }}>
          {visual.kind !== 'card' && (
            <input
              value={scene.onScreenText}
              disabled={readOnly}
              maxLength={MAX_SCREEN_TEXT_CHARS}
              onChange={e => update({ onScreenText: e.target.value })}
              placeholder="Chữ trên màn hình (VD: 2.5 TẤN)"
              style={inputStyle}
            />
          )}
          {visual.kind === 'image' && (
            <select value={visual.motion} disabled={readOnly} onChange={e => updateVisual({ motion: e.target.value as ImageMotion })} style={inputStyle} title="Chuyển động của ảnh">
              {(Object.keys(IMAGE_MOTIONS) as ImageMotion[]).map(k => <option key={k} value={k}>🎥 {IMAGE_MOTIONS[k]}</option>)}
            </select>
          )}
          {visual.kind === 'clip' && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: '#64748b' }}>
              Bắt đầu từ giây
              <input type="number" min={0} step={0.5} value={visual.trimStart} disabled={readOnly} onChange={e => updateVisual({ trimStart: Math.max(0, Number(e.target.value) || 0) })} style={{ ...inputStyle, width: '70px' }} />
            </label>
          )}
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: '#64748b' }} title="Cảnh kéo dài ít nhất bằng lời đọc; tăng số này để giữ cảnh lâu hơn">
            Tối thiểu
            <input type="number" min={1} max={MAX_SCENE_SECONDS} step={0.5} value={scene.minDuration} disabled={readOnly} onChange={e => update({ minDuration: Math.min(MAX_SCENE_SECONDS, Math.max(1, Number(e.target.value) || 1)) })} style={{ ...inputStyle, width: '64px' }} />
            giây
          </label>
        </div>
      </div>
    </div>
  );
}
