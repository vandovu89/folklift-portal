'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { FaPlus, FaFilm, FaTrash } from 'react-icons/fa';
import NewProjectDialog from '@/components/studio/NewProjectDialog';
import { VIDEO_TEMPLATES, PROJECT_STATUS_LABELS, FORMAT_SHORT_LABELS, isVideoTemplate } from '@/lib/video-studio';

interface ProjectRow {
  id: string;
  title: string;
  type: string;
  format: string;
  status: string;
  outputUrl: string | null;
  updatedAt: string;
}

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  draft: { bg: '#f1f5f9', fg: '#475569' },
  rendering: { bg: '#fef3c7', fg: '#92400e' },
  done: { bg: '#dcfce7', fg: '#166534' },
  failed: { bg: '#fee2e2', fg: '#991b1b' },
};

export default function StudioPage() {
  const pathname = usePathname();
  const router = useRouter();
  const lang = pathname.split('/')[1] === 'en' ? 'en' : 'vi';
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState('');
  const [dialog, setDialog] = useState<{ open: boolean; forkliftId?: string }>({ open: false });

  useEffect(() => {
    fetch('/api/studio/projects')
      .then(res => (res.ok ? res.json() : []))
      .then(data => setProjects(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        const userRole = d.user?.role || '';
        setRole(userRole);
        // Mở sẵn hộp thoại tạo video khi đi từ trang sửa xe: /admin/studio?forklift=<id>
        const forkliftId = new URLSearchParams(window.location.search).get('forklift');
        if (forkliftId && userRole && userRole !== 'VIEWER') setDialog({ open: true, forkliftId });
      })
      .catch(() => {});
  }, []);

  const canEdit = role !== '' && role !== 'VIEWER';

  const handleDelete = async (project: ProjectRow) => {
    if (!confirm(`Xóa dự án "${project.title}"? Giọng đọc và video thành phẩm chưa gắn vào xe sẽ bị xóa.`)) return;
    const res = await fetch(`/api/studio/projects/${project.id}`, { method: 'DELETE' });
    if (!res.ok) return alert('Không xóa được dự án');
    setProjects(prev => prev.filter(p => p.id !== project.id));
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FaFilm color="#8b5cf6" /> AI Video Studio
          </h1>
          <p style={{ margin: '0.3rem 0 0', color: '#64748b', fontSize: '0.9rem' }}>
            AI lên kịch bản theo từng cảnh, dựng video từ ảnh, clip thật của xe và thẻ chữ, lồng giọng đọc tiếng Việt.
          </p>
        </div>
        {canEdit && (
          <button className="btn-primary" onClick={() => setDialog({ open: true })} style={{ background: '#8b5cf6', borderColor: '#8b5cf6', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <FaPlus /> Tạo video mới
          </button>
        )}
      </div>

      {loading ? (
        <p style={{ color: '#64748b' }}>Đang tải...</p>
      ) : projects.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem 1rem', textAlign: 'center', color: '#64748b' }}>
          <FaFilm size={36} color="#c4b5fd" />
          <p style={{ margin: '0.8rem 0 0' }}>Chưa có dự án video nào.{canEdit ? ' Bấm "Tạo video mới" để bắt đầu.' : ''}</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))', gap: '1rem' }}>
          {projects.map(p => {
            const template = isVideoTemplate(p.type) ? VIDEO_TEMPLATES[p.type] : null;
            const colors = STATUS_COLORS[p.status] || STATUS_COLORS.draft;
            return (
              <div key={p.id} className="glass-panel hover-lift-sm" style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <Link href={`/${lang}/admin/studio/${p.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ aspectRatio: '16 / 9', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {p.outputUrl
                      ? <video src={`${p.outputUrl}#t=0.5`} preload="metadata" muted style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      : <span style={{ fontSize: '2rem' }}>{template?.icon || '🎬'}</span>}
                  </div>
                  <div style={{ padding: '0.75rem 0.9rem 0.4rem' }}>
                    <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: '0.3rem', lineHeight: 1.35 }}>{p.title}</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                      {template?.label || p.type} · {FORMAT_SHORT_LABELS[p.format] || p.format}
                    </div>
                  </div>
                </Link>
                <div style={{ marginTop: 'auto', padding: '0.4rem 0.9rem 0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                  <span style={{ background: colors.bg, color: colors.fg, padding: '0.15rem 0.5rem', borderRadius: '999px', fontWeight: 600 }}>
                    {PROJECT_STATUS_LABELS[p.status] || p.status}
                  </span>
                  <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    {new Date(p.updatedAt).toLocaleDateString('vi-VN')}
                    {canEdit && (
                      <button type="button" title="Xóa dự án" onClick={() => handleDelete(p)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: 0 }}>
                        <FaTrash />
                      </button>
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {dialog.open && (
        <NewProjectDialog
          initialForkliftId={dialog.forkliftId}
          onClose={() => setDialog({ open: false })}
          onCreated={id => router.push(`/${lang}/admin/studio/${id}`)}
        />
      )}
    </div>
  );
}
