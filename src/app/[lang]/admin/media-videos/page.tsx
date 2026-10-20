'use client';

import React, { useState, useEffect } from 'react';
import { FaPlus, FaTrash, FaVideo, FaTimes, FaExternalLinkAlt } from 'react-icons/fa';
import VideoEmbed from '@/components/VideoEmbed';

interface MediaVideoItem {
  id: string;
  title: string;
  videoUrl: string;
  thumbnailUrl?: string;
  category: string;
  description?: string;
  isFeatured: boolean;
  createdAt: string;
}

export default function AdminMediaVideosPage() {
  const [videos, setVideos] = useState<MediaVideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filterCat, setFilterCat] = useState('ALL');

  const [formData, setFormData] = useState({
    title: '',
    videoUrl: '',
    thumbnailUrl: '',
    category: 'DELIVERY',
    description: '',
    isFeatured: false
  });

  const fetchVideos = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/media-videos');
      const data = await res.json();
      if (Array.isArray(data)) {
        setVideos(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa video này?')) return;
    try {
      const res = await fetch(`/api/media-videos/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchVideos();
      } else {
        alert('Lỗi khi xóa!');
      }
    } catch (e) {
      alert('Lỗi kết nối máy chủ');
    }
  };

  const handleToggleFeatured = async (v: MediaVideoItem) => {
    try {
      const res = await fetch(`/api/media-videos/${v.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFeatured: !v.isFeatured })
      });
      if (res.ok) {
        fetchVideos();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/media-videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setShowModal(false);
        setFormData({
          title: '',
          videoUrl: '',
          thumbnailUrl: '',
          category: 'DELIVERY',
          description: '',
          isFeatured: false
        });
        fetchVideos();
      } else {
        const err = await res.json();
        alert(err.error || 'Lỗi thêm mới');
      }
    } catch (e) {
      alert('Lỗi kết nối máy chủ');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredVideos = videos.filter(v => {
    if (filterCat === 'ALL') return true;
    return v.category === filterCat;
  });

  const categoryNames: Record<string, string> = {
    DELIVERY: 'Bàn giao xe',
    INSPECTION: 'Kiểm tra & Test',
    WAREHOUSE: 'Kho bãi & Container',
    GUIDE: 'Hướng dẫn vận hành'
  };

  return (
    <div style={{ padding: '0' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: 'clamp(1.3rem, 3vw, 1.8rem)', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            🎬 Thư Viện Media & Video Review
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0.3rem 0 0 0' }}>
            Quản lý video YouTube, TikTok về lễ bàn giao xe, test tải và kho bãi thực tế
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <a
            href="/vi/media"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.1rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: 'white',
              color: '#334155',
              fontWeight: 600,
              textDecoration: 'none',
              fontSize: '0.9rem'
            }}
          >
            <FaExternalLinkAlt /> Xem trang khách
          </a>
          <button
            onClick={() => setShowModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.25rem',
              borderRadius: '8px',
              border: 'none',
              background: 'var(--primary)',
              color: 'white',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(37,99,235,0.25)',
              fontSize: '0.9rem'
            }}
          >
            <FaPlus /> Thêm Video Mới
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {['ALL', 'DELIVERY', 'INSPECTION', 'WAREHOUSE', 'GUIDE'].map(c => (
          <button
            key={c}
            onClick={() => setFilterCat(c)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '20px',
              border: filterCat === c ? 'none' : '1px solid #cbd5e1',
              background: filterCat === c ? '#0f172a' : 'white',
              color: filterCat === c ? 'white' : '#475569',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            {c === 'ALL' ? 'Tất cả' : categoryNames[c] || c}
          </button>
        ))}
      </div>

      {/* Video Cards Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>Đang tải danh sách video...</div>
      ) : filteredVideos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', background: 'white', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
          <p style={{ color: '#64748b', fontSize: '1rem' }}>Chưa có video nào trong mục này.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: '1.25rem' }}>
          {filteredVideos.map(v => (
            <div key={v.id} style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '0.5rem', background: '#0f172a' }}>
                <VideoEmbed url={v.videoUrl} title={v.title} />
              </div>
              <div style={{ padding: '1.2rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '6px', background: '#f1f5f9', color: '#334155' }}>
                    {categoryNames[v.category] || v.category}
                  </span>
                  <button
                    onClick={() => handleToggleFeatured(v)}
                    style={{
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: v.isFeatured ? '#ef4444' : '#94a3b8'
                    }}
                  >
                    {v.isFeatured ? '🔥 Nổi bật' : '☆ Đặt nổi bật'}
                  </button>
                </div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0', lineHeight: 1.4 }}>
                  {v.title}
                </h3>
                {v.description && (
                  <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5, margin: '0 0 1rem 0', flex: 1 }}>
                    {v.description}
                  </p>
                )}
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.8rem', marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    {new Date(v.createdAt).toLocaleDateString('vi-VN')}
                  </span>
                  <button
                    onClick={() => handleDelete(v.id)}
                    style={{
                      border: 'none',
                      background: '#fee2e2',
                      color: '#dc2626',
                      padding: '0.4rem 0.8rem',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem'
                    }}
                  >
                    <FaTrash /> Xóa
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Add Video */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '550px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: 'clamp(1.2rem, 3vw, 2rem)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>Thêm Video Mới</h2>
              <button onClick={() => setShowModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#64748b' }}>
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                  Tiêu đề Video *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="VD: Bàn giao xe nâng Komatsu 2.5T cho công ty nhựa Bình Dương"
                  style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                  Link YouTube / YouTube Shorts / TikTok *
                </label>
                <input
                  type="url"
                  required
                  value={formData.videoUrl}
                  onChange={e => setFormData({ ...formData, videoUrl: e.target.value })}
                  placeholder="https://www.youtube.com/watch?v=... hoặc shorts"
                  style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                    Chuyên mục
                  </label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', background: 'white' }}
                  >
                    <option value="DELIVERY">Lễ Bàn giao xe</option>
                    <option value="INSPECTION">Kiểm tra & Test máy</option>
                    <option value="WAREHOUSE">Kho bãi & Rút Cont</option>
                    <option value="GUIDE">Hướng dẫn vận hành</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                    Ưu tiên nổi bật
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', height: '40px', gap: '0.5rem' }}>
                    <input
                      type="checkbox"
                      id="isFeatured"
                      checked={formData.isFeatured}
                      onChange={e => setFormData({ ...formData, isFeatured: e.target.checked })}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <label htmlFor="isFeatured" style={{ fontSize: '0.85rem', color: '#334155', cursor: 'pointer' }}>
                      Ghim lên đầu trang
                    </label>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                  Mô tả ngắn
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Thông tin thêm về chiếc xe, tải trọng nâng hoặc khách hàng..."
                  style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.8rem' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ padding: '0.65rem 1.2rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', color: '#475569', fontWeight: 600, cursor: 'pointer' }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: '0.65rem 1.4rem', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 700, cursor: 'pointer' }}
                >
                  {submitting ? 'Đang lưu...' : 'Lưu Video'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
