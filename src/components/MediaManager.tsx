'use client';

import { useState, useEffect, useCallback } from 'react';
import { FaTrash, FaEye, FaEyeSlash, FaFileUpload } from 'react-icons/fa';

export default function MediaManager({ forkliftId }: { forkliftId: string }) {
  const [mediaList, setMediaList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState('Tổng thể');
  const [isPublic, setIsPublic] = useState(true);

  const fetchMedia = useCallback(async () => {
    const res = await fetch(`/api/media?forkliftId=${forkliftId}`);
    if (res.ok) {
      const data = await res.json();
      setMediaList(data);
    }
  }, [forkliftId]);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('forkliftId', forkliftId);
    formData.append('category', category);
    formData.append('isPublic', isPublic.toString());

    try {
      const res = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        setFile(null);
        await fetchMedia();
      } else {
        alert('Upload thất bại');
      }
    } catch(err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa file này?')) return;
    
    try {
      const res = await fetch(`/api/media/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchMedia();
      }
    } catch(err) {
      console.error(err);
    }
  };

  return (
    <div style={{ marginTop: '2rem' }}>
      <h3 style={{ marginBottom: '1rem', borderBottom: '2px solid var(--primary)', display: 'inline-block' }}>
        Quản lý Hình ảnh & Tài liệu
      </h3>
      
      <form onSubmit={handleUpload} className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', display: 'flex', gap: '1.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 250px' }}>
          <label className="form-label">Chọn File (Ảnh/PDF/Doc)</label>
          <input type="file" className="form-control" onChange={(e) => setFile(e.target.files?.[0] || null)} required />
        </div>
        <div style={{ flex: '1 1 200px' }}>
          <label className="form-label">Phân loại nhóm</label>
          <select className="form-control" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="Tổng thể">Ảnh Tổng thể (Front, Rear...)</option>
            <option value="Kỹ thuật">Ảnh Kỹ thuật (Engine, Mast...)</option>
            <option value="Tình trạng">Ảnh Tình trạng (Damage, Leak...)</option>
            <option value="Inspection Report">Báo cáo kiểm định (PDF)</option>
            <option value="Invoice">Hóa đơn mua bán</option>
            <option value="Maintenance">Hồ sơ bảo dưỡng</option>
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', height: '40px' }}>
          <input type="checkbox" id="isPublic" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} style={{ width: '1.2rem', height: '1.2rem' }} />
          <label htmlFor="isPublic" style={{ fontWeight: '600' }}>Hiển thị ra Public</label>
        </div>
        <button type="submit" className="btn-primary" disabled={loading || !file} style={{ height: '40px', padding: '0 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FaFileUpload /> {loading ? 'Đang tải...' : 'Tải lên'}
        </button>
      </form>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.5rem' }}>
        {mediaList.map((m) => (
          <div key={m.id} className="glass-panel" style={{ overflow: 'hidden', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', zIndex: 10, display: 'flex', gap: '0.3rem' }}>
              <span className={`badge ${m.isPublic ? 'badge-success' : 'badge-warning'}`} title={m.isPublic ? 'Public (Khách hàng thấy)' : 'Internal (Chỉ Admin thấy)'}>
                {m.isPublic ? <FaEye /> : <FaEyeSlash />}
              </span>
              <button onClick={() => handleDelete(m.id)} style={{ background: 'var(--danger)', color: 'white', border: 'none', borderRadius: '4px', padding: '0.3rem 0.5rem', cursor: 'pointer' }}>
                <FaTrash />
              </button>
            </div>

            {m.fileType === 'IMAGE' ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.url} alt={m.fileName} style={{ width: '100%', height: '160px', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-border)', color: 'var(--primary)' }}>
                <strong>DOCUMENT / FILE</strong>
              </div>
            )}
            
            <div style={{ padding: '1rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--primary)' }}>{m.category}</div>
              <div style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '0.2rem' }} title={m.fileName}>
                {m.fileName}
              </div>
            </div>
          </div>
        ))}
        {mediaList.length === 0 && (
          <div style={{ gridColumn: '1 / -1', padding: '3rem', textAlign: 'center', color: '#888', border: '2px dashed var(--surface-border)', borderRadius: '12px' }}>
            Chưa có hình ảnh hoặc tài liệu nào được đính kèm.
          </div>
        )}
      </div>
    </div>
  );
}
