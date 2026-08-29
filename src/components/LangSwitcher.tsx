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
    <div style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center', background: 'rgba(255,255,255,0.1)', padding: '0.3rem 0.5rem', borderRadius: '8px' }}>
      <Link 
        href={getNewPath('vi')} 
        style={{ 
          padding: '0.2rem 0.6rem', 
          borderRadius: '4px', 
          background: currentLang === 'vi' ? 'white' : 'transparent',
          color: currentLang === 'vi' ? 'var(--primary)' : 'white',
          textDecoration: 'none',
          fontWeight: 'bold',
          fontSize: '0.85rem'
        }}
      >
        VI
      </Link>
      <Link 
        href={getNewPath('en')} 
        style={{ 
          padding: '0.2rem 0.6rem', 
          borderRadius: '4px', 
          background: currentLang === 'en' ? 'white' : 'transparent',
          color: currentLang === 'en' ? 'var(--primary)' : 'white',
          textDecoration: 'none',
          fontWeight: 'bold',
          fontSize: '0.85rem'
        }}
      >
        EN
      </Link>
    </div>
  );
}
