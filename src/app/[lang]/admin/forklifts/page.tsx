import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { parseCapacityKg, parseLiftHeightMm } from '@/lib/utils';
import styles from './forklifts.module.css';
import ForkliftFilter from './ForkliftFilter';
import ForkliftTable from './ForkliftTable';

export const dynamic = 'force-dynamic';

export default async function ForkliftsPage({ searchParams }: { searchParams: Promise<{ q?: string, status?: string, category?: string, capacity?: string, height?: string, price?: string }> }) {
  const resolvedParams = await searchParams;
  const q = resolvedParams.q || '';
  const status = resolvedParams.status || '';
  const category = resolvedParams.category || '';
  const capacity = resolvedParams.capacity || '';
  const height = resolvedParams.height || '';
  const price = resolvedParams.price || '';

  const whereClause: any = {};
  
  if (q) {
    whereClause.OR = [
      { maker: { contains: q, mode: 'insensitive' } },
      { model: { contains: q, mode: 'insensitive' } },
      { internalCode: { contains: q, mode: 'insensitive' } },
      { serialNo: { contains: q, mode: 'insensitive' } },
      { id: { contains: q } }
    ];
  }
  
  if (status) {
    whereClause.status = status;
  }
  
  if (category) {
    whereClause.category = category;
  }

  if (price) {
    if (price.startsWith('<')) {
      whereClause.price = { lt: Number(price.replace('<', '')) };
    } else if (price.startsWith('>')) {
      whereClause.price = { gt: Number(price.replace('>', '')) };
    } else if (price.includes('-')) {
      const [min, max] = price.split('-');
      whereClause.price = { gte: Number(min), lte: Number(max) };
    }
  }

  let forklifts = await prisma.forklift.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
    include: {
      media: {
        where: { fileType: 'IMAGE' },
        orderBy: [
          { isThumbnail: 'desc' },
          { createdAt: 'asc' }
        ],
        take: 1
      }
    }
  });

  if (capacity) {
    let minCap = 0, maxCap = Infinity;
    if (capacity.startsWith('<')) maxCap = Number(capacity.replace('<', ''));
    else if (capacity.startsWith('>')) minCap = Number(capacity.replace('>', ''));
    else if (capacity.includes('-')) {
      const [min, max] = capacity.split('-');
      minCap = Number(min);
      maxCap = Number(max);
    }
    forklifts = forklifts.filter(f => {
      const cap = parseCapacityKg(f.loadCapacity);
      if (cap === null) return false;
      return cap >= minCap && cap <= maxCap;
    });
  }

  if (height) {
    let minHeight = 0, maxHeight = Infinity;
    if (height.startsWith('<')) maxHeight = Number(height.replace('<', ''));
    else if (height.startsWith('>')) minHeight = Number(height.replace('>', ''));
    else if (height.includes('-')) {
      const [min, max] = height.split('-');
      minHeight = Number(min);
      maxHeight = Number(max);
    }
    forklifts = forklifts.filter(f => {
      const h = parseLiftHeightMm(f.liftHeight);
      if (h === null) return false;
      return h >= minHeight && h <= maxHeight;
    });
  }

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1>Quản lý Xe Nâng ({forklifts.length})</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <a href="/api/forklifts/export" download className="btn-secondary" style={{ backgroundColor: '#107c41', color: 'white', borderColor: '#107c41' }}>
            📤 Export Excel
          </a>
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
