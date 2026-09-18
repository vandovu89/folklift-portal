'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { FaSearch } from 'react-icons/fa';

export default function ForkliftFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [q, setQ] = useState(searchParams.get('q') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [capacity, setCapacity] = useState(searchParams.get('capacity') || '');
  const [height, setHeight] = useState(searchParams.get('height') || '');
  const [price, setPrice] = useState(searchParams.get('price') || '');

  // Reset form nếu URL bị thay đổi từ bên ngoài (ví dụ back button)
  useEffect(() => {
    setQ(searchParams.get('q') || '');
    setStatus(searchParams.get('status') || '');
    setCategory(searchParams.get('category') || '');
    setCapacity(searchParams.get('capacity') || '');
    setHeight(searchParams.get('height') || '');
    setPrice(searchParams.get('price') || '');
  }, [searchParams]);

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (status) params.set('status', status);
    if (category) params.set('category', category);
    if (capacity) params.set('capacity', capacity);
    if (height) params.set('height', height);
    if (price) params.set('price', price);
    
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
      <div style={{ width: '150px' }}>
        <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block', fontSize: '0.9rem', color: '#666' }}>
          Loại (Type 2)
        </label>
        <select value={category} onChange={e => setCategory(e.target.value)} className="form-control">
          <option value="">-- Tất cả --</option>
          <option value="COUNTER">Counter (Ngồi lái)</option>
          <option value="REACH">Reach (Đứng lái)</option>
          <option value="OTHER">Other (Khác)</option>
        </select>
      </div>
      <div style={{ width: '200px' }}>
        <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block', fontSize: '0.9rem', color: '#666' }}>
          Trạng thái
        </label>
        <select value={status} onChange={e => setStatus(e.target.value)} className="form-control">
          <option value="">-- Tất cả --</option>
          <option value="Draft">Draft (Lưu kho / Bản nháp)</option>
          <option value="Incoming">Incoming (Sắp về kho)</option>
          <option value="Available">Available (Đang bán / Sẵn sàng)</option>
          <option value="Reserved">Reserved (Đã nhận cọc)</option>
          <option value="Sold">Sold (Đã bán)</option>
        </select>
      </div>
      <div style={{ width: '150px' }}>
        <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block', fontSize: '0.9rem', color: '#666' }}>
          Tải trọng
        </label>
        <select value={capacity} onChange={e => setCapacity(e.target.value)} className="form-control">
          <option value="">-- Tất cả --</option>
          <option value="<1500">Dưới 1.5 tấn</option>
          <option value="1500-2500">1.5 - 2.5 tấn</option>
          <option value=">2500">Trên 2.5 tấn</option>
        </select>
      </div>
      <div style={{ width: '150px' }}>
        <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block', fontSize: '0.9rem', color: '#666' }}>
          Chiều cao nâng
        </label>
        <select value={height} onChange={e => setHeight(e.target.value)} className="form-control">
          <option value="">-- Tất cả --</option>
          <option value="<3000">Dưới 3m</option>
          <option value="3000-4000">3m - 4m</option>
          <option value=">4000">Trên 4m</option>
        </select>
      </div>
      <div style={{ width: '150px' }}>
        <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block', fontSize: '0.9rem', color: '#666' }}>
          Tầm giá
        </label>
        <select value={price} onChange={e => setPrice(e.target.value)} className="form-control">
          <option value="">-- Tất cả --</option>
          <option value="<150000000">Dưới 150 triệu</option>
          <option value="150000000-300000000">150 - 300 triệu</option>
          <option value=">300000000">Trên 300 triệu</option>
        </select>
      </div>
      <button type="submit" className="btn-primary" style={{ height: '42px', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
        <FaSearch /> Lọc kết quả
      </button>
    </form>
  );
}
