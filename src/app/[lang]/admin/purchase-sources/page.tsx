'use client';

import { useState, useEffect } from 'react';

type PurchaseSource = {
  id: string;
  name: string;
  abbreviation: string;
  currentSeq: number;
};

export default function PurchaseSourcesPage() {
  const [sources, setSources] = useState<PurchaseSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({ name: '', abbreviation: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchSources = async () => {
    try {
      const res = await fetch('/api/purchase-sources');
      const data = await res.json();
      setSources(data);
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSources();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const url = editingId ? `/api/purchase-sources/${editingId}` : '/api/purchase-sources';
      const method = editingId ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        setFormData({ name: '', abbreviation: '' });
        setEditingId(null);
        fetchSources();
      } else {
        const error = await res.json();
        alert(error.error || 'Có lỗi xảy ra');
      }
    } catch (error) {
      alert('Có lỗi xảy ra');
    }
    
    setSubmitting(false);
  };

  const handleEdit = (source: PurchaseSource) => {
    setEditingId(source.id);
    setFormData({ name: source.name, abbreviation: source.abbreviation });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa?')) return;
    try {
      const res = await fetch(`/api/purchase-sources/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchSources();
      } else {
        alert('Có lỗi xảy ra');
      }
    } catch (error) {
      alert('Có lỗi xảy ra');
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Đang tải...</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '2rem', fontSize: '1.5rem', fontWeight: 600 }}>Quản lý Nguồn nhập & Mã viết tắt</h2>
      
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>
          {editingId ? 'Cập nhật Nguồn nhập' : 'Thêm Nguồn nhập mới'}
        </h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px' }}>
            <label className="form-label">Tên nguồn nhập *</label>
            <input 
              required
              className="form-control"
              placeholder="VD: TAU TRADEi"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div style={{ width: '150px' }}>
            <label className="form-label">Mã viết tắt *</label>
            <input 
              required
              maxLength={4}
              className="form-control"
              placeholder="VD: TA"
              value={formData.abbreviation}
              onChange={e => setFormData({ ...formData, abbreviation: e.target.value.toUpperCase() })}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {editingId && (
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={() => { setEditingId(null); setFormData({ name: '', abbreviation: '' }); }}
              >
                Hủy
              </button>
            )}
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Đang lưu...' : (editingId ? 'Cập nhật' : 'Thêm mới')}
            </button>
          </div>
        </form>
      </div>

      <div className="glass-panel" style={{ overflowX: 'auto' }}>
        <table className="table" style={{ width: '100%', minWidth: '600px' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Tên Nguồn nhập</th>
              <th style={{ textAlign: 'center', width: '150px' }}>Mã Viết Tắt</th>
              <th style={{ textAlign: 'center', width: '150px' }}>Current Seq</th>
              <th style={{ textAlign: 'center', width: '150px' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {sources.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                  Chưa có dữ liệu
                </td>
              </tr>
            ) : sources.map(source => (
              <tr key={source.id}>
                <td>{source.name}</td>
                <td style={{ textAlign: 'center' }}>
                  <span className="badge badge-neutral" style={{ fontSize: '1rem' }}>{source.abbreviation}</span>
                </td>
                <td style={{ textAlign: 'center' }}>{source.currentSeq}</td>
                <td style={{ textAlign: 'center', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                  <button onClick={() => handleEdit(source)} className="btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}>Sửa</button>
                  <button onClick={() => handleDelete(source.id)} className="btn-danger" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}>Xóa</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
