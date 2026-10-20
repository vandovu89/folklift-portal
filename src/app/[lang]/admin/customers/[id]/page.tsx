'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FaArrowLeft, FaSave, FaTools, FaUnlink } from 'react-icons/fa';
import { SERVICE_TYPE_LABELS, SERVICE_STATUS_LABELS, SERVICE_STATUSES, maintenanceState, type ServiceType } from '@/lib/customer';

interface MaintenanceLog { id: string; date: string; hourMeter: number | null; description: string; performedBy: string | null }
interface CustomerForklift {
  id: string; maker: string; model: string; internalCode: string | null; serialNo: string | null; year: number | null; hour: number | null;
  soldDate: string | null; warrantyEndDate: string | null; maintenanceIntervalMonths: number | null; nextMaintenanceDate: string | null;
  maintenanceLogs: MaintenanceLog[];
}
interface CustomerDetail {
  id: string; name: string; phone: string; email: string | null; company: string | null; address: string | null; note: string | null;
  isActive: boolean; lastLoginAt: string | null; createdAt: string;
  forklifts: CustomerForklift[];
  serviceRequests: { id: string; type: string; status: string; message: string | null; preferredDate: string | null; createdAt: string; forklift: { maker: string; model: string; internalCode: string | null } | null }[];
}
interface ForkliftOption { id: string; maker: string; model: string; internalCode: string | null; status: string; customerId: string | null }

const toInputDate = (d: string | null) => (d ? new Date(d).toISOString().split('T')[0] : '');
const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString('vi-VN') : '—');

