'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FaTools, FaWrench, FaCogs, FaPhoneAlt, FaSignOutAlt, FaKey, FaShieldAlt, FaCalendarCheck } from 'react-icons/fa';
import {
  SERVICE_TYPE_LABELS, SERVICE_STATUS_LABELS, maintenanceState, isUnderWarranty, type ServiceType
} from '@/lib/customer';

interface PortalForklift {
  id: string;
  maker: string;
  model: string;
  internalCode: string | null;
  serialNo: string | null;
  year: number | null;
  hour: number | null;
  loadCapacity: string | null;
  powerType: string | null;
  soldDate: Date | null;
  warrantyEndDate: Date | null;
  maintenanceIntervalMonths: number | null;
  nextMaintenanceDate: Date | null;
  media: { url: string }[];
  maintenanceLogs: { id: string; date: Date; hourMeter: number | null; description: string }[];
}

interface PortalCustomer {
  id: string;
  name: string;
  phone: string;
  company: string | null;
  forklifts: PortalForklift[];
  serviceRequests: { id: string; type: string; status: string; message: string | null; createdAt: Date; forkliftId: string | null }[];
}

const HOTLINE = '84362396092';
const SERVICE_ACTIONS: { type: ServiceType; icon: React.ReactNode; color: string }[] = [
  { type: 'MAINTENANCE', icon: <FaCalendarCheck />, color: '#0284c7' },
  { type: 'REPAIR', icon: <FaWrench />, color: '#dc2626' },
  { type: 'PARTS', icon: <FaCogs />, color: '#7c3aed' },
];

const fmtDate = (d: Date | string | null) => (d ? new Date(d).toLocaleDateString('vi-VN') : '—');

