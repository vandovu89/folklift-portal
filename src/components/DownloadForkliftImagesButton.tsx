'use client';

import React, { useState } from 'react';
import JSZip from 'jszip';
import { FaDownload, FaSpinner, FaCheck } from 'react-icons/fa';

interface DownloadForkliftImagesButtonProps {
  forkliftId?: string;
  images?: string[];
  forkliftName: string;
  internalCode?: string;
  lang?: string;
  variant?: 'detail' | 'card' | 'icon';
  className?: string;
  style?: React.CSSProperties;
}

export default function DownloadForkliftImagesButton({
  forkliftId,
  images: initialImages,
  forkliftName,
  internalCode,
  lang = 'vi',
  variant = 'detail',
  className = '',
  style = {}
}: DownloadForkliftImagesButtonProps) {
  const [downloading, setDownloading] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [isDone, setIsDone] = useState(false);

  const cleanFilename = (name: string) => {
    return name
      .replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1EA0-\u1EF9-]/g, '_')
      .replace(/_+/g, '_')
      .trim();
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (downloading) return;

    try {
      setDownloading(true);
      setIsDone(false);
      setProgressText(lang === 'vi' ? 'Đang chuẩn bị...' : 'Preparing...');

      // 1. Lấy danh sách ảnh nếu chưa có sẵn
      let imageUrls = initialImages || [];
      if (imageUrls.length === 0 && forkliftId) {
        setProgressText(lang === 'vi' ? 'Đang lấy ảnh...' : 'Fetching images...');
        const res = await fetch(`/api/forklifts/${forkliftId}/images`);
        const data = await res.json();
        if (data.images && data.images.length > 0) {
          imageUrls = data.images;
        }
      }

      if (imageUrls.length === 0) {
        alert(lang === 'vi' ? 'Chiếc xe này chưa có hình ảnh công khai để tải về.' : 'No public images available for this forklift.');
        setDownloading(false);
        setProgressText('');
        return;
      }

      const zip = new JSZip();
      const baseName = cleanFilename(`${internalCode ? `${internalCode}_` : ''}${forkliftName}`);

      // 2. Tải từng ảnh và thêm vào ZIP
      let count = 0;
      for (let i = 0; i < imageUrls.length; i++) {
        const url = imageUrls[i];
        setProgressText(
          lang === 'vi' 
            ? `Tải ảnh ${i + 1}/${imageUrls.length}...` 
            : `Downloading ${i + 1}/${imageUrls.length}...`
        );

        try {
          // Thêm cross-origin fetch
          const response = await fetch(url, { mode: 'cors' });
          if (!response.ok) {
            console.warn(`Failed to fetch image: ${url}`);
            continue;
          }
          const blob = await response.blob();
          
          // Trích xuất định dạng ảnh (jpg, png, webp)
          let ext = 'jpg';
          if (url.includes('.png') || blob.type === 'image/png') ext = 'png';
          else if (url.includes('.webp') || blob.type === 'image/webp') ext = 'webp';

          const filename = `${baseName}_${i + 1}.${ext}`;
          zip.file(filename, blob);
          count++;
        } catch (err) {
          console.error(`Error downloading image ${url}:`, err);
        }
      }

      if (count === 0) {
        alert(lang === 'vi' ? 'Không thể tải ảnh, vui lòng thử lại sau.' : 'Failed to download images.');
        setDownloading(false);
        setProgressText('');
        return;
      }

      // 3. Nén file ZIP
      setProgressText(lang === 'vi' ? 'Đang nén ZIP...' : 'Compressing ZIP...');
      const zipBlob = await zip.generateAsync({ type: 'blob' });

      // 4. Kích hoạt tải về trên trình duyệt
      const downloadUrl = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `${baseName}_Images.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      setIsDone(true);
      setProgressText(lang === 'vi' ? 'Đã tải xong!' : 'Downloaded!');
      setTimeout(() => {
        setIsDone(false);
        setProgressText('');
      }, 3000);
    } catch (error) {
      console.error('Download error:', error);
      alert(lang === 'vi' ? 'Có lỗi xảy ra khi tải ảnh.' : 'Error occurred while downloading.');
    } finally {
      setDownloading(false);
    }
  };

  // Variant: Trên card sản phẩm trang Catalog
  if (variant === 'card') {
    return (
      <button
        type="button"
        onClick={handleDownload}
        disabled={downloading}
        title={lang === 'vi' ? 'Tải trọn bộ ảnh xe này về máy (ZIP)' : 'Download all images (ZIP)'}
        style={{
          flex: '0 0 auto',
          padding: '0.75rem 1rem',
          borderRadius: '8px',
          border: '1px solid #cbd5e1',
          background: isDone ? '#dcfce7' : (downloading ? '#f1f5f9' : 'white'),
          color: isDone ? '#15803d' : (downloading ? '#64748b' : '#334155'),
          fontWeight: 700,
          fontSize: '0.85rem',
          cursor: downloading ? 'wait' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.4rem',
          transition: 'all 0.2s',
          ...style
        }}
        className={className}
      >
        {downloading ? (
          <>
            <FaSpinner className="spin" style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: '0.75rem' }}>{progressText || 'Đang tải...'}</span>
          </>
        ) : isDone ? (
          <>
            <FaCheck color="#16a34a" />
            <span>{lang === 'vi' ? 'Đã tải' : 'Done'}</span>
          </>
        ) : (
          <>
            <FaDownload />
            <span>{lang === 'vi' ? 'Tải ảnh' : 'Download Photos'}</span>
          </>
        )}
      </button>
    );
  }

  // Variant: Icon nhỏ gọn
  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={handleDownload}
        disabled={downloading}
        title={lang === 'vi' ? 'Tải trọn bộ ảnh xe (ZIP)' : 'Download all photos (ZIP)'}
        style={{
          padding: '0.5rem',
          borderRadius: '6px',
          border: '1px solid #e2e8f0',
          background: 'white',
          color: '#334155',
          cursor: downloading ? 'wait' : 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...style
        }}
        className={className}
      >
        {downloading ? <FaSpinner style={{ animation: 'spin 1s linear infinite' }} /> : <FaDownload />}
      </button>
    );
  }

  // Variant mặc định: Nút lớn trên trang chi tiết xe (Detail page)
  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={downloading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.6rem',
        padding: '0.8rem 1.4rem',
        borderRadius: '8px',
        border: '1px solid #cbd5e1',
        background: isDone ? '#dcfce7' : (downloading ? '#f8fafc' : 'white'),
        color: isDone ? '#166534' : '#1e293b',
        fontWeight: 700,
        fontSize: '0.95rem',
        cursor: downloading ? 'wait' : 'pointer',
        boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        ...style
      }}
      className={`hover-lift-sm ${className}`}
    >
      {downloading ? (
        <>
          <FaSpinner style={{ animation: 'spin 1s linear infinite' }} />
          <span>{progressText || (lang === 'vi' ? 'Đang nén ảnh...' : 'Processing...')}</span>
        </>
      ) : isDone ? (
        <>
          <FaCheck color="#16a34a" size={16} />
          <span>{lang === 'vi' ? 'Tải ảnh hoàn tất!' : 'Download complete!'}</span>
        </>
      ) : (
        <>
          <FaDownload color="var(--primary)" size={16} />
          <span>{lang === 'vi' ? '📥 Tải Trọn Bộ Ảnh Xe (ZIP)' : '📥 Download All Photos (ZIP)'}</span>
        </>
      )}
    </button>
  );
}
