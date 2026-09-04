'use client';

import { useState } from 'react';

export default function InquiryForm({ 
  forkliftId, 
  lang,
  dictionary 
}: { 
  forkliftId: string, 
  lang: string,
  dictionary: any
}) {
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
      company: formData.get('company'),
      message: formData.get('message'),
      forkliftId
    };

    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Something went wrong');
      }

      setSuccess(true);
      (e.target as HTMLFormElement).reset();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--surface-border)' }} id="inquiry-form">
      <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', fontWeight: 600 }}>{dictionary.inquiry?.title || 'Yêu cầu báo giá'}</h3>
      
      {success ? (
        <div style={{ padding: '1rem', background: '#dcfce7', color: '#166534', borderRadius: '8px', marginBottom: '1rem' }}>
          {dictionary.inquiry?.success_message || 'Yêu cầu của bạn đã được gửi thành công. Chúng tôi sẽ liên hệ lại sớm nhất!'}
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {error && <div style={{ color: 'red', fontSize: '0.9rem' }}>{error}</div>}
          
          <div>
            <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.3rem', color: '#555' }}>
              {dictionary.inquiry?.name || 'Họ và tên'} *
            </label>
            <input required name="customerName" type="text" className="form-control" style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ccc' }} />
          </div>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 150px' }}>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.3rem', color: '#555' }}>
                {dictionary.inquiry?.phone || 'Số điện thoại'}
              </label>
              <input name="phone" type="tel" className="form-control" style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ccc' }} />
            </div>
            <div style={{ flex: '1 1 150px' }}>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.3rem', color: '#555' }}>
                {dictionary.inquiry?.email || 'Email'}
              </label>
              <input name="email" type="email" className="form-control" style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ccc' }} />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.3rem', color: '#555' }}>
              {dictionary.inquiry?.company || 'Tên công ty'}
            </label>
            <input name="company" type="text" className="form-control" style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ccc' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.3rem', color: '#555' }}>
              {dictionary.inquiry?.message || 'Ghi chú / Yêu cầu thêm'}
            </label>
            <textarea name="message" rows={3} className="form-control" style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ccc', resize: 'vertical' }}></textarea>
          </div>

          <button type="submit" disabled={loading} className="btn-primary" style={{ padding: '0.8rem', borderRadius: '8px', fontWeight: 600, opacity: loading ? 0.7 : 1 }}>
            {loading ? (dictionary.inquiry?.sending || 'Đang gửi...') : (dictionary.inquiry?.submit || 'Gửi yêu cầu')}
          </button>
        </form>
      )}
    </div>
  );
}
