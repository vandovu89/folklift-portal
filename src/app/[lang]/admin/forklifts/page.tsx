import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import styles from './forklifts.module.css';
import ForkliftFilter from './ForkliftFilter';
import ForkliftTable from './ForkliftTable';

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

      <ForkliftTable forklifts={forklifts} />
    </div>
  );
}
