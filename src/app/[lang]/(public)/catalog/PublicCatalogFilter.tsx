'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { FaSearch } from 'react-icons/fa';

export default function PublicCatalogFilter({ lang }: { lang: 'en' | 'vi' }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [q, setQ] = useState(searchParams.get('q') || '');
  const [maker, setMaker] = useState(searchParams.get('maker') || '');
  const [powerType, setPowerType] = useState(searchParams.get('powerType') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [capacity, setCapacity] = useState(searchParams.get('capacity') || '');
  const [height, setHeight] = useState(searchParams.get('height') || '');
  const [price, setPrice] = useState(searchParams.get('price') || '');

  useEffect(() => {
    setQ(searchParams.get('q') || '');
    setMaker(searchParams.get('maker') || '');
    setPowerType(searchParams.get('powerType') || '');
    setCategory(searchParams.get('category') || '');
    setCapacity(searchParams.get('capacity') || '');
    setHeight(searchParams.get('height') || '');
    setPrice(searchParams.get('price') || '');
  }, [searchParams]);

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (maker) params.set('maker', maker);
    if (powerType) params.set('powerType', powerType);
    if (category) params.set('category', category);
    if (capacity) params.set('capacity', capacity);
    if (height) params.set('height', height);
    if (price) params.set('price', price);
    
    router.push(`/${lang}/catalog?${params.toString()}`);
  };

  return (
    <form onSubmit={handleFilter} className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap', borderRadius: '16px' }}>
      <div style={{ flex: '1 1 200px' }}>
        <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block', fontSize: '0.9rem', color: '#666', fontWeight: 600 }}>
          {lang === 'vi' ? 'Tìm kiếm' : 'Search'}
        </label>
        <input 
          value={q} 
          onChange={e => setQ(e.target.value)} 
          className="form-control" 
          placeholder={lang === 'vi' ? "Tên máy, model..." : "Model name..."}
          style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--surface-border)' }}
        />
      </div>
      <div style={{ flex: '1 1 120px' }}>
        <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block', fontSize: '0.9rem', color: '#666', fontWeight: 600 }}>
          {lang === 'vi' ? 'Loại xe' : 'Type'}
        </label>
        <select 
          value={category} 
          onChange={e => setCategory(e.target.value)} 
          className="form-control"
          style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--surface-border)' }}
        >
          <option value="">-- {lang === 'vi' ? 'Tất cả' : 'All'} --</option>
          <option value="COUNTER">{lang === 'vi' ? 'Ngồi lái' : 'Counter'}</option>
          <option value="REACH">{lang === 'vi' ? 'Đứng lái' : 'Reach'}</option>
          <option value="OTHER">{lang === 'vi' ? 'Khác' : 'Other'}</option>
        </select>
      </div>
      <div style={{ flex: '1 1 150px' }}>
        <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block', fontSize: '0.9rem', color: '#666', fontWeight: 600 }}>
          {lang === 'vi' ? 'Hãng sản xuất' : 'Maker'}
        </label>
        <select 
          value={maker} 
          onChange={e => setMaker(e.target.value)} 
          className="form-control"
          style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--surface-border)' }}
        >
          <option value="">-- {lang === 'vi' ? 'Tất cả' : 'All'} --</option>
          <option value="KOMATSU">KOMATSU</option>
          <option value="TOYOTA">TOYOTA</option>
          <option value="TCM">TCM</option>
          <option value="NISSAN">NISSAN</option>
          <option value="MITSUBISHI">MITSUBISHI</option>
          <option value="NICHIYU">NICHIYU</option>
        </select>
      </div>
      <div style={{ flex: '1 1 150px' }}>
        <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block', fontSize: '0.9rem', color: '#666', fontWeight: 600 }}>
          {lang === 'vi' ? 'Nhiên liệu' : 'Power Type'}
        </label>
        <select 
          value={powerType} 
          onChange={e => setPowerType(e.target.value)} 
          className="form-control"
          style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--surface-border)' }}
        >
          <option value="">-- {lang === 'vi' ? 'Tất cả' : 'All'} --</option>
          <option value="BATTERY">Battery (Điện)</option>
          <option value="GASOLINE">Gasoline (Xăng)</option>
          <option value="DIESEL">Diesel (Dầu)</option>
        </select>
      </div>

      <div style={{ flex: '1 1 150px' }}>
        <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block', fontSize: '0.9rem', color: '#666', fontWeight: 600 }}>
          {lang === 'vi' ? 'Tải trọng' : 'Capacity'}
        </label>
        <select 
          value={capacity} 
          onChange={e => setCapacity(e.target.value)} 
          className="form-control"
          style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--surface-border)' }}
        >
          <option value="">-- {lang === 'vi' ? 'Tất cả' : 'All'} --</option>
          <option value="<1500">{lang === 'vi' ? 'Dưới 1.5 tấn' : 'Under 1.5 tons'}</option>
          <option value="1500-2500">1.5 - 2.5 {lang === 'vi' ? 'tấn' : 'tons'}</option>
          <option value=">2500">{lang === 'vi' ? 'Trên 2.5 tấn' : 'Above 2.5 tons'}</option>
        </select>
      </div>

      <div style={{ flex: '1 1 150px' }}>
        <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block', fontSize: '0.9rem', color: '#666', fontWeight: 600 }}>
          {lang === 'vi' ? 'Chiều cao nâng' : 'Lift Height'}
        </label>
        <select 
          value={height} 
          onChange={e => setHeight(e.target.value)} 
          className="form-control"
          style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--surface-border)' }}
        >
          <option value="">-- {lang === 'vi' ? 'Tất cả' : 'All'} --</option>
          <option value="<3000">{lang === 'vi' ? 'Dưới 3m' : 'Under 3m'}</option>
          <option value="3000-4000">3m - 4m</option>
          <option value=">4000">{lang === 'vi' ? 'Trên 4m' : 'Above 4m'}</option>
        </select>
      </div>

      <div style={{ flex: '1 1 150px' }}>
        <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block', fontSize: '0.9rem', color: '#666', fontWeight: 600 }}>
          {lang === 'vi' ? 'Tầm giá' : 'Price Range'}
        </label>
        <select 
          value={price} 
          onChange={e => setPrice(e.target.value)} 
          className="form-control"
          style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--surface-border)' }}
        >
          <option value="">-- {lang === 'vi' ? 'Tất cả' : 'All'} --</option>
          <option value="<150000000">{lang === 'vi' ? 'Dưới 150 triệu' : 'Under 150M'}</option>
          <option value="150000000-300000000">150 - 300 {lang === 'vi' ? 'triệu' : 'M'}</option>
          <option value=">300000000">{lang === 'vi' ? 'Trên 300 triệu' : 'Above 300M'}</option>
        </select>
      </div>

      <button type="submit" className="btn-primary" style={{ padding: '0.8rem 1.5rem', height: '46px', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', borderRadius: '8px', fontWeight: 700 }}>
        <FaSearch /> {lang === 'vi' ? 'Lọc kết quả' : 'Filter'}
      </button>
    </form>
  );
}