function ForkliftCard({ forklift, customerId, userRole, onChanged }: { forklift: CustomerForklift; customerId: string; userRole: string; onChanged: () => void }) {
  const [schedule, setSchedule] = useState({
    warrantyEndDate: toInputDate(forklift.warrantyEndDate),
    maintenanceIntervalMonths: String(forklift.maintenanceIntervalMonths || 3),
    nextMaintenanceDate: toInputDate(forklift.nextMaintenanceDate)
  });
  const [log, setLog] = useState({ date: new Date().toISOString().split('T')[0], hourMeter: '', description: '', performedBy: '' });
  const state = maintenanceState(forklift.nextMaintenanceDate);

  const saveSchedule = async () => {
    const res = await fetch(`/api/customers/${customerId}/forklifts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ forkliftId: forklift.id, ...schedule })
    });
    if (res.ok) onChanged();
    else alert((await res.json()).error || 'Lỗi lưu lịch');
  };

  const addLog = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`/api/forklifts/${forklift.id}/maintenance-logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(log)
    });
    if (res.ok) {
      setLog({ ...log, hourMeter: '', description: '' });
      onChanged();
    } else {
      alert((await res.json()).error || 'Lỗi ghi nhận bảo dưỡng');
    }
  };

  const deleteLog = async (logId: string) => {
    if (!confirm('Xóa lần bảo dưỡng này?')) return;
    const res = await fetch(`/api/forklifts/${forklift.id}/maintenance-logs?logId=${logId}`, { method: 'DELETE' });
    if (res.ok) onChanged();
  };

  const unassign = async () => {
    if (!confirm(`Bỏ gán xe ${forklift.maker} ${forklift.model} khỏi khách hàng này?`)) return;
    const res = await fetch(`/api/customers/${customerId}/forklifts?forkliftId=${forklift.id}`, { method: 'DELETE' });
    if (res.ok) onChanged();
  };

  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem', background: 'white' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div>
          <Link href={`/admin/forklifts/${forklift.id}/edit`} style={{ fontWeight: 700, color: '#0284c7' }}>{forklift.maker} {forklift.model}</Link>
          <span style={{ color: '#64748b', fontSize: '0.85rem' }}> {forklift.internalCode ? `· ${forklift.internalCode}` : ''} {forklift.serialNo ? `· SN ${forklift.serialNo}` : ''} · Bán ngày {fmtDate(forklift.soldDate)}</span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {state !== 'unknown' && state !== 'ok' && (
            <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '999px', background: state === 'overdue' ? '#fee2e2' : '#fef3c7', color: state === 'overdue' ? '#b91c1c' : '#92400e' }}>
              {state === 'overdue' ? 'Quá hạn bảo dưỡng' : 'Sắp đến hạn'}
            </span>
          )}
          <button type="button" onClick={unassign} className="btn-secondary" style={{ fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}><FaUnlink /> Bỏ gán</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.6rem', marginTop: '0.8rem', alignItems: 'end' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Bảo hành đến</label>
          <input type="date" className="form-control" value={schedule.warrantyEndDate} onChange={e => setSchedule({ ...schedule, warrantyEndDate: e.target.value })} />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Chu kỳ bảo dưỡng (tháng)</label>
          <input type="number" min={1} className="form-control" value={schedule.maintenanceIntervalMonths} onChange={e => setSchedule({ ...schedule, maintenanceIntervalMonths: e.target.value })} />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Bảo dưỡng tiếp theo</label>
          <input type="date" className="form-control" value={schedule.nextMaintenanceDate} onChange={e => setSchedule({ ...schedule, nextMaintenanceDate: e.target.value })} />
        </div>
        <button type="button" onClick={saveSchedule} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'center' }}><FaSave /> Lưu lịch</button>
      </div>

      <form onSubmit={addLog} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.6rem', marginTop: '1rem', padding: '0.8rem', background: '#f8fafc', borderRadius: '8px', alignItems: 'end' }}>
        <strong style={{ gridColumn: '1 / -1', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><FaTools /> Ghi nhận lần bảo dưỡng (tự lùi lịch tiếp theo theo chu kỳ)</strong>
        <input type="date" required className="form-control" value={log.date} onChange={e => setLog({ ...log, date: e.target.value })} />
        <input type="number" className="form-control" placeholder="Số giờ đồng hồ" value={log.hourMeter} onChange={e => setLog({ ...log, hourMeter: e.target.value })} />
        <input className="form-control" placeholder="Thợ thực hiện" value={log.performedBy} onChange={e => setLog({ ...log, performedBy: e.target.value })} />
        <input required className="form-control" placeholder="Nội dung: thay dầu, lọc gió..." value={log.description} onChange={e => setLog({ ...log, description: e.target.value })} style={{ gridColumn: 'span 2' }} />
        <button type="submit" className="btn-secondary">+ Ghi nhận</button>
      </form>

      {forklift.maintenanceLogs.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, margin: '0.8rem 0 0', display: 'grid', gap: '0.4rem', fontSize: '0.85rem' }}>
          {forklift.maintenanceLogs.map(l => (
            <li key={l.id} style={{ borderLeft: '3px solid #0284c7', paddingLeft: '0.6rem', display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
              <span>
                <strong>{fmtDate(l.date)}</strong>{l.hourMeter ? ` · ${l.hourMeter.toLocaleString('vi-VN')} giờ` : ''}{l.performedBy ? ` · ${l.performedBy}` : ''}
                <div style={{ color: '#475569' }}>{l.description}</div>
              </span>
              {userRole === 'ADMIN' && <button type="button" onClick={() => deleteLog(l.id)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '0.8rem' }}>Xóa</button>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [userRole, setUserRole] = useState('SALES');
  const [forkliftOptions, setForkliftOptions] = useState<ForkliftOption[]>([]);
  const [assignId, setAssignId] = useState('');
  const [info, setInfo] = useState({ name: '', phone: '', company: '', email: '', address: '', note: '', isActive: true, password: '' });
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(() => {
    return fetch(`/api/customers/${id}`)
      .then(async res => {
        if (!res.ok) {
          setNotFound(true);
          return;
        }
        const data: CustomerDetail = await res.json();
        setCustomer(data);
        setInfo({ name: data.name, phone: data.phone, company: data.company || '', email: data.email || '', address: data.address || '', note: data.note || '', isActive: data.isActive, password: '' });
      })
      .catch(console.error);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => d.user && setUserRole(d.user.role)).catch(console.error);
    fetch('/api/forklifts').then(r => r.json()).then((all: ForkliftOption[]) => setForkliftOptions(all.filter(f => !f.customerId))).catch(console.error);
  }, []);

  const saveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    const { password, ...rest } = info;
    const res = await fetch(`/api/customers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(password ? { ...rest, password } : rest)
    });
    const data = await res.json();
    if (!res.ok) return alert(data.error || 'Lỗi cập nhật');
    alert(password ? 'Đã lưu thông tin và đặt lại mật khẩu.' : 'Đã lưu thông tin.');
    load();
  };

  const assignForklift = async () => {
    if (!assignId) return;
    const res = await fetch(`/api/customers/${id}/forklifts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ forkliftId: assignId })
    });
    if (!res.ok) return alert((await res.json()).error || 'Lỗi gán xe');
    setForkliftOptions(prev => prev.filter(f => f.id !== assignId));
    setAssignId('');
    load();
  };

  const updateRequestStatus = async (requestId: string, status: string) => {
    const res = await fetch(`/api/service-requests/${requestId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (res.ok) load();
  };

  const deleteCustomer = async () => {
    if (!customer || !confirm(`Xóa tài khoản ${customer.name}? Xe của khách vẫn được giữ lại.`)) return;
    const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' });
    if (res.ok) router.push('/admin/customers');
  };

  if (notFound) return <div style={{ padding: '2rem' }}>Không tìm thấy khách hàng. <Link href="/admin/customers">Quay lại</Link></div>;
  if (!customer) return <div style={{ padding: '2rem' }}>Đang tải dữ liệu...</div>;

  const sortedOptions = [...forkliftOptions].sort((a, b) => Number(b.status === 'Sold') - Number(a.status === 'Sold'));

  return (
    <div style={{ display: 'grid', gap: '1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
      <Link href="/admin/customers" style={{ color: '#0284c7', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}><FaArrowLeft /> Danh sách khách hàng</Link>

      <form onSubmit={saveInfo} className="glass-panel" style={{ padding: '1.2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>{customer.name}</h3>
          <span style={{ color: '#64748b', fontSize: '0.85rem' }}>
            Tạo ngày {fmtDate(customer.createdAt)} · {customer.lastLoginAt ? `Đăng nhập gần nhất ${new Date(customer.lastLoginAt).toLocaleString('vi-VN')}` : 'Chưa đăng nhập lần nào'}
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.8rem' }}>
          <div className="form-group" style={{ margin: 0 }}><label className="form-label">Tên khách hàng</label><input required className="form-control" value={info.name} onChange={e => setInfo({ ...info, name: e.target.value })} /></div>
          <div className="form-group" style={{ margin: 0 }}><label className="form-label">SĐT (tên đăng nhập)</label><input required className="form-control" value={info.phone} onChange={e => setInfo({ ...info, phone: e.target.value })} /></div>
          <div className="form-group" style={{ margin: 0 }}><label className="form-label">Công ty</label><input className="form-control" value={info.company} onChange={e => setInfo({ ...info, company: e.target.value })} /></div>
          <div className="form-group" style={{ margin: 0 }}><label className="form-label">Email</label><input type="email" className="form-control" value={info.email} onChange={e => setInfo({ ...info, email: e.target.value })} /></div>
          <div className="form-group" style={{ margin: 0 }}><label className="form-label">Địa chỉ</label><input className="form-control" value={info.address} onChange={e => setInfo({ ...info, address: e.target.value })} /></div>
          <div className="form-group" style={{ margin: 0 }}><label className="form-label">Đặt lại mật khẩu</label><input minLength={6} className="form-control" placeholder="Để trống nếu không đổi" value={info.password} onChange={e => setInfo({ ...info, password: e.target.value })} /></div>
          <div className="form-group" style={{ margin: 0, gridColumn: '1 / -1' }}><label className="form-label">Ghi chú nội bộ</label><input className="form-control" value={info.note} onChange={e => setInfo({ ...info, note: e.target.value })} /></div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem' }}>
            <input type="checkbox" checked={info.isActive} onChange={e => setInfo({ ...info, isActive: e.target.checked })} /> Cho phép đăng nhập cổng khách hàng
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {userRole === 'ADMIN' && <button type="button" onClick={deleteCustomer} className="btn-danger">Xóa tài khoản</button>}
            <button type="submit" className="btn-primary">Lưu thông tin</button>
          </div>
        </div>
      </form>

      <div className="glass-panel" style={{ padding: '1.2rem' }}>
        <h3 style={{ margin: '0 0 1rem' }}>🚜 Xe của khách ({customer.forklifts.length})</h3>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <select value={assignId} onChange={e => setAssignId(e.target.value)} className="form-control" style={{ flex: '1 1 300px' }}>
            <option value="">— Chọn xe để gán cho khách (xe Đã bán hiển thị trước) —</option>
            {sortedOptions.map(f => (
              <option key={f.id} value={f.id}>{f.status === 'Sold' ? '✅ ' : ''}{f.maker} {f.model} {f.internalCode ? `(${f.internalCode})` : ''} · {f.status}</option>
            ))}
          </select>
          <button type="button" onClick={assignForklift} disabled={!assignId} className="btn-primary">Gán xe</button>
        </div>
        <div style={{ display: 'grid', gap: '1rem' }}>
          {customer.forklifts.map(f => (
            <ForkliftCard key={`${f.id}-${f.nextMaintenanceDate}-${f.maintenanceLogs.length}`} forklift={f} customerId={customer.id} userRole={userRole} onChanged={load} />
          ))}
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '1.2rem' }}>
        <h3 style={{ margin: '0 0 1rem' }}>📋 Yêu cầu dịch vụ ({customer.serviceRequests.length})</h3>
        {customer.serviceRequests.length === 0 && <div style={{ color: '#94a3b8' }}>Khách chưa gửi yêu cầu nào.</div>}
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          {customer.serviceRequests.map(r => (
            <div key={r.id} style={{ border: '1px solid #e2e8f0', borderLeft: `4px solid ${SERVICE_STATUS_LABELS[r.status]?.color || '#94a3b8'}`, borderRadius: '8px', padding: '0.6rem 0.8rem', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <strong>{SERVICE_TYPE_LABELS[r.type as ServiceType] || r.type}</strong>
                {r.forklift && <span style={{ color: '#64748b' }}> · {r.forklift.maker} {r.forklift.model} {r.forklift.internalCode ? `(${r.forklift.internalCode})` : ''}</span>}
                {r.message && <div style={{ color: '#475569' }}>{r.message}</div>}
                <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{new Date(r.createdAt).toLocaleString('vi-VN')}{r.preferredDate ? ` · Mong muốn: ${fmtDate(r.preferredDate)}` : ''}</div>
              </div>
              <select value={r.status} onChange={e => updateRequestStatus(r.id, e.target.value)} style={{ alignSelf: 'flex-start' }}>
                {SERVICE_STATUSES.map(s => <option key={s} value={s}>{SERVICE_STATUS_LABELS[s].label}</option>)}
              </select>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
