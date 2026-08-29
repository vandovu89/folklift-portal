'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../forklifts.module.css';

export default function AddForkliftPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    internalCode: '',
    stockNo: '',
    maker: '',
    model: '',
    year: '',
    hour: '',
    powerType: 'Diesel',
    status: 'Draft',
    price: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/forklifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        router.push('/admin/forklifts');
        router.refresh();
      } else {
        alert('Có lỗi xảy ra');
      }
    } catch (error) {
      alert('Có lỗi xảy ra');
    }
    setLoading(false);
  };

  return (
    <div className="glass-panel" style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
      <div className={styles.pageHeader}>
        <h2>Thêm Xe Nâng Mới</h2>
      </div>

      <form onSubmit={handleSubmit}>
        <div className={styles.formSection}>
          <h3>1. Thông tin Nhận diện</h3>
          <div className={styles.formGrid}>
            <div className="form-group">
              <label className="form-label">Hãng sản xuất (Maker) *</label>
              <input required name="maker" value={formData.maker} onChange={handleChange} className="form-control" placeholder="Toyota, Komatsu..." />
            </div>
            <div className="form-group">
              <label className="form-label">Model *</label>
              <input required name="model" value={formData.model} onChange={handleChange} className="form-control" placeholder="VD: FD25T-17" />
            </div>
            <div className="form-group">
              <label className="form-label">Mã nội bộ</label>
              <input name="internalCode" value={formData.internalCode} onChange={handleChange} className="form-control" placeholder="Mã lưu nội bộ" />
            </div>
            <div className="form-group">
              <label className="form-label">Stock No.</label>
              <input name="stockNo" value={formData.stockNo} onChange={handleChange} className="form-control" placeholder="Mã bãi/kho" />
            </div>
            <div className="form-group">
              <label className="form-label">Năm SX</label>
              <input type="number" name="year" value={formData.year} onChange={handleChange} className="form-control" placeholder="2018" />
            </div>
            <div className="form-group">
              <label className="form-label">Số Giờ Hoạt Động</label>
              <input type="number" name="hour" value={formData.hour} onChange={handleChange} className="form-control" placeholder="4500" />
            </div>
          </div>
        </div>

        <div className={styles.formSection}>
          <h3>2. Phân loại & Giá</h3>
          <div className={styles.formGrid}>
            <div className="form-group">
              <label className="form-label">Nhiên liệu</label>
              <select name="powerType" value={formData.powerType} onChange={handleChange} className="form-control">
                <option value="Diesel">Diesel</option>
                <option value="Battery">Battery (Điện)</option>
                <option value="Gasoline">Gasoline</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Trạng thái hiện tại</label>
              <select name="status" value={formData.status} onChange={handleChange} className="form-control">
                <option value="Draft">Draft (Bản nháp)</option>
                <option value="Received">Received (Đã nhận)</option>
                <option value="Ready">Ready (Sẵn sàng bán)</option>
                <option value="Published">Published (Công khai Web)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Giá Bán Đề Xuất (VND)</label>
              <input type="number" name="price" value={formData.price} onChange={handleChange} className="form-control" placeholder="0" />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <button type="button" onClick={() => router.back()} className="btn-secondary">Hủy</button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Đang lưu...' : 'Lưu Dữ Liệu'}
          </button>
        </div>
      </form>
    </div>
  );
}
