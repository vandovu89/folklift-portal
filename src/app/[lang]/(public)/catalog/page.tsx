import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { parseCapacityKg, parseLiftHeightMm, formatCapacity } from '@/lib/utils';
import { FaGasPump, FaBatteryFull, FaCalendarAlt } from 'react-icons/fa';
import { getDictionary } from '@/dictionaries';
import LangSwitcher from '@/components/LangSwitcher';

import PublicCatalogFilter from './PublicCatalogFilter';
import CatalogInquiryButton from '@/components/CatalogInquiryButton';

export const dynamic = 'force-dynamic';

export default async function PublicCatalog({ 
  params,
  searchParams
}: { 
  params: Promise<{ lang: string }>,
  searchParams: Promise<{ q?: string, maker?: string, powerType?: string, category?: string, capacity?: string, height?: string, price?: string }>
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const dict = await getDictionary(resolvedParams.lang as 'en' | 'vi');

  const whereClause: any = { status: { in: ['Available', 'Incoming', 'Reserved'] } };

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

  return (
    <div>
      <main style={{ padding: '3rem 5%', maxWidth: '1400px', margin: '0 auto', minHeight: '80vh' }}>
        
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
            {forklifts.map((fl) => (
              <div key={fl.id} className="glass-panel hover-scale" style={{ overflow: 'hidden', transition: 'var(--transition)', padding: '1rem', backgroundColor: 'white' }}>
                <Link href={`/${resolvedParams.lang}/machine/${fl.id}`} style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
                {/* Top Section: Image & Title */}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                  {/* Image */}
                  <div style={{ flex: '0 0 38%', height: '120px', background: '#f8fafc', borderRadius: '8px', overflow: 'hidden', position: 'relative' }}>
                    {fl.status === 'Incoming' && <span className="badge" style={{ position: 'absolute', top: 0, left: 0, zIndex: 1, backgroundColor: '#f97316', color: 'white', fontSize: '0.7rem', padding: '0.2rem 0.4rem', borderTopLeftRadius: '8px', borderBottomRightRadius: '8px' }}>Sắp về</span>}
                    {fl.status === 'Reserved' && <span className="badge" style={{ position: 'absolute', top: 0, left: 0, zIndex: 1, backgroundColor: '#eab308', color: 'white', fontSize: '0.7rem', padding: '0.2rem 0.4rem', borderTopLeftRadius: '8px', borderBottomRightRadius: '8px' }}>Đã cọc</span>}
                    
                    {fl.media && fl.media.length > 0 ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={fl.media[0].url} alt={fl.model} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', fontSize: '0.8rem', textAlign: 'center' }}>No image</div>
                    )}
                  </div>
                  
                  {/* Title */}
                  <div style={{ flex: '1' }}>
                    <div style={{ fontSize: '0.85rem', color: '#3b82f6', fontWeight: '700', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
                      {resolvedParams.lang === 'vi' ? 'Xe nâng ' : 'Forklift '}
                    </div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', lineHeight: '1.3', color: '#0f172a', marginBottom: '0.5rem' }}>
                      {fl.maker} {fl.model}
                    </h3>
                    <div style={{ fontSize: '0.85rem', color: '#475569', lineHeight: '1.4' }}>
                      {fl.loadCapacity ? `${formatCapacity(fl.loadCapacity, resolvedParams.lang as 'vi' | 'en')} / ` : ''}
                      {fl.powerType}
                    </div>
                  </div>
                </div>

                {/* Middle Section: Specs Grid */}
                <div style={{ display: 'flex', flexWrap: 'wrap', fontSize: '0.85rem', color: '#334155', marginBottom: '1rem', lineHeight: '1.8' }}>
                  <div style={{ width: '50%', display: 'flex', paddingRight: '0.5rem' }}><span style={{ width: '50%', color: '#0f172a', fontWeight: '600' }}>{resolvedParams.lang === 'vi' ? 'Mã số' : 'Ref No'}</span><span style={{ width: '50%' }}>{fl.internalCode || '-'}</span></div>
                  <div style={{ width: '50%', display: 'flex' }}><span style={{ width: '50%', color: '#0f172a', fontWeight: '600' }}>{resolvedParams.lang === 'vi' ? 'Năm SX' : 'Year'}</span><span style={{ width: '50%' }}>{fl.year || '-'}</span></div>
                  
                  <div style={{ width: '50%', display: 'flex', paddingRight: '0.5rem' }}><span style={{ width: '50%', color: '#0f172a', fontWeight: '600' }}>{resolvedParams.lang === 'vi' ? 'Tải trọng' : 'Capacity'}</span><span style={{ width: '50%' }}>{fl.loadCapacity || '-'}</span></div>
                  <div style={{ width: '50%', display: 'flex' }}><span style={{ width: '50%', color: '#0f172a', fontWeight: '600' }}>{resolvedParams.lang === 'vi' ? 'Nhiên liệu' : 'Fuel'}</span><span style={{ width: '50%' }}>{fl.powerType || '-'}</span></div>
                  
                  <div style={{ width: '50%', display: 'flex', paddingRight: '0.5rem' }}><span style={{ width: '50%', color: '#0f172a', fontWeight: '600' }}>{resolvedParams.lang === 'vi' ? 'Nâng cao' : 'Height'}</span><span style={{ width: '50%' }}>{fl.liftHeight || '-'}</span></div>
                  <div style={{ width: '50%', display: 'flex' }}><span style={{ width: '50%', color: '#0f172a', fontWeight: '600' }}>{resolvedParams.lang === 'vi' ? 'Giờ HĐ' : 'Hours'}</span><span style={{ width: '50%' }}>{fl.hour || '-'}</span></div>
                  
                  <div style={{ width: '100%', display: 'flex', marginTop: '0.2rem' }}><span style={{ width: '25%', color: '#0f172a', fontWeight: '600' }}>{resolvedParams.lang === 'vi' ? 'Phụ kiện' : 'Attach'}</span><span style={{ width: '75%' }}>{fl.attachment || '-'}</span></div>
                </div>

                {/* Price Box */}
                <div style={{ display: 'flex', border: '1px solid #1e293b', borderRadius: '6px', overflow: 'hidden', marginBottom: '1rem' }}>
                  <div style={{ backgroundColor: '#1e293b', color: 'white', padding: '0.4rem', width: '35%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 'bold', letterSpacing: '0.5px' }}>{resolvedParams.lang === 'vi' ? 'Giá bán' : 'Price'}</div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>{resolvedParams.lang === 'vi' ? '(Chưa VAT)' : '(Excl. Tax)'}</div>
                  </div>
                  <div style={{ flex: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff4757', fontWeight: 'bold', fontSize: '1.4rem', padding: '0.5rem' }}>
                    {fl.price ? `${fl.price.toLocaleString('vi-VN')} VNĐ` : dict.common.contact}
                  </div>
                </div>
                </Link>

                {/* Buttons */}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <CatalogInquiryButton 
                    lang={resolvedParams.lang as string}
                    dict={dict}
                    forkliftId={fl.id}
                    forkliftName={`${fl.maker} ${fl.model}`}
                    internalCode={fl.internalCode || ''}
                  />
                  <a href="tel:84362396092" style={{ flex: 1, backgroundColor: 'white', color: '#f97316', border: '1px solid #f97316', textAlign: 'center', padding: '0.75rem', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.95rem', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                    📞 {resolvedParams.lang === 'vi' ? 'Gọi điện' : 'Call'}
                  </a>
                </div>

              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
