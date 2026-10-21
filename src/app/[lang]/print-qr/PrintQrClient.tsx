'use client';

import React, { useState, useRef, useEffect, useSyncExternalStore } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { QRCodeSVG } from 'qrcode.react';
import { 
  FaPrint, 
  FaDownload, 
  FaArrowLeft, 
  FaCog, 
  FaCheckSquare, 
  FaSquare,
  FaQrcode,
  FaThLarge,
  FaFileAlt,
  FaTag,
  FaReceipt,
  FaShareAlt
} from 'react-icons/fa';
import JSZip from 'jszip';
import { formatCapacity } from '@/lib/utils';
import { THERMAL_SIZES, renderThermalLabel, dataUrlToFile, type ThermalSize } from './thermal-label';

export interface ForkliftPrintData {
  id: string;
  internalCode: string | null;
  maker: string;
  model: string;
  serialNo: string | null;
  year: number | null;
  hour: number | null;
  powerType: string | null;
  loadCapacity: string | null;
  liftHeight: string | null;
  forkLength: string | null;
  attachment?: string | null;
  condition: string | null;
  price: number | null;
  status: string;
  imageUrl?: string | null;
}

interface PrintQrClientProps {
  initialForklifts: ForkliftPrintData[];
  baseUrl: string;
  lang: string;
  isAllSample?: boolean;
}

type PrintMode = 'decal' | 'showcase' | 'grid4' | ThermalSize;

const isThermalMode = (mode: PrintMode): mode is ThermalSize => mode in THERMAL_SIZES;

// Trình duyệt nhúng trong Zalo / Facebook / Messenger / Instagram không hỗ trợ lệnh in (window.print)
const IN_APP_BROWSER_RE = /Zalo|FBAN|FBAV|FB_IAB|Messenger|Instagram|Line\//i;
const subscribeNoop = () => () => {};
const getDeviceInfo = () => {
  const ua = navigator.userAgent;
  const probe = typeof File !== 'undefined' ? [new File([''], 'x.png', { type: 'image/png' })] : [];
  const canShare = typeof navigator.canShare === 'function' && navigator.canShare({ files: probe });
  return `${IN_APP_BROWSER_RE.test(ua) ? 1 : 0}${/Android|iPhone|iPad|iPod|Mobile/i.test(ua) ? 1 : 0}${canShare ? 1 : 0}`;
};
const getServerDeviceInfo = () => '000';

