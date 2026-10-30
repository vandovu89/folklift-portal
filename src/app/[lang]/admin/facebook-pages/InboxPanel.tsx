'use client';

import { useEffect, useRef, useState } from 'react';
import { FaFacebookMessenger, FaPaperPlane, FaSync, FaUserCircle, FaInfoCircle } from 'react-icons/fa';
import type { FbDict } from './i18n';

interface Conversation {
  id: string;
  senderId: string;
  customerName: string | null;
  customerPicture: string | null;
  page: { id: string; pageId: string; pageName: string } | null;
  lastMessage: { role: string; content: string; createdAt: string } | null;
  updatedAt: string;
}

interface Message {
  id: string;
  role: string;
  content: string;
  createdAt: string;
}

export default function InboxPanel({ t, locale }: { t: FbDict; locale: string }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; msg: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const active = conversations.find(c => c.id === activeId) || null;

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/messenger/conversations');
      const data = await res.json();
      if (data.success) setConversations(data.conversations);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (id: string) => {
    const res = await fetch(`/api/messenger/conversations/${id}`);
    const data = await res.json();
    if (data.success) setMessages(data.messages);
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  // Tự làm mới hội thoại đang mở để thấy tin nhắn mới của khách
  useEffect(() => {
    if (!activeId) return;
    fetchMessages(activeId);
    const timer = setInterval(() => fetchMessages(activeId), 4000);
    return () => clearInterval(timer);
  }, [activeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeId || !text.trim()) return;
    setSending(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/messenger/conversations/${activeId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      const data = await res.json();
      if (data.success) {
        setMessages(prev => [...prev, data.message]);
        setText('');
        setNotice({ ok: true, msg: t.sent });
      } else {
        setNotice({ ok: false, msg: data.error });
      }
    } catch (err: any) {
      setNotice({ ok: false, msg: err.message });
    } finally {
      setSending(false);
    }
  };

  const displayName = (c: Conversation) => c.customerName || `PSID ${c.senderId}`;

  return (
    <div style={{ background: 'var(--card-bg, #fff)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
      <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ maxWidth: '720px' }}>
          <div style={{ fontWeight: 600, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FaFacebookMessenger style={{ color: '#0084FF' }} /> {t.inboxTitle}
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)', margin: '0.25rem 0 0 0' }}>{t.inboxDesc}</p>
        </div>
        <button onClick={fetchConversations} className="btn btn-outline" style={{ fontSize: '0.85rem', padding: '0.4rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <FaSync className={loading ? 'spin' : ''} /> {t.refresh}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 320px) 1fr', minHeight: '480px' }} className="fb-inbox-grid">
        {/* Danh sách hội thoại */}
        <div style={{ borderRight: '1px solid var(--border)', overflowY: 'auto', maxHeight: '600px' }}>
          {loading && conversations.length === 0 ? (
            <div style={{ padding: '1.5rem', color: 'var(--muted)', fontSize: '0.9rem' }}>{t.inboxLoading}</div>
          ) : conversations.length === 0 ? (
            <div style={{ padding: '1.5rem', color: 'var(--muted)', fontSize: '0.9rem' }}>{t.inboxEmpty}</div>
          ) : (
            conversations.map(c => (
              <button
                key={c.id}
                onClick={() => { setActiveId(c.id); setNotice(null); }}
                style={{
                  display: 'flex', gap: '0.65rem', width: '100%', textAlign: 'left', padding: '0.85rem 1rem',
                  border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer',
                  background: c.id === activeId ? 'rgba(0, 132, 255, 0.08)' : 'transparent'
                }}
              >
                {c.customerPicture ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.customerPicture} alt="" style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0 }} />
                ) : (
                  <FaUserCircle style={{ fontSize: 36, color: '#9CA3AF', flexShrink: 0 }} />
                )}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--foreground)' }}>{displayName(c)}</div>
                  <div style={{ fontSize: '0.75rem', color: '#1877F2' }}>{t.via} {c.page?.pageName}</div>
                  {c.lastMessage && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.lastMessage.role === 'user' ? '' : `${t.you}: `}{c.lastMessage.content}
                    </div>
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Khung chat */}
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {!active ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', padding: '2rem' }}>
              {t.inboxSelect}
            </div>
          ) : (
            <>
              <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 600 }}>{displayName(active)}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                  {t.via} <strong style={{ color: '#1877F2' }}>{active.page?.pageName}</strong> · Page ID {active.page?.pageId}
                </div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', background: '#F9FAFB', maxHeight: '440px' }}>
                {messages.map(m => {
                  const fromCustomer = m.role === 'user';
                  return (
                    <div key={m.id} style={{ display: 'flex', justifyContent: fromCustomer ? 'flex-start' : 'flex-end', marginBottom: '0.5rem' }}>
                      <div style={{
                        maxWidth: '75%', padding: '0.55rem 0.85rem', borderRadius: '16px', fontSize: '0.9rem', lineHeight: 1.45,
                        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                        background: fromCustomer ? '#E5E7EB' : '#0084FF', color: fromCustomer ? '#111827' : '#fff'
                      }}>
                        {m.content}
                        <div style={{ fontSize: '0.68rem', opacity: 0.7, marginTop: '0.2rem' }}>
                          {fromCustomer ? t.customer : t.you} · {new Date(m.createdAt).toLocaleString(locale)}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              <form onSubmit={handleSend} style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border)' }}>
                {notice && (
                  <div style={{ fontSize: '0.82rem', marginBottom: '0.5rem', color: notice.ok ? '#059669' : '#DC2626' }}>{notice.msg}</div>
                )}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder={t.composerPh}
                    style={{ flex: 1, padding: '0.65rem 0.9rem', borderRadius: '20px', border: '1px solid var(--border)', outline: 'none', fontSize: '0.95rem', minWidth: 0 }}
                  />
                  <button type="submit" className="btn btn-primary" disabled={sending || !text.trim()} title={t.sendTip}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', borderRadius: '20px' }}>
                    <FaPaperPlane /> {sending ? t.sending : t.send}
                  </button>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <FaInfoCircle /> {t.windowNote}
                </div>
              </form>
            </>
          )}
        </div>
      </div>
      <style>{`@media (max-width: 720px) { .fb-inbox-grid { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}
