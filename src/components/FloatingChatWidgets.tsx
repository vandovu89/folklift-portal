'use client';

import React, { useState } from 'react';
import { FaPhoneAlt, FaFacebookMessenger, FaYoutube } from 'react-icons/fa';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function FloatingChatWidgets() {
  const pathname = usePathname();
  const lang = pathname?.startsWith('/en') ? 'en' : 'vi';
  const [showTooltip, setShowTooltip] = useState<string | null>(null);

  const widgets = [
    {
      id: 'hotline',
      href: 'tel:0362396092',
      title: lang === 'vi' ? 'Gọi Hotline: 0362-396-092' : 'Call Hotline: 0362-396-092',
      label: lang === 'vi' ? 'Gọi ngay' : 'Call now',
      bg: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      icon: <FaPhoneAlt size={20} className="phone-ring" />,
      isExternal: true,
      hasPulse: true,
    },
    {
      id: 'zalo',
      href: 'https://zalo.me/84362396092',
      title: lang === 'vi' ? 'Chat Zalo Tư Vấn' : 'Zalo Chat Support',
      label: 'Zalo',
      bg: '#0068FF',
      icon: <span style={{ fontWeight: 900, fontSize: '14px', letterSpacing: '-0.5px' }}>Zalo</span>,
      isExternal: true,
    },
    {
      id: 'messenger',
      href: 'https://m.me/machikotranxenangnhat',
      title: lang === 'vi' ? 'Nhắn tin qua Messenger' : 'Chat via Messenger',
      label: 'Messenger',
      bg: 'linear-gradient(135deg, #00B2FF 0%, #006AFF 100%)',
      icon: <FaFacebookMessenger size={22} />,
      isExternal: true,
    },
    {
      id: 'video',
      href: `/${lang}/media`,
      title: lang === 'vi' ? 'Xem Video Bàn Giao & Test Xe' : 'Watch Delivery & Test Videos',
      label: lang === 'vi' ? 'Video' : 'Videos',
      bg: 'linear-gradient(135deg, #ff0000 0%, #cc0000 100%)',
      icon: <FaYoutube size={22} />,
      isExternal: false,
    }
  ];

  return (
    <>
      <style jsx global>{`
        @keyframes pulse-ring {
          0% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
          }
          70% {
            transform: scale(1);
            box-shadow: 0 0 0 12px rgba(239, 68, 68, 0);
          }
          100% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
          }
        }
        @keyframes phone-shake {
          0%, 100% { transform: rotate(0deg); }
          10%, 30%, 50% { transform: rotate(-15deg); }
          20%, 40%, 60% { transform: rotate(15deg); }
          70% { transform: rotate(0deg); }
        }
        .phone-pulse {
          animation: pulse-ring 2s infinite ease-in-out;
        }
        .phone-ring {
          animation: phone-shake 2.5s infinite ease-in-out;
        }
      `}</style>

      <div style={{
        position: 'fixed',
        bottom: '24px',
        right: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        zIndex: 9999,
        alignItems: 'flex-end'
      }}>
        {widgets.map(w => {
          const content = (
            <div
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end'
              }}
              onMouseEnter={() => setShowTooltip(w.id)}
              onMouseLeave={() => setShowTooltip(null)}
            >
              {/* Tooltip on Hover */}
              {showTooltip === w.id && (
                <div style={{
                  position: 'absolute',
                  right: '65px',
                  background: '#0f172a',
                  color: 'white',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  pointerEvents: 'none',
                  animation: 'fadeIn 0.15s ease'
                }}>
                  {w.title}
                </div>
              )}

              <div
                className={w.hasPulse ? 'phone-pulse' : ''}
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  background: w.bg,
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
                  cursor: 'pointer',
                  transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  transform: showTooltip === w.id ? 'scale(1.12)' : 'scale(1)'
                }}
              >
                {w.icon}
              </div>
            </div>
          );

          if (w.isExternal) {
            return (
              <a
                key={w.id}
                href={w.href}
                target={w.href.startsWith('tel:') ? undefined : '_blank'}
                rel="noopener noreferrer"
                style={{ textDecoration: 'none' }}
                aria-label={w.title}
              >
                {content}
              </a>
            );
          }

          return (
            <Link key={w.id} href={w.href} style={{ textDecoration: 'none' }} aria-label={w.title}>
              {content}
            </Link>
          );
        })}
      </div>
    </>
  );
}
