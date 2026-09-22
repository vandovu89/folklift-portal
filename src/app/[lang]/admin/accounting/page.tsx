'use client';

import { useState, useEffect } from 'react';
import { FaFileExcel, FaLock, FaCheckCircle, FaSpinner } from 'react-icons/fa';

export default function AccountingPage() {
  const [activeTab, setActiveTab] = useState<'pending' | 'archived'>('pending');
  const [forklifts, setForklifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);

  const fetchForklifts = async (locked: boolean) => {
    setLoading(true);
    setSelectedIds([]);
    try {
      const res = await fetch(`/api/accounting?locked=${locked}`);
      const data = await res.json();
      setForklifts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchForklifts(activeTab === 'archived');
  }, [activeTab]);

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(x => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const selectAll = () => {
    if (selectedIds.length === forklifts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(forklifts.map(f => f.id));
    }
  };

  const handleExport = async () => {
    if (selectedIds.length === 0) {
      alert('Vui lòng chọn ít nhất một xe để xuất Excel.');
      return;
    }
    
    if (!confirm('Hành động này sẽ XUẤT EXCEL và KHÓA SỔ các xe đã chọn. Sau khi khóa, nhân viên kinh doanh sẽ không thể sửa đổi giá hay chi phí của xe này nữa. Bạn có chắc chắn?')) return;

    setExporting(true);
    try {
      const res = await fetch('/api/accounting/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forkliftIds: selectedIds })
      });

      if (!res.ok) {
        const error = await res.json();
        alert('Lỗi xuất dữ liệu: ' + error.error);
      } else {
        // Download file
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `MISA_Export_${new Date().getTime()}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        
        // Refresh danh sách
        alert('Đã xuất Excel và khóa sổ thành công!');
        fetchForklifts(false);
      }
    } catch (error) {
      console.error(error);
      alert('Lỗi hệ thống khi xuất Excel.');
    }
    setExporting(false);
  };

  const calculateTotalExpenses = (expenses: any[]) => {
    if (!expenses) return 0;
    return expenses.reduce((acc, curr) => acc + curr.amount, 0);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.8rem', color: '#1e293b', margin: 0 }}>Tổng hợp dữ liệu Kế toán</h2>
        
        {activeTab === 'pending' && (
          <button 
            className="btn-primary" 
            onClick={handleExport}
            disabled={exporting || selectedIds.length === 0}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#10b981', borderColor: '#10b981' }}
          >
            {exporting ? <FaSpinner className="fa-spin" /> : <FaFileExcel />} 
            Xuất Excel MISA & Khóa Sổ ({selectedIds.length})
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0' }}>
        <button 
          onClick={() => setActiveTab('pending')}
          style={{
            padding: '0.75rem 1.5rem', background: 'none', border: 'none',
            borderBottom: activeTab === 'pending' ? '3px solid #3b82f6' : '3px solid transparent',
            color: activeTab === 'pending' ? '#3b82f6' : '#64748b',
            fontWeight: 600, cursor: 'pointer', fontSize: '1rem'
          }}
        >
          <FaCheckCircle style={{ marginRight: '0.5rem' }}/> 
          Chờ khóa sổ ({activeTab === 'pending' && !loading ? forklifts.length : '...'})
        </button>
        <button 
          onClick={() => setActiveTab('archived')}
          style={{
            padding: '0.75rem 1.5rem', background: 'none', border: 'none',
            borderBottom: activeTab === 'archived' ? '3px solid #64748b' : '3px solid transparent',
            color: activeTab === 'archived' ? '#333' : '#64748b',
            fontWeight: 600, cursor: 'pointer', fontSize: '1rem'
          }}
        >
          <FaLock style={{ marginRight: '0.5rem' }}/> 
          Đã khóa (Lịch sử)
        </button>
      </div>

      <div className="glass-panel" style={{ padding: '1rem', overflowX: 'auto' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Đang tải dữ liệu...</div>
        ) : forklifts.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Không có dữ liệu.</div>
        ) : (
          <table className="table" style={{ minWidth: '900px' }}>
            <thead>
              <tr>
                {activeTab === 'pending' && (
                  <th style={{ width: '40px', textAlign: 'center' }}>
                    <input 
                      type="checkbox" 
                      checked={selectedIds.length === forklifts.length && forklifts.length > 0} 
                      onChange={selectAll} 
                    />
                  </th>
                )}
                <th>Mã Xe (Nội bộ)</th>
                <th>Tên Xe</th>
                <th>Giá Bán (Doanh thu)</th>
                <th>Giá Vốn (Nhập)</th>
                <th>Tổng Phụ Phí</th>
                <th>Lợi Nhuận Gộp</th>
                <th>Ngày Bán</th>
              </tr>
            </thead>
            <tbody>
              {forklifts.map((fl) => {
                const totalExpenses = calculateTotalExpenses(fl.expenses);
                const costPrice = fl.costPrice || 0;
                const soldPrice = fl.soldPrice || 0;
                const profit = soldPrice - costPrice - totalExpenses;
                
                return (
                  <tr key={fl.id} style={{ opacity: activeTab === 'archived' ? 0.7 : 1 }}>
                    {activeTab === 'pending' && (
                      <td style={{ textAlign: 'center' }}>
                        <input 
                          type="checkbox" 
                          checked={selectedIds.includes(fl.id)} 
                          onChange={() => toggleSelect(fl.id)} 
                        />
                      </td>
                    )}
                    <td style={{ fontWeight: 600 }}>{fl.internalCode || fl.id.substring(0,8)}</td>
                    <td>{fl.maker} {fl.model}</td>
                    <td style={{ color: '#16a34a', fontWeight: 'bold' }}>{soldPrice.toLocaleString()} ₫</td>
                    <td style={{ color: '#dc2626' }}>{costPrice.toLocaleString()} ₫</td>
                    <td style={{ color: '#ea580c' }}>{totalExpenses.toLocaleString()} ₫</td>
                    <td style={{ fontWeight: 'bold', color: profit >= 0 ? '#16a34a' : '#dc2626' }}>
                      {profit.toLocaleString()} ₫
                    </td>
                    <td>{fl.soldDate ? new Date(fl.soldDate).toLocaleDateString('vi-VN') : '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
