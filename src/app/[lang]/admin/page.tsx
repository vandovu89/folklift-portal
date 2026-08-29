import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { FaTractor, FaBoxOpen, FaEye } from 'react-icons/fa';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const total = await prisma.forklift.count();
  const published = await prisma.forklift.count({ where: { status: 'Published' } });

  return (
    <div>
      <h1 style={{ marginBottom: '2rem' }}>Bảng điều khiển</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="glass-panel" style={{ padding: '2rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ backgroundColor: 'rgba(37, 99, 235, 0.1)', padding: '1rem', borderRadius: '50%', color: 'var(--primary)' }}>
            <FaTractor size={30} />
          </div>
          <div>
            <div style={{ fontSize: '0.9rem', color: '#666' }}>Tổng số xe nâng</div>
            <div style={{ fontSize: '2rem', fontWeight: 800 }}>{total}</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '2rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', padding: '1rem', borderRadius: '50%', color: 'var(--success)' }}>
            <FaEye size={30} />
          </div>
          <div>
            <div style={{ fontSize: '0.9rem', color: '#666' }}>Đang đăng bán Web</div>
            <div style={{ fontSize: '2rem', fontWeight: 800 }}>{published}</div>
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Chào mừng đến với hệ thống quản lý</h3>
        <p style={{ color: '#666', marginBottom: '1.5rem' }}>Hệ thống Forklift Portal (Phase 1) đang hoạt động ổn định.</p>
        <Link href="/admin/forklifts" className="btn-primary">
          Xem & Quản lý danh sách xe
        </Link>
      </div>
    </div>
  );
}
