'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaUserShield } from 'react-icons/fa';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (res.ok) {
        router.push('/admin');
        router.refresh(); 
      } else {
        const data = await res.json();
        setError(data.error || 'Đăng nhập thất bại');
      }
    } catch (e) {
      setError('Lỗi kết nối tới máy chủ');
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)' }}>
      <div className="glass-panel" style={{ padding: '3rem', maxWidth: '400px', width: '90%', textAlign: 'center' }}>
        <FaUserShield size={50} color="var(--primary)" style={{ marginBottom: '1.5rem' }} />
        <h2 style={{ marginBottom: '2rem' }}>Quản Trị Hệ Thống</h2>
        {error && <div style={{ color: 'var(--danger)', marginBottom: '1.5rem', padding: '0.8rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px' }}>{error}</div>}
        <form onSubmit={handleLogin}>
          <div className="form-group" style={{ textAlign: 'left' }}>
            <label className="form-label">Tài khoản</label>
            <input 
              required 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              className="form-control" 
              autoComplete="username"
            />
          </div>
          <div className="form-group" style={{ textAlign: 'left', marginBottom: '2rem' }}>
            <label className="form-label">Mật khẩu</label>
            <input 
              type="password" 
              required 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              className="form-control" 
              autoComplete="current-password"
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', padding: '0.8rem 1rem', fontSize: '1.1rem' }}>
            {loading ? 'Đang xử lý...' : 'Đăng Nhập'}
          </button>
        </form>
      </div>
    </div>
  );
}
