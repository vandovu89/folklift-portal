'use client';

import React, { useState } from 'react';
import VideoEmbed from '@/components/VideoEmbed';

interface MediaVideoItem {
  id: string;
  title: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  category: string;
  description: string | null;
  isFeatured: boolean;
  createdAt: Date | string;
}

interface MediaGalleryClientProps {
  videos: MediaVideoItem[];
  lang: string;
}

export default function MediaGalleryClient({ videos, lang }: MediaGalleryClientProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const categories = [
    { key: 'ALL', labelVi: 'Tất cả Video', labelEn: 'All Videos' },
    { key: 'DELIVERY', labelVi: 'Lễ Bàn Giao Xe', labelEn: 'Vehicle Delivery' },
    { key: 'INSPECTION', labelVi: 'Kiểm Tra & Test Máy', labelEn: 'Inspection & Test Drive' },
    { key: 'WAREHOUSE', labelVi: 'Kho Bãi & Nhập Khẩu', labelEn: 'Warehouse & Unboxing' },
    { key: 'GUIDE', labelVi: 'Hướng Dẫn Vận Hành', labelEn: 'Operation Guide' },
  ];

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'DELIVERY':
        return { label: lang === 'vi' ? 'Bàn giao xe' : 'Delivery', bg: '#10b981', color: 'white' };
      case 'INSPECTION':
        return { label: lang === 'vi' ? 'Test máy' : 'Inspection', bg: '#3b82f6', color: 'white' };
      case 'WAREHOUSE':
        return { label: lang === 'vi' ? 'Kho bãi' : 'Warehouse', bg: '#8b5cf6', color: 'white' };
      case 'GUIDE':
        return { label: lang === 'vi' ? 'Hướng dẫn' : 'Guide', bg: '#f59e0b', color: 'white' };
      default:
        return { label: cat, bg: '#64748b', color: 'white' };
    }
  };

  const filteredVideos = videos.filter(v => {
    const matchesCategory = selectedCategory === 'ALL' || v.category === selectedCategory;
    const matchesSearch = searchTerm.trim() === '' || 
      v.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.description && v.description.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div>
      {/* Category Filter & Search Bar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1.2rem',
        marginBottom: '2.5rem',
        background: 'white',
        padding: '1.2rem 1.8rem',
        borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
        border: '1px solid #e2e8f0'
      }}>
        {/* Category Pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
          {categories.map(cat => {
            const isActive = selectedCategory === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setSelectedCategory(cat.key)}
                style={{
                  padding: '0.6rem 1.2rem',
                  borderRadius: '30px',
                  border: isActive ? 'none' : '1px solid #cbd5e1',
                  background: isActive ? 'var(--primary)' : 'white',
                  color: isActive ? 'white' : '#334155',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: isActive ? '0 4px 12px rgba(37,99,235,0.25)' : 'none'
                }}
              >
                {lang === 'vi' ? cat.labelVi : cat.labelEn}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div style={{ minWidth: '260px' }}>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={lang === 'vi' ? 'Tìm kiếm video theo tiêu đề...' : 'Search videos...'}
            style={{
              width: '100%',
              padding: '0.7rem 1.2rem',
              borderRadius: '30px',
              border: '1px solid #cbd5e1',
              fontSize: '0.9rem',
              outline: 'none',
              background: '#f8fafc'
            }}
          />
        </div>
      </div>

      {/* Videos Grid */}
      {filteredVideos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '5rem 2rem', background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📹</div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#334155', marginBottom: '0.5rem' }}>
            {lang === 'vi' ? 'Chưa có video trong chuyên mục này' : 'No videos found in this category'}
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
            {lang === 'vi' ? 'Vui lòng chọn danh mục khác hoặc quay lại sau.' : 'Please select another category or check back later.'}
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
          gap: '2.5rem'
        }}>
          {filteredVideos.map(v => {
            const badge = getCategoryBadge(v.category);
            return (
              <div
                key={v.id}
                style={{
                  background: 'white',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 6px 18px rgba(0,0,0,0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s, box-shadow 0.2s'
                }}
              >
                {/* Video Player */}
                <div style={{ padding: '0.8rem', background: '#0f172a' }}>
                  <VideoEmbed url={v.videoUrl} title={v.title} />
                </div>

                {/* Info Container */}
                <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      backgroundColor: badge.bg,
                      color: badge.color
                    }}>
                      {badge.label}
                    </span>
                    {v.isFeatured && (
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        🔥 {lang === 'vi' ? 'Nổi bật' : 'Featured'}
                      </span>
                    )}
                  </div>

                  <h3 style={{
                    fontSize: '1.15rem',
                    fontWeight: 800,
                    color: '#0f172a',
                    marginBottom: '0.6rem',
                    lineHeight: 1.4
                  }}>
                    {v.title}
                  </h3>

                  {v.description && (
                    <p style={{
                      color: '#64748b',
                      fontSize: '0.9rem',
                      lineHeight: 1.6,
                      flex: 1,
                      marginBottom: '1rem'
                    }}>
                      {v.description}
                    </p>
                  )}

                  <div style={{
                    borderTop: '1px solid #f1f5f9',
                    paddingTop: '1rem',
                    marginTop: 'auto',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                      {new Date(v.createdAt).toLocaleDateString('vi-VN')}
                    </span>
                    <a
                      href={v.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        color: 'var(--primary)',
                        textDecoration: 'none'
                      }}
                    >
                      {lang === 'vi' ? 'Xem trên YouTube/TikTok' : 'Watch external'} &rarr;
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
