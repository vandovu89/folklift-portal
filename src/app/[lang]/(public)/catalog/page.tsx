import type { Metadata } from 'next';
import { pageMetadata, PUBLIC_FORKLIFT_STATUSES } from '@/lib/seo';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { parseCapacityKg, parseLiftHeightMm } from '@/lib/utils';
import { getDictionary } from '@/dictionaries';

import PublicCatalogFilter from './PublicCatalogFilter';
import ForkliftCard from '@/components/ForkliftCard';
import Pagination from '@/components/Pagination';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const isEn = lang === 'en';
  return pageMetadata({
    lang,
    path: '/catalog',
    title: isEn ? 'Used Japanese Forklifts in Stock – Electric, Diesel, LPG' : 'Danh Sách Xe Nâng Cũ Nhật Bản – Xe Nâng Điện, Dầu, Gas Có Sẵn',
    description: isEn ? 'Browse every used Japanese forklift in stock at MCK: electric, diesel and LPG forklifts 1–5 t from Toyota, Komatsu, TCM, Nichiyu, Mitsubishi. Real photos, published prices.' : 'Xem toàn bộ xe nâng cũ Nhật Bản đang có tại kho Xe Nâng MCK: xe nâng điện cũ, xe nâng dầu, xe nâng gas 1–5 tấn của Toyota, Komatsu, TCM, Nichiyu, Mitsubishi. Hình ảnh thực tế, giá công khai.',
  });
}

export default async function PublicCatalog({ 
  params,
  searchParams
}: { 
  params: Promise<{ lang: string }>,
  searchParams: Promise<{ q?: string, maker?: string, powerType?: string, category?: string, capacity?: string, height?: string, price?: string, page?: string }>
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const dict = await getDictionary(resolvedParams.lang as 'en' | 'vi');

  const whereClause: any = { status: { in: PUBLIC_FORKLIFT_STATUSES } };

  const andConditions: any[] = [];
  
  if (resolvedSearchParams.q) {
    andConditions.push({
      OR: [
        { maker: { contains: resolvedSearchParams.q, mode: 'insensitive' } },
        { model: { contains: resolvedSearchParams.q, mode: 'insensitive' } },
        { internalCode: { contains: resolvedSearchParams.q, mode: 'insensitive' } }
      ]
    });
  }

  if (resolvedSearchParams.maker) {
    andConditions.push({ maker: resolvedSearchParams.maker });
  }

  if (resolvedSearchParams.powerType) {
    const ptClean = resolvedSearchParams.powerType.toLowerCase();
    if (ptClean === 'battery') {
      andConditions.push({ OR: [{ powerType: { contains: 'điện', mode: 'insensitive' } }, { powerType: { contains: 'battery', mode: 'insensitive' } }] });
    } else if (ptClean === 'diesel') {
      andConditions.push({ OR: [{ powerType: { contains: 'dầu', mode: 'insensitive' } }, { powerType: { contains: 'diesel', mode: 'insensitive' } }] });
    } else if (ptClean === 'gasoline') {
      andConditions.push({ OR: [{ powerType: { contains: 'xăng', mode: 'insensitive' } }, { powerType: { contains: 'gas', mode: 'insensitive' } }] });
    } else {
      andConditions.push({ powerType: resolvedSearchParams.powerType });
    }
  }

  if (resolvedSearchParams.category) {
    const catClean = resolvedSearchParams.category.toLowerCase();
    if (catClean === 'counter') {
      andConditions.push({ OR: [{ category: { contains: 'ngồi', mode: 'insensitive' } }, { category: { contains: 'counter', mode: 'insensitive' } }] });
    } else if (catClean === 'reach') {
      andConditions.push({ OR: [{ category: { contains: 'đứng', mode: 'insensitive' } }, { category: { contains: 'reach', mode: 'insensitive' } }] });
    } else {
      andConditions.push({ category: resolvedSearchParams.category });
    }
  }

  if (andConditions.length > 0) {
    whereClause.AND = andConditions;
  }

  if (resolvedSearchParams.price) {
    const price = resolvedSearchParams.price;
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
        where: { isPublic: true, fileType: 'IMAGE' },
        orderBy: [
          { isThumbnail: 'desc' },
          { createdAt: 'asc' }
        ],
        take: 1
      }
    }
  });

  if (resolvedSearchParams.capacity) {
    const capacity = resolvedSearchParams.capacity;
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

  if (resolvedSearchParams.height) {
    const height = resolvedSearchParams.height;
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

  const ITEMS_PER_PAGE = 24;
  const page = parseInt(resolvedSearchParams.page || '1', 10);
  const totalItems = forklifts.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const paginatedForklifts = forklifts.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  return (
    <div>
      <main style={{ padding: '3rem 5%', maxWidth: '1600px', margin: '0 auto', minHeight: '80vh' }}>
        
        <PublicCatalogFilter lang={resolvedParams.lang as 'en' | 'vi'} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', color: 'var(--primary)' }}>{dict.home.title} ({forklifts.length})</h2>
        </div>

        {forklifts.length === 0 ? (
          <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center' }}>
            <h3 style={{ color: '#666' }}>{dict.home.empty_state}</h3>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2rem' }}>
            {paginatedForklifts.map((fl) => (
              <ForkliftCard key={fl.id} fl={fl} lang={resolvedParams.lang} dict={dict} />
            ))}
          </div>
        )}
        
        {totalPages > 1 && (
          <Pagination currentPage={page} totalPages={totalPages} />
        )}
      </main>
    </div>
  );
}
