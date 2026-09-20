'use client';

import { FaFacebookMessenger } from 'react-icons/fa';

export default function FloatingChatWidgets() {
  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '15px',
      zIndex: 9999
    }}>
      {/* Zalo Button */}
      <a
        href="https://zalo.me/84362396092" // TODO: Thay số điện thoại Zalo của khách hàng
        target="_blank"
        rel="noopener noreferrer"
        style={{
          width: '55px',
          height: '55px',
          backgroundColor: '#0068FF', // Màu xanh đặc trưng của Zalo
          color: 'white',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textDecoration: 'none',
          boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
          fontWeight: 800,
          fontSize: '14px',
          transition: 'transform 0.2s ease',
        }}
        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
        title="Chat qua Zalo"
      >
        Zalo
      </a>

      {/* Messenger Button */}
      <a
        href="https://m.me/machikotranxenangnhat" // Đã đổi sang m.me để mở khung chat trực tiếp
        target="_blank"
        rel="noopener noreferrer"
        style={{
          width: '55px',
          height: '55px',
          background: 'linear-gradient(45deg, #00B2FF, #006AFF)', // Màu gradient của Messenger
          color: 'white',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textDecoration: 'none',
          boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
          transition: 'transform 0.2s ease',
        }}
        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
        title="Chat qua Facebook Messenger"
      >
        <FaFacebookMessenger size={28} />
      </a>
    </div>
  );
}
