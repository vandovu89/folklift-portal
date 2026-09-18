'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../forklifts.module.css';

export default function AddForkliftPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [sources, setSources] = useState<{ id: string, name: string }[]>([]);

  useEffect(() => {
    fetch('/api/purchase-sources').then(res => res.json()).then(data => setSources(data));
  }, []);
  
  const [formData, setFormData] = useState({
    purchaseSource: '',
    serialNo: '',
    maker: '',
    model: '',
    year: '',
    hour: '',
    powerType: '',
    category: '',
    status: 'Published',
    price: '',
    forkLength: '',
    attachment: '',
    liftHeight: '',
    loadCapacity: '',
    condition: '',
    location: '',
    sourceUrl: '',
    costPrice: '',
    expenses: [] as { title: string, amount: string, date: string, note: string }[]
  });

  const handleExpenseChange = (index: number, field: string, value: string) => {
    const newExpenses = [...formData.expenses];
    newExpenses[index] = { ...newExpenses[index], [field]: value };
    setFormData({ ...formData, expenses: newExpenses });
  };

  const addExpense = () => {
    setFormData({
      ...formData,
      expenses: [...formData.expenses, { title: '', amount: '', date: '', note: '' }]
    });
  };

  const removeExpense = (index: number) => {
    const newExpenses = [...formData.expenses];
    newExpenses.splice(index, 1);
    setFormData({ ...formData, expenses: newExpenses });
  };

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
    <div className="glass-panel" style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <div className={styles.pageHeader}>
        <h2>Thêm Xe Nâng Mới</h2>
      </div>

      <form onSubmit={handleSubmit}>
        <div className={styles.formSection}>
          <h3>1. Thông tin Chung & Nhận diện</h3>
          <div className={styles.formGrid}>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Nguồn nhập (Sẽ tự động sinh Mã Nội Bộ)</label>
              <select name="purchaseSource" value={formData.purchaseSource} onChange={handleChange} className="form-control">
                <option value="">-- Chọn nguồn nhập --</option>
                {sources.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Hãng sản xuất (MAKER) *</label>
              <input required name="maker" value={formData.maker} onChange={handleChange} className="form-control" />
            </div>
            <div className="form-group">
              <label className="form-label">Model *</label>
              <input required name="model" value={formData.model} onChange={handleChange} className="form-control" />
            </div>
            <div className="form-group">
              <label className="form-label">Số Serial (SERI NO.)</label>
              <input name="serialNo" value={formData.serialNo} onChange={handleChange} className="form-control" />
            </div>
            <div className="form-group">
              <label className="form-label">Năm Sản Xuất</label>
              <input type="number" name="year" value={formData.year} onChange={handleChange} className="form-control" />
            </div>
            <div className="form-group">
              <label className="form-label">Giờ Hoạt Động</label>
              <input type="number" name="hour" value={formData.hour} onChange={handleChange} className="form-control" />
            </div>
            <div className="form-group">
              <label className="form-label">Địa Điểm</label>
              <input name="location" value={formData.location} onChange={handleChange} className="form-control" />
            </div>
            <div className="form-group">
              <label className="form-label">Nguồn tham khảo (URL)</label>
              <input name="sourceUrl" value={formData.sourceUrl} onChange={handleChange} className="form-control" />
            </div>
          </div>
        </div>

        <div className={styles.formSection}>
          <h3>2. Thông số Kỹ thuật & Tình trạng</h3>
          <div className={styles.formGrid}>
            <div className="form-group">
              <label className="form-label">Tình trạng xe (Bình ắc quy)</label>
              <input name="condition" value={formData.condition} onChange={handleChange} className="form-control" placeholder="Hoạt động bình thường..." />
            </div>
            <div className="form-group">
              <label className="form-label">Loại Nhiên Liệu</label>
              <input name="powerType" value={formData.powerType} onChange={handleChange} className="form-control" placeholder="XE NÂNG ĐIỆN, DIESEL..." />
            </div>
            <div className="form-group">
              <label className="form-label">Chủng Loại Xe</label>
              <input name="category" value={formData.category} onChange={handleChange} className="form-control" placeholder="NGỒI LÁI, ĐỨNG LÁI..." />
            </div>
            <div className="form-group">
              <label className="form-label">Chiều Dài Càng Nâng</label>
              <input name="forkLength" value={formData.forkLength} onChange={handleChange} className="form-control" placeholder="1070mm..." />
            </div>
            <div className="form-group">
              <label className="form-label">Phụ Kiện</label>
              <input name="attachment" value={formData.attachment} onChange={handleChange} className="form-control" placeholder="CÓ DỊCH CÀNG, KHÔNG..." />
            </div>
            <div className="form-group">
              <label className="form-label">Chiều Cao Nâng Tối Đa</label>
              <input name="liftHeight" value={formData.liftHeight} onChange={handleChange} className="form-control" placeholder="3,000mm..." />
            </div>
            <div className="form-group">
              <label className="form-label">Tải Trọng Nâng Tối Đa</label>
              <input name="loadCapacity" value={formData.loadCapacity} onChange={handleChange} className="form-control" placeholder="2,000kg..." />
            </div>
          </div>
        </div>

        <div className={styles.formSection}>
          <h3>3. Trạng thái & Giá Bán</h3>
          <div className={styles.formGrid}>
            <div className="form-group">
              <label className="form-label">Trạng thái hiện tại</label>
              <select name="status" value={formData.status} onChange={handleChange} className="form-control">
                <option value="Draft">Draft (Lưu kho / Bản nháp)</option>
                <option value="Incoming">Incoming (Sắp về kho)</option>
                <option value="Published">Published (Đang bán / Sẵn sàng)</option>
                <option value="Reserved">Reserved (Đã nhận cọc)</option>
                <option value="Sold">Sold (Đã bán)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Giá Bán Đề Xuất (VNĐ)</label>
              <input type="number" name="price" value={formData.price} onChange={handleChange} className="form-control" />
            </div>
          </div>
        </div>

        <div className={styles.formSection}>
          <h3>4. Quản lý Vốn & Chi phí nội bộ</h3>
          <div className={styles.formGrid}>
            <div className="form-group">
              <label className="form-label">Giá vốn mua vào (VNĐ)</label>
              <input type="number" name="costPrice" value={formData.costPrice} onChange={handleChange} className="form-control" />
            </div>
          </div>
          
          <div style={{ marginTop: '1rem' }}>
            <label className="form-label">Chi phí phát sinh</label>
            {formData.expenses.map((exp, index) => (
              <div key={index} style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                <input required placeholder="Tên chi phí (VD: Vận chuyển)" value={exp.title} onChange={e => handleExpenseChange(index, 'title', e.target.value)} className="form-control" style={{ flex: 2 }} />
                <input required type="number" placeholder="Số tiền" value={exp.amount} onChange={e => handleExpenseChange(index, 'amount', e.target.value)} className="form-control" style={{ flex: 1.5 }} />
                <input type="date" value={exp.date} onChange={e => handleExpenseChange(index, 'date', e.target.value)} className="form-control" style={{ flex: 1.5 }} />
                <input placeholder="Ghi chú" value={exp.note} onChange={e => handleExpenseChange(index, 'note', e.target.value)} className="form-control" style={{ flex: 2 }} />
                <button type="button" onClick={() => removeExpense(index)} className="btn-danger" style={{ padding: '0.5rem' }}>Xóa</button>
              </div>
            ))}
            <button type="button" onClick={addExpense} className="btn-secondary" style={{ marginTop: '0.5rem' }}>+ Thêm chi phí</button>
          </div>
          
          <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', textAlign: 'center' }}>
              <div>
                <div style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '0.5rem' }}>Tổng vốn nhập (Bao gồm chi phí)</div>
                <div style={{ fontSize: '1.2rem', color: '#ffb703', fontWeight: 600 }}>
                  {((parseFloat(formData.costPrice) || 0) + formData.expenses.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0)).toLocaleString('vi-VN')} VNĐ
                </div>
              </div>
              <div style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '0.5rem' }}>Giá Bán Đề Xuất</div>
                <div style={{ fontSize: '1.2rem', color: '#38bdf8', fontWeight: 600 }}>
                  {(parseFloat(formData.price) || 0).toLocaleString('vi-VN')} VNĐ
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '0.5rem' }}>Lợi Nhuận Dự Kiến</div>
                <div style={{ 
                  fontSize: '1.3rem', 
                  fontWeight: 700,
                  color: ((parseFloat(formData.price) || 0) - ((parseFloat(formData.costPrice) || 0) + formData.expenses.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0))) >= 0 ? '#4ade80' : '#f87171' 
                }}>
                  {((parseFloat(formData.price) || 0) - ((parseFloat(formData.costPrice) || 0) + formData.expenses.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0))).toLocaleString('vi-VN')} VNĐ
                </div>
              </div>
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
