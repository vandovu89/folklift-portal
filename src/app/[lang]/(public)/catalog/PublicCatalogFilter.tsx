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

  useEffect(() => {
    setQ(searchParams.get('q') || '');
    setMaker(searchParams.get('maker') || '');
    setPowerType(searchParams.get('powerType') || '');
    setCategory(searchParams.get('category') || '');
  }, [searchParams]);

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (maker) params.set('maker', maker);
    if (powerType) params.set('powerType', powerType);
    if (category) params.set('category', category);
    
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
          <option value="COUNTER">Counter</option>
          <option value="REACH">Reach</option>
          <option value="OTHER">Other</option>
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
      <button type="submit" className="btn-primary" style={{ padding: '0.8rem 1.5rem', height: '46px', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', borderRadius: '8px', fontWeight: 700 }}>
        <FaSearch /> {lang === 'vi' ? 'Lọc kết quả' : 'Filter'}
      </button>
    </form>
  );
}
