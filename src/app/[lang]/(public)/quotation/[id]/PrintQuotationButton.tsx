'use client';

import React from 'react';
import { FaPrint, FaFilePdf, FaShareAlt } from 'react-icons/fa';

export default function PrintQuotationButton() {
  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Bảng Báo Giá Xe Nâng',
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Đã sao chép đường link báo giá vào bộ nhớ tạm! Bạn có thể dán gửi cho khách hàng qua Zalo hoặc tin nhắn.');
    }
  };

  return (
    <div style={{ display: 'flex', gap: '0.8rem' }}>
      <button
        onClick={handleShare}
        style={{
          background: 'white',
          color: '#0284c7',
          border: '1px solid #cbd5e1',
          padding: '0.6rem 1.2rem',
          borderRadius: '8px',
          fontWeight: 600,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
        }}
      >
        <FaShareAlt /> Chia sẻ Link
      </button>

      <button
        onClick={handlePrint}
        style={{
          background: '#0284c7',
          color: 'white',
          border: 'none',
          padding: '0.6rem 1.4rem',
          borderRadius: '8px',
          fontWeight: 700,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)'
        }}
      >
        <FaPrint /> In / Xuất PDF Báo Giá
      </button>
    </div>
  );
}
