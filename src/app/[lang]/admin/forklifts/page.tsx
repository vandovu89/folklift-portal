import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import styles from './forklifts.module.css';
import ForkliftFilter from './ForkliftFilter';

export const dynamic = 'force-dynamic';

export default async function ForkliftsPage({ searchParams }: { searchParams: Promise<{ q?: string, status?: string, category?: string }> }) {
  const resolvedParams = await searchParams;
  const q = resolvedParams.q || '';
  const status = resolvedParams.status || '';
  const category = resolvedParams.category || '';

  const whereClause: any = {};
  
  if (q) {
    whereClause.OR = [
      { maker: { contains: q } },
      { model: { contains: q } },
      { stockNo: { contains: q } },
      { internalCode: { contains: q } }
    ];
  }
  
  if (status) {
    whereClause.status = status;
  }
  
  if (category) {
    whereClause.category = category;
  }

  const forklifts = await prisma.forklift.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1>Quản lý Xe Nâng</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Link href="/admin/forklifts/import" className="btn-secondary" style={{ backgroundColor: '#217346', color: 'white', borderColor: '#217346' }}>
            📥 Import Excel
          </Link>
          <Link href="/admin/forklifts/add" className="btn-primary">
            + Thêm Xe Nâng
          </Link>
        </div>
      </div>

      <ForkliftFilter />

      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Mã Nội Bộ</th>
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
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                  Chưa có dữ liệu xe nâng nào.
                </td>
              </tr>
            ) : (
              forklifts.map((fl) => (
                <tr key={fl.id}>
                  <td><strong>{fl.internalCode || fl.stockNo || '-'}</strong></td>
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
    </div>
  );
}
