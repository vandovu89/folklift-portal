'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { FaSearch } from 'react-icons/fa';

export default function ForkliftFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [q, setQ] = useState(searchParams.get('q') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');

  // Reset form nếu URL bị thay đổi từ bên ngoài (ví dụ back button)
  useEffect(() => {
    setQ(searchParams.get('q') || '');
    setStatus(searchParams.get('status') || '');
  }, [searchParams]);

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (status) params.set('status', status);
    
    router.push(`/admin/forklifts?${params.toString()}`);
  };

  return (
    <form onSubmit={handleFilter} className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
      <div style={{ flex: '1 1 300px' }}>
        <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block', fontSize: '0.9rem', color: '#666' }}>
          Tìm kiếm (Hãng, Model, Stock No...)
        </label>
        <input 
          value={q} 
          onChange={e => setQ(e.target.value)} 
          className="form-control" 
          placeholder="Nhập từ khóa tìm kiếm..." 
        />
      </div>
      <div style={{ width: '200px' }}>
        <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block', fontSize: '0.9rem', color: '#666' }}>
          Trạng thái
        </label>
        <select value={status} onChange={e => setStatus(e.target.value)} className="form-control">
          <option value="">-- Tất cả --</option>
          <option value="Draft">Draft (Bản nháp)</option>
          <option value="Received">Received (Đã nhận)</option>
          <option value="Ready">Ready (Sẵn sàng bán)</option>
          <option value="Published">Published (Công khai Web)</option>
        </select>
      </div>
      <button type="submit" className="btn-primary" style={{ height: '42px', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
        <FaSearch /> Lọc kết quả
      </button>
    </form>
  );
}
