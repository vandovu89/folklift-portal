'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import LangSwitcher from '@/components/LangSwitcher';

export default function PublicNavbar({ lang, dict }: { lang: 'en' | 'vi', dict: any }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  const navLinks = [
    { href: `/${lang}`, label: dict.nav.home, exact: true },
    { href: `/${lang}/catalog`, label: dict.nav.catalog },
    { href: `/${lang}/about`, label: dict.nav.about },
    { href: `/${lang}/policies`, label: dict.nav.policies },
    { href: `/${lang}/contact`, label: dict.nav.contact },
  ];

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: 'rgba(255, 255, 255, 0.97)', backdropFilter: 'blur(10px)',
      borderBottom: '1px solid var(--surface-border)',
      padding: '1rem 5%',
      boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1400px', margin: '0 auto' }}>
        <Link href={`/${lang}`} style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <img src="/logo.png" alt="Việt Nhật Logo" style={{ height: '40px', width: 'auto', objectFit: 'contain' }} />
        </Link>

        {/* Desktop Nav */}
        <div className="nav-desktop" style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'color 0.2s',
                color: isActive(link.href, link.exact) ? 'var(--primary)' : 'var(--foreground)',
                borderBottom: isActive(link.href, link.exact) ? '2px solid var(--primary)' : '2px solid transparent',
                paddingBottom: '2px',
              }}
            >
              {link.label}
            </Link>
          ))}
          <div style={{ borderLeft: '1px solid var(--surface-border)', paddingLeft: '1.5rem', display: 'flex', alignItems: 'center' }}>
            <LangSwitcher currentLang={lang} />
          </div>
        </div>

        {/* Mobile: LangSwitcher + Hamburger */}
        <div className="nav-mobile-controls" style={{ display: 'none', alignItems: 'center', gap: '1rem' }}>
          <LangSwitcher currentLang={lang} />
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.4rem', display: 'flex', flexDirection: 'column', gap: '5px' }}
            aria-label="Toggle menu"
          >
            <span style={{ display: 'block', width: '24px', height: '2px', background: 'var(--foreground)', transition: 'all 0.3s', transform: menuOpen ? 'rotate(45deg) translate(5px, 5px)' : 'none' }}></span>
            <span style={{ display: 'block', width: '24px', height: '2px', background: 'var(--foreground)', transition: 'all 0.3s', opacity: menuOpen ? 0 : 1 }}></span>
            <span style={{ display: 'block', width: '24px', height: '2px', background: 'var(--foreground)', transition: 'all 0.3s', transform: menuOpen ? 'rotate(-45deg) translate(5px, -5px)' : 'none' }}></span>
          </button>
        </div>
      </div>

      {/* Mobile Dropdown */}
      {menuOpen && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0,
          background: 'white', borderBottom: '1px solid var(--surface-border)',
          boxShadow: '0 8px 20px rgba(0,0,0,0.1)',
          display: 'flex', flexDirection: 'column', padding: '1rem 5%', gap: '0.25rem'
        }}>
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              style={{
                padding: '0.75rem 1rem',
                fontWeight: 600,
                textDecoration: 'none',
                borderRadius: '8px',
                display: 'block',
                color: isActive(link.href, link.exact) ? 'var(--primary)' : 'var(--foreground)',
                background: isActive(link.href, link.exact) ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
