'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FaFileExcel, FaUpload, FaSpinner } from 'react-icons/fa';

export default function ImportExcelPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{imported: number, skipped: number} | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await fetch('/api/forklifts/import', {
        method: 'POST',
        body: formData,
      });
      
      const data = await res.json();
      if (res.ok) {
        setResult({ imported: data.imported, skipped: data.skipped });
        router.refresh(); // Làm mới data ở background
      } else {
        alert(data.error || 'Có lỗi xảy ra khi import');
      }
    } catch (error) {
      alert('Lỗi kết nối tới máy chủ');
    }
    setLoading(false);
  };

  return (
    <div className="glass-panel" style={{ padding: '2.5rem', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.8rem', color: 'var(--primary)', marginBottom: '0.5rem' }}>Import Xe Nâng Từ Excel</h2>
        <p style={{ color: '#666' }}>Hỗ trợ định dạng TENDER LIST (.xlsx)</p>
      </div>

      {!result ? (
        <div style={{ border: '2px dashed var(--surface-border)', borderRadius: '12px', padding: '4rem 2rem', backgroundColor: 'rgba(255,255,255,0.5)' }}>
          <FaFileExcel size={60} color="#217346" style={{ marginBottom: '1rem' }} />
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.2rem' }}>Chọn file Excel để tải lên</h3>
          <input 
            type="file" 
            accept=".xlsx, .xls" 
            onChange={handleFileChange}
            style={{ display: 'none' }}
            id="file-upload"
          />
          <label htmlFor="file-upload" className="btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex', gap: '0.5rem' }}>
            <FaUpload /> {file ? file.name : 'Chọn File...'}
          </label>

          {file && (
            <div style={{ marginTop: '2rem' }}>
              <button onClick={handleUpload} disabled={loading} className="btn-primary" style={{ padding: '0.8rem 2rem', fontSize: '1.1rem' }}>
                {loading ? 'Đang xử lý...' : 'Bắt Đầu Import'}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ padding: '3rem 2rem', backgroundColor: 'rgba(34, 197, 94, 0.1)', borderRadius: '12px', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
          <h3 style={{ color: 'var(--success)', fontSize: '1.5rem', marginBottom: '1rem' }}>Import Thành Công!</h3>
          <div style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
            Đã thêm mới: <strong>{result.imported}</strong> xe
          </div>
          <div style={{ fontSize: '1.1rem', color: '#666', marginBottom: '2rem' }}>
            Bỏ qua (bị trùng mã StockNo): <strong>{result.skipped}</strong> xe
          </div>
          <Link href="/admin/forklifts" className="btn-primary">
            Quay lại Danh sách Xe
          </Link>
        </div>
      )}
    </div>
  );
}
