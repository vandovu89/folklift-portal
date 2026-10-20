'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CustomerLoginForm({ lang }: { lang: string }) {
  const t = (vi: string, en: string) => (lang === 'vi' ? vi : en);
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/customer-portal/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/${lang}/customer`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : t('Đăng nhập thất bại', 'Login failed'));
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
      <div className="form-group">
        <label className="form-label">{t('Số điện thoại', 'Phone number')}</label>
        <input required type="tel" inputMode="tel" autoComplete="username" value={phone} onChange={e => setPhone(e.target.value)} className="form-control" placeholder="0912 345 678" />
      </div>
      <div className="form-group">
        <label className="form-label">{t('Mật khẩu', 'Password')}</label>
        <input required type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} className="form-control" />
      </div>
      {error && <div style={{ color: '#dc2626', fontSize: '0.9rem' }}>{error}</div>}
      <button type="submit" disabled={loading} className="btn-primary" style={{ padding: '0.8rem' }}>
        {loading ? t('Đang đăng nhập...', 'Signing in...') : t('Đăng nhập', 'Sign in')}
      </button>
    </form>
  );
}
