'use client';

import { useState, useEffect, useCallback } from 'react';
import { FaTrash, FaEye, FaEyeSlash, FaFileUpload, FaStar, FaRegStar } from 'react-icons/fa';
import heic2any from 'heic2any';

export default function MediaManager({ forkliftId }: { forkliftId: string }) {
  const [mediaList, setMediaList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [category, setCategory] = useState('Tổng thể');
  const [isPublic, setIsPublic] = useState(true);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);

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
    if (files.length === 0) return;

    setLoading(true);
    setUploadProgress({ current: 0, total: files.length });

    let hasError = false;

    for (let i = 0; i < files.length; i++) {
      let currentFile = files[i];
      setUploadProgress({ current: i + 1, total: files.length });

      // Convert HEIC to JPEG if needed
      if (currentFile.type === 'image/heic' || currentFile.name.toLowerCase().endsWith('.heic')) {
        try {
          const convertedBlob = await heic2any({
            blob: currentFile,
            toType: 'image/jpeg',
            quality: 0.8
          });
          const blobArray = Array.isArray(convertedBlob) ? convertedBlob : [convertedBlob];
          currentFile = new File(blobArray, currentFile.name.replace(/\.heic$/i, '.jpg'), {
            type: 'image/jpeg'
          });
        } catch (err) {
          console.error('HEIC conversion failed', err);
          hasError = true;
          continue; // Skip uploading this file if conversion fails
        }
      }

      const formData = new FormData();
      formData.append('file', currentFile);
      formData.append('forkliftId', forkliftId);
      formData.append('category', category);
      formData.append('isPublic', isPublic.toString());

      try {
        const res = await fetch('/api/media/upload', {
          method: 'POST',
          body: formData
        });
        if (!res.ok) {
          hasError = true;
        }
      } catch(err) {
        console.error(err);
        hasError = true;
      }
    }

    if (hasError) {
      alert('Một hoặc nhiều file tải lên thất bại. Kiểm tra lại định dạng ảnh.');
    }

    setFiles([]);
    setUploadProgress({ current: 0, total: 0 });
    await fetchMedia();
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

  const handleSetThumbnail = async (id: string) => {
    // Optimistic UI Update
    setMediaList(prev => prev.map(m => ({
      ...m,
      isThumbnail: m.id === id
    })));

    try {
      const res = await fetch(`/api/media/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_thumbnail' })
      });
      if (!res.ok) {
        // Revert if failed by re-fetching
        await fetchMedia();
      }
    } catch(err) {
      console.error(err);
      await fetchMedia(); // Revert on error
    }
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedItemId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedItemId || draggedItemId === targetId) return;

    const newMediaList = [...mediaList];
    const draggedIndex = newMediaList.findIndex(m => m.id === draggedItemId);
    const targetIndex = newMediaList.findIndex(m => m.id === targetId);

    const [draggedItem] = newMediaList.splice(draggedIndex, 1);
    newMediaList.splice(targetIndex, 0, draggedItem);

    // Cập nhật order
    const reordered = newMediaList.map((item, index) => ({
      ...item,
      order: index
    }));

    setMediaList(reordered);
    setDraggedItemId(null);

    // Call API
    try {
      await fetch('/api/media/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: reordered.map(item => ({ id: item.id, order: item.order }))
        })
      });
    } catch (err) {
      console.error('Failed to save order', err);
    }
  };

  return (
    <div style={{ marginTop: '2rem' }}>
      <h3 style={{ marginBottom: '1rem', borderBottom: '2px solid var(--primary)', display: 'inline-block' }}>
        Quản lý Hình ảnh & Tài liệu
      </h3>
      
      <form onSubmit={handleUpload} className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', display: 'flex', gap: '1.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 250px' }}>
          <label className="form-label">Chọn File (Ảnh/PDF/Doc) - Có thể chọn nhiều file</label>
          <input type="file" multiple className="form-control" onChange={(e) => setFiles(Array.from(e.target.files || []))} required />
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
        <button type="submit" className="btn-primary" disabled={loading || files.length === 0} style={{ height: '40px', padding: '0 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FaFileUpload /> {loading ? `Đang tải... ${uploadProgress.current}/${uploadProgress.total}` : 'Tải lên'}
        </button>
      </form>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.5rem' }}>
        {mediaList.map((m) => (
          <div 
            key={m.id} 
            className="glass-panel" 
            style={{ 
              overflow: 'hidden', 
              position: 'relative',
              cursor: 'grab',
              opacity: draggedItemId === m.id ? 0.5 : 1,
              border: draggedItemId === m.id ? '2px dashed var(--primary)' : '1px solid var(--glass-border)'
            }}
            draggable
            onDragStart={(e) => handleDragStart(e, m.id)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, m.id)}
          >
            <div style={{ position: 'absolute', top: '0.5rem', left: '0.5rem', zIndex: 10, background: 'rgba(0,0,0,0.5)', color: 'white', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.8rem' }}>
              ≡ Kéo thả
            </div>
            <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', zIndex: 10, display: 'flex', gap: '0.3rem' }}>
              <span className={`badge ${m.isPublic ? 'badge-success' : 'badge-warning'}`} title={m.isPublic ? 'Public (Khách hàng thấy)' : 'Internal (Chỉ Admin thấy)'}>
                {m.isPublic ? <FaEye /> : <FaEyeSlash />}
              </span>
              {m.fileType === 'IMAGE' && (
                <button 
                  onClick={() => handleSetThumbnail(m.id)} 
                  style={{ background: m.isThumbnail ? '#f59e0b' : 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '4px', padding: '0.3rem 0.5rem', cursor: 'pointer' }}
                  title={m.isThumbnail ? 'Đang là ảnh đại diện (Thumbnail)' : 'Đặt làm ảnh đại diện'}
                >
                  {m.isThumbnail ? <FaStar /> : <FaRegStar />}
                </button>
              )}
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
