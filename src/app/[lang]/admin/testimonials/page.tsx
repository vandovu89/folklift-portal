'use client';

import React, { useState, useEffect } from 'react';
import { FaPlus, FaTrash, FaStar, FaBuilding, FaMapMarkerAlt, FaTruck, FaTimes } from 'react-icons/fa';

interface TestimonialItem {
  id: string;
  customerName: string;
  companyName?: string;
  location?: string;
  forkliftModel?: string;
  imageUrl?: string;
  videoUrl?: string;
  content: string;
  rating: number;
  deliveryDate?: string;
  isFeatured: boolean;
  createdAt: string;
}

export default function AdminTestimonialsPage() {
  const [stories, setStories] = useState<TestimonialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    customerName: '',
    companyName: '',
    location: '',
    forkliftModel: '',
    imageUrl: '',
    content: '',
    rating: 5,
    deliveryDate: new Date().toISOString().split('T')[0],
    isFeatured: true
  });

  const fetchStories = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/testimonials');
      const data = await res.json();
      if (Array.isArray(data)) {
        setStories(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStories();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa đánh giá/hình ảnh bàn giao này?')) return;
    try {
      const res = await fetch(`/api/testimonials/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchStories();
      } else {
        alert('Lỗi khi xóa!');
      }
    } catch (e) {
      alert('Lỗi kết nối máy chủ');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/testimonials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setShowModal(false);
        setFormData({
          customerName: '',
          companyName: '',
          location: '',
          forkliftModel: '',
          imageUrl: '',
          content: '',
          rating: 5,
          deliveryDate: new Date().toISOString().split('T')[0],
          isFeatured: true
        });
        fetchStories();
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

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: 'clamp(1.3rem, 3vw, 1.8rem)', fontWeight: 800, margin: 0, color: '#0f172a' }}>
            Quản Lý Góc Khách Hàng &amp; Bàn Giao
          </h2>
          <p style={{ color: '#64748b', margin: '0.4rem 0 0 0', fontSize: '0.9rem' }}>
            Thêm hình ảnh thực tế giao xe và cảm nhận của khách để hiển thị trên website công khai.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{
            background: 'var(--primary)',
            color: 'white',
            padding: '0.75rem 1.4rem',
            borderRadius: '8px',
            border: 'none',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 4px 12px rgba(194, 39, 45, 0.3)'
          }}
        >
          <FaPlus /> Thêm Bàn Giao / Đánh Giá
        </button>
      </div>

      {/* Danh sách */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Đang tải dữ liệu...</div>
      ) : stories.length === 0 ? (
        <div style={{ background: 'white', padding: '3rem', borderRadius: '12px', textAlign: 'center', color: '#64748b', border: '1px solid #e2e8f0' }}>
          Chưa có đánh giá hoặc ảnh bàn giao nào. Hãy bấm &quot;Thêm Bàn Giao / Đánh Giá&quot; để tạo mới.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 290px), 1fr))', gap: '1.25rem' }}>
          {stories.map(item => (
            <div key={item.id} style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <strong style={{ fontSize: '1.1rem', color: '#0f172a' }}>{item.customerName}</strong>
                  {item.companyName && <div style={{ fontSize: '0.9rem', color: '#0284c7', fontWeight: 600 }}>{item.companyName}</div>}
                  {item.location && <div style={{ fontSize: '0.85rem', color: '#64748b' }}><FaMapMarkerAlt /> {item.location}</div>}
                </div>
                <button
                  onClick={() => handleDelete(item.id)}
                  style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', padding: '0.4rem 0.6rem', borderRadius: '6px', cursor: 'pointer' }}
                  title="Xóa"
                >
                  <FaTrash />
                </button>
              </div>

              {item.imageUrl && (
                <div style={{ width: '100%', height: '160px', borderRadius: '8px', overflow: 'hidden', marginBottom: '1rem', background: '#f1f5f9' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.imageUrl} alt={item.customerName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}

              {item.forkliftModel && (
                <div style={{ fontSize: '0.85rem', color: '#1e40af', background: '#eff6ff', padding: '0.3rem 0.6rem', borderRadius: '4px', marginBottom: '0.8rem', display: 'inline-block' }}>
                  ⚡ Xe: <strong>{item.forkliftModel}</strong>
                </div>
              )}

              <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.6, flex: 1, margin: 0, fontStyle: 'italic' }}>
                &ldquo;{item.content}&rdquo;
              </p>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.8rem', marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                <div style={{ color: '#f59e0b', display: 'flex', gap: '2px' }}>
                  {Array.from({ length: item.rating }).map((_, i) => <FaStar key={i} />)}
                </div>
                <span style={{ color: '#94a3b8' }}>
                  {item.deliveryDate ? new Date(item.deliveryDate).toLocaleDateString('vi-VN') : ''}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Thêm Mới */}
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
          <div style={{ background: 'white', borderRadius: '16px', maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: 'clamp(1.2rem, 3vw, 2rem)', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Thêm Câu Chuyện Bàn Giao &amp; Đánh Giá</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}>
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.3rem' }}>Họ tên khách hàng *</label>
                  <input
                    required
                    value={formData.customerName}
                    onChange={e => setFormData({ ...formData, customerName: e.target.value })}
                    placeholder="VD: Anh Tuấn - Quản lý kho"
                    style={{ width: '100%', padding: '0.7rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.3rem' }}>Tên công ty / Doanh nghiệp</label>
                  <input
                    value={formData.companyName}
                    onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder="VD: Công ty TNHH Bao Bì Nam Á"
                    style={{ width: '100%', padding: '0.7rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.3rem' }}>Địa điểm (KCN / Tỉnh thành)</label>
                  <input
                    value={formData.location}
                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                    placeholder="VD: KCN Nội Bài, Hà Nội"
                    style={{ width: '100%', padding: '0.7rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.3rem' }}>Model xe đã bàn giao</label>
                  <input
                    value={formData.forkliftModel}
                    onChange={e => setFormData({ ...formData, forkliftModel: e.target.value })}
                    placeholder="VD: Toyota 8FB25 (Điện 2.5 Tấn)"
                    style={{ width: '100%', padding: '0.7rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.3rem' }}>Link hình ảnh thực tế (Cloudinary / URL)</label>
                <input
                  value={formData.imageUrl}
                  onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="https://..."
                  style={{ width: '100%', padding: '0.7rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.3rem' }}>Nội dung cảm nhận / Đánh giá *</label>
                <textarea
                  required
                  rows={4}
                  value={formData.content}
                  onChange={e => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Khách hàng nhận xét thế nào về chất lượng xe, ắc quy và dịch vụ bàn giao..."
                  style={{ width: '100%', padding: '0.7rem', borderRadius: '6px', border: '1px solid #cbd5e1', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.3rem' }}>Đánh giá số sao</label>
                  <select
                    value={formData.rating}
                    onChange={e => setFormData({ ...formData, rating: parseInt(e.target.value) })}
                    style={{ width: '100%', padding: '0.7rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  >
                    <option value={5}>⭐⭐⭐⭐⭐ (5 sao)</option>
                    <option value={4}>⭐⭐⭐⭐ (4 sao)</option>
                    <option value={3}>⭐⭐⭐ (3 sao)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.3rem' }}>Ngày bàn giao</label>
                  <input
                    type="date"
                    value={formData.deliveryDate}
                    onChange={e => setFormData({ ...formData, deliveryDate: e.target.value })}
                    style={{ width: '100%', padding: '0.7rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.8rem' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ padding: '0.7rem 1.2rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer' }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: '0.7rem 1.6rem', borderRadius: '6px', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 700, cursor: 'pointer' }}
                >
                  {submitting ? 'Đang lưu...' : 'Lưu Bàn Giao'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
