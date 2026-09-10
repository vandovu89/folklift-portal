'use client';

import { useEffect, useState, use } from 'react';
import { 
  FaFacebook, 
  FaPlus, 
  FaSync, 
  FaTrash, 
  FaEdit, 
  FaKey, 
  FaCopy, 
  FaEye, 
  FaEyeSlash, 
  FaInfoCircle, 
  FaRobot, 
  FaCheckCircle, 
  FaTimesCircle,
  FaComments,
  FaUserFriends,
  FaHistory,
  FaTrashAlt,
  FaCode
} from 'react-icons/fa';

interface FacebookPageItem {
  id: string;
  pageId: string;
  pageName: string;
  accessTokenMasked?: string;
  isActive: boolean;
  greeting?: string | null;
  createdAt: string;
  _count?: {
    sessions: number;
    inquiries: number;
  };
}

interface BotLogItem {
  id: string;
  pageId?: string | null;
  pageName?: string | null;
  eventType: string;
  senderId?: string | null;
  message?: string | null;
  details?: string | null;
  status: string;
  createdAt: string;
}

export default function FacebookPagesAdminPage({ params }: { params: Promise<{ lang: string }> }) {
  const resolvedParams = use(params);
  const [pages, setPages] = useState<FacebookPageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPage, setEditingPage] = useState<FacebookPageItem | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    pageName: '',
    pageId: '',
    accessToken: '',
    greeting: '',
    isActive: true
  });
  const [showToken, setShowToken] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Status & Test states
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<{ [key: string]: { success: boolean; msg: string } }>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Bot Logs states
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [logs, setLogs] = useState<BotLogItem[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [autoRefreshLogs, setAutoRefreshLogs] = useState(true);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Webhook domain
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
    fetchPages();
  }, []);

  // Auto refresh logs when modal is open
  useEffect(() => {
    let timer: any;
    if (showLogsModal && autoRefreshLogs) {
      timer = setInterval(() => {
        fetch('/api/bot-logs')
          .then(r => r.json())
          .then(d => { if (d.success) setLogs(d.logs); })
          .catch(() => {});
      }, 3000);
    }
    return () => clearInterval(timer);
  }, [showLogsModal, autoRefreshLogs]);

  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const res = await fetch('/api/bot-logs');
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs);
      }
    } catch (err) {
      console.error('Failed to fetch logs', err);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleClearLogs = async () => {
    if (!confirm('Bạn có chắc chắn muốn xóa toàn bộ nhật ký log hoạt động?')) return;
    try {
      const res = await fetch('/api/bot-logs', { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setLogs([]);
      }
    } catch {
      alert('Xóa log thất bại');
    }
  };

  const fetchPages = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/facebook-pages');
      const data = await res.json();
      if (data.success) {
        setPages(data.pages);
      }
    } catch (err) {
      console.error('Failed to load facebook pages', err);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingPage(null);
    setFormData({
      pageName: '',
      pageId: '',
      accessToken: '',
      greeting: '',
      isActive: true
    });
    setShowToken(false);
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (page: FacebookPageItem) => {
    setEditingPage(page);
    setFormData({
      pageName: page.pageName,
      pageId: page.pageId,
      accessToken: '', // Để trống nếu không muốn đổi token
      greeting: page.greeting || '',
      isActive: page.isActive
    });
    setShowToken(false);
    setFormError('');
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');

    try {
      if (editingPage) {
        // Cập nhật
        const res = await fetch(`/api/facebook-pages/${editingPage.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Cập nhật thất bại');
        }
      } else {
        // Thêm mới
        const res = await fetch('/api/facebook-pages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Thêm Fanpage thất bại');
        }
      }

      setShowModal(false);
      fetchPages();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc chắn muốn ngắt kết nối và xóa Fanpage "${name}" không?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/facebook-pages/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setPages(pages.filter(p => p.id !== id));
      } else {
        alert(data.error || 'Xóa thất bại');
      }
    } catch (err) {
      alert('Đã xảy ra lỗi khi xóa');
    }
  };

  const handleToggleActive = async (page: FacebookPageItem) => {
    const updatedStatus = !page.isActive;
    try {
      const res = await fetch(`/api/facebook-pages/${page.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: updatedStatus })
      });
      const data = await res.json();
      if (data.success) {
        setPages(pages.map(p => p.id === page.id ? { ...p, isActive: updatedStatus } : p));
      }
    } catch (err) {
      console.error('Toggle status failed', err);
    }
  };

  const handleTestToken = async (id: string) => {
    setTestingId(id);
    try {
      const res = await fetch(`/api/facebook-pages/${id}/test`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setTestResults(prev => ({
          ...prev,
          [id]: { success: true, msg: `Kết nối tốt: ${data.pageName || 'Hợp lệ'}` }
        }));
      } else {
        setTestResults(prev => ({
          ...prev,
          [id]: { success: false, msg: data.error || 'Token hết hạn hoặc sai quyền' }
        }));
      }
    } catch (err: any) {
      setTestResults(prev => ({
        ...prev,
        [id]: { success: false, msg: 'Lỗi khi gọi API' }
      }));
    } finally {
      setTestingId(null);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const webhookUrl = `${origin || 'https://vietnhat-forklift.vercel.app'}/api/webhook/messenger`;
  const verifyToken = 'vietnhat_forklift_secret_token_2026';

  const totalSessions = pages.reduce((acc, p) => acc + (p._count?.sessions || 0), 0);
  const totalInquiries = pages.reduce((acc, p) => acc + (p._count?.inquiries || 0), 0);
  const activePages = pages.filter(p => p.isActive).length;

  return (
    <div className="admin-container fade-in" style={{ paddingBottom: '3rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <FaFacebook style={{ color: '#1877F2' }} /> Quản lý Fanpage Facebook & AI Bot
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.95rem', marginTop: '0.25rem' }}>
            Quản lý tập trung nhiều Fanpage, tự động phân luồng tin nhắn và phản hồi bằng Gemini AI.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button 
            onClick={() => { setShowLogsModal(true); fetchLogs(); }}
            className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--card-bg, #fff)' }}
            title="Xem lịch sử Webhook và nhật ký bot"
          >
            <FaHistory style={{ color: '#2563EB' }} /> Nhật ký hoạt động (Logs)
          </button>

          <button 
            onClick={openAddModal} 
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <FaPlus /> Thêm Fanpage mới
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
        gap: '1.25rem', 
        marginBottom: '2rem' 
      }}>
        <div style={{ background: 'var(--card-bg, #fff)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Tổng Fanpage</span>
            <FaFacebook style={{ color: '#1877F2', fontSize: '1.4rem' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, marginTop: '0.5rem' }}>{pages.length}</div>
          <div style={{ fontSize: '0.8rem', color: '#10B981', marginTop: '0.25rem' }}>{activePages} đang bật Bot</div>
        </div>

        <div style={{ background: 'var(--card-bg, #fff)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Cuộc hội thoại AI</span>
            <FaComments style={{ color: '#8B5CF6', fontSize: '1.4rem' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, marginTop: '0.5rem' }}>{totalSessions}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.25rem' }}>Từ khách hàng Facebook</div>
        </div>

        <div style={{ background: 'var(--card-bg, #fff)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Khách hàng tiềm năng (Leads)</span>
            <FaUserFriends style={{ color: '#F59E0B', fontSize: '1.4rem' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, marginTop: '0.5rem' }}>{totalInquiries}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.25rem' }}>AI thu thập SĐT tự động</div>
        </div>
      </div>

      {/* Webhook Configuration Info Card */}
      <div style={{ 
        background: 'linear-gradient(135deg, rgba(24, 119, 242, 0.05) 0%, rgba(37, 99, 235, 0.02) 100%)', 
        border: '1px solid rgba(24, 119, 242, 0.2)', 
        borderRadius: '12px', 
        padding: '1.25rem', 
        marginBottom: '2rem' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: '#1877F2', marginBottom: '0.75rem' }}>
          <FaInfoCircle /> Thông tin cấu hình Webhook chung trên Meta for Developers
        </div>
        <p style={{ fontSize: '0.88rem', color: 'var(--foreground)', marginBottom: '1rem', lineHeight: 1.5 }}>
          Dùng chung duy nhất một URL Webhook này cho tất cả các Fanpage trong Meta App của bạn. Hệ thống sẽ tự phân luồng theo từng Page ID:
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          <div style={{ background: 'var(--card-bg, #fff)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.25rem', fontWeight: 600 }}>CALLBACK URL:</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
              <code style={{ fontSize: '0.85rem', wordBreak: 'break-all', color: '#2563EB' }}>{webhookUrl}</code>
              <button 
                onClick={() => copyToClipboard(webhookUrl, 'webhook')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: copiedKey === 'webhook' ? '#10B981' : 'var(--muted)' }}
                title="Sao chép"
              >
                <FaCopy />
              </button>
            </div>
          </div>

          <div style={{ background: 'var(--card-bg, #fff)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.25rem', fontWeight: 600 }}>VERIFY TOKEN:</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
              <code style={{ fontSize: '0.85rem', color: '#2563EB' }}>{verifyToken}</code>
              <button 
                onClick={() => copyToClipboard(verifyToken, 'verify')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: copiedKey === 'verify' ? '#10B981' : 'var(--muted)' }}
                title="Sao chép"
              >
                <FaCopy />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Pages Table */}
      <div className="table-container" style={{ background: 'var(--card-bg, #fff)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 600, fontSize: '1.05rem' }}>Danh sách Fanpage ({pages.length})</div>
          <button 
            onClick={fetchPages} 
            className="btn btn-outline"
            style={{ fontSize: '0.85rem', padding: '0.4rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <FaSync className={loading ? 'spin' : ''} /> Làm mới
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>
            Đang tải danh sách Fanpage...
          </div>
        ) : pages.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <FaFacebook style={{ fontSize: '3rem', color: '#9CA3AF', marginBottom: '1rem' }} />
            <p style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.5rem' }}>Chưa có Fanpage nào được kết nối</p>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Thêm Fanpage để bot tự động trả lời tin nhắn của khách hàng.
            </p>
            <button onClick={openAddModal} className="btn btn-primary">
              <FaPlus /> Kết nối Fanpage đầu tiên
            </button>
          </div>
        ) : (
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.02)', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '0.9rem 1.25rem' }}>Tên Fanpage</th>
                <th style={{ padding: '0.9rem 1rem' }}>Page ID</th>
                <th style={{ padding: '0.9rem 1rem' }}>Token</th>
                <th style={{ padding: '0.9rem 1rem' }}>Hội thoại / Leads</th>
                <th style={{ padding: '0.9rem 1rem' }}>Trạng thái Bot</th>
                <th style={{ padding: '0.9rem 1.25rem', textAlign: 'right' }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((p) => {
                const testResult = testResults[p.id];
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <FaFacebook style={{ color: '#1877F2', fontSize: '1.25rem', flexShrink: 0 }} />
                        <div>
                          <div style={{ fontWeight: 600 }}>{p.pageName}</div>
                          {p.greeting && (
                            <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.15rem' }}>
                              Chào riêng: {p.greeting.slice(0, 40)}...
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '1rem 1rem' }}>
                      <code style={{ fontSize: '0.85rem', background: 'rgba(0,0,0,0.04)', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>
                        {p.pageId}
                      </code>
                    </td>

                    <td style={{ padding: '1rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                          {p.accessTokenMasked || '••••••••'}
                        </span>
                      </div>
                      {/* Test result message if available */}
                      {testResult && (
                        <div style={{ 
                          fontSize: '0.75rem', 
                          marginTop: '0.25rem', 
                          color: testResult.success ? '#10B981' : '#EF4444',
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.25rem' 
                        }}>
                          {testResult.success ? <FaCheckCircle /> : <FaTimesCircle />}
                          {testResult.msg}
                        </div>
                      )}
                    </td>

                    <td style={{ padding: '1rem 1rem' }}>
                      <div style={{ fontSize: '0.88rem' }}>
                        <strong>{p._count?.sessions || 0}</strong> chat / <strong style={{ color: '#F59E0B' }}>{p._count?.inquiries || 0}</strong> leads
                      </div>
                    </td>

                    <td style={{ padding: '1rem 1rem' }}>
                      <button
                        onClick={() => handleToggleActive(p)}
                        style={{
                          background: p.isActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(156, 163, 175, 0.15)',
                          color: p.isActive ? '#059669' : '#6B7280',
                          border: `1px solid ${p.isActive ? '#10B981' : '#D1D5DB'}`,
                          padding: '0.25rem 0.65rem',
                          borderRadius: '20px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem'
                        }}
                      >
                        <span style={{ 
                          width: '8px', 
                          height: '8px', 
                          borderRadius: '50%', 
                          background: p.isActive ? '#10B981' : '#9CA3AF' 
                        }} />
                        {p.isActive ? 'Đang bật' : 'Tạm dừng'}
                      </button>
                    </td>

                    <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                        <button
                          onClick={() => handleTestToken(p.id)}
                          className="btn btn-outline"
                          style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem', color: '#2563EB' }}
                          title="Kiểm tra kết nối Token"
                          disabled={testingId === p.id}
                        >
                          <FaRobot /> {testingId === p.id ? 'Đang test...' : 'Test Token'}
                        </button>

                        <button
                          onClick={() => openEditModal(p)}
                          className="btn btn-outline"
                          style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
                          title="Chỉnh sửa"
                        >
                          <FaEdit /> Sửa
                        </button>

                        <button
                          onClick={() => handleDelete(p.id, p.pageName)}
                          className="btn btn-outline"
                          style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem', color: '#EF4444' }}
                          title="Xóa Fanpage"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Thêm / Chỉnh sửa Fanpage */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            background: 'var(--card-bg, #fff)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '560px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FaFacebook style={{ color: '#1877F2' }} />
                {editingPage ? 'Chỉnh sửa Fanpage' : 'Kết nối Fanpage mới'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--muted)' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} style={{ padding: '1.5rem' }}>
              {formError && (
                <div style={{
                  padding: '0.75rem 1rem',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#DC2626',
                  borderRadius: '8px',
                  fontSize: '0.88rem',
                  marginBottom: '1rem',
                  border: '1px solid rgba(239, 68, 68, 0.2)'
                }}>
                  {formError}
                </div>
              )}

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Tên Fanpage (Gợi nhớ) <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Xe Nâng Việt Nhật - Miền Bắc"
                  value={formData.pageName}
                  onChange={(e) => setFormData({ ...formData, pageName: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.9rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    outline: 'none',
                    fontSize: '0.95rem'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Facebook Page ID <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: 1058291823912 (Lấy trong phần Giới thiệu của Trang)"
                  value={formData.pageId}
                  onChange={(e) => setFormData({ ...formData, pageId: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.9rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    outline: 'none',
                    fontSize: '0.95rem'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label style={{ fontSize: '0.88rem', fontWeight: 600 }}>
                    Page Access Token {editingPage ? '(Để trống nếu giữ nguyên)' : <span style={{ color: '#EF4444' }}>*</span>}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    style={{ background: 'none', border: 'none', color: '#2563EB', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                  >
                    {showToken ? <FaEyeSlash /> : <FaEye />} {showToken ? 'Ẩn token' : 'Hiện token'}
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showToken ? 'text' : 'password'}
                    required={!editingPage}
                    placeholder={editingPage ? '•••••••••••••••• (Không đổi)' : 'Dán mã Page Access Token tạo từ developers.facebook.com'}
                    value={formData.accessToken}
                    onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.9rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      outline: 'none',
                      fontSize: '0.95rem',
                      fontFamily: showToken ? 'monospace' : 'inherit'
                    }}
                  />
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.35rem' }}>
                  Lấy tại mục Messenger &gt; Settings &gt; Access Tokens trên Meta Developer Portal.
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Chỉ dẫn / Lời chào riêng cho Page này (Tùy chọn)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ví dụ: Kho chính tại Đông Anh - Hà Nội, hỗ trợ giao hàng hỏa tốc trong ngày khu vực miền Bắc..."
                  value={formData.greeting}
                  onChange={(e) => setFormData({ ...formData, greeting: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.9rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    outline: 'none',
                    fontSize: '0.9rem',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="isActiveToggle" style={{ fontSize: '0.9rem', cursor: 'pointer', fontWeight: 500 }}>
                  Kích hoạt AI Chatbot cho Fanpage này ngay sau khi lưu
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-outline"
                  disabled={submitting}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Đang lưu...' : editingPage ? 'Cập nhật' : 'Thêm Fanpage'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Xem Nhật ký hoạt động Bot (Live Logs) */}
      {showLogsModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '1rem'
        }}>
          <div style={{
            background: 'var(--card-bg, #fff)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '920px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FaHistory style={{ color: '#2563EB' }} /> Nhật ký hoạt động Bot (Live Logs)
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--muted)' }}>
                  Theo dõi thời gian thực tin nhắn khách gửi đến, phản hồi của AI và trạng thái gửi về Facebook.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={autoRefreshLogs}
                    onChange={(e) => setAutoRefreshLogs(e.target.checked)}
                  />
                  Tự động làm mới (3s)
                </label>

                <button
                  onClick={fetchLogs}
                  className="btn btn-outline"
                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                >
                  <FaSync className={logsLoading ? 'spin' : ''} /> Làm mới
                </button>

                <button
                  onClick={handleClearLogs}
                  className="btn btn-outline"
                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.82rem', color: '#EF4444', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                  title="Xóa lịch sử log"
                >
                  <FaTrashAlt /> Xóa log
                </button>

                <button
                  onClick={() => setShowLogsModal(false)}
                  style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: 'var(--muted)', marginLeft: '0.5rem' }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body - Log Stream */}
            <div style={{ padding: '1.25rem', overflowY: 'auto', flex: 1, background: '#F9FAFB' }}>
              {logsLoading && logs.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>
                  Đang tải nhật ký hoạt động...
                </div>
              ) : logs.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', background: '#fff', borderRadius: '12px', border: '1px dashed var(--border)' }}>
                  <FaHistory style={{ fontSize: '2.5rem', color: '#9CA3AF', marginBottom: '0.75rem' }} />
                  <p style={{ fontWeight: 600, margin: '0 0 0.25rem 0' }}>Chưa có sự kiện nào được ghi nhận</p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--muted)', margin: 0 }}>
                    Khi có yêu cầu Webhook từ Meta hoặc khách nhắn tin vào Fanpage, toàn bộ tiến trình sẽ hiển thị trực tiếp tại đây.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {logs.map((log) => {
                    const isExpanded = expandedLogId === log.id;
                    const eventBadgeColor = 
                      log.eventType === 'MESSAGE_IN' ? { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE', label: 'TIN NHẮN ĐẾN' } :
                      log.eventType === 'AI_REPLY' ? { bg: '#F5F3FF', text: '#6D28D9', border: '#DDD6FE', label: 'AI PHẢN HỒI' } :
                      log.eventType === 'SEND_SUCCESS' ? { bg: '#ECFDF5', text: '#047857', border: '#A7F3D0', label: 'GỬI FB THÀNH CÔNG' } :
                      log.eventType === 'SEND_ERROR' ? { bg: '#FEF2F2', text: '#B91C1C', border: '#FECACA', label: 'LỖI GỬI FB' } :
                      log.eventType === 'PAGE_NOT_FOUND' ? { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A', label: 'PAGE CHƯA KẾT NỐI' } :
                      log.eventType === 'BOT_DISABLED' ? { bg: '#F3F4F6', text: '#4B5563', border: '#E5E7EB', label: 'BOT ĐANG TẮT' } :
                      log.eventType === 'VERIFY' ? { bg: '#F0FDFA', text: '#0F766E', border: '#99F6E4', label: 'XÁC THỰC WEBHOOK' } :
                      { bg: '#FEF2F2', text: '#DC2626', border: '#FCA5A5', label: log.eventType };

                    return (
                      <div 
                        key={log.id} 
                        style={{ 
                          background: '#fff', 
                          borderRadius: '10px', 
                          border: `1px solid ${log.status === 'ERROR' ? '#FECACA' : '#E5E7EB'}`, 
                          padding: '0.85rem 1rem',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.4rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              background: eventBadgeColor.bg,
                              color: eventBadgeColor.text,
                              border: `1px solid ${eventBadgeColor.border}`
                            }}>
                              {eventBadgeColor.label}
                            </span>

                            {log.pageName && (
                              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1F2937' }}>
                                {log.pageName}
                              </span>
                            )}

                            {log.pageId && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--muted)', background: '#F3F4F6', padding: '0.1rem 0.35rem', borderRadius: '3px' }}>
                                ID: {log.pageId}
                              </span>
                            )}
                          </div>

                          <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                            {new Date(log.createdAt).toLocaleString('vi-VN')}
                          </div>
                        </div>

                        <div style={{ fontSize: '0.88rem', color: '#374151', lineHeight: 1.5, wordBreak: 'break-word' }}>
                          {log.message}
                        </div>

                        {log.details && (
                          <div style={{ marginTop: '0.5rem' }}>
                            <button
                              onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                              style={{ 
                                background: 'none', 
                                border: 'none', 
                                color: '#2563EB', 
                                fontSize: '0.78rem', 
                                cursor: 'pointer', 
                                padding: 0, 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: '0.25rem' 
                              }}
                            >
                              <FaCode /> {isExpanded ? 'Ẩn chi tiết kỹ thuật' : 'Xem chi tiết kỹ thuật'}
                            </button>

                            {isExpanded && (
                              <pre style={{
                                marginTop: '0.4rem',
                                background: '#1E293B',
                                color: '#F8FAFC',
                                padding: '0.75rem',
                                borderRadius: '6px',
                                fontSize: '0.78rem',
                                overflowX: 'auto',
                                maxHeight: '200px'
                              }}>
                                {log.details}
                              </pre>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

