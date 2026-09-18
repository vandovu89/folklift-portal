'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './forklifts.module.css';

export default function ForkliftTable({ forklifts }: { forklifts: any[] }) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const toggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(forklifts.map((fl) => fl.id));
    } else {
      setSelectedIds([]);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => 
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.length} xe nâng đã chọn? Hành động này không thể hoàn tác.`)) {
      return;
    }
    
    setIsDeleting(true);
    try {
      const res = await fetch('/api/forklifts/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });
      
      if (res.ok) {
        setSelectedIds([]);
        router.refresh();
      } else {
        alert('Có lỗi xảy ra khi xóa!');
      }
    } catch (error) {
      console.error(error);
      alert('Có lỗi xảy ra khi xóa!');
    }
    setIsDeleting(false);
  };

  return (
    <div className="glass-panel" style={{ overflow: 'hidden', position: 'relative' }}>
      
      {selectedIds.length > 0 && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, 
          padding: '10px 1rem', background: 'rgba(239, 68, 68, 0.15)', 
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          borderBottom: '1px solid rgba(239, 68, 68, 0.3)',
          backdropFilter: 'blur(8px)',
          zIndex: 10
        }}>
          <span style={{ color: '#ef4444', fontWeight: 'bold' }}>
            Đã chọn {selectedIds.length} xe nâng
          </span>
          <button 
            onClick={handleBulkDelete} 
            disabled={isDeleting}
            className="btn-danger"
            style={{ padding: '0.4rem 1rem' }}
          >
            {isDeleting ? 'Đang xóa...' : 'Xóa Các Mục Đã Chọn'}
          </button>
        </div>
      )}

      <table className={styles.table} style={{ marginTop: selectedIds.length > 0 ? '55px' : '0', transition: 'margin-top 0.2s' }}>
        <thead>
          <tr>
            <th style={{ width: '40px', textAlign: 'center' }}>
              <input 
                type="checkbox" 
                checked={selectedIds.length === forklifts.length && forklifts.length > 0}
                onChange={toggleSelectAll}
                style={{ cursor: 'pointer', transform: 'scale(1.2)' }}
              />
            </th>
            <th>Mã nội bộ</th>
            <th>Nguồn nhập</th>
            <th>Hãng</th>
            <th>Model</th>
            <th>Năm SX</th>
            <th>Giờ</th>
            <th>Trạng Thái</th>
            <th>Hành Động</th>
          </tr>
        </thead>
        <tbody>
          {forklifts.length === 0 ? (
            <tr>
              <td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>
                Chưa có dữ liệu xe nâng nào.
              </td>
            </tr>
          ) : (
            forklifts.map((fl) => (
              <tr key={fl.id} style={{ background: selectedIds.includes(fl.id) ? 'rgba(239, 68, 68, 0.05)' : 'transparent' }}>
                <td style={{ textAlign: 'center' }}>
                  <input 
                    type="checkbox" 
                    checked={selectedIds.includes(fl.id)}
                    onChange={() => toggleSelect(fl.id)}
                    style={{ cursor: 'pointer', transform: 'scale(1.2)' }}
                  />
                </td>
                <td><strong title={`ID: ${fl.id}`}>{fl.internalCode || fl.id.substring(0, 8)}</strong></td>
                <td>{fl.purchaseSource || '-'}</td>
                <td>{fl.maker}</td>
                <td>{fl.model}</td>
                <td>{fl.year || '-'}</td>
                <td>{fl.hour || '-'}</td>
                <td>
                  <span className={`badge ${fl.status === 'Published' ? 'badge-success' : 'badge-neutral'}`}>
                    {fl.status}
                  </span>
                </td>
                <td>
                  <Link href={`/admin/forklifts/${fl.id}/edit`} className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                    Sửa
                  </Link>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
