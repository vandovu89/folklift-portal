import Link from 'next/link';
import { getDictionary } from '@/dictionaries';
import LangSwitcher from '@/components/LangSwitcher';

export default async function PublicNavbar({ lang }: { lang: 'en' | 'vi' }) {
  const dict = await getDictionary(lang);
  
  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)',
      borderBottom: '1px solid var(--surface-border)',
      padding: '1.2rem 5%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
    }}>
      <Link href={`/${lang}`} style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--primary)', textDecoration: 'none', letterSpacing: '-0.5px' }}>
        KYOWA<span style={{ color: 'var(--foreground)' }}>FORKLIFT</span>
      </Link>
      
      <div style={{ display: 'flex', gap: '2.5rem', alignItems: 'center' }}>
        <Link href={`/${lang}`} style={{ fontWeight: 600, color: 'var(--foreground)', textDecoration: 'none', transition: 'color 0.2s' }}>{dict.nav.home}</Link>
        <Link href={`/${lang}/catalog`} style={{ fontWeight: 600, color: 'var(--foreground)', textDecoration: 'none', transition: 'color 0.2s' }}>{dict.nav.catalog}</Link>
        <Link href={`/${lang}/about`} style={{ fontWeight: 600, color: 'var(--foreground)', textDecoration: 'none', transition: 'color 0.2s' }}>{dict.nav.about}</Link>
        <Link href={`/${lang}/policies`} style={{ fontWeight: 600, color: 'var(--foreground)', textDecoration: 'none', transition: 'color 0.2s' }}>{dict.nav.policies}</Link>
        <Link href={`/${lang}/contact`} style={{ fontWeight: 600, color: 'var(--foreground)', textDecoration: 'none', transition: 'color 0.2s' }}>{dict.nav.contact}</Link>
        
        <div style={{ borderLeft: '1px solid var(--surface-border)', paddingLeft: '1.5rem', display: 'flex', alignItems: 'center' }}>
          <LangSwitcher currentLang={lang} />
        </div>
      </div>
    </nav>
  );
}
