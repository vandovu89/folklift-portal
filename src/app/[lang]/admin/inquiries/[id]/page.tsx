'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import { FaFacebook } from 'react-icons/fa';

export default function InquiryDetailPage({ params }: { params: Promise<{ id: string, lang: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  
  const [inquiry, setInquiry] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [assignedToId, setAssignedToId] = useState('');
  const [soldPrice, setSoldPrice] = useState('');
  const [soldDate, setSoldDate] = useState('');
  const [contractUrl, setContractUrl] = useState('');
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    fetchInquiry();
    fetchUsers();
  }, [resolvedParams.id]);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        // Lọc các user có role là SALES hoặc ADMIN để gán
        setUsers(data.filter((u: any) => u.role === 'SALES' || u.role === 'ADMIN'));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchInquiry = async () => {
    try {
      const res = await fetch(`/api/inquiries/${resolvedParams.id}`);
      if (res.ok) {
        const data = await res.json();
        setInquiry(data);
        setStatus(data.status);
        setNotes(data.notes || '');
        setAssignedToId(data.assignedToId || '');
        if (data.forklift) {
          setSoldPrice(data.forklift.soldPrice || data.forklift.price || '');
          setSoldDate(data.forklift.soldDate ? new Date(data.forklift.soldDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
          setContractUrl(data.forklift.contractUrl || '');
        }
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
        body: JSON.stringify({ status, notes, assignedToId })
      });
      
      let forkliftUpdated = true;
      if (status === 'Won' && inquiry?.forkliftId) {
        const flRes = await fetch(`/api/forklifts/${inquiry.forkliftId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'Sold',
            soldPrice: soldPrice,
            soldDate: soldDate,
            contractUrl: contractUrl
          })
        });
        if (!flRes.ok) forkliftUpdated = false;
      }

      if (res.ok && forkliftUpdated) {
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
                <td style={{ color: '#666', padding: '0.5rem 0' }}>Nguồn khách:</td>
                <td>
                  {inquiry.facebookPage ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#1877F2', fontWeight: 600 }}>
                      <FaFacebook /> Fanpage: {inquiry.facebookPage.pageName}
                    </span>
                  ) : (
                    <span style={{ fontWeight: 600 }}>Website Form</span>
                  )}
                </td>
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

          {/* Lịch sử trò chuyện với AI Chatbot nếu có */}
          {inquiry.chatSession?.messages && inquiry.chatSession.messages.length > 0 && (
            <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'rgba(24, 119, 242, 0.03)', borderRadius: '12px', border: '1px solid rgba(24, 119, 242, 0.15)' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1877F2' }}>
                <FaFacebook /> Lịch sử trò chuyện với AI Bot ({inquiry.chatSession.messages.length} tin)
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '420px', overflowY: 'auto', padding: '0.5rem' }}>
                {inquiry.chatSession.messages.map((m: any) => (
                  <div key={m.id} style={{
                    alignSelf: m.role === 'user' ? 'flex-start' : 'flex-end',
                    maxWidth: '85%',
                    background: m.role === 'user' ? '#F3F4F6' : '#EFF6FF',
                    color: '#1F2937',
                    padding: '0.65rem 0.9rem',
                    borderRadius: '12px',
                    borderBottomLeftRadius: m.role === 'user' ? '2px' : '12px',
                    borderBottomRightRadius: m.role === 'user' ? '12px' : '2px',
                    fontSize: '0.88rem',
                    border: `1px solid ${m.role === 'user' ? '#E5E7EB' : '#DBEAFE'}`
                  }}>
                    <div style={{ fontSize: '0.72rem', color: '#6B7280', marginBottom: '0.2rem', fontWeight: 600 }}>
                      {m.role === 'user' ? inquiry.customerName || 'Khách hàng' : 'AI Trợ lý'} • {new Date(m.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>{m.content}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Khung bên phải: Trạng thái & Ghi chú */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '1rem' }}>
            Cập nhật Trạng thái (Sales)
          </h2>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Người phụ trách (Sales):</label>
            <select 
              className="form-control" 
              value={assignedToId} 
              onChange={(e) => setAssignedToId(e.target.value)}
              style={{ width: '100%', padding: '0.8rem' }}
            >
              <option value="">-- Chưa gán --</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
              ))}
            </select>
          </div>

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
          
          {status === 'Won' && inquiry?.forklift && (
            <div style={{ marginBottom: '1.5rem', background: 'rgba(74, 222, 128, 0.05)', border: '1px solid rgba(74, 222, 128, 0.2)', padding: '1rem', borderRadius: '8px' }}>
              <h3 style={{ color: '#4ade80', fontSize: '1.1rem', marginBottom: '1rem' }}>Thông tin Chốt Đơn (Bán Xe)</h3>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Giá Bán Thực Tế (VNĐ) *:</label>
                <input type="number" required value={soldPrice} onChange={e => setSoldPrice(e.target.value)} className="form-control" style={{ width: '100%' }} />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Ngày Bán *:</label>
                <input type="date" required value={soldDate} onChange={e => setSoldDate(e.target.value)} className="form-control" style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Link Hợp Đồng:</label>
                <input type="text" value={contractUrl} onChange={e => setContractUrl(e.target.value)} className="form-control" style={{ width: '100%' }} placeholder="https://drive.google.com/..." />
              </div>
              <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>
                Trạng thái xe nâng này sẽ tự động chuyển sang <strong>Sold (Đã bán)</strong>.
              </div>
            </div>
          )}

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
