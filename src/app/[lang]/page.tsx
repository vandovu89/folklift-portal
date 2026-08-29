import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { FaGasPump, FaBatteryFull, FaCalendarAlt } from 'react-icons/fa';
import { getDictionary } from '@/dictionaries';
import LangSwitcher from '@/components/LangSwitcher';

export const dynamic = 'force-dynamic';

export default async function PublicCatalog({ params }: { params: Promise<{ lang: 'en' | 'vi' }> }) {
  const resolvedParams = await params;
  const dict = await getDictionary(resolvedParams.lang);

  const forklifts = await prisma.forklift.findMany({
    where: { status: 'Published' },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div>
      <header style={{ padding: '3rem 5%', background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)', color: 'white', textAlign: 'center', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem' }}>
          <LangSwitcher currentLang={resolvedParams.lang} />
        </div>
        <h1 style={{ fontSize: '3rem', marginBottom: '0.5rem', fontWeight: 800 }}>{dict.home.title}</h1>
        <p style={{ opacity: 0.9, fontSize: '1.1rem' }}>{dict.home.subtitle}</p>
      </header>

      <main style={{ padding: '3rem 5%', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', color: 'var(--primary)' }}>{dict.home.title} ({forklifts.length})</h2>
        </div>

        {forklifts.length === 0 ? (
          <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center' }}>
            <h3 style={{ color: '#666' }}>{dict.home.empty_state}</h3>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2rem' }}>
            {forklifts.map((fl) => (
              <div key={fl.id} className="glass-panel" style={{ overflow: 'hidden', transition: 'var(--transition)' }}>
                <div style={{ height: '220px', background: 'var(--surface-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>
                  [ Hình ảnh {fl.maker} ]
                </div>
                <div style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1.3rem' }}>{fl.maker} {fl.model}</h3>
                    <span className="badge badge-success">Sẵn sàng</span>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '1rem', color: 'var(--foreground)', opacity: 0.8, fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <FaCalendarAlt /> {fl.year || 'N/A'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      {fl.powerType === 'Battery' ? <FaBatteryFull /> : <FaGasPump />} {fl.powerType}
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid var(--surface-border)', paddingTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: '800', color: 'var(--danger)', fontSize: '1.15rem' }}>
                      {fl.price ? `${fl.price.toLocaleString('vi-VN')} ₫` : dict.common.contact}
                    </div>
                    <Link href={`/${resolvedParams.lang}/machine/${fl.id}`} className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                      {dict.common.view_detail}
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
