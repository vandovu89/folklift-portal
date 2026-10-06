'use client';

import { useState } from 'react';

interface ExportButtonProps {
  selectedIds?: string[];
  currentFilters?: any;
  buttonText?: string;
  buttonStyle?: React.CSSProperties;
  className?: string;
}

const ALL_COLUMNS = [
  { id: 'internalCode', label: 'Mã nội bộ', default: true },
  { id: 'link', label: 'Link Web', default: true },
  { id: 'maker', label: 'Hãng (Maker)', default: true },
  { id: 'model', label: 'Model', default: true },
  { id: 'serialNo', label: 'Số khung (Serial)', default: true },
  { id: 'year', label: 'Năm SX', default: true },
  { id: 'hour', label: 'Giờ hoạt động', default: true },
  { id: 'condition', label: 'Tình trạng', default: true },
  { id: 'powerType', label: 'Nhiên liệu', default: true },
  { id: 'category', label: 'Chủng loại', default: true },
  { id: 'forkLength', label: 'Chiều dài càng', default: true },
  { id: 'attachment', label: 'Phụ kiện', default: true },
  { id: 'liftHeight', label: 'Chiều cao nâng', default: true },
  { id: 'loadCapacity', label: 'Tải trọng', default: true },
  { id: 'weight', label: 'Trọng lượng xe', default: true },
  { id: 'location', label: 'Địa điểm', default: true },
  { id: 'price', label: 'Giá bán', default: true },
  { id: 'costPrice', label: 'Giá vốn', default: false },
  { id: 'expenses', label: 'Chi phí phát sinh', default: false },
  { id: 'purchaseSource', label: 'Nguồn nhập', default: false },
  { id: 'status', label: 'Trạng thái', default: false },
];

export default function ExportButton({ 
  selectedIds = [], 
  currentFilters = {},
  buttonText = '📤 Export Excel',
  buttonStyle = { backgroundColor: '#107c41', color: 'white', borderColor: '#107c41' },
  className = 'btn-secondary'
}: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // State for selected columns
  const [selectedCols, setSelectedCols] = useState<string[]>(
    ALL_COLUMNS.filter(c => c.default).map(c => c.id)
  );

  const toggleColumn = (id: string) => {
    setSelectedCols(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedCols(ALL_COLUMNS.map(c => c.id));
  };

  const handleDeselectAll = () => {
    setSelectedCols([]);
  };

  const handleExport = async () => {
    if (selectedCols.length === 0) {
      alert('Vui lòng chọn ít nhất 1 cột để xuất!');
      return;
    }

    setIsExporting(true);
    try {
      const payload = {
        scope: selectedIds.length > 0 ? 'selected' : (Object.keys(currentFilters).length > 0 ? 'filtered' : 'all'),
        ids: selectedIds,
        filters: currentFilters,
        columns: selectedCols
      };

      const res = await fetch('/api/forklifts/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Export failed');

      // Trigger file download
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Danh_Sach_Xe_Nang_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setIsOpen(false);
    } catch (error) {
      console.error(error);
      alert('Có lỗi xảy ra khi tải file!');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <button onClick={() => setIsOpen(true)} className={className} style={buttonStyle}>
        {buttonText}
      </button>

      {isOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: 'white', padding: '2rem', borderRadius: '12px',
            width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto',
            color: '#333'
          }}>
            <h2 style={{ marginTop: 0, marginBottom: '0.5rem', color: '#0f172a' }}>Tùy chọn xuất Excel</h2>
            <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
              {selectedIds.length > 0 
                ? `Đang xuất ${selectedIds.length} xe nâng được chọn.` 
                : (Object.keys(currentFilters).length > 0 ? 'Đang xuất theo bộ lọc hiện tại.' : 'Đang xuất toàn bộ xe nâng.')}
            </p>

            <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem' }}>
              <button onClick={handleSelectAll} style={{ color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600 }}>
                + Chọn tất cả
              </button>
              <button onClick={handleDeselectAll} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600 }}>
                - Bỏ chọn tất cả
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '2rem' }}>
              {ALL_COLUMNS.map(col => (
                <label key={col.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={selectedCols.includes(col.id)}
                    onChange={() => toggleColumn(col.id)}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span>{col.label}</span>
                </label>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button 
                onClick={() => setIsOpen(false)} 
                className="btn-secondary"
                disabled={isExporting}
              >
                Hủy
              </button>
              <button 
                onClick={handleExport} 
                className="btn-primary"
                style={{ backgroundColor: '#107c41', borderColor: '#107c41' }}
                disabled={isExporting || selectedCols.length === 0}
              >
                {isExporting ? 'Đang tạo file...' : 'Tải xuống Excel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
