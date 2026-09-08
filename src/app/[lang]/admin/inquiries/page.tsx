'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';

export default function InquiriesPage({ params }: { params: Promise<{ lang: string }> }) {
  const resolvedParams = use(params);
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    fetchInquiries();
  }, [filter]);

  const fetchInquiries = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/inquiries?status=${filter}`);
      const data = await res.json();
      setInquiries(data);
    } catch (error) {
      console.error('Failed to fetch inquiries', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-container fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--foreground)' }}>Quản lý Yêu cầu (Inquiries)</h1>
        
        <select 
          className="form-control" 
          value={filter} 
          onChange={(e) => setFilter(e.target.value)}
          style={{ width: '200px' }}
        >
          <option value="All">Tất cả trạng thái</option>
          <option value="New">Mới (New)</option>
          <option value="Contacted">Đã liên hệ (Contacted)</option>
          <option value="Negotiating">Đang thương lượng (Negotiating)</option>
          <option value="Quoted">Đã báo giá (Quoted)</option>
          <option value="Won">Thành công (Won)</option>
          <option value="Lost">Thất bại (Lost)</option>
        </select>
      </div>

      <div className="table-container">
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>Đang tải dữ liệu...</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Khách hàng</th>
                <th>SĐT</th>
                <th>Email</th>
                <th>Xe quan tâm</th>
                <th>Nguồn</th>
                <th>Ngày gửi</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {inquiries.map((iq) => (
                <tr key={iq.id}>
                  <td style={{ fontWeight: 600 }}>{iq.customerName}</td>
                  <td>{iq.phone || '-'}</td>
                  <td>{iq.email || '-'}</td>
                  <td>
                    {iq.forklift ? (
                      <Link href={`/${resolvedParams.lang}/machine/${iq.forkliftId}`} target="_blank" style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                        {iq.forklift.maker} {iq.forklift.model}
                      </Link>
                    ) : (
                      <span style={{ color: '#888' }}>Liên hệ chung</span>
                    )}
                  </td>
                  <td>
                    {iq.facebookPage ? (
                      <span style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '0.25rem', 
                        background: 'rgba(24, 119, 242, 0.1)', 
                        color: '#1877F2', 
                        padding: '0.2rem 0.5rem', 
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        fontWeight: 600
                      }}>
                        FB: {iq.facebookPage.pageName}
                      </span>
                    ) : (
                      <span style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        background: 'rgba(0,0,0,0.05)', 
                        color: 'var(--muted)', 
                        padding: '0.2rem 0.5rem', 
                        borderRadius: '4px',
                        fontSize: '0.8rem'
                      }}>
                        Website
                      </span>
                    )}
                  </td>
                  <td>{new Date(iq.createdAt).toLocaleDateString('vi-VN')}</td>
                  <td>
                    <span className={`status-badge status-${iq.status.toLowerCase()}`}>
                      {iq.status}
                    </span>
                  </td>
                  <td>
                    <Link href={`/${resolvedParams.lang}/admin/inquiries/${iq.id}`} className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem', textDecoration: 'none' }}>
                      Chi tiết
                    </Link>
                  </td>
                </tr>
              ))}
              
              {inquiries.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
                    Không có yêu cầu nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
