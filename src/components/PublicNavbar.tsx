'use client';

import Link from 'next/link';
import { useState } from 'react';
import LangSwitcher from '@/components/LangSwitcher';

export default function PublicNavbar({ lang, dict }: { lang: 'en' | 'vi', dict: any }) {
  const [menuOpen, setMenuOpen] = useState(false);

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
          <Link href={`/${lang}`} style={{ fontWeight: 600, color: 'var(--foreground)', textDecoration: 'none' }}>{dict.nav.home}</Link>
          <Link href={`/${lang}/catalog`} style={{ fontWeight: 600, color: 'var(--foreground)', textDecoration: 'none' }}>{dict.nav.catalog}</Link>
          <Link href={`/${lang}/about`} style={{ fontWeight: 600, color: 'var(--foreground)', textDecoration: 'none' }}>{dict.nav.about}</Link>
          <Link href={`/${lang}/policies`} style={{ fontWeight: 600, color: 'var(--foreground)', textDecoration: 'none' }}>{dict.nav.policies}</Link>
          <Link href={`/${lang}/contact`} style={{ fontWeight: 600, color: 'var(--foreground)', textDecoration: 'none' }}>{dict.nav.contact}</Link>
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
          {[
            { href: `/${lang}`, label: dict.nav.home },
            { href: `/${lang}/catalog`, label: dict.nav.catalog },
            { href: `/${lang}/about`, label: dict.nav.about },
            { href: `/${lang}/policies`, label: dict.nav.policies },
            { href: `/${lang}/contact`, label: dict.nav.contact },
          ].map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--foreground)', textDecoration: 'none', borderRadius: '8px', display: 'block' }}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
