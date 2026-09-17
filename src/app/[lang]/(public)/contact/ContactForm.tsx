'use client';

import { useState } from 'react';

export default function ContactForm() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const formData = new FormData(e.currentTarget);
    const data = {
      customerName: formData.get('customerName'),
      phone: formData.get('phone'),
      email: formData.get('email'),
      message: formData.get('message'),
    };

    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Đã có lỗi xảy ra. Vui lòng thử lại.');
      }

      setSuccess(true);
      (e.target as HTMLFormElement).reset();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{ padding: '2rem', background: '#dcfce7', color: '#166534', borderRadius: '12px', textAlign: 'center' }}>
        <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', fontWeight: 600 }}>Gửi yêu cầu thành công!</h3>
        <p>Chúng tôi đã nhận được thông tin và sẽ liên hệ lại với bạn sớm nhất có thể.</p>
        <button 
          onClick={() => setSuccess(false)} 
          className="btn-primary" 
          style={{ marginTop: '1rem', padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '1rem', fontWeight: 600 }}
        >
          Gửi thêm yêu cầu
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {error && <div style={{ color: 'red', fontSize: '0.9rem', padding: '0.5rem', background: '#fee2e2', borderRadius: '6px' }}>{error}</div>}
      
      <div>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#333' }}>Họ và Tên *</label>
        <input required name="customerName" type="text" className="form-control" placeholder="Nhập tên của bạn" style={{ padding: '1rem', background: 'var(--surface-border)', width: '100%' }} />
      </div>
      
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 150px' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#333' }}>Số điện thoại *</label>
          <input required name="phone" type="tel" className="form-control" placeholder="Số điện thoại của bạn" style={{ padding: '1rem', background: 'var(--surface-border)', width: '100%' }} />
        </div>
        <div style={{ flex: '1 1 150px' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#333' }}>Email</label>
          <input name="email" type="email" className="form-control" placeholder="Email của bạn" style={{ padding: '1rem', background: 'var(--surface-border)', width: '100%' }} />
        </div>
      </div>
      
      <div>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#333' }}>Nội dung lời nhắn</label>
        <textarea name="message" className="form-control" rows={5} placeholder="Bạn cần tư vấn về sản phẩm nào?" style={{ padding: '1rem', background: 'var(--surface-border)', resize: 'vertical', width: '100%' }}></textarea>
      </div>
      
      <button type="submit" disabled={loading} className="btn-primary" style={{ padding: '1rem', fontSize: '1.1rem', fontWeight: 700, borderRadius: '12px', marginTop: '1rem', opacity: loading ? 0.7 : 1 }}>
        {loading ? 'Đang gửi...' : 'Gửi Yêu Cầu'}
      </button>
    </form>
  );
}