export default function PrintQrClient({
  initialForklifts,
  baseUrl,
  lang,
  isAllSample = false
}: PrintQrClientProps) {
  const [printMode, setPrintMode] = useState<PrintMode>('a6');
  const [selectedIds, setSelectedIds] = useState<string[]>(
    initialForklifts.map(f => f.id)
  );

  // Display toggles
  const [showPrice, setShowPrice] = useState(true);
  const [showImage, setShowImage] = useState(true);
  const [showSpecs, setShowSpecs] = useState(true);
  const [showCompany, setShowCompany] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  // Hidden container for SVG to Canvas export
  const hiddenQrRef = useRef<HTMLDivElement>(null);

  const activeForklifts = initialForklifts.filter(f => selectedIds.includes(f.id));

  // Thiết bị: [trình duyệt nhúng][điện thoại][chia sẻ được file]
  const deviceInfo = useSyncExternalStore(subscribeNoop, getDeviceInfo, getServerDeviceInfo);
  const isInAppBrowser = deviceInfo[0] === '1';
  const isMobile = deviceInfo[1] === '1';
  const canShareFiles = deviceInfo[2] === '1';

  // Ảnh tem nhiệt A6/A7 (vẽ từ canvas) theo id xe, dùng cho xem trước / in / tải / chia sẻ
  const [thermalImages, setThermalImages] = useState<Record<string, string>>({});
  const [thermalKey, setThermalKey] = useState('');
  const activeIdsKey = activeForklifts.map(f => f.id).join(',');
  const currentThermalKey = isThermalMode(printMode) ? `${printMode}|${showCompany}|${showSpecs}|${showPrice}|${activeIdsKey}` : '';
  const thermalReady = isThermalMode(printMode) && thermalKey === currentThermalKey;

  useEffect(() => {
    if (!isThermalMode(printMode)) return;
    let cancelled = false;
    const run = async () => {
      // Effect chạy sau khi các mã QR ẩn đã có trong DOM (không dùng requestAnimationFrame vì bị dừng khi tab ẩn)
      const ids = activeIdsKey.split(',');
      const images: Record<string, string> = {};
      for (const fl of initialForklifts.filter(f => ids.includes(f.id))) {
        const svg = document.getElementById(`thermal-qr-${fl.id}`) as SVGSVGElement | null;
        if (!svg) continue;
        try {
          images[fl.id] = await renderThermalLabel(fl, printMode, svg, { showCompany, showSpecs, showPrice, baseUrl });
        } catch (err) {
          console.error('Render thermal label error:', err);
        }
        if (cancelled) return;
      }
      if (!cancelled) {
        setThermalImages(images);
        setThermalKey(`${printMode}|${showCompany}|${showSpecs}|${showPrice}|${activeIdsKey}`);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [printMode, showCompany, showSpecs, showPrice, activeIdsKey, initialForklifts, baseUrl]);

  const thermalFileName = (fl: ForkliftPrintData) =>
    `Tem_${printMode.toUpperCase()}_${(fl.internalCode || fl.model).replace(/[^\w-]+/g, '_')}_${fl.id.slice(0, 6)}.png`;

  // Điện thoại: gửi ảnh tem đúng khổ sang app máy in nhiệt (qua menu Chia sẻ của hệ điều hành)
  const handleShareThermal = async () => {
    if (!thermalReady || !isThermalMode(printMode)) return;
    const files = activeForklifts.filter(fl => thermalImages[fl.id]).map(fl => dataUrlToFile(thermalImages[fl.id], thermalFileName(fl)));
    if (files.length === 0) return;
    try {
      await navigator.share({ files, title: `Tem QR ${THERMAL_SIZES[printMode].label}` });
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') alert('Không chia sẻ được ảnh tem. Hãy dùng nút "Tải File PNG" rồi mở bằng app máy in.');
    }
  };

  const toggleSelectForklift = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => setSelectedIds(initialForklifts.map(f => f.id));
  const deselectAll = () => setSelectedIds([]);

  const handlePrint = () => {
    if (isInAppBrowser) {
      alert(isThermalMode(printMode)
        ? 'Trình duyệt trong Zalo/Facebook không hỗ trợ in. Hãy bấm "Gửi sang app máy in" hoặc "Tải File PNG", hoặc mở trang này bằng Chrome/Safari.'
        : 'Trình duyệt trong Zalo/Facebook không hỗ trợ in. Hãy bấm menu ⋮ / ⋯ → "Mở bằng trình duyệt" (Chrome/Safari) rồi in lại.');
      return;
    }
    window.print();
  };

  /**
   * Export QR codes as high-resolution PNGs
   */
  const handleDownloadQrPng = async () => {
    if (activeForklifts.length === 0) {
      alert('Vui lòng chọn ít nhất 1 xe để tải mã QR!');
      return;
    }

    setIsDownloading(true);

    try {
      if (isThermalMode(printMode)) {
        if (!thermalReady) {
          alert('Ảnh tem đang được tạo, vui lòng thử lại sau giây lát.');
          return;
        }
        const ready = activeForklifts.filter(fl => thermalImages[fl.id]);
        if (ready.length === 1) {
          const a = document.createElement('a');
          a.href = thermalImages[ready[0].id];
          a.download = thermalFileName(ready[0]);
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        } else {
          const zip = new JSZip();
          for (const fl of ready) zip.file(thermalFileName(fl), thermalImages[fl.id].split(',')[1], { base64: true });
          const content = await zip.generateAsync({ type: 'blob' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(content);
          a.download = `Tem_${printMode.toUpperCase()}_${ready.length}_xe.zip`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(a.href);
        }
      } else if (activeForklifts.length === 1) {
        // Single download
        const fl = activeForklifts[0];
        const dataUrl = await generateQrPng(fl);
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `QR_${fl.internalCode || fl.model}_${fl.id.slice(0, 6)}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        // Batch download zipped
        const zip = new JSZip();
        for (const fl of activeForklifts) {
          const dataUrl = await generateQrPng(fl);
          const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
          const filename = `QR_${fl.internalCode || fl.model}_${fl.id.slice(0, 6)}.png`;
          zip.file(filename, base64Data, { base64: true });
        }

        const content = await zip.generateAsync({ type: 'blob' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(content);
        a.download = `Ma_QR_Xe_Nang_${activeForklifts.length}_xe.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
      }
    } catch (err) {
      console.error(err);
      alert('Có lỗi xảy ra khi tạo ảnh QR!');
    } finally {
      setIsDownloading(false);
    }
  };

  /**
   * Helper: Render high-res QR onto off-screen canvas with text
   */
  const generateQrPng = (fl: ForkliftPrintData): Promise<string> => {
    return new Promise((resolve) => {
      const qrUrl = `${baseUrl}/${lang}/machine/${fl.id}`;
      const canvas = document.createElement('canvas');
      const size = 1200; // Ultra high-res 1200x1400
      canvas.width = size;
      canvas.height = size + 360;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve('');
        return;
      }

      // Background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Create an SVG image
      const svgElement = document.getElementById(`qr-svg-${fl.id}`);
      let svgXml = '';
      if (svgElement) {
        svgXml = new XMLSerializer().serializeToString(svgElement);
      } else {
        // Fallback simple SVG representation
        svgXml = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000"></svg>`;
      }

      const img = new window.Image();
      const svgBlob = new Blob([svgXml], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        // Draw top brand bar
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, canvas.width, 100);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 36px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('XE NÂNG MCK JAPAN • HOTLINE: 0362-396-092', canvas.width / 2, 65);

        // Draw QR Code
        ctx.drawImage(img, 100, 140, 1000, 1000);

        // Bottom text: Internal Code & Model
        ctx.fillStyle = '#b91c1c';
        ctx.font = 'bold 54px "Segoe UI", Arial, sans-serif';
        const codeText = fl.internalCode ? `[ ${fl.internalCode} ] ` : '';
        ctx.fillText(`${codeText}${fl.maker} ${fl.model}`, canvas.width / 2, 1210);

        // Sub text: specs
        ctx.fillStyle = '#475569';
        ctx.font = 'bold 36px "Segoe UI", Arial, sans-serif';
        const spec1 = fl.loadCapacity ? formatCapacity(fl.loadCapacity, 'vi') : '';
        const spec2 = fl.liftHeight ? `Cao ${fl.liftHeight}` : '';
        const spec3 = fl.powerType ? fl.powerType : '';
        const specLine = [spec1, spec2, spec3].filter(Boolean).join(' • ');
        ctx.fillText(specLine, canvas.width / 2, 1270);

        // Instructions
        ctx.fillStyle = '#64748b';
        ctx.font = 'italic 30px "Segoe UI", Arial, sans-serif';
        ctx.fillText('Quét mã để xem hình ảnh, video test tải & thông số chi tiết', canvas.width / 2, 1330);

        // Clean up
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/png'));
      };

      img.src = url;
    });
  };

  return (
    <div className="print-qr-container" style={{ background: '#f1f5f9', minHeight: '100vh', color: '#1e293b' }}>
      
      {/* 1. Control Toolbar (Hidden on print) */}
      <header className="no-print" style={{
        background: '#0f172a',
        color: 'white',
        padding: '0.8rem 1.5rem',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem'
        }}>
          {/* Left: Back & Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Link 
              href={`/${lang}/catalog`} 
              className="btn-back"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                color: '#cbd5e1',
                padding: '0.4rem 0.8rem',
                borderRadius: '6px',
                background: 'rgba(255,255,255,0.08)',
                fontSize: '0.88rem',
                fontWeight: 600,
                textDecoration: 'none'
              }}
            >
              <FaArrowLeft /> Quay lại
            </Link>
            <div>
              <h1 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FaQrcode style={{ color: '#38bdf8' }} /> In Tem Mã QR Xe Nâng
              </h1>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                Đã chọn <strong>{activeForklifts.length}</strong> / {initialForklifts.length} xe nâng
                {isAllSample && ' (Đang xem danh sách mẫu toàn kho)'}
              </div>
            </div>
          </div>

          {/* Center: Mode Switcher */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            background: 'rgba(255,255,255,0.1)',
            padding: '3px',
            borderRadius: '8px',
            gap: '3px'
          }}>
            <button
              onClick={() => setPrintMode('decal')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.85rem',
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: printMode === 'decal' ? '#0f172a' : '#cbd5e1',
                background: printMode === 'decal' ? '#38bdf8' : 'transparent',
                transition: 'all 0.15s ease'
              }}
              title="Khổ tem dán trực tiếp lên thân xe / cột nâng (100 x 75 mm)"
            >
              <FaTag /> Tem Decal (100x75)
            </button>
            <button
              onClick={() => setPrintMode('grid4')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.85rem',
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: printMode === 'grid4' ? '#0f172a' : '#cbd5e1',
                background: printMode === 'grid4' ? '#38bdf8' : 'transparent',
                transition: 'all 0.15s ease'
              }}
              title="In 4 tem trên 1 trang A4 để cắt dán hàng loạt"
            >
              <FaThLarge /> Lưới 4 Tem / A4
            </button>
            {(Object.keys(THERMAL_SIZES) as ThermalSize[]).map(size => (
              <button
                key={size}
                onClick={() => setPrintMode(size)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.45rem 0.85rem',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: printMode === size ? '#0f172a' : '#cbd5e1',
                  background: printMode === size ? '#38bdf8' : 'transparent',
                  transition: 'all 0.15s ease'
                }}
                title={`Tem giấy in nhiệt khổ ${THERMAL_SIZES[size].label} mm, đen trắng`}
              >
                <FaReceipt /> Tem Nhiệt {THERMAL_SIZES[size].label}
              </button>
            ))}
            <button
              onClick={() => setPrintMode('showcase')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.85rem',
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: printMode === 'showcase' ? '#0f172a' : '#cbd5e1',
                background: printMode === 'showcase' ? '#38bdf8' : 'transparent',
                transition: 'all 0.15s ease'
              }}
              title="Bảng kẹp kính / vô lăng khổ lớn A4 hoặc A5 cho showroom"
            >
              <FaFileAlt /> Bảng Kẹp Xe (A4/A5)
            </button>
          </div>

          {/* Right: Actions */}
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {isThermalMode(printMode) && canShareFiles && (
              <button
                onClick={handleShareThermal}
                disabled={!thermalReady || activeForklifts.length === 0}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: '#16a34a',
                  color: 'white',
                  border: 'none',
                  padding: '0.5rem 0.9rem',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
                title="Gửi ảnh tem đúng khổ sang app máy in nhiệt (Bluetooth) trên điện thoại"
              >
                <FaShareAlt /> {thermalReady ? 'Gửi sang app máy in' : 'Đang tạo tem...'}
              </button>
            )}
            <button
              onClick={handleDownloadQrPng}
              disabled={isDownloading || activeForklifts.length === 0}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: '#1e293b',
                color: '#38bdf8',
                border: '1px solid #334155',
                padding: '0.5rem 0.9rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
              title="Tải ảnh QR độ phân giải cao PNG (1200x1560) để in tem kim loại / mica"
            >
              <FaDownload /> {isDownloading ? 'Đang xuất...' : 'Tải File PNG'}
            </button>

            <button
              onClick={handlePrint}
              disabled={activeForklifts.length === 0}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: '#0284c7',
                color: 'white',
                border: 'none',
                padding: '0.5rem 1.3rem',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.4)'
              }}
            >
              <FaPrint /> In Tem Ngay
            </button>
          </div>
        </div>

        {/* Sub-bar: Display Customization & Vehicle Selector */}
        <div style={{
          maxWidth: '1400px',
          margin: '0.8rem auto 0 auto',
          paddingTop: '0.6rem',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          fontSize: '0.82rem',
          color: '#cbd5e1'
        }}>
          {/* Toggles */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.2rem', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <FaCog /> Tùy chọn in:
            </span>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={showPrice} 
                onChange={e => setShowPrice(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              Hiển thị Giá bán
            </label>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={showSpecs} 
                onChange={e => setShowSpecs(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              Thông số kỹ thuật
            </label>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={showCompany} 
                onChange={e => setShowCompany(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              Tên công ty & Hotline
            </label>
            {printMode === 'showcase' && (
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={showImage} 
                  onChange={e => setShowImage(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                Ảnh chụp thực tế
              </label>
            )}
          </div>

          {/* Selection helper */}
          {initialForklifts.length > 1 && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span>Chọn xe:</span>
              <button
                onClick={selectAll}
                style={{ color: '#38bdf8', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.8rem' }}
              >
                Chọn tất cả ({initialForklifts.length})
              </button>
              <span>•</span>
              <button
                onClick={deselectAll}
                style={{ color: '#94a3b8', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.8rem' }}
              >
                Bỏ chọn
              </button>
            </div>
          )}
        </div>
      </header>

      {/* 2. Vehicle Checklist Drawer if multiple loaded (No-print) */}
      {initialForklifts.length > 1 && (
        <div className="no-print" style={{
          maxWidth: '1400px',
          margin: '1rem auto 0 auto',
          padding: '0.8rem 1.2rem',
          background: 'white',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.5rem' }}>
            Danh sách xe nâng in tem ({activeForklifts.length}/{initialForklifts.length} xe đang chọn):
          </div>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem',
            maxHeight: '120px',
            overflowY: 'auto'
          }}>
            {initialForklifts.map(fl => {
              const isSelected = selectedIds.includes(fl.id);
              return (
                <button
                  key={fl.id}
                  onClick={() => toggleSelectForklift(fl.id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.3rem 0.6rem',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    border: isSelected ? '1px solid #0284c7' : '1px solid #cbd5e1',
                    background: isSelected ? '#eff6ff' : '#f8fafc',
                    color: isSelected ? '#0369a1' : '#64748b',
                    fontWeight: isSelected ? 700 : 500,
                    cursor: 'pointer'
                  }}
                >
                  {isSelected ? <FaCheckSquare style={{ color: '#0284c7' }} /> : <FaSquare style={{ color: '#cbd5e1' }} />}
                  <span>{fl.internalCode || fl.model}</span>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>({fl.maker})</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Hướng dẫn in trên điện thoại (No-print) */}
      {(isMobile || isInAppBrowser) && (
        <div className="no-print" style={{
          maxWidth: '1400px',
          margin: '1rem auto 0 auto',
          padding: '0.8rem 1rem',
          background: isInAppBrowser ? '#fef3c7' : '#eff6ff',
          border: `1px solid ${isInAppBrowser ? '#fcd34d' : '#bfdbfe'}`,
          borderRadius: '8px',
          fontSize: '0.85rem',
          color: '#1e293b',
          lineHeight: 1.5
        }}>
          {isInAppBrowser && (
            <div style={{ fontWeight: 700, color: '#92400e', marginBottom: '0.3rem' }}>
              ⚠️ Bạn đang mở trang trong Zalo / Facebook: trình duyệt này không hỗ trợ nút In.
            </div>
          )}
          <strong>In bằng máy in nhiệt Bluetooth trên điện thoại:</strong> chọn khổ <strong>Tem Nhiệt A6</strong> hoặc <strong>A7</strong>,
          rồi bấm {canShareFiles ? <strong>&quot;Gửi sang app máy in&quot;</strong> : <strong>&quot;Tải File PNG&quot;</strong>} và chọn app của máy in
          (trong app đặt khổ giấy đúng {THERMAL_SIZES.a6.label} hoặc {THERMAL_SIZES.a7.label} mm, tỉ lệ 100%).
          {isInAppBrowser && <> Hoặc bấm menu <strong>⋮ / ⋯ → Mở bằng trình duyệt</strong> để dùng nút In.</>}
        </div>
      )}

      {/* Mã QR ẩn để vẽ tem nhiệt lên canvas */}
      {isThermalMode(printMode) && (
        <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', top: 0 }}>
          {activeForklifts.map(fl => (
            <QRCodeSVG
              key={fl.id}
              id={`thermal-qr-${fl.id}`}
              value={`${baseUrl}/${lang}/machine/${fl.id}`}
              size={600}
              level="H"
              marginSize={0}
              bgColor="#ffffff"
              fgColor="#000000"
            />
          ))}
        </div>
      )}

      {/* 3. Main Printable Area */}
      <main style={{ padding: '2rem 1rem', maxWidth: '1400px', margin: '0 auto' }}>
        
        {activeForklifts.length === 0 ? (
          <div className="no-print" style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            background: 'white',
            borderRadius: '12px',
            border: '2px dashed #cbd5e1',
            margin: '2rem auto',
            maxWidth: '600px'
          }}>
            <FaQrcode size={48} style={{ color: '#94a3b8', marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.2rem', color: '#1e293b', marginBottom: '0.5rem' }}>Chưa có xe nâng nào được chọn</h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Vui lòng tích chọn ít nhất 1 xe nâng ở danh sách phía trên để xem trước và in tem mã QR.
            </p>
            <button
              onClick={selectAll}
              style={{
                background: '#0284c7',
                color: 'white',
                padding: '0.6rem 1.2rem',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              Chọn tất cả các xe
            </button>
          </div>
        ) : isThermalMode(printMode) ? (
          <div className="print-wrapper print-mode-thermal">
            {!thermalReady && (
              <div className="no-print" style={{ color: '#64748b', padding: '2rem' }}>Đang tạo tem {THERMAL_SIZES[printMode].label}...</div>
            )}
            {thermalReady && activeForklifts.map(fl => thermalImages[fl.id] && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                key={fl.id}
                src={thermalImages[fl.id]}
                alt={`Tem ${fl.internalCode || fl.model}`}
                className="thermal-label-img"
                style={{ width: `${THERMAL_SIZES[printMode].widthMm}mm`, height: `${THERMAL_SIZES[printMode].heightMm}mm` }}
              />
            ))}
          </div>
        ) : (
          <div className={`print-wrapper print-mode-${printMode}`}>
            {activeForklifts.map((forklift) => {
              const qrUrl = `${baseUrl}/${lang}/machine/${forklift.id}`;
              const internalCode = forklift.internalCode || forklift.id.slice(0, 8).toUpperCase();

              return (
                <div 
                  key={forklift.id} 
                  className={`qr-label-card qr-label-${printMode}`}
                >
                  {/* Decal Label Layout (100 x 75mm) */}
                  {printMode === 'decal' && (
                    <div className="decal-layout">
                      {/* Top Branding */}
                      {showCompany && (
                        <div className="label-brand-header">
                          <div className="brand-logo-name">
                            <span className="brand-badge">MCK</span>
                            <span className="brand-title">XE NÂNG MCK JAPAN</span>
                          </div>
                          <div className="brand-hotline">
                            HOTLINE: <strong>0362.396.092</strong>
                          </div>
                        </div>
                      )}

                      {/* Main Body */}
                      <div className="decal-body">
                        {/* QR Code Left Column */}
                        <div className="decal-qr-col">
                          <div className="qr-svg-wrapper">
                            <QRCodeSVG 
                              id={`qr-svg-${forklift.id}`}
                              value={qrUrl} 
                              size={120}
                              level="H" 
                              marginSize={1}
                            />
                          </div>
                          <div className="qr-scan-hint">
                            QUÉT XEM CHI TIẾT
                          </div>
                        </div>

                        {/* Specs Right Column */}
                        <div className="decal-info-col">
                          {/* Internal Code Badge */}
                          <div className="decal-code-row">
                            <span className="decal-code-badge">{internalCode}</span>
                            <span className="decal-status-badge">{forklift.status === 'Available' ? 'SẴN SÀNG' : forklift.status}</span>
                          </div>

                          {/* Maker & Model */}
                          <div className="decal-title">
                            <span className="decal-maker">{forklift.maker}</span>
                            <span className="decal-model">{forklift.model}</span>
                          </div>

                          {/* Key Specs */}
                          {showSpecs && (
                            <div className="decal-specs-grid">
                              <div className="spec-row">
                                <span className="spec-label">Tải trọng:</span>
                                <span className="spec-val highlight">{forklift.loadCapacity ? formatCapacity(forklift.loadCapacity, 'vi') : '-'}</span>
                              </div>
                              <div className="spec-row">
                                <span className="spec-label">Chiều cao nâng:</span>
                                <span className="spec-val">{forklift.liftHeight || '3,000 mm'}</span>
                              </div>
                              <div className="spec-row">
                                <span className="spec-label">Nhiên liệu:</span>
                                <span className="spec-val">{forklift.powerType || 'Điện / Dầu'}</span>
                              </div>
                              <div className="spec-row">
                                <span className="spec-label">Năm SX / Số khung:</span>
                                <span className="spec-val">{forklift.year || 'N/A'} • {forklift.serialNo || 'Theo khung'}</span>
                              </div>
                              {forklift.condition && (
                                <div className="spec-row spec-full">
                                  <span className="spec-label">Tình trạng:</span>
                                  <span className="spec-val condition">{forklift.condition}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Price Tag if enabled */}
                          {showPrice && (
                            <div className="decal-price-row">
                              <span className="price-label">Giá bán:</span>
                              <span className="price-val">
                                {forklift.price ? `${forklift.price.toLocaleString('vi-VN')} đ` : 'Liên hệ tư vấn'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="decal-footer">
                        <span>👉 Quét Zalo / Camera xem ảnh HD & Video vận hành thực tế</span>
                        <span className="footer-url">{baseUrl.replace(/^https?:\/\//, '')}/vi/machine/{forklift.id.slice(0, 8)}</span>
                      </div>
                    </div>
                  )}

                  {/* Grid 4 Tem / A4 Layout */}
                  {printMode === 'grid4' && (
                    <div className="grid4-layout">
                      {/* Top Branding */}
                      {showCompany && (
                        <div className="grid4-header">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ background: '#b91c1c', color: 'white', fontWeight: 900, fontSize: '11px', padding: '2px 5px', borderRadius: '3px' }}>MCK</div>
                            <span style={{ fontWeight: 800, fontSize: '12px', color: '#0f172a' }}>XE NÂNG MCK JAPAN</span>
                          </div>
                          <span style={{ fontSize: '11px', color: '#b91c1c', fontWeight: 700 }}>☎ 0362.396.092</span>
                        </div>
                      )}

                      <div className="grid4-content">
                        <div className="grid4-code-tag">
                          {internalCode}
                        </div>

                        <h3 className="grid4-title">
                          {forklift.maker} {forklift.model}
                        </h3>

                        <div className="grid4-body">
                          <div className="grid4-qr-wrapper">
                            <QRCodeSVG 
                              id={`qr-svg-${forklift.id}`}
                              value={qrUrl} 
                              size={135}
                              level="H" 
                              marginSize={1}
                            />
                            <div className="grid4-qr-caption">Quét mã xem chi tiết</div>
                          </div>

                          <div className="grid4-specs">
                            <div className="grid4-spec-item">
                              <span className="g-label">Tải trọng:</span>
                              <span className="g-val highlight">{forklift.loadCapacity ? formatCapacity(forklift.loadCapacity, 'vi') : '-'}</span>
                            </div>
                            <div className="grid4-spec-item">
                              <span className="g-label">Nâng cao:</span>
                              <span className="g-val">{forklift.liftHeight || '3,000 mm'}</span>
                            </div>
                            <div className="grid4-spec-item">
                              <span className="g-label">Nhiên liệu:</span>
                              <span className="g-val">{forklift.powerType || 'Điện'}</span>
                            </div>
                            <div className="grid4-spec-item">
                              <span className="g-label">Năm SX:</span>
                              <span className="g-val">{forklift.year || '-'}</span>
                            </div>
                            <div className="grid4-spec-item">
                              <span className="g-label">Số khung:</span>
                              <span className="g-val">{forklift.serialNo || '-'}</span>
                            </div>
                            {showPrice && (
                              <div className="grid4-price-box">
                                {forklift.price ? `${forklift.price.toLocaleString('vi-VN')} đ` : 'Liên hệ báo giá'}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="grid4-footer">
                          Cam kết bình ắc quy &gt;80% • Bảo hành chính hãng
                        </div>
                      </div>

                      {/* Cut guide */}
                      <div className="cut-mark cut-top-right">✂</div>
                    </div>
                  )}

                  {/* Showcase A4 / A5 Hanging Sheet Layout */}
                  {printMode === 'showcase' && (
                    <div className="showcase-layout">
                      {/* Company Header */}
                      {showCompany && (
                        <div className="showcase-header">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                              background: '#b91c1c',
                              color: 'white',
                              fontWeight: 900,
                              fontSize: '18px',
                              padding: '6px 14px',
                              borderRadius: '6px',
                              letterSpacing: '1px'
                            }}>
                              MCK FORKLIFT
                            </div>
                            <div>
                              <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>
                                XE NÂNG MCK JAPAN
                              </div>
                              <div style={{ fontSize: '12px', color: '#64748b' }}>
                                Kho bãi: Thôn Bình Phú, xã Việt Yên, Hưng Yên • Hotline / Zalo: 0362-396-092
                              </div>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{
                              display: 'inline-block',
                              background: '#0284c7',
                              color: 'white',
                              padding: '6px 14px',
                              borderRadius: '6px',
                              fontWeight: 800,
                              fontSize: '14px'
                            }}>
                              MÃ XE: {internalCode}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Main Title Banner */}
                      <div className="showcase-title-banner">
                        <div style={{ fontSize: '13px', color: '#0284c7', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
                          THIẾT BỊ XE NÂNG NHẬP KHẨU NHẬT BẢN NGUYÊN BẢN
                        </div>
                        <h2 style={{ fontSize: '26px', fontWeight: 900, color: '#0f172a', margin: '4px 0', textTransform: 'uppercase' }}>
                          XE NÂNG {forklift.maker} {forklift.model}
                        </h2>
                      </div>

                      {/* Showcase Center: Image & Specs & QR */}
                      <div className="showcase-center-grid">
                        
                        {/* Column 1: Image & Highlight Badge */}
                        {showImage && (
                          <div className="showcase-img-col">
                            <div className="showcase-img-container">
                              {forklift.imageUrl ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img 
                                  src={forklift.imageUrl} 
                                  alt={forklift.model}
                                  className="showcase-img"
                                />
                              ) : (
                                <div className="no-image-placeholder">
                                  <span>Hình ảnh thực tế xe nâng</span>
                                </div>
                              )}
                              <div className="showcase-origin-badge">ORIGINAL JAPAN</div>
                            </div>

                            {/* Price Bar */}
                            {showPrice && (
                              <div className="showcase-price-banner">
                                <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>GIÁ BÁN ĐÃ GỒM VAT:</span>
                                <div style={{ fontSize: '24px', fontWeight: 900, color: '#b91c1c' }}>
                                  {forklift.price ? `${forklift.price.toLocaleString('vi-VN')} VNĐ` : 'LIÊN HỆ BÁO GIÁ'}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Column 2: Full Specifications Table */}
                        <div className="showcase-specs-col">
                          <table className="showcase-table">
                            <tbody>
                              <tr>
                                <td className="tbl-label">Hãng sản xuất</td>
                                <td className="tbl-val bold">{forklift.maker}</td>
                              </tr>
                              <tr>
                                <td className="tbl-label">Model xe</td>
                                <td className="tbl-val bold">{forklift.model}</td>
                              </tr>
                              <tr>
                                <td className="tbl-label">Tải trọng nâng</td>
                                <td className="tbl-val highlight">{forklift.loadCapacity ? formatCapacity(forklift.loadCapacity, 'vi') : '-'}</td>
                              </tr>
                              <tr>
                                <td className="tbl-label">Chiều cao nâng</td>
                                <td className="tbl-val bold">{forklift.liftHeight || '3,000 mm'}</td>
                              </tr>
                              <tr>
                                <td className="tbl-label">Loại nhiên liệu</td>
                                <td className="tbl-val">{forklift.powerType || 'Điện (Battery)'}</td>
                              </tr>
                              <tr>
                                <td className="tbl-label">Năm sản xuất</td>
                                <td className="tbl-val">{forklift.year || 'N/A'}</td>
                              </tr>
                              <tr>
                                <td className="tbl-label">Số khung / Serial</td>
                                <td className="tbl-val">{forklift.serialNo || 'Theo khung máy'}</td>
                              </tr>
                              <tr>
                                <td className="tbl-label">Giờ hoạt động</td>
                                <td className="tbl-val">{forklift.hour ? `${forklift.hour} giờ` : 'N/A'}</td>
                              </tr>
                              <tr>
                                <td className="tbl-label">Chiều dài càng</td>
                                <td className="tbl-val">{forklift.forkLength || '1070 mm'}</td>
                              </tr>
                              <tr>
                                <td className="tbl-label">Tình trạng ắc quy</td>
                                <td className="tbl-val ok">{forklift.condition || 'Cam kết dung lượng >80%, test tải thực tế'}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* Column 3: Large QR Code with Scan Box */}
                        <div className="showcase-qr-col">
                          <div className="showcase-qr-card">
                            <div className="qr-title">QUÉT TRA CỨU</div>
                            <div className="showcase-qr-frame">
                              <QRCodeSVG 
                                id={`qr-svg-${forklift.id}`}
                                value={qrUrl} 
                                size={170}
                                level="H" 
                                marginSize={1}
                              />
                            </div>
                            <div className="qr-hint-text">
                              Dùng <strong>Zalo</strong> hoặc <strong>Camera điện thoại</strong> để quét mã
                            </div>
                            <ul className="qr-features-list">
                              <li>✓ Xem Video review vận hành</li>
                              <li>✓ Xem album ảnh chi tiết sắc nét</li>
                              <li>✓ Tải Bảng Báo Giá PDF có dấu</li>
                              <li>✓ Chat tư vấn Zalo trực tiếp</li>
                            </ul>
                          </div>
                        </div>

                      </div>

                      {/* Showcase Footer */}
                      <div className="showcase-footer">
                        <div style={{ display: 'flex', gap: '2rem' }}>
                          <div><strong>Chính sách:</strong> Bảo hành 03 tháng Ắc quy &amp; Bo mạch điện tử</div>
                          <div><strong>Vận chuyển:</strong> Miễn phí giao xe 50km từ bãi Hà Nội</div>
                        </div>
                        <div style={{ color: '#0284c7', fontWeight: 700 }}>
                          xenangmck.jp • Hotline: 0362-396-092
                        </div>
                      </div>

                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 4. Complete Styling & Print CSS */}
      <style dangerouslySetInnerHTML={{ __html: `
        /* General screen layout */
        .print-wrapper {
          display: flex;
          flex-direction: column;
          gap: 2rem;
          align-items: center;
        }

        .qr-label-card {
          background: white;
          color: #0f172a;
          box-shadow: 0 4px 15px rgba(0,0,0,0.06);
          position: relative;
        }

        /* ----------------------------------------------------
           DECAL LAYOUT (100 x 75mm standard label)
        ---------------------------------------------------- */
        .qr-label-decal {
          width: 100mm;
          min-height: 75mm;
          border: 2px solid #0f172a;
          border-radius: 6px;
          padding: 8px 10px;
          box-sizing: border-box;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .decal-layout {
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .label-brand-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #b91c1c;
          padding-bottom: 4px;
          margin-bottom: 6px;
        }

        .brand-logo-name {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .brand-badge {
          background: #b91c1c;
          color: white;
          font-weight: 900;
          font-size: 10px;
          padding: 2px 5px;
          border-radius: 3px;
          letter-spacing: 0.5px;
        }

        .brand-title {
          font-weight: 800;
          font-size: 11.5px;
          color: #0f172a;
          letter-spacing: 0.3px;
        }

        .brand-hotline {
          font-size: 10px;
          color: #b91c1c;
          font-weight: 600;
        }

        .decal-body {
          display: flex;
          gap: 10px;
          flex: 1;
        }

        .decal-qr-col {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 125px;
          flex-shrink: 0;
        }

        .qr-svg-wrapper {
          padding: 3px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
        }

        .qr-scan-hint {
          font-size: 8px;
          font-weight: 800;
          color: #0284c7;
          margin-top: 3px;
          letter-spacing: 0.5px;
          text-align: center;
        }

        .decal-info-col {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .decal-code-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 3px;
        }

        .decal-code-badge {
          background: #0f172a;
          color: white;
          font-weight: 900;
          font-size: 12px;
          padding: 2px 7px;
          border-radius: 3px;
          letter-spacing: 0.5px;
        }

        .decal-status-badge {
          background: #dcfce7;
          color: #15803d;
          font-size: 9px;
          font-weight: 700;
          padding: 2px 5px;
          border-radius: 3px;
        }

        .decal-title {
          line-height: 1.2;
          margin-bottom: 4px;
        }

        .decal-maker {
          font-size: 11px;
          font-weight: 700;
          color: #b91c1c;
          margin-right: 4px;
          text-transform: uppercase;
        }

        .decal-model {
          font-size: 14px;
          font-weight: 900;
          color: #0f172a;
          text-transform: uppercase;
        }

        .decal-specs-grid {
          display: flex;
          flex-direction: column;
          gap: 2px;
          font-size: 9.5px;
          background: #f8fafc;
          padding: 4px 6px;
          border-radius: 4px;
          border: 1px solid #f1f5f9;
        }

        .spec-row {
          display: flex;
          justify-content: space-between;
          line-height: 1.25;
        }

        .spec-label {
          color: #64748b;
          font-weight: 600;
        }

        .spec-val {
          font-weight: 700;
          color: #1e293b;
        }

        .spec-val.highlight {
          color: #0284c7;
          font-weight: 800;
        }

        .spec-val.condition {
          color: #16a34a;
        }

        .decal-price-row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-top: 4px;
          border-top: 1px dashed #cbd5e1;
          padding-top: 3px;
        }

        .price-label {
          font-size: 9.5px;
          color: #475569;
          font-weight: 600;
        }

        .price-val {
          font-size: 12px;
          color: #b91c1c;
          font-weight: 900;
        }

        .decal-footer {
          margin-top: 5px;
          padding-top: 3px;
          border-top: 1px solid #e2e8f0;
          font-size: 8px;
          color: #64748b;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .footer-url {
          font-weight: 700;
          color: #0284c7;
        }

        /* ----------------------------------------------------
           GRID 4 LAYOUT (4 per A4 Sheet)
        ---------------------------------------------------- */
        .print-mode-grid4 {
          display: grid;
          grid-template-columns: repeat(2, 95mm);
          gap: 15mm;
          justify-content: center;
        }

        .qr-label-grid4 {
          width: 95mm;
          height: 135mm;
          border: 1.5px dashed #94a3b8;
          padding: 12px;
          box-sizing: border-box;
          border-radius: 6px;
          position: relative;
          background: white;
        }

        .grid4-layout {
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .grid4-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #0f172a;
          padding-bottom: 6px;
          margin-bottom: 8px;
        }

        .grid4-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .grid4-code-tag {
          background: #0284c7;
          color: white;
          font-size: 13px;
          font-weight: 900;
          padding: 3px 12px;
          border-radius: 4px;
          display: inline-block;
          margin-bottom: 6px;
        }

        .grid4-title {
          font-size: 17px;
          font-weight: 900;
          color: #0f172a;
          margin: 0 0 10px 0;
          text-transform: uppercase;
        }

        .grid4-body {
          display: flex;
          gap: 12px;
          width: 100%;
          align-items: center;
          margin-bottom: 10px;
        }

        .grid4-qr-wrapper {
          flex-shrink: 0;
          padding: 4px;
          background: white;
          border: 1px solid #cbd5e1;
          border-radius: 4px;
        }

        .grid4-qr-caption {
          font-size: 8.5px;
          font-weight: 700;
          color: #0284c7;
          margin-top: 4px;
        }

        .grid4-specs {
          flex: 1;
          text-align: left;
          font-size: 10.5px;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .grid4-spec-item {
          display: flex;
          justify-content: space-between;
          border-bottom: 1px dotted #e2e8f0;
          padding-bottom: 2px;
        }

        .g-label {
          color: #64748b;
          font-weight: 600;
        }

        .g-val {
          font-weight: 700;
          color: #1e293b;
        }

        .g-val.highlight {
          color: #0284c7;
          font-weight: 800;
        }

        .grid4-price-box {
          margin-top: 6px;
          background: #fef2f2;
          color: #b91c1c;
          font-weight: 900;
          font-size: 13px;
          padding: 4px;
          border-radius: 4px;
          text-align: center;
          border: 1px solid #fecaca;
        }

        .grid4-footer {
          font-size: 9px;
          color: #15803d;
          font-weight: 700;
          border-top: 1px solid #e2e8f0;
          padding-top: 6px;
          width: 100%;
        }

        .cut-mark {
          position: absolute;
          top: -10px;
          right: -10px;
          background: white;
          padding: 0 4px;
          font-size: 11px;
          color: #94a3b8;
        }

        /* ----------------------------------------------------
           SHOWCASE LAYOUT (A4 / A5 Hanging Sheet)
        ---------------------------------------------------- */
        .qr-label-showcase {
          width: 210mm;
          max-width: 820px;
          min-height: 148mm;
          border: 2px solid #0f172a;
          border-radius: 8px;
          padding: 24px;
          box-sizing: border-box;
          background: white;
        }

        .showcase-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #0f172a;
          padding-bottom: 14px;
          margin-bottom: 14px;
        }

        .showcase-title-banner {
          text-align: center;
          margin-bottom: 18px;
        }

        .showcase-center-grid {
          display: grid;
          grid-template-columns: 240px 1fr 200px;
          gap: 18px;
          align-items: start;
          margin-bottom: 18px;
        }

        .showcase-img-container {
          position: relative;
          width: 100%;
          height: 180px;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          overflow: hidden;
          background: #f8fafc;
        }

        .showcase-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .no-image-placeholder {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #94a3b8;
          font-size: 12px;
          font-style: italic;
        }

        .showcase-origin-badge {
          position: absolute;
          bottom: 6px;
          left: 6px;
          background: rgba(15, 23, 42, 0.85);
          color: white;
          font-size: 10px;
          font-weight: 800;
          padding: 2px 6px;
          border-radius: 3px;
        }

        .showcase-price-banner {
          margin-top: 10px;
          background: #fef2f2;
          border: 1px solid #fee2e2;
          padding: 8px 12px;
          border-radius: 6px;
          text-align: center;
        }

        .showcase-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12.5px;
        }

        .showcase-table td {
          padding: 5px 8px;
          border: 1px solid #e2e8f0;
        }

        .tbl-label {
          background: #f8fafc;
          color: #475569;
          font-weight: 600;
          width: 40%;
        }

        .tbl-val {
          color: #1e293b;
        }

        .tbl-val.bold {
          font-weight: 700;
        }

        .tbl-val.highlight {
          color: #0284c7;
          font-weight: 800;
        }

        .tbl-val.ok {
          color: #15803d;
          font-size: 11.5px;
        }

        .showcase-qr-card {
          border: 1.5px solid #0284c7;
          border-radius: 8px;
          padding: 12px;
          text-align: center;
          background: #f0f9ff;
        }

        .qr-title {
          font-weight: 900;
          font-size: 13px;
          color: #0369a1;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
        }

        .showcase-qr-frame {
          background: white;
          padding: 6px;
          border-radius: 6px;
          display: inline-block;
          border: 1px solid #bae6fd;
        }

        .qr-hint-text {
          font-size: 10.5px;
          color: #0284c7;
          margin-top: 6px;
          line-height: 1.3;
        }

        .qr-features-list {
          list-style: none;
          padding: 0;
          margin: 8px 0 0 0;
          font-size: 10px;
          color: #334155;
          text-align: left;
          line-height: 1.4;
        }

        .showcase-footer {
          border-top: 1.5px solid #e2e8f0;
          padding-top: 10px;
          display: flex;
          justify-content: space-between;
          font-size: 11.5px;
          color: #475569;
        }

        /* ----------------------------------------------------
           PRINT MEDIA OPTIMIZATIONS
        ---------------------------------------------------- */
        @media print {
          body {
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .no-print {
            display: none !important;
          }

          .print-qr-container {
            background: white !important;
            min-height: auto !important;
          }

          main {
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
          }

          .print-wrapper {
            gap: 0 !important;
          }

          /* Decal printing */
          .qr-label-decal {
            box-shadow: none !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            page-break-after: always;
            margin: 0 auto 5mm auto !important;
          }

          /* Grid4 printing (4 per A4 page) */
          .print-mode-grid4 {
            display: grid !important;
            grid-template-columns: repeat(2, 95mm) !important;
            gap: 5mm !important;
            page-break-after: always;
          }

          .qr-label-grid4 {
            box-shadow: none !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          /* Showcase printing (1 per A4 page) */
          .qr-label-showcase {
            box-shadow: none !important;
            width: 100% !important;
            max-width: 100% !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            page-break-after: always;
            border: 2px solid #0f172a !important;
          }

          /* Tem nhiệt A6 / A7: mỗi tem 1 trang đúng khổ giấy */
          .thermal-label-img {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            break-after: page;
            page-break-after: always;
          }

          @page {
            size: ${isThermalMode(printMode) ? `${THERMAL_SIZES[printMode].widthMm}mm ${THERMAL_SIZES[printMode].heightMm}mm` : 'auto'};
            margin: ${isThermalMode(printMode) ? '0' : '8mm'};
          }
        }

        .thermal-label-img {
          display: block;
          max-width: 100%;
          object-fit: contain;
          background: white;
          border: 1px solid #cbd5e1;
          box-shadow: 0 4px 15px rgba(0,0,0,0.08);
        }
      `}} />

    </div>
  );
}
