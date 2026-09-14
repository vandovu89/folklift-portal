'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import LangSwitcher from '@/components/LangSwitcher';

export default function PublicNavbar({ lang, dict }: { lang: 'en' | 'vi', dict: any }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  const navLinks = [
    { href: `/${lang}`, label: dict.nav.home, exact: true },
    { href: `/${lang}/catalog`, label: dict.nav.catalog },
    { href: `/${lang}/about`, label: dict.nav.about },
    { href: `/${lang}/policies`, label: dict.nav.policies },
    { href: `/${lang}/contact`, label: dict.nav.contact, isCta: true },
  ];

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <motion.nav 
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
      style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(15px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '1rem 5%',
        boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
      }}
    >
      {/* Animated glowing bottom border */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent, var(--primary), var(--secondary), transparent)', opacity: 0.8 }} className="animated-gradient-text" />

      <div style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
        maxWidth: '1400px', margin: '0 auto', position: 'relative'
      }}>
        <Link href={`/${lang}`} style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <img src="/logo.png" alt="Việt Nhật Logo" style={{ height: '40px', width: 'auto', objectFit: 'contain' }} />
        </Link>

        {/* Desktop Nav */}
        <div className="nav-desktop" style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={link.isCta ? "btn-primary" : ""}
              style={link.isCta ? { padding: '0.6rem 1.5rem', borderRadius: '50px' } : {
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'all 0.3s ease',
                color: isActive(link.href, link.exact) ? 'white' : 'rgba(255, 255, 255, 0.7)',
                textShadow: isActive(link.href, link.exact) ? '0 0 10px rgba(255,255,255,0.5)' : 'none',
                position: 'relative',
              }}
            >
              {link.label}
              {!link.isCta && isActive(link.href, link.exact) && (
                <motion.div 
                  layoutId="nav-indicator"
                  style={{ position: 'absolute', bottom: '-4px', left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, var(--primary), var(--secondary))', borderRadius: '10px', boxShadow: '0 0 10px var(--primary)' }} 
                />
              )}
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
            <span style={{ display: 'block', width: '24px', height: '2px', background: 'white', transition: 'all 0.3s', transform: menuOpen ? 'rotate(45deg) translate(5px, 5px)' : 'none' }}></span>
            <span style={{ display: 'block', width: '24px', height: '2px', background: 'white', transition: 'all 0.3s', opacity: menuOpen ? 0 : 1 }}></span>
            <span style={{ display: 'block', width: '24px', height: '2px', background: 'white', transition: 'all 0.3s', transform: menuOpen ? 'rotate(-45deg) translate(5px, -5px)' : 'none' }}></span>
          </button>
        </div>
      </div>

      {/* Mobile Dropdown */}
      {menuOpen && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            position: 'absolute', top: 'calc(100% + 15px)', left: '5%', right: '5%',
            background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(15px)', 
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '20px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            display: 'flex', flexDirection: 'column', padding: '1.5rem', gap: '0.5rem'
          }}
        >
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
                color: isActive(link.href, link.exact) ? 'white' : 'rgba(255,255,255,0.7)',
                background: isActive(link.href, link.exact) ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
              }}
            >
              {link.label}
            </Link>
          ))}
        </motion.div>
      )}
    </motion.nav>
  );
}
