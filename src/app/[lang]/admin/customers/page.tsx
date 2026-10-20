'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FaPlus, FaUserTie, FaBell } from 'react-icons/fa';
import { SERVICE_TYPE_LABELS, SERVICE_STATUS_LABELS, SERVICE_STATUSES, maintenanceState, type ServiceType } from '@/lib/customer';

interface CustomerRow {
  id: string;
  name: string;
  phone: string;
  company: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  forklifts: { id: string; maker: string; model: string; internalCode: string | null; nextMaintenanceDate: string | null }[];
  _count: { serviceRequests: number };
}

interface ServiceRequestRow {
  id: string;
  type: string;
  status: string;
  message: string | null;
  preferredDate: string | null;
  createdAt: string;
  customer: { id: string; name: string; phone: string; company: string | null };
  forklift: { id: string; maker: string; model: string; internalCode: string | null } | null;
}

const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString('vi-VN') : '—');
const emptyForm = { name: '', phone: '', password: '', company: '', email: '', address: '' };

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [requests, setRequests] = useState<ServiceRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState('');

  const load = async () => {
    try {
      const [cRes, rRes] = await Promise.all([fetch('/api/customers'), fetch('/api/service-requests?status=New,InProgress')]);
      if (cRes.ok) setCustomers(await cRes.json());
      if (rRes.ok) setRequests(await rRes.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    const data = await res.json();
    if (!res.ok) return alert(data.error || 'Lỗi tạo tài khoản');
    alert(`Đã tạo tài khoản cho ${data.name}.\nĐăng nhập tại /vi/customer/login bằng SĐT ${data.phone} và mật khẩu vừa đặt.`);
    setForm(emptyForm);
    setShowForm(false);
    load();
  };

  const updateRequestStatus = async (id: string, status: string) => {
    const res = await fetch(`/api/service-requests/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (res.ok) load();
    else alert('Không cập nhật được trạng thái');
  };

  const dueList = customers.flatMap(c =>
    c.forklifts
      .filter(f => ['overdue', 'due_soon'].includes(maintenanceState(f.nextMaintenanceDate)))
      .map(f => ({ customer: c, forklift: f, overdue: maintenanceState(f.nextMaintenanceDate) === 'overdue' }))
  ).sort((a, b) => new Date(a.forklift.nextMaintenanceDate!).getTime() - new Date(b.forklift.nextMaintenanceDate!).getTime());

  const filtered = customers.filter(c => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [c.name, c.phone, c.company, ...c.forklifts.map(f => `${f.maker} ${f.model} ${f.internalCode || ''}`)]
      .some(v => v?.toLowerCase().includes(q));
  });

  if (loading) return <div style={{ padding: '2rem' }}>Đang tải dữ liệu...</div>;

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))', gap: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.2rem' }}>
          <h3 style={{ margin: '0 0 0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FaBell color="#f97316" /> Yêu cầu dịch vụ đang chờ ({requests.length})
          </h3>
          {requests.length === 0 && <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Không có yêu cầu nào đang chờ.</div>}
          <div style={{ display: 'grid', gap: '0.6rem' }}>
            {requests.map(r => (
              <div key={r.id} style={{ border: '1px solid #e2e8f0', borderLeft: `4px solid ${SERVICE_STATUS_LABELS[r.status]?.color || '#94a3b8'}`, borderRadius: '8px', padding: '0.6rem 0.8rem', fontSize: '0.85rem', background: 'white' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <strong>{SERVICE_TYPE_LABELS[r.type as ServiceType] || r.type}</strong>
                  <select value={r.status} onChange={e => updateRequestStatus(r.id, e.target.value)} style={{ fontSize: '0.8rem', padding: '0.1rem 0.3rem' }}>
                    {SERVICE_STATUSES.map(s => <option key={s} value={s}>{SERVICE_STATUS_LABELS[s].label}</option>)}
                  </select>
                </div>
                <div>
                  <Link href={`/admin/customers/${r.customer.id}`} style={{ color: '#0284c7' }}>{r.customer.name}</Link>
                  {' · '}<a href={`tel:${r.customer.phone}`}>{r.customer.phone}</a>
                  {r.forklift && <> · {r.forklift.maker} {r.forklift.model} {r.forklift.internalCode ? `(${r.forklift.internalCode})` : ''}</>}
                </div>
                {r.message && <div style={{ color: '#475569', marginTop: '0.2rem' }}>{r.message}</div>}
                <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '0.2rem' }}>
                  Gửi lúc {new Date(r.createdAt).toLocaleString('vi-VN')}{r.preferredDate ? ` · Mong muốn: ${fmtDate(r.preferredDate)}` : ''}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.2rem' }}>
          <h3 style={{ margin: '0 0 0.8rem' }}>🔔 Xe sắp / quá hạn bảo dưỡng ({dueList.length})</h3>
          {dueList.length === 0 && <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Không có xe nào cần bảo dưỡng trong 14 ngày tới.</div>}
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {dueList.map(({ customer, forklift, overdue }) => (
              <div key={forklift.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.85rem', padding: '0.5rem 0.7rem', borderRadius: '8px', background: overdue ? '#fee2e2' : '#fef3c7' }}>
                <span>
                  <strong>{forklift.maker} {forklift.model}</strong> {forklift.internalCode ? `(${forklift.internalCode})` : ''} · <Link href={`/admin/customers/${customer.id}`} style={{ color: '#0284c7' }}>{customer.name}</Link>
                </span>
                <span style={{ fontWeight: 700, color: overdue ? '#b91c1c' : '#92400e' }}>{overdue ? 'Quá hạn' : 'Hạn'} {fmtDate(forklift.nextMaintenanceDate)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '1.2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FaUserTie /> Khách hàng hậu mãi ({customers.length})</h3>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <input value={search} onChange={e => setSearch(e.target.value)} className="form-control" placeholder="Tìm tên, SĐT, công ty, xe..." style={{ minWidth: '220px' }} />
            <button type="button" onClick={() => setShowForm(!showForm)} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <FaPlus /> Cấp tài khoản
            </button>
          </div>
        </div>

        {showForm && (
          <form onSubmit={createCustomer} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.8rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px', marginBottom: '1rem' }}>
            <input required className="form-control" placeholder="Tên khách hàng *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <input required className="form-control" placeholder="Số điện thoại (tên đăng nhập) *" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            <input required minLength={6} className="form-control" placeholder="Mật khẩu ban đầu (≥ 6 ký tự) *" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            <input className="form-control" placeholder="Công ty" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} />
            <input className="form-control" type="email" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            <input className="form-control" placeholder="Địa chỉ kho / nhà máy" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Hủy</button>
              <button type="submit" className="btn-primary">Tạo tài khoản</button>
            </div>
          </form>
        )}

        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '0.6rem' }}>Khách hàng</th>
                <th style={{ padding: '0.6rem' }}>SĐT</th>
                <th style={{ padding: '0.6rem' }}>Xe đã mua</th>
                <th style={{ padding: '0.6rem' }}>Yêu cầu chờ</th>
                <th style={{ padding: '0.6rem' }}>Đăng nhập gần nhất</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={5} style={{ padding: '1rem', color: '#94a3b8', textAlign: 'center' }}>Chưa có khách hàng nào.</td></tr>
              )}
              {filtered.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9', opacity: c.isActive ? 1 : 0.5 }}>
                  <td style={{ padding: '0.6rem' }}>
                    <Link href={`/admin/customers/${c.id}`} style={{ color: '#0284c7', fontWeight: 600 }}>{c.name}</Link>
                    {c.company && <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{c.company}</div>}
                    {!c.isActive && <span className="badge" style={{ fontSize: '0.7rem' }}>Đã khóa</span>}
                  </td>
                  <td style={{ padding: '0.6rem' }}>{c.phone}</td>
                  <td style={{ padding: '0.6rem' }}>{c.forklifts.map(f => `${f.maker} ${f.model}`).join(', ') || '—'}</td>
                  <td style={{ padding: '0.6rem', color: c._count.serviceRequests ? '#f97316' : '#94a3b8', fontWeight: 700 }}>{c._count.serviceRequests}</td>
                  <td style={{ padding: '0.6rem', color: '#64748b' }}>{c.lastLoginAt ? new Date(c.lastLoginAt).toLocaleString('vi-VN') : 'Chưa đăng nhập'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
