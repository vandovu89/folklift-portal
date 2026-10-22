'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../../forklifts.module.css';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import AiMarketingModal from '@/components/AiMarketingModal';
import AiVideoModal from '@/components/AiVideoModal';
import ConditionMap from '@/components/ConditionMap';
import { FaMagic, FaVideo, FaQrcode } from 'react-icons/fa';

const MediaManager = dynamic(() => import('@/components/MediaManager'), {
  ssr: false,
  loading: () => <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Đang tải quản lý thư viện ảnh...</div>
});

export default function EditForkliftPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('SALES');
  // ADMIN sửa toàn bộ; SALES chỉ đổi trạng thái (kèm thông tin chốt đơn khi "Đã bán"); VIEWER chỉ xem
  const isAdminUser = userRole === 'ADMIN';
  const canChangeStatus = userRole === 'ADMIN' || userRole === 'SALES';
  const [activities, setActivities] = useState<any[]>([]);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    id: '',
    internalCode: '',
    purchaseSource: '',
    serialNo: '',
    maker: '',
    model: '',
    year: '',
    hour: '',
    powerType: '',
    category: '',
    status: 'Available',
    price: '',
    forkLength: '',
    liftHeight: '',
    loadCapacity: '',
    weight: '',
    condition: '',
    location: '',
    sourceUrl: '',
    videoUrl: '',
    costPrice: '',
    soldPrice: '',
    soldDate: '',
    contractUrl: '',
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

  useEffect(() => {
    const fetchForklift = async () => {
      try {
        const res = await fetch(`/api/forklifts/${resolvedParams.id}`);
        const found = res.ok ? await res.json() : null;
        if (found) {
          setFormData({
            id: found.id || '',
            internalCode: found.internalCode || '',
            purchaseSource: found.purchaseSource || '',
            serialNo: found.serialNo || '',
            maker: found.maker || '',
            model: found.model || '',
            year: found.year || '',
            hour: found.hour || '',
            powerType: found.powerType || '',
            category: found.category || '',
            status: found.status || 'Available',
            price: found.price || '',
            forkLength: found.forkLength || '',
            liftHeight: found.liftHeight || '',
            loadCapacity: found.loadCapacity || '',
            weight: found.weight || '',
            condition: found.condition || '',
            location: found.location || '',
            sourceUrl: found.sourceUrl || '',
            videoUrl: found.videoUrl || '',
            costPrice: found.costPrice || '',
            soldPrice: found.soldPrice || '',
            soldDate: found.soldDate ? new Date(found.soldDate).toISOString().split('T')[0] : '',
            contractUrl: found.contractUrl || '',
            expenses: found.expenses ? found.expenses.map((e: any) => ({
              title: e.title || '',
              amount: e.amount ? String(e.amount) : '',
              date: e.date ? new Date(e.date).toISOString().split('T')[0] : '',
              note: e.note || ''
            })) : []
          });
        }
      } catch(e) {
        console.error(e);
      }
      setInitialLoading(false);
    };
    
    const fetchUserRole = async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data.user) setUserRole(data.user.role);
      } catch (e) {
        console.error(e);
      }
    };
    
    const fetchActivities = async () => {
      try {
        const res = await fetch(`/api/forklifts/${resolvedParams.id}/activities`);
        if (res.ok) {
          const data = await res.json();
          setActivities(data);
        }
      } catch (e) {
        console.error(e);
      }
    };
    
    fetchForklift();
    fetchUserRole();
    fetchActivities();
  }, [resolvedParams.id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/forklifts/${resolvedParams.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isAdminUser ? formData : {
          status: formData.status,
          ...(formData.status === 'Sold' ? { soldPrice: formData.soldPrice, soldDate: formData.soldDate, contractUrl: formData.contractUrl } : {})
        }),
      });
      if (res.ok) {
        router.push('/admin/forklifts');
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Có lỗi xảy ra');
      }
    } catch (error) {
      alert('Có lỗi xảy ra');
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!confirm('Bạn có chắc chắn muốn xóa xe nâng này?')) return;
    try {
      const res = await fetch(`/api/forklifts/${resolvedParams.id}`, {
        method: 'DELETE',
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
  };

  if (initialLoading) return <div style={{ padding: '2rem' }}>Đang tải dữ liệu...</div>;

  return (
    <div className="glass-panel" style={{ padding: 'clamp(1rem, 3vw, 2rem)', maxWidth: '1000px', margin: '0 auto' }}>
      <div className={styles.pageHeader}>
        <h2 style={{ fontSize: 'clamp(1.2rem, 3vw, 1.6rem)' }}>{isAdminUser ? 'Chỉnh sửa Thông tin Xe Nâng' : 'Thông tin Xe Nâng'}</h2>
        <div className={styles.headerActions}>
          <Link 
            href={`/vi/print-qr?ids=${resolvedParams.id}`} 
            target="_blank"
            className="btn-secondary" 
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              background: '#eff6ff', 
              borderColor: '#bfdbfe', 
              color: '#0284c7',
              textDecoration: 'none',
              fontWeight: 700
            }}
          >
            <FaQrcode /> In QR Dán Xe
          </Link>
          {canChangeStatus && (
            <>
              <button type="button" onClick={() => setIsVideoModalOpen(true)} className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#f5f3ff', borderColor: '#ddd6fe', color: '#5b21b6' }}>
                <FaVideo /> AI Video Studio
              </button>
              <button type="button" onClick={() => setIsAiModalOpen(true)} className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#f0fdf4', borderColor: '#bbf7d0', color: '#166534' }}>
                <FaMagic /> Trợ lý AI Marketing
              </button>
            </>
          )}
          {userRole === 'ADMIN' && (
            <button type="button" onClick={handleDelete} className="btn-danger">Xóa Xe Này</button>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {!isAdminUser && (
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e3a8a', borderRadius: '8px', padding: '0.7rem 1rem', marginBottom: '1rem', fontSize: '0.9rem' }}>
            🔒 {canChangeStatus
              ? 'Tài khoản Sales chỉ xem thông tin xe và được cập nhật Trạng thái (kèm thông tin chốt đơn khi chuyển sang "Đã bán"). Cần sửa thông tin khác, vui lòng liên hệ Admin.'
              : 'Tài khoản chỉ có quyền xem.'}
          </div>
        )}
        <div className={styles.formSection}>
          <h3>1. Thông tin Chung & Nhận diện</h3>
          <fieldset disabled={!isAdminUser} style={{ border: 'none', padding: 0, margin: 0, minWidth: 0 }}>
          <div className={styles.formGrid}>
            <div className="form-group">
              <label className="form-label">Mã nội bộ</label>
              <input name="internalCode" value={formData.internalCode} onChange={handleChange} className="form-control" />
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
            {isAdminUser && (
              <>
                <div className="form-group">
                  <label className="form-label">Nguồn nhập</label>
                  <input name="purchaseSource" value={formData.purchaseSource} onChange={handleChange} className="form-control" />
                </div>
                <div className="form-group">
                  <label className="form-label">Nguồn tham khảo (URL)</label>
                  <input name="sourceUrl" value={formData.sourceUrl} onChange={handleChange} className="form-control" />
                </div>
              </>
            )}
            <div className="form-group">
              <label className="form-label">🎥 Video Review (YouTube / TikTok URL)</label>
              <input name="videoUrl" value={formData.videoUrl} onChange={handleChange} className="form-control" placeholder="https://www.youtube.com/watch?v=... hoặc TikTok" />
            </div>
            <div className="form-group">
              <label className="form-label">ID Hệ Thống</label>
              <input value={formData.id} readOnly className="form-control" style={{ opacity: 0.6 }} />
            </div>
          </div>
          </fieldset>
        </div>

        <div className={styles.formSection}>
          <h3>2. Thông số Kỹ thuật & Tình trạng</h3>
          <fieldset disabled={!isAdminUser} style={{ border: 'none', padding: 0, margin: 0, minWidth: 0 }}>
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
              <label className="form-label">Chiều Cao Nâng Tối Đa</label>
              <input name="liftHeight" value={formData.liftHeight} onChange={handleChange} className="form-control" placeholder="3,000mm..." />
            </div>
            <div className="form-group">
              <label className="form-label">Tải Trọng Nâng Tối Đa</label>
              <input name="loadCapacity" value={formData.loadCapacity} onChange={handleChange} className="form-control" placeholder="2,000kg..." />
            </div>
            <div className="form-group">
              <label className="form-label">Trọng lượng xe</label>
              <input name="weight" value={formData.weight} onChange={handleChange} className="form-control" placeholder="1,500kg..." />
            </div>
          </div>
          </fieldset>
        </div>

        <div className={styles.formSection}>
          <h3>3. Trạng thái & Giá Bán</h3>
          <div className={styles.formGrid}>
            <div className="form-group">
              <label className="form-label">Trạng thái hiện tại</label>
              <select name="status" value={formData.status} onChange={handleChange} className="form-control" disabled={!canChangeStatus}>
                <option value="Draft">Draft (Lưu kho / Bản nháp)</option>
                <option value="Incoming">Incoming (Sắp về kho)</option>
                <option value="Available">Available (Đang bán / Sẵn sàng)</option>
                <option value="Reserved">Reserved (Đã nhận cọc)</option>
                <option value="Sold">Sold (Đã bán)</option>
                <option value="Unpacking">Đang Rút Container</option>
                <option value="InJapan">Nhật Bản</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Giá Bán Đề Xuất (VNĐ)</label>
              <input type="number" name="price" value={formData.price} onChange={handleChange} className="form-control" disabled={!isAdminUser} />
            </div>
          </div>
        </div>

        {formData.status === 'Sold' && (
          <div className={styles.formSection} style={{ background: 'rgba(74, 222, 128, 0.05)', borderColor: 'rgba(74, 222, 128, 0.2)' }}>
            <h3 style={{ color: '#4ade80' }}>Thông tin Chốt Đơn (Khi Đã Bán)</h3>
            <fieldset disabled={!canChangeStatus} style={{ border: 'none', padding: 0, margin: 0, minWidth: 0 }}>
            <div className={styles.formGrid}>
              <div className="form-group">
                <label className="form-label">Giá Bán Thực Tế (VNĐ) *</label>
                <input required type="number" name="soldPrice" value={formData.soldPrice} onChange={handleChange} className="form-control" />
              </div>
              <div className="form-group">
                <label className="form-label">Ngày Bán *</label>
                <input required type="date" name="soldDate" value={formData.soldDate} onChange={handleChange} className="form-control" />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Link Hợp Đồng / Biên Bản Giao Nhận</label>
                <input name="contractUrl" value={formData.contractUrl} onChange={handleChange} className="form-control" placeholder="https://drive.google.com/..." />
              </div>
            </div>
            </fieldset>
          </div>
        )}

        {userRole === 'ADMIN' && (
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
                <div key={index} className={styles.expenseRow}>
                  <input required placeholder="Tên chi phí (VD: Vận chuyển)" value={exp.title} onChange={e => handleExpenseChange(index, 'title', e.target.value)} className="form-control" />
                  <input required type="number" placeholder="Số tiền" value={exp.amount} onChange={e => handleExpenseChange(index, 'amount', e.target.value)} className="form-control" />
                  <input type="date" value={exp.date} onChange={e => handleExpenseChange(index, 'date', e.target.value)} className="form-control" />
                  <input placeholder="Ghi chú" value={exp.note} onChange={e => handleExpenseChange(index, 'note', e.target.value)} className="form-control" />
                  <button type="button" onClick={() => removeExpense(index)} className="btn-danger" style={{ padding: '0.5rem 1rem' }}>Xóa</button>
                </div>
              ))}
              <button type="button" onClick={addExpense} className="btn-secondary" style={{ marginTop: '0.5rem' }}>+ Thêm chi phí</button>
            </div>
            
            <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
              <div className={styles.profitGrid}>
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
        )}

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <button type="button" onClick={() => router.back()} className="btn-secondary">{canChangeStatus ? 'Hủy' : 'Quay lại'}</button>
          {canChangeStatus && (
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Đang lưu...' : isAdminUser ? 'Lập Tức Cập Nhật' : 'Cập Nhật Trạng Thái'}
            </button>
          )}
        </div>
      </form>

      <MediaManager forkliftId={resolvedParams.id} canEdit={isAdminUser} />

      {isAdminUser && <ConditionMap forkliftId={resolvedParams.id} mode="edit" />}
      
      <div className={styles.formSection} style={{ marginTop: '2rem' }}>
        <h3>Lịch sử hoạt động (Timeline)</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
          {activities.length === 0 && <div style={{ color: '#999' }}>Chưa có hoạt động nào được ghi nhận.</div>}
          {activities.map(log => (
            <div key={log.id} style={{ display: 'flex', gap: '1.5rem', borderLeft: '3px solid var(--primary)', paddingLeft: '1.5rem', position: 'relative' }}>
              <div style={{ 
                position: 'absolute', left: '-8px', top: '0', width: '13px', height: '13px', 
                borderRadius: '50%', background: 'var(--primary)', border: '2px solid #fff' 
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold', fontSize: '1.05rem', color: '#111' }}>{log.details}</div>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: '#666', marginTop: '0.3rem' }}>
                  <span>Thực hiện bởi: <strong>{log.user?.name || 'Hệ thống'}</strong></span>
                  <span>{new Date(log.createdAt).toLocaleString('vi-VN')}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <AiMarketingModal 
        isOpen={isAiModalOpen} 
        onClose={() => setIsAiModalOpen(false)} 
        forkliftId={resolvedParams.id} 
      />
      <AiVideoModal 
        isOpen={isVideoModalOpen} 
        onClose={() => setIsVideoModalOpen(false)} 
        forkliftId={resolvedParams.id} 
      />
    </div>
  );
}
