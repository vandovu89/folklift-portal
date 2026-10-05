'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaSearch, FaCaretDown } from 'react-icons/fa';

interface HomeQuickSearchProps {
  lang: string;
}

export default function HomeQuickSearch({ lang }: HomeQuickSearchProps) {
  const router = useRouter();
  const [maker, setMaker] = useState('');
  const [powerType, setPowerType] = useState('');
  const [capacity, setCapacity] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (maker) params.append('maker', maker);
    if (powerType) params.append('powerType', powerType);
    if (capacity) params.append('minCapacity', capacity);
    
    router.push(`/${lang}/catalog?${params.toString()}`);
  };

  return (
    <div style={{
      maxWidth: '1000px',
      margin: '-60px auto 4rem auto',
      position: 'relative',
      zIndex: 10,
      background: 'white',
      borderRadius: '16px',
      boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
      padding: '2rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem'
    }}>
      <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#1e293b', fontWeight: 700 }}>
        {lang === 'vi' ? 'Tìm kiếm xe nâng nhanh' : 'Quick Forklift Search'}
      </h3>
      <form onSubmit={handleSearch} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>{lang === 'vi' ? 'Hãng sản xuất' : 'Maker'}</label>
          <div style={{ position: 'relative' }}>
            <select 
              value={maker}
              onChange={(e) => setMaker(e.target.value)}
              style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', appearance: 'none', background: '#f8fafc', outline: 'none', color: '#1e293b', fontWeight: 500 }}
            >
              <option value="">{lang === 'vi' ? 'Tất cả hãng' : 'All Makers'}</option>
              <option value="TOYOTA">Toyota</option>
              <option value="KOMATSU">Komatsu</option>
              <option value="TCM">TCM</option>
              <option value="MITSUBISHI">Mitsubishi</option>
              <option value="NISSAN">Nissan</option>
              <option value="NICHIYU">Nichiyu</option>
            </select>
            <FaCaretDown style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>{lang === 'vi' ? 'Nhiên liệu' : 'Power Type'}</label>
          <div style={{ position: 'relative' }}>
            <select 
              value={powerType}
              onChange={(e) => setPowerType(e.target.value)}
              style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', appearance: 'none', background: '#f8fafc', outline: 'none', color: '#1e293b', fontWeight: 500 }}
            >
              <option value="">{lang === 'vi' ? 'Tất cả loại' : 'All Types'}</option>
              <option value="BATTERY">Battery (Điện)</option>
              <option value="DIESEL">Diesel (Dầu)</option>
              <option value="GASOLINE">Gasoline (Xăng/Gas)</option>
            </select>
            <FaCaretDown style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>{lang === 'vi' ? 'Tải trọng' : 'Capacity'}</label>
          <div style={{ position: 'relative' }}>
            <select 
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', appearance: 'none', background: '#f8fafc', outline: 'none', color: '#1e293b', fontWeight: 500 }}
            >
              <option value="">{lang === 'vi' ? 'Mọi tải trọng' : 'All Capacities'}</option>
              <option value="1000">1 Tấn - 1.5 Tấn</option>
              <option value="2000">2 Tấn - 2.5 Tấn</option>
              <option value="3000">3 Tấn - 4 Tấn</option>
              <option value="5000">Từ 5 Tấn trở lên</option>
            </select>
            <FaCaretDown style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
          </div>
        </div>

        <button type="submit" style={{ padding: '0.8rem 1rem', borderRadius: '8px', background: 'var(--primary)', color: 'white', border: 'none', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer', height: '45px', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'var(--primary-hover)'} onMouseOut={e => e.currentTarget.style.background = 'var(--primary)'}>
          <FaSearch /> {lang === 'vi' ? 'Tìm Xe Ngay' : 'Search Now'}
        </button>

      </form>
    </div>
  );
}
