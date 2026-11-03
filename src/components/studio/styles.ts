// Style dùng chung cho các component của AI Video Studio
import type { CSSProperties } from 'react';

export const labelStyle: CSSProperties = { fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.3rem' };

export const inputStyle: CSSProperties = {
  width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px',
  border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#fff', fontFamily: 'inherit'
};

export const iconButtonStyle: CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: '0.2rem', display: 'inline-flex'
};
