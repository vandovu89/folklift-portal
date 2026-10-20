import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { FaTractor, FaBoxOpen, FaEye, FaUsers, FaMoneyBillWave } from 'react-icons/fa';
import styles from './admin.module.css';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const total = await prisma.forklift.count();
  const published = await prisma.forklift.count({ where: { status: 'Available' } });
  
  // Tổng giá trị tồn kho (CostPrice của các xe chưa bán)
  const forkliftsInStock = await prisma.forklift.findMany({
    where: { status: { notIn: ['Sold', 'Delivered'] } },
    select: { costPrice: true }
  });
  const totalValue = forkliftsInStock.reduce((acc, curr) => acc + (curr.costPrice || 0), 0);
  
  // Total Inquiries
  const totalInquiries = await prisma.inquiry.count({ where: { status: 'New' } });

  // Recent Activities
  const recentActivities = await prisma.activityLog.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { name: true } } }
  });

  return (
    <div>
      <h1 style={{ marginBottom: '1.5rem', fontSize: 'clamp(1.4rem, 4vw, 1.8rem)' }}>Bảng điều khiển</h1>
      
      <div className={styles.dashboardStatsGrid}>
        <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ backgroundColor: 'rgba(37, 99, 235, 0.1)', padding: '0.85rem', borderRadius: '50%', color: 'var(--primary)', flexShrink: 0 }}>
            <FaTractor size={26} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.85rem', color: '#666', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Tổng số xe nâng</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, overflowWrap: 'break-word' }}>{total}</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', padding: '0.85rem', borderRadius: '50%', color: 'var(--success)', flexShrink: 0 }}>
            <FaEye size={26} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.85rem', color: '#666', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Đang bán trên Web</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, overflowWrap: 'break-word' }}>{published}</div>
          </div>
        </div>
        
        <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ backgroundColor: 'rgba(234, 179, 8, 0.1)', padding: '0.85rem', borderRadius: '50%', color: '#eab308', flexShrink: 0 }}>
            <FaUsers size={26} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.85rem', color: '#666', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Yêu cầu (Inquiry)</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, overflowWrap: 'break-word' }}>{totalInquiries}</div>
          </div>
        </div>
        
        <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '0.85rem', borderRadius: '50%', color: '#ef4444', flexShrink: 0 }}>
            <FaMoneyBillWave size={26} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.85rem', color: '#666', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Giá trị Tồn kho</div>
            <div style={{ fontSize: 'clamp(1.2rem, 3vw, 1.5rem)', fontWeight: 800, overflowWrap: 'break-word', lineHeight: '1.2' }}>{totalValue.toLocaleString()} ¥</div>
          </div>
        </div>
      </div>

      <div className={styles.dashboardMainGrid}>
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Chào mừng đến với hệ thống quản lý</h3>
          <p style={{ color: '#666', marginBottom: '1.5rem' }}>Hệ thống Forklift Portal (Phase 2) đã cập nhật luồng CRM & Costing.</p>
          <Link href="/admin/forklifts" className="btn-primary">
            Xem & Quản lý danh sách xe
          </Link>
        </div>
        
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>Hoạt động gần đây</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {recentActivities.length === 0 && <div style={{ color: '#999', fontSize: '0.9rem' }}>Chưa có hoạt động nào</div>}
            {recentActivities.map(log => (
              <div key={log.id} style={{ borderLeft: '3px solid var(--primary)', paddingLeft: '1rem', fontSize: '0.85rem' }}>
                <div style={{ fontWeight: 'bold', color: '#333' }}>{log.user?.name || 'Hệ thống'}</div>
                <div style={{ color: '#555', margin: '0.2rem 0' }}>{log.details}</div>
                <div style={{ color: '#999', fontSize: '0.75rem' }}>{new Date(log.createdAt).toLocaleString('vi-VN')}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
