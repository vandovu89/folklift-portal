'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  FaFacebook,
  FaPlus,
  FaSync,
  FaTrash,
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
  FaCode,
  FaFacebookMessenger,
  FaPlug,
  FaSignOutAlt
} from 'react-icons/fa';
import { getFbDict } from './i18n';
import InboxPanel from './InboxPanel';

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

interface FbSession {
  configured: boolean;
  loggedIn: boolean;
  user?: { id: string; name: string };
  requestedScopes: string[];
  permissions?: Array<{ permission: string; status: string }>;
  pages?: Array<{ id: string; name: string; category: string | null; picture: string | null; connected: boolean }>;
  error?: string;
}

type SubscriptionState = { loading: boolean; subscribed?: boolean; fields?: string[]; error?: string };

export default function FacebookPagesAdminPage({ params }: { params: Promise<{ lang: string }> }) {
  const resolvedParams = use(params);
  const lang = resolvedParams.lang === 'en' ? 'en' : 'vi';
  const locale = lang === 'en' ? 'en-US' : 'vi-VN';
  const t = getFbDict(lang);
  const router = useRouter();

  const [tab, setTab] = useState<'pages' | 'inbox'>('pages');
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

  // Facebook Login states
  const [fbSession, setFbSession] = useState<FbSession | null>(null);
  const [fbLoading, setFbLoading] = useState(true);
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>([]);
  const [connecting, setConnecting] = useState(false);
  const [banner, setBanner] = useState<{ ok: boolean; msg: string } | null>(null);
  const [subscriptions, setSubscriptions] = useState<{ [id: string]: SubscriptionState }>({});

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
      // Kết quả trả về từ luồng Facebook Login (callback redirect)
      const search = new URLSearchParams(window.location.search);
      if (search.get('fb_error')) setBanner({ ok: false, msg: search.get('fb_error') as string });
      if (search.get('fb_connected')) setBanner({ ok: true, msg: t.loginSuccess });
      if (search.get('fb_error') || search.get('fb_connected')) {
        router.replace(window.location.pathname);
      }
    }
    fetchPages();
    fetchFbSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const fetchFbSession = async () => {
    setFbLoading(true);
    try {
      const res = await fetch('/api/facebook/oauth/session');
      const data = await res.json();
      setFbSession(data);
      if (data.error) setBanner({ ok: false, msg: data.error });
      if (data.pages) {
        setSelectedPageIds(data.pages.filter((p: any) => !p.connected).map((p: any) => p.id));
      }
    } catch (err) {
      console.error('Failed to load Facebook session', err);
    } finally {
      setFbLoading(false);
    }
  };

  const handleFbLogout = async () => {
    await fetch('/api/facebook/oauth/session', { method: 'DELETE' });
    setSelectedPageIds([]);
    fetchFbSession();
  };

  const handleConnectPages = async () => {
    if (selectedPageIds.length === 0) return;
    setConnecting(true);
    setBanner(null);
    try {
      const res = await fetch('/api/facebook/oauth/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageIds: selectedPageIds })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      const failed = data.results.filter((r: any) => !r.subscribed);
      const names = data.results.filter((r: any) => r.success).map((r: any) => r.pageName).join(', ');
      setBanner(failed.length === 0
        ? { ok: true, msg: `${t.connectDone}: ${names}` }
        : { ok: false, msg: failed.map((r: any) => `${r.pageName || r.pageId}: ${t.webhookFailed} (${r.error})`).join(' · ') });
      await fetchPages();
      await fetchFbSession();
    } catch (err: any) {
      setBanner({ ok: false, msg: err.message });
    } finally {
      setConnecting(false);
    }
  };

  const fetchSubscription = async (id: string, method: 'GET' | 'POST' | 'DELETE' = 'GET') => {
    setSubscriptions(prev => ({ ...prev, [id]: { ...prev[id], loading: true } }));
    try {
      const res = await fetch(`/api/facebook-pages/${id}/subscription`, { method });
      const data = await res.json();
      setSubscriptions(prev => ({
        ...prev,
        [id]: data.success
          ? { loading: false, subscribed: data.subscribed, fields: data.fields }
          : { loading: false, error: data.error }
      }));
    } catch (err: any) {
      setSubscriptions(prev => ({ ...prev, [id]: { loading: false, error: err.message } }));
    }
  };

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
    if (!confirm(t.clearConfirm)) return;
    try {
      const res = await fetch('/api/bot-logs', { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setLogs([]);
      }
    } catch {
      alert(t.clearFail);
    }
  };

  const fetchPages = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/facebook-pages');
      const data = await res.json();
      if (data.success) {
        setPages(data.pages);
        data.pages.forEach((p: FacebookPageItem) => fetchSubscription(p.id));
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
          throw new Error(data.error || t.updateFail);
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
          throw new Error(data.error || t.addFail);
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
    if (!confirm(t.removeConfirm(name))) {
      return;
    }

    try {
      const res = await fetch(`/api/facebook-pages/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setPages(pages.filter(p => p.id !== id));
      } else {
        alert(data.error || t.removeFail);
      }
    } catch (err) {
      alert(t.removeFail);
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
          [id]: { success: true, msg: `${t.testOk}: ${data.pageName || ''}` }
        }));
      } else {
        setTestResults(prev => ({
          ...prev,
          [id]: { success: false, msg: data.error || t.testFail }
        }));
      }
    } catch (err: any) {
      setTestResults(prev => ({
        ...prev,
        [id]: { success: false, msg: t.apiError }
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

  const webhookUrl = `${origin || process.env.NEXT_PUBLIC_APP_URL || ''}/api/webhook/messenger`;
  const verifyToken = process.env.NEXT_PUBLIC_META_VERIFY_TOKEN || 'vietnhat_forklift_secret_token_2026';

  const totalSessions = pages.reduce((acc, p) => acc + (p._count?.sessions || 0), 0);
  const totalInquiries = pages.reduce((acc, p) => acc + (p._count?.inquiries || 0), 0);
  const activePages = pages.filter(p => p.isActive).length;

  const permissionStatus = (scope: string) =>
    fbSession?.permissions?.find(p => p.permission === scope)?.status;

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '0.6rem 1rem',
    border: 'none',
    borderBottom: `3px solid ${active ? '#1877F2' : 'transparent'}`,
    background: 'none',
    fontWeight: 600,
    fontSize: '0.95rem',
    cursor: 'pointer',
    color: active ? '#1877F2' : 'var(--muted)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.45rem'
  });

  return (
    <div className="admin-container fade-in" style={{ paddingBottom: '3rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <FaFacebook style={{ color: '#1877F2' }} /> {t.title}
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.95rem', marginTop: '0.25rem', maxWidth: '760px' }}>
            {t.subtitle}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => { setShowLogsModal(true); fetchLogs(); }}
            className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--card-bg, #fff)' }}
            title={t.logsTip}
          >
            <FaHistory style={{ color: '#2563EB' }} /> {t.logs}
          </button>

          <button
            onClick={openAddModal}
            className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--card-bg, #fff)' }}
            title={t.addManualTip}
          >
            <FaPlus /> {t.addManual}
          </button>
        </div>
      </div>

      {banner && (
        <div style={{
          padding: '0.85rem 1rem',
          borderRadius: '10px',
          marginBottom: '1.25rem',
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: banner.ok ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          color: banner.ok ? '#047857' : '#B91C1C',
          border: `1px solid ${banner.ok ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
        }}>
          {banner.ok ? <FaCheckCircle /> : <FaTimesCircle />} {banner.msg}
        </div>
      )}

      {/* How it works — mỗi bước gắn với một quyền Meta */}
      <div style={{ background: 'var(--card-bg, #fff)', borderRadius: '12px', border: '1px solid var(--border)', padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ fontWeight: 600, marginBottom: '0.9rem' }}>{t.howTitle}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {t.steps.map((s, i) => (
            <div key={s.perm} style={{ display: 'flex', gap: '0.65rem' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#1877F2', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 }}>
                {i + 1}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{s.title}</div>
                <code style={{ fontSize: '0.72rem', color: '#1877F2', background: 'rgba(24,119,242,0.08)', padding: '0.05rem 0.35rem', borderRadius: '4px' }}>{s.perm}</code>
                <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.25rem', lineHeight: 1.45 }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Facebook Login & chọn Page */}
      <div style={{ background: 'var(--card-bg, #fff)', borderRadius: '12px', border: '1px solid rgba(24, 119, 242, 0.35)', padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ maxWidth: '640px' }}>
            <div style={{ fontWeight: 600, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FaFacebook style={{ color: '#1877F2' }} /> {t.loginTitle}
            </div>
            {fbSession?.loggedIn ? (
              <p style={{ fontSize: '0.9rem', margin: '0.35rem 0 0 0' }}>
                {t.loggedInAs} <strong>{fbSession.user?.name}</strong>
              </p>
            ) : (
              <p style={{ fontSize: '0.88rem', color: 'var(--muted)', margin: '0.35rem 0 0 0', lineHeight: 1.5 }}>{t.loginDesc}</p>
            )}
          </div>

          {fbLoading ? (
            <FaSync className="spin" style={{ color: 'var(--muted)' }} />
          ) : fbSession?.loggedIn ? (
            <button onClick={handleFbLogout} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
              <FaSignOutAlt /> {t.logoutFb}
            </button>
          ) : (
            <a
              href={`/api/facebook/oauth/start?lang=${lang}`}
              title={t.loginBtnTip}
              aria-disabled={!fbSession?.configured}
              onClick={(e) => { if (!fbSession?.configured) e.preventDefault(); }}
              style={{
                background: fbSession?.configured ? '#1877F2' : '#9CA3AF',
                color: '#fff',
                padding: '0.7rem 1.2rem',
                borderRadius: '8px',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.55rem',
                textDecoration: 'none',
                cursor: fbSession?.configured ? 'pointer' : 'not-allowed'
              }}
            >
              <FaFacebook style={{ fontSize: '1.2rem' }} /> {t.loginBtn}
            </a>
          )}
        </div>

        {!fbLoading && fbSession && !fbSession.configured && (
          <div style={{ marginTop: '0.75rem', fontSize: '0.82rem', color: '#B45309' }}>{t.notConfigured}</div>
        )}

        {fbSession?.loggedIn && (
          <>
            <div style={{ marginTop: '1rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted)', marginBottom: '0.4rem' }}>{t.permsTitle}</div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {fbSession.requestedScopes.map(scope => {
                  const status = permissionStatus(scope);
                  const ok = status === 'granted';
                  return (
                    <span key={scope} style={{
                      fontSize: '0.78rem', padding: '0.2rem 0.55rem', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                      background: ok ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.08)', color: ok ? '#047857' : '#B91C1C',
                      border: `1px solid ${ok ? 'rgba(16,185,129,0.35)' : 'rgba(239,68,68,0.3)'}`
                    }}>
                      {ok ? <FaCheckCircle /> : <FaTimesCircle />} {scope}: {status === 'granted' ? t.granted : status === 'declined' ? t.declined : t.notGranted}
                    </span>
                  );
                })}
              </div>
            </div>

            <div style={{ marginTop: '1.25rem' }}>
              <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{t.pickTitle}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '0.6rem' }}>{t.pickDesc}</div>
              {(fbSession.pages || []).length === 0 ? (
                <div style={{ fontSize: '0.88rem', color: '#B45309' }}>{t.noManagedPages}</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.6rem' }}>
                  {fbSession.pages!.map(p => {
                    const checked = selectedPageIds.includes(p.id);
                    return (
                      <label key={p.id} style={{
                        display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.65rem 0.8rem', borderRadius: '10px', cursor: 'pointer',
                        border: `1px solid ${checked ? '#1877F2' : 'var(--border)'}`, background: checked ? 'rgba(24,119,242,0.05)' : 'transparent'
                      }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => setSelectedPageIds(prev => e.target.checked ? [...prev, p.id] : prev.filter(x => x !== p.id))}
                          style={{ width: 18, height: 18 }}
                        />
                        {p.picture ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.picture} alt="" style={{ width: 36, height: 36, borderRadius: '50%' }} />
                        ) : (
                          <FaFacebook style={{ fontSize: 36, color: '#1877F2' }} />
                        )}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                            {p.category ? `${p.category} · ` : ''}ID {p.id}
                          </div>
                          {p.connected && <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 600 }}>✓ {t.alreadyConnected}</div>}
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}

              <button
                onClick={handleConnectPages}
                className="btn btn-primary"
                disabled={connecting || selectedPageIds.length === 0}
                title={t.connectBtnTip}
                style={{ marginTop: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}
              >
                <FaPlug /> {connecting ? t.connecting : `${t.connectBtn} (${selectedPageIds.length})`}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem' }}>
        <button style={tabStyle(tab === 'pages')} onClick={() => setTab('pages')}>
          <FaFacebook /> {t.tabPages} ({pages.length})
        </button>
        <button style={tabStyle(tab === 'inbox')} onClick={() => setTab('inbox')}>
          <FaFacebookMessenger /> {t.tabInbox}
        </button>
      </div>

      {tab === 'inbox' ? (
        <InboxPanel t={t} locale={locale} />
      ) : (
      <>
      {/* Metric Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1.25rem',
        marginBottom: '2rem'
      }}>
        <div style={{ background: 'var(--card-bg, #fff)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>{t.statPages}</span>
            <FaFacebook style={{ color: '#1877F2', fontSize: '1.4rem' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, marginTop: '0.5rem' }}>{pages.length}</div>
          <div style={{ fontSize: '0.8rem', color: '#10B981', marginTop: '0.25rem' }}>{activePages} {t.statActive}</div>
        </div>

        <div style={{ background: 'var(--card-bg, #fff)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>{t.statChats}</span>
            <FaComments style={{ color: '#8B5CF6', fontSize: '1.4rem' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, marginTop: '0.5rem' }}>{totalSessions}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.25rem' }}>{t.statChatsSub}</div>
        </div>

        <div style={{ background: 'var(--card-bg, #fff)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>{t.statLeads}</span>
            <FaUserFriends style={{ color: '#F59E0B', fontSize: '1.4rem' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, marginTop: '0.5rem' }}>{totalInquiries}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.25rem' }}>{t.statLeadsSub}</div>
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
          <FaInfoCircle /> {t.webhookCardTitle}
        </div>
        <p style={{ fontSize: '0.88rem', color: 'var(--foreground)', marginBottom: '1rem', lineHeight: 1.5 }}>
          {t.webhookCardDesc}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          <div style={{ background: 'var(--card-bg, #fff)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.25rem', fontWeight: 600 }}>CALLBACK URL:</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
              <code style={{ fontSize: '0.85rem', wordBreak: 'break-all', color: '#2563EB' }}>{webhookUrl}</code>
              <button
                onClick={() => copyToClipboard(webhookUrl, 'webhook')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: copiedKey === 'webhook' ? '#10B981' : 'var(--muted)' }}
                title={t.copy}
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
                title={t.copy}
              >
                <FaCopy />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Pages Table */}
      <div style={{ background: 'var(--card-bg, #fff)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ fontWeight: 600, fontSize: '1.05rem' }}>{t.listTitle} ({pages.length})</div>
          <button
            onClick={fetchPages}
            className="btn btn-outline"
            style={{ fontSize: '0.85rem', padding: '0.4rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <FaSync className={loading ? 'spin' : ''} /> {t.refresh}
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>
            {t.loadingPages}
          </div>
        ) : pages.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <FaFacebook style={{ fontSize: '3rem', color: '#9CA3AF', marginBottom: '1rem' }} />
            <p style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.5rem' }}>{t.emptyTitle}</p>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
              {t.emptyDesc}
            </p>
          </div>
        ) : (
          <div className="table-responsive" style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table className="table" style={{ width: '100%', minWidth: '900px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.02)', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '0.9rem 1.25rem' }}>{t.colName}</th>
                <th style={{ padding: '0.9rem 1rem' }}>{t.colId}</th>
                <th style={{ padding: '0.9rem 1rem' }}>{t.colWebhook}</th>
                <th style={{ padding: '0.9rem 1rem' }}>{t.colStats}</th>
                <th style={{ padding: '0.9rem 1rem' }}>{t.colBot}</th>
                <th style={{ padding: '0.9rem 1.25rem', textAlign: 'right' }}>{t.colActions}</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((p) => {
                const testResult = testResults[p.id];
                const sub = subscriptions[p.id];
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <FaFacebook style={{ color: '#1877F2', fontSize: '1.25rem', flexShrink: 0 }} />
                        <div>
                          <div style={{ fontWeight: 600 }}>{p.pageName}</div>
                          {p.greeting && (
                            <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.15rem' }}>
                              {t.greetingPrefix}: {p.greeting.slice(0, 40)}...
                            </div>
                          )}
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
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '1rem 1rem' }}>
                      <code style={{ fontSize: '0.85rem', background: 'rgba(0,0,0,0.04)', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>
                        {p.pageId}
                      </code>
                    </td>

                    <td style={{ padding: '1rem 1rem' }}>
                      {!sub || sub.loading ? (
                        <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{t.checking}</span>
                      ) : sub.error ? (
                        <span style={{ fontSize: '0.75rem', color: '#EF4444' }} title={sub.error}><FaTimesCircle /> {sub.error.slice(0, 50)}</span>
                      ) : (
                        <div>
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: sub.subscribed ? '#059669' : '#B45309', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                            {sub.subscribed ? <FaCheckCircle /> : <FaTimesCircle />} {sub.subscribed ? t.subscribed : t.notSubscribed}
                          </span>
                          {sub.subscribed && sub.fields && sub.fields.length > 0 && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{sub.fields.join(', ')}</div>
                          )}
                          <div>
                            <button
                              onClick={() => fetchSubscription(p.id, sub.subscribed ? 'DELETE' : 'POST')}
                              title={sub.subscribed ? t.unsubscribeTip : t.subscribeTip}
                              style={{ background: 'none', border: 'none', padding: 0, marginTop: '0.2rem', color: '#2563EB', fontSize: '0.78rem', cursor: 'pointer', textDecoration: 'underline' }}
                            >
                              {sub.subscribed ? t.unsubscribe : t.subscribe}
                            </button>
                          </div>
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
                        title={t.botTip}
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
                        {p.isActive ? t.botOn : t.botOff}
                      </button>
                    </td>

                    <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                        <button
                          onClick={() => handleTestToken(p.id)}
                          className="btn-action"
                          style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem', color: '#2563EB', background: 'transparent' }}
                          title={t.testTip}
                          disabled={testingId === p.id}
                        >
                          <FaRobot /> {testingId === p.id ? t.testing : t.testToken}
                        </button>

                        <button
                          onClick={() => openEditModal(p)}
                          className="btn-action"
                          style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
                          title={t.edit}
                        >
                          ✏️ {t.edit}
                        </button>

                        <button
                          onClick={() => handleDelete(p.id, p.pageName)}
                          className="btn-danger"
                          style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
                          title={t.remove}
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
          </div>
        )}
      </div>
      </>
      )}

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
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
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
                {editingPage ? t.modalEdit : t.modalAdd}
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
                  {t.fName} <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={t.fNamePh}
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
                  {t.fId} <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={t.fIdPh}
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
                    {t.fToken} {editingPage ? t.fTokenKeep : <span style={{ color: '#EF4444' }}>*</span>}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    style={{ background: 'none', border: 'none', color: '#2563EB', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                  >
                    {showToken ? <FaEyeSlash /> : <FaEye />} {showToken ? t.hideToken : t.showToken}
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showToken ? 'text' : 'password'}
                    required={!editingPage}
                    placeholder={editingPage ? t.fTokenKeepPh : t.fTokenPh}
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
                  {t.fTokenHelp}
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  {t.fGreeting}
                </label>
                <textarea
                  rows={2}
                  placeholder={t.fGreetingPh}
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
                  {t.fActive}
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-outline"
                  disabled={submitting}
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? t.saving : editingPage ? t.update : t.add}
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
                  <FaHistory style={{ color: '#2563EB' }} /> {t.logsTitle}
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--muted)' }}>
                  {t.logsDesc}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={autoRefreshLogs}
                    onChange={(e) => setAutoRefreshLogs(e.target.checked)}
                  />
                  {t.autoRefresh}
                </label>

                <button
                  onClick={fetchLogs}
                  className="btn btn-outline"
                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                >
                  <FaSync className={logsLoading ? 'spin' : ''} /> {t.refresh}
                </button>

                <button
                  onClick={handleClearLogs}
                  className="btn btn-outline"
                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.82rem', color: '#EF4444', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                  title={t.clearLogs}
                >
                  <FaTrashAlt /> {t.clearLogs}
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
                  {t.loadingLogs}
                </div>
              ) : logs.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', background: '#fff', borderRadius: '12px', border: '1px dashed var(--border)' }}>
                  <FaHistory style={{ fontSize: '2.5rem', color: '#9CA3AF', marginBottom: '0.75rem' }} />
                  <p style={{ fontWeight: 600, margin: '0 0 0.25rem 0' }}>{t.emptyLogs}</p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--muted)', margin: 0 }}>
                    {t.emptyLogsDesc}
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {logs.map((log) => {
                    const isExpanded = expandedLogId === log.id;
                    const label = t.eventLabels[log.eventType] || log.eventType;
                    const eventBadgeColor =
                      log.eventType === 'MESSAGE_IN' ? { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE', label } :
                      log.eventType === 'AI_REPLY' ? { bg: '#F5F3FF', text: '#6D28D9', border: '#DDD6FE', label } :
                      log.eventType === 'SEND_SUCCESS' ? { bg: '#ECFDF5', text: '#047857', border: '#A7F3D0', label } :
                      log.eventType === 'SEND_ERROR' ? { bg: '#FEF2F2', text: '#B91C1C', border: '#FECACA', label } :
                      log.eventType === 'PAGE_NOT_FOUND' ? { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A', label } :
                      log.eventType === 'BOT_DISABLED' ? { bg: '#F3F4F6', text: '#4B5563', border: '#E5E7EB', label } :
                      log.eventType === 'VERIFY' ? { bg: '#F0FDFA', text: '#0F766E', border: '#99F6E4', label } :
                      { bg: '#FEF2F2', text: '#DC2626', border: '#FCA5A5', label };

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
                            {new Date(log.createdAt).toLocaleString(locale)}
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
                              <FaCode /> {isExpanded ? t.hideDetails : t.showDetails}
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
