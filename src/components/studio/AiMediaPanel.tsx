'use client';

import { useEffect, useState } from 'react';
import { FaMagic, FaRobot } from 'react-icons/fa';
import { inputStyle } from '@/components/studio/styles';
import { VISUAL_STYLES, type VisualStyle } from '@/lib/ai-visual-styles';

interface BudgetInfo {
  budgetUsd: number;
  spentUsd: number;
  imageCostUsd: number;
  clipCostUsd: number;
  clipAvailable: boolean;
}

export interface AiMediaResult {
  id: string;
  kind: 'image' | 'clip';
  url: string;
}

interface Props {
  projectId: string;
  narration: string;
  onScreenText: string;
  // Ảnh gốc khi "Làm ảnh này chuyển động" (panel được tạo lại mỗi khi đổi ảnh gốc)
  sourceImage?: string | null;
  onClearSource?: () => void;
  onCreated: (result: AiMediaResult) => void;
}

const usd = (n: number) => `${n.toFixed(2)}$`;

const DEFAULT_MOTION = 'Slow cinematic push-in toward the subject, gentle natural light, subtle ambient motion in the background.';

// Tạo ảnh / clip minh họa bằng AI cho một cảnh, có hiển thị ngân sách tháng
export default function AiMediaPanel({ projectId, narration, onScreenText, sourceImage = null, onClearSource, onCreated }: Props) {
  const [budget, setBudget] = useState<BudgetInfo | null>(null);
  const [kind, setKind] = useState<'image' | 'clip'>(sourceImage ? 'clip' : 'image');
  const [prompt, setPrompt] = useState(sourceImage ? DEFAULT_MOTION : '');
  const [style, setStyle] = useState<VisualStyle>('realistic');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const loadBudget = () =>
    fetch('/api/studio/ai-media')
      .then(res => res.json())
      .then(data => { if (typeof data.budgetUsd === 'number') setBudget(data); })
      .catch(() => {});

  useEffect(() => { loadBudget(); }, []);

  const cost = budget ? (kind === 'clip' ? budget.clipCostUsd : budget.imageCostUsd) : 0;
  const remaining = budget ? Math.max(0, budget.budgetUsd - budget.spentUsd) : 0;
  const overBudget = Boolean(budget) && cost > remaining + 1e-9;

  const suggest = async () => {
    setError('');
    setBusy('AI đang viết mô tả hình ảnh...');
    try {
      const res = await fetch('/api/studio/ai-media/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ narration, onScreenText, kind, style })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setPrompt(data.prompt);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi gợi ý mô tả');
    }
    setBusy('');
  };

  // Clip AI mất 1-3 phút: hỏi tiến độ mỗi 8 giây (tối đa ~10 phút)
  const waitForClip = async (id: string): Promise<AiMediaResult> => {
    for (let attempt = 0; attempt < 75; attempt++) {
      await new Promise(r => setTimeout(r, 8000));
      setBusy(`AI đang tạo clip... ${Math.round(((attempt + 1) * 8) / 60 * 10) / 10} phút`);
      const res = await fetch(`/api/studio/ai-media/${id}`, { cache: 'no-store' });
      if (!res.ok) continue;
      const data = await res.json();
      if (data.status === 'done' && data.url) return { id, kind: 'clip', url: data.url };
      if (data.status === 'failed') throw new Error(data.error || 'Tạo clip thất bại');
    }
    throw new Error('AI chạy quá lâu. Mở lại bộ chọn hình sau ít phút, clip xong sẽ nằm trong kho hình của dự án.');
  };

  const create = async () => {
    setError('');
    setBusy(kind === 'clip' ? 'Đang gửi yêu cầu tạo clip...' : 'AI đang vẽ ảnh (10-30 giây)...');
    try {
      const res = await fetch('/api/studio/ai-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, kind, prompt, style, sourceUrl: sourceImage })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      const result: AiMediaResult = data.status === 'done' ? { id: data.id, kind, url: data.url } : await waitForClip(data.id);
      onCreated(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi tạo hình ảnh AI');
    }
    setBusy('');
    loadBudget();
  };

  return (
    <div style={{ border: '1px solid #ddd6fe', background: '#faf5ff', borderRadius: '10px', padding: '0.8rem', marginBottom: '1rem', display: 'grid', gap: '0.55rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <strong style={{ color: '#5b21b6', fontSize: '0.88rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}><FaRobot /> Tạo hình minh họa bằng AI</strong>
        {budget && (
          <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: overBudget ? '#b91c1c' : '#6b7280' }}>
            Ngân sách tháng: đã dùng {usd(budget.spentUsd)} / {usd(budget.budgetUsd)}
          </span>
        )}
      </div>
      <div style={{ fontSize: '0.75rem', color: '#6b7280', lineHeight: 1.45 }}>
        Chỉ dùng cho cảnh minh họa chung (kho bãi, nhà xưởng, bảo dưỡng...). Cảnh nói về một chiếc xe cụ thể phải dùng ảnh thật của xe. Video sẽ ghi &quot;Hình minh họa AI&quot; trên các cảnh này.
      </div>
      {sourceImage && (
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', background: '#fff', border: '1px solid #ddd6fe', borderRadius: '8px', padding: '0.5rem' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={sourceImage} alt="Ảnh gốc" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }} />
          <div style={{ fontSize: '0.75rem', color: '#4c1d95', lineHeight: 1.45 }}>
            <strong>Làm ảnh này chuyển động.</strong> Mô tả chuyển động máy quay bên dưới. AI có thể làm sai lệch chi tiết của xe (chữ, logo, kết cấu): xem kỹ clip trước khi dùng cho cảnh nói về xe đang bán.
          </div>
          <button type="button" onClick={onClearSource} disabled={Boolean(busy)} aria-label="Bỏ ảnh gốc" style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '0.9rem' }}>✕</button>
        </div>
      )}
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
        {(['image', 'clip'] as const).map(k => {
          const disabled = (k === 'clip' && budget !== null && !budget.clipAvailable) || (k === 'image' && Boolean(sourceImage));
          return (
            <button
              key={k}
              type="button"
              disabled={disabled || Boolean(busy)}
              onClick={() => setKind(k)}
              title={disabled ? 'Tài khoản Gemini hiện chưa có model tạo clip' : undefined}
              style={{
                padding: '0.35rem 0.7rem', borderRadius: '999px', fontSize: '0.78rem', cursor: disabled ? 'not-allowed' : 'pointer',
                border: `1px solid ${kind === k ? '#8b5cf6' : '#d1d5db'}`, background: kind === k ? '#ede9fe' : '#fff', color: disabled ? '#9ca3af' : '#4c1d95'
              }}
            >
              {k === 'image' ? `🖼️ Ảnh (~${usd(budget?.imageCostUsd ?? 0)})` : `🎬 Clip ~10 giây (~${usd(budget?.clipCostUsd ?? 0)})${disabled ? ' · chưa khả dụng' : ''}`}
            </button>
          );
        })}
        {!sourceImage && <button type="button" onClick={suggest} disabled={Boolean(busy) || (!narration.trim() && !onScreenText.trim())} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#7c3aed', fontSize: '0.78rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
          <FaMagic /> Gợi ý mô tả từ lời đọc
        </button>}
      </div>
      {!sourceImage && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', color: '#6b7280', marginRight: '0.15rem' }}>Phong cách:</span>
          {(Object.keys(VISUAL_STYLES) as VisualStyle[]).map(s => (
            <button
              key={s}
              type="button"
              disabled={Boolean(busy)}
              onClick={() => setStyle(s)}
              style={{
                padding: '0.25rem 0.6rem', borderRadius: '999px', fontSize: '0.74rem', cursor: 'pointer',
                border: `1px solid ${style === s ? '#8b5cf6' : '#d1d5db'}`, background: style === s ? '#ede9fe' : '#fff', color: '#4c1d95'
              }}
            >
              {VISUAL_STYLES[s].label}
            </button>
          ))}
        </div>
      )}
      <textarea
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
        maxLength={800}
        rows={3}
        disabled={Boolean(busy)}
        placeholder="Mô tả hình cần tạo (nên viết tiếng Anh). VD: Wide shot of a clean modern warehouse with tall pallet racks, soft daylight"
        style={{ ...inputStyle, resize: 'vertical' }}
      />
      {error && <div style={{ fontSize: '0.8rem', color: '#b91c1c' }}>{error}</div>}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
        {busy && <span style={{ fontSize: '0.78rem', color: '#7c3aed' }}>⏳ {busy}</span>}
        <button
          type="button"
          className="btn-primary"
          onClick={create}
          disabled={Boolean(busy) || prompt.trim().length < 10 || overBudget || !budget}
          style={{ marginLeft: 'auto', background: '#8b5cf6', borderColor: '#8b5cf6', fontSize: '0.82rem' }}
        >
          {overBudget ? 'Hết ngân sách tháng này' : `${sourceImage ? 'Làm chuyển động' : `Tạo ${kind === 'clip' ? 'clip' : 'ảnh'}`} (~${usd(cost)})`}
        </button>
      </div>
    </div>
  );
}
