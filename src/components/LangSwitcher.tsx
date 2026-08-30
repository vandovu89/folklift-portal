'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

export default function LangSwitcher({ currentLang }: { currentLang: string }) {
  const pathname = usePathname();
  
  const getNewPath = (newLocale: string) => {
    if (!pathname) return '/';
    const segments = pathname.split('/');
    if (segments.length > 1) {
      segments[1] = newLocale;
    }
    return segments.join('/');
  };

  return (
    <div style={{ display: 'inline-flex', gap: '0.2rem', alignItems: 'center', background: 'var(--surface-border)', padding: '0.3rem', borderRadius: '10px' }}>
      <Link 
        href={getNewPath('vi')} 
        style={{ 
          padding: '0.4rem 0.8rem', 
          borderRadius: '8px', 
          background: currentLang === 'vi' ? 'white' : 'transparent',
          color: currentLang === 'vi' ? 'var(--primary)' : '#64748b',
          textDecoration: 'none',
          fontWeight: currentLang === 'vi' ? '700' : '600',
          fontSize: '0.85rem',
          boxShadow: currentLang === 'vi' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
          transition: 'all 0.2s'
        }}
      >
        VI
      </Link>
      <Link 
        href={getNewPath('en')} 
        style={{ 
          padding: '0.4rem 0.8rem', 
          borderRadius: '8px', 
          background: currentLang === 'en' ? 'white' : 'transparent',
          color: currentLang === 'en' ? 'var(--primary)' : '#64748b',
          textDecoration: 'none',
          fontWeight: currentLang === 'en' ? '700' : '600',
          fontSize: '0.85rem',
          boxShadow: currentLang === 'en' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
          transition: 'all 0.2s'
        }}
      >
        EN
      </Link>
    </div>
  );
}