export default function CustomerPortal({ lang, customer }: { lang: string; customer: PortalCustomer }) {
  const t = (vi: string, en: string) => (lang === 'vi' ? vi : en);
  const router = useRouter();
  const [requestFor, setRequestFor] = useState<{ forkliftId: string | null; type: ServiceType } | null>(null);
  const [message, setMessage] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });

  const logout = async () => {
    await fetch('/api/customer-portal/logout', { method: 'POST' });
    router.push(`/${lang}/customer/login`);
    router.refresh();
  };

  const submitRequest = async () => {
    if (!requestFor) return;
    setSending(true);
    try {
      const res = await fetch('/api/customer-portal/service-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...requestFor, message, preferredDate })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNotice(t('✅ Đã gửi yêu cầu! Kỹ thuật viên MCK Japan sẽ gọi lại cho bạn trong thời gian sớm nhất.', '✅ Request sent! An MCK Japan technician will call you back shortly.'));
      setRequestFor(null);
      setMessage('');
      setPreferredDate('');
      router.refresh();
    } catch (err) {
      setNotice('⚠️ ' + (err instanceof Error ? err.message : t('Gửi yêu cầu thất bại', 'Failed to send request')));
      setRequestFor(null);
    }
    setSending(false);
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/customer-portal/password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(passwords)
    });
    const data = await res.json();
    if (res.ok) {
      setNotice(t('✅ Đã đổi mật khẩu.', '✅ Password changed.'));
      setShowPassword(false);
      setPasswords({ currentPassword: '', newPassword: '' });
    } else {
      alert(data.error);
    }
  };

  const stateBadge = (next: Date | null) => {
    const state = maintenanceState(next);
    const map = {
      overdue: { bg: '#fee2e2', color: '#b91c1c', text: t('Quá hạn bảo dưỡng', 'Maintenance overdue') },
      due_soon: { bg: '#fef3c7', color: '#92400e', text: t('Sắp đến hạn bảo dưỡng', 'Maintenance due soon') },
      ok: { bg: '#dcfce7', color: '#166534', text: t('Đúng lịch bảo dưỡng', 'On schedule') },
      unknown: { bg: '#f1f5f9', color: '#475569', text: t('Chưa có lịch bảo dưỡng', 'No schedule yet') },
    }[state];
    return <span style={{ background: map.bg, color: map.color, padding: '0.25rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700 }}>{map.text}</span>;
  };

  const dueForklifts = customer.forklifts.filter(f => ['overdue', 'due_soon'].includes(maintenanceState(f.nextMaintenanceDate)));
  const openRequests = customer.serviceRequests.filter(r => r.status === 'New' || r.status === 'InProgress');

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', color: '#0f172a', margin: 0 }}>
            {t('Xin chào', 'Hello')}, {customer.name} 👋
          </h1>
          <p style={{ color: '#64748b', margin: '0.3rem 0 0' }}>{customer.company || customer.phone}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <FaKey /> {t('Đổi mật khẩu', 'Change password')}
          </button>
          <button type="button" onClick={logout} className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <FaSignOutAlt /> {t('Đăng xuất', 'Sign out')}
          </button>
        </div>
      </div>

      {showPassword && (
        <form onSubmit={changePassword} className="glass-panel" style={{ padding: '1.2rem', marginBottom: '1.5rem', display: 'flex', gap: '0.8rem', flexWrap: 'wrap', alignItems: 'flex-end', background: 'white' }}>
          <div className="form-group" style={{ flex: '1 1 200px', margin: 0 }}>
            <label className="form-label">{t('Mật khẩu hiện tại', 'Current password')}</label>
            <input required type="password" autoComplete="current-password" className="form-control" value={passwords.currentPassword} onChange={e => setPasswords({ ...passwords, currentPassword: e.target.value })} />
          </div>
          <div className="form-group" style={{ flex: '1 1 200px', margin: 0 }}>
            <label className="form-label">{t('Mật khẩu mới (tối thiểu 6 ký tự)', 'New password (min 6 chars)')}</label>
            <input required minLength={6} type="password" autoComplete="new-password" className="form-control" value={passwords.newPassword} onChange={e => setPasswords({ ...passwords, newPassword: e.target.value })} />
          </div>
          <button type="submit" className="btn-primary">{t('Lưu', 'Save')}</button>
        </form>
      )}

      {notice && (
        <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', color: '#0c4a6e', borderRadius: '8px', padding: '0.8rem 1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0c4a6e' }}>✕</button>
        </div>
      )}

      {dueForklifts.length > 0 && (
        <div style={{ background: '#fffbeb', border: '2px solid #f59e0b', borderRadius: '12px', padding: '1rem 1.2rem', marginBottom: '1.5rem' }}>
          <strong style={{ color: '#92400e' }}>🔔 {t('Nhắc lịch bảo dưỡng', 'Maintenance reminder')}</strong>
          <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.2rem', color: '#78350f', fontSize: '0.9rem' }}>
            {dueForklifts.map(f => (
              <li key={f.id}>
                {f.maker} {f.model} {f.internalCode ? `(${f.internalCode})` : ''}: {t('hạn bảo dưỡng', 'due on')} <strong>{fmtDate(f.nextMaintenanceDate)}</strong>
                {' · '}
                <button type="button" onClick={() => setRequestFor({ forkliftId: f.id, type: 'MAINTENANCE' })} style={{ background: 'none', border: 'none', color: '#b45309', textDecoration: 'underline', cursor: 'pointer', padding: 0, fontWeight: 700 }}>
                  {t('Đặt lịch ngay', 'Book now')}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        <a href={`tel:${HOTLINE}`} className="btn-primary hover-lift-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', background: '#dc2626', borderColor: '#dc2626' }}>
          <FaPhoneAlt /> {t('Gọi thợ ngay: 0362 396 092', 'Call technician: +84 362 396 092')}
        </a>
        <a href={`https://zalo.me/${HOTLINE}`} target="_blank" rel="noopener noreferrer" className="btn-primary hover-lift-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', background: '#0068ff', borderColor: '#0068ff' }}>
          💬 {t('Nhắn Zalo kỹ thuật', 'Chat on Zalo')}
        </a>
        <button type="button" onClick={() => setRequestFor({ forkliftId: null, type: 'PARTS' })} className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
          <FaCogs /> {t('Hỏi mua phụ tùng', 'Ask for spare parts')}
        </button>
      </div>

      <h2 style={{ fontSize: '1.3rem', color: '#0f172a', marginBottom: '1rem' }}>🚜 {t('Xe của tôi', 'My forklifts')} ({customer.forklifts.length})</h2>
      {customer.forklifts.length === 0 && (
        <p style={{ color: '#64748b' }}>{t('Chưa có xe nào được gắn với tài khoản. Vui lòng liên hệ MCK Japan.', 'No forklifts linked to your account yet. Please contact MCK Japan.')}</p>
      )}
      <div style={{ display: 'grid', gap: '1.2rem' }}>
        {customer.forklifts.map(f => (
          <div key={f.id} className="glass-panel" style={{ background: 'white', padding: 0, overflow: 'hidden', display: 'flex', flexWrap: 'wrap' }}>
            <div style={{ flex: '0 0 220px', maxWidth: '100%', minHeight: '160px', background: '#f1f5f9' }}>
              {f.media[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.media[0].url} alt={`${f.maker} ${f.model}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>🚜</div>
              )}
            </div>
            <div style={{ flex: '1 1 320px', padding: '1.2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a' }}>
                  <span style={{ color: 'var(--primary)' }}>{f.maker}</span> {f.model}
                </h3>
                {stateBadge(f.nextMaintenanceDate)}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#64748b', margin: '0.3rem 0 0.9rem' }}>
                {[f.internalCode && `${t('Mã', 'Code')}: ${f.internalCode}`, f.serialNo && `Serial: ${f.serialNo}`, f.year && `${t('Đời', 'Year')} ${f.year}`, f.loadCapacity].filter(Boolean).join(' • ')}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.8rem', fontSize: '0.85rem', marginBottom: '1rem' }}>
                <div>
                  <div style={{ color: '#64748b' }}>{t('Ngày bàn giao', 'Handover')}</div>
                  <strong>{fmtDate(f.soldDate)}</strong>
                </div>
                <div>
                  <div style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><FaShieldAlt /> {t('Bảo hành đến', 'Warranty until')}</div>
                  <strong style={{ color: isUnderWarranty(f.warrantyEndDate) ? '#16a34a' : '#64748b' }}>
                    {fmtDate(f.warrantyEndDate)} {f.warrantyEndDate && !isUnderWarranty(f.warrantyEndDate) ? t('(hết hạn)', '(expired)') : ''}
                  </strong>
                </div>
                <div>
                  <div style={{ color: '#64748b' }}>{t('Bảo dưỡng tiếp theo', 'Next maintenance')}</div>
                  <strong>{fmtDate(f.nextMaintenanceDate)}</strong>
                  {f.maintenanceIntervalMonths ? <span style={{ color: '#94a3b8' }}> ({t(`${f.maintenanceIntervalMonths} tháng/lần`, `every ${f.maintenanceIntervalMonths} mo`)})</span> : null}
                </div>
                <div>
                  <div style={{ color: '#64748b' }}>{t('Giờ hoạt động', 'Hour meter')}</div>
                  <strong>{f.hour !== null ? `${f.hour.toLocaleString('vi-VN')} ${t('giờ', 'h')}` : '—'}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {SERVICE_ACTIONS.map(action => (
                  <button
                    key={action.type}
                    type="button"
                    onClick={() => setRequestFor({ forkliftId: f.id, type: action.type })}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'white', border: `1px solid ${action.color}`, color: action.color, borderRadius: '8px', padding: '0.5rem 0.8rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                  >
                    {action.icon} {SERVICE_TYPE_LABELS[action.type]}
                  </button>
                ))}
                <Link href={`/${lang}/machine/${f.id}`} style={{ alignSelf: 'center', fontSize: '0.85rem', color: '#0284c7', marginLeft: 'auto' }}>
                  {t('Xem hồ sơ xe', 'View forklift')} →
                </Link>
              </div>

              {f.maintenanceLogs.length > 0 && (
                <details style={{ marginTop: '1rem', fontSize: '0.85rem' }}>
                  <summary style={{ cursor: 'pointer', color: '#334155', fontWeight: 600 }}>
                    <FaTools style={{ marginRight: '0.3rem' }} /> {t('Lịch sử bảo dưỡng', 'Maintenance history')} ({f.maintenanceLogs.length})
                  </summary>
                  <ul style={{ listStyle: 'none', padding: 0, margin: '0.6rem 0 0', display: 'grid', gap: '0.4rem' }}>
                    {f.maintenanceLogs.map(log => (
                      <li key={log.id} style={{ borderLeft: '3px solid #0284c7', paddingLeft: '0.6rem' }}>
                        <strong>{fmtDate(log.date)}</strong>
                        {log.hourMeter ? <span style={{ color: '#64748b' }}> · {log.hourMeter.toLocaleString('vi-VN')} {t('giờ', 'h')}</span> : null}
                        <div style={{ color: '#475569' }}>{log.description}</div>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          </div>
        ))}
      </div>

      {customer.serviceRequests.length > 0 && (
        <>
          <h2 style={{ fontSize: '1.3rem', color: '#0f172a', margin: '2rem 0 1rem' }}>
            📋 {t('Yêu cầu dịch vụ', 'Service requests')} {openRequests.length > 0 ? `(${openRequests.length} ${t('đang xử lý', 'open')})` : ''}
          </h2>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {customer.serviceRequests.map(r => {
              const status = SERVICE_STATUS_LABELS[r.status] || SERVICE_STATUS_LABELS.New;
              const forklift = customer.forklifts.find(f => f.id === r.forkliftId);
              return (
                <div key={r.id} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.7rem 1rem', display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', fontSize: '0.9rem' }}>
                  <div>
                    <strong>{SERVICE_TYPE_LABELS[r.type as ServiceType] || r.type}</strong>
                    {forklift && <span style={{ color: '#64748b' }}> · {forklift.maker} {forklift.model}</span>}
                    {r.message && <div style={{ color: '#475569', fontSize: '0.85rem' }}>{r.message}</div>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ color: status.color, fontWeight: 700 }}>{status.label}</span>
                    <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{fmtDate(r.createdAt)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {requestFor && (
        <div
          onClick={() => setRequestFor(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
        >
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', width: '100%', maxWidth: '460px' }}>
            <h3 style={{ margin: '0 0 0.3rem', color: '#0f172a' }}>{SERVICE_TYPE_LABELS[requestFor.type]}</h3>
            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0 0 1rem' }}>
              {(() => {
                const f = customer.forklifts.find(x => x.id === requestFor.forkliftId);
                return f ? `${f.maker} ${f.model}${f.internalCode ? ` (${f.internalCode})` : ''}` : t('Yêu cầu chung', 'General request');
              })()}
            </p>
            <div className="form-group">
              <label className="form-label">{t('Mô tả (không bắt buộc)', 'Details (optional)')}</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={3}
                className="form-control"
                style={{ resize: 'vertical', fontFamily: 'inherit' }}
                placeholder={requestFor.type === 'PARTS' ? t('Tên phụ tùng, mã phụ tùng hoặc ảnh chụp...', 'Part name or number...') : t('Xe đang gặp vấn đề gì?', 'What is the problem?')}
              />
            </div>
            {requestFor.type !== 'PARTS' && (
              <div className="form-group">
                <label className="form-label">{t('Ngày mong muốn thợ đến', 'Preferred date')}</label>
                <input type="date" value={preferredDate} onChange={e => setPreferredDate(e.target.value)} className="form-control" />
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setRequestFor(null)} className="btn-secondary">{t('Hủy', 'Cancel')}</button>
              <button type="button" onClick={submitRequest} disabled={sending} className="btn-primary">{sending ? t('Đang gửi...', 'Sending...') : t('Gửi yêu cầu', 'Send request')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
