'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { use } from 'react';

export default function InquiryDetailPage({ params }: { params: Promise<{ id: string, lang: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  
  const [inquiry, setInquiry] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchInquiry();
  }, [resolvedParams.id]);

  const fetchInquiry = async () => {
    try {
      const res = await fetch(`/api/inquiries/${resolvedParams.id}`);
      if (res.ok) {
        const data = await res.json();
        setInquiry(data);
        setStatus(data.status);
        setNotes(data.notes || '');
      }
    } catch (error) {
      console.error('Failed to fetch inquiry', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/inquiries/${resolvedParams.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes })
      });
      if (res.ok) {
        alert('Cập nhật thành công!');
      } else {
        alert('Cập nhật thất bại');
      }
    } catch (error) {
      console.error('Error updating', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Đang tải...</div>;
  if (!inquiry) return <div style={{ padding: '2rem' }}>Không tìm thấy yêu cầu.</div>;

  return (
    <div className="admin-container fade-in">
      <Link href={`/${resolvedParams.lang}/admin/inquiries`} style={{ color: 'var(--primary)', textDecoration: 'none', display: 'inline-block', marginBottom: '1.5rem', fontWeight: 600 }}>
        &larr; Quay lại danh sách
      </Link>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
        
        {/* Khung bên trái: Thông tin khách hàng & Yêu cầu */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '1rem' }}>
            Thông tin Khách hàng
          </h2>
          
          <table style={{ width: '100%', borderCollapse: 'collapse', lineHeight: '1.8' }}>
            <tbody>
              <tr>
                <td style={{ color: '#666', width: '30%', padding: '0.5rem 0' }}>Họ Tên:</td>
                <td style={{ fontWeight: 600 }}>{inquiry.customerName}</td>
              </tr>
              <tr>
                <td style={{ color: '#666', padding: '0.5rem 0' }}>SĐT:</td>
                <td style={{ fontWeight: 600 }}>{inquiry.phone || 'N/A'}</td>
              </tr>
              <tr>
                <td style={{ color: '#666', padding: '0.5rem 0' }}>Email:</td>
                <td style={{ fontWeight: 600 }}>{inquiry.email || 'N/A'}</td>
              </tr>
              <tr>
                <td style={{ color: '#666', padding: '0.5rem 0' }}>Công ty:</td>
                <td style={{ fontWeight: 600 }}>{inquiry.company || 'N/A'}</td>
              </tr>
              <tr>
                <td style={{ color: '#666', padding: '0.5rem 0' }}>Ngày gửi:</td>
                <td style={{ fontWeight: 600 }}>{new Date(inquiry.createdAt).toLocaleString('vi-VN')}</td>
              </tr>
            </tbody>
          </table>

          <div style={{ marginTop: '1.5rem' }}>
            <div style={{ color: '#666', marginBottom: '0.5rem' }}>Nội dung lời nhắn:</div>
            <div style={{ background: 'var(--background)', padding: '1rem', borderRadius: '8px', minHeight: '80px', border: '1px solid var(--surface-border)' }}>
              {inquiry.message || <span style={{ color: '#aaa', fontStyle: 'italic' }}>Không có lời nhắn</span>}
            </div>
          </div>

          {inquiry.forklift && (
            <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'rgba(37, 99, 235, 0.05)', borderRadius: '12px', border: '1px solid rgba(37, 99, 235, 0.1)' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--primary)' }}>Xe nâng đang quan tâm</h3>
              <div style={{ fontWeight: 600, fontSize: '1.2rem', marginBottom: '0.5rem' }}>
                {inquiry.forklift.maker} {inquiry.forklift.model}
              </div>
              <div style={{ color: '#666', marginBottom: '1rem' }}>Mã kho: {inquiry.forklift.stockNo || inquiry.forklift.internalCode}</div>
              <Link href={`/${resolvedParams.lang}/machine/${inquiry.forklift.id}`} target="_blank" className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', textDecoration: 'none' }}>
                Xem chi tiết xe
              </Link>
            </div>
          )}
        </div>

        {/* Khung bên phải: Trạng thái & Ghi chú */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '1rem' }}>
            Cập nhật Trạng thái (Sales)
          </h2>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Trạng thái xử lý (Phễu):</label>
            <select 
              className="form-control" 
              value={status} 
              onChange={(e) => setStatus(e.target.value)}
              style={{ width: '100%', padding: '0.8rem' }}
            >
              <option value="New">Mới (New) - Chưa liên hệ</option>
              <option value="Contacted">Đã liên hệ (Contacted)</option>
              <option value="Negotiating">Đang thương lượng (Negotiating)</option>
              <option value="Quoted">Đã báo giá (Quoted)</option>
              <option value="Won">Thành công (Won) - Đã chốt sale</option>
              <option value="Lost">Thất bại (Lost) - Khách không mua</option>
            </select>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Ghi chú nội bộ (Chỉ Sales xem):</label>
            <textarea 
              className="form-control"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={8}
              placeholder="Nhập ghi chú quá trình làm việc với khách hàng..."
              style={{ width: '100%', padding: '1rem', resize: 'vertical' }}
            ></textarea>
          </div>

          <button 
            onClick={handleUpdate} 
            disabled={saving} 
            className="btn-primary" 
            style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', fontWeight: 700, opacity: saving ? 0.7 : 1 }}
          >
            {saving ? 'Đang lưu...' : 'Cập nhật Yêu cầu'}
          </button>
        </div>
      </div>
    </div>
  );
}
