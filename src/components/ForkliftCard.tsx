import Link from 'next/link';
import type { Forklift } from '@prisma/client';
import { formatCapacity } from '@/lib/utils';
import { forkliftImageAlt } from '@/lib/seo';
import CatalogInquiryButton from '@/components/CatalogInquiryButton';
import DownloadForkliftImagesButton from '@/components/DownloadForkliftImagesButton';

export type ForkliftCardData = Forklift & { media: { url: string }[] };

const STATUS_BADGES: Record<string, { label: string; color: string }> = {
  Incoming: { label: 'Sắp về', color: '#f97316' },
  Reserved: { label: 'Đã cọc', color: '#eab308' },
  Unpacking: { label: 'Đang Rút Container', color: '#8b5cf6' },
  InJapan: { label: 'Nhật Bản', color: '#ec4899' },
};

/** Thẻ xe dùng chung cho catalog và các trang đích theo từ khóa. */
export default function ForkliftCard({ fl, lang, dict }: { fl: ForkliftCardData; lang: string; dict: any }) {
  const vi = lang === 'vi';
  const badge = STATUS_BADGES[fl.status];
  const specs: [string, string, React.ReactNode][] = [
    ['Mã số', 'Ref No', fl.internalCode],
    ['Năm SX', 'Year', fl.year],
    ['Tải trọng', 'Capacity', fl.loadCapacity],
    ['Nhiên liệu', 'Fuel', fl.powerType],
    ['Nâng cao', 'Height', fl.liftHeight],
    ['Giờ HĐ', 'Hours', fl.hour],
  ];

  return (
    <div className="glass-panel hover-scale" style={{ overflow: 'hidden', transition: 'var(--transition)', padding: '1rem', backgroundColor: 'white' }}>
      <Link href={`/${lang}/machine/${fl.id}`} style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
        {/* Top Section: Image & Title */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ flex: '0 0 50%', height: '120px', background: '#f8fafc', borderRadius: '8px', overflow: 'hidden', position: 'relative' }}>
            {badge && (
              <span className="badge" style={{ position: 'absolute', top: 0, left: 0, zIndex: 1, backgroundColor: badge.color, color: 'white', fontSize: '0.7rem', padding: '0.2rem 0.4rem', borderTopLeftRadius: '8px', borderBottomRightRadius: '8px' }}>
                {badge.label}
              </span>
            )}
            {fl.media && fl.media.length > 0 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={fl.media[0].url} alt={forkliftImageAlt(fl, lang)} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', fontSize: '0.8rem', textAlign: 'center' }}>No image</div>
            )}
          </div>

          <div style={{ flex: '1' }}>
            <div style={{ fontSize: '0.85rem', color: '#3b82f6', fontWeight: '700', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
              {vi ? 'Xe nâng ' : 'Forklift '}
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', lineHeight: '1.3', color: '#0f172a', marginBottom: '0.5rem' }}>
              {fl.maker} {fl.model}
            </h3>
            <div style={{ fontSize: '0.85rem', color: '#475569', lineHeight: '1.4' }}>
              {fl.loadCapacity ? `${formatCapacity(fl.loadCapacity, vi ? 'vi' : 'en')} / ` : ''}
              {fl.powerType}
            </div>
          </div>
        </div>

        {/* Specs Grid */}
        <div style={{ display: 'flex', flexWrap: 'wrap', fontSize: '0.85rem', color: '#334155', marginBottom: '1rem', lineHeight: '1.8' }}>
          {specs.map(([labelVi, labelEn, value], i) => (
            <div key={labelEn} style={{ width: '50%', display: 'flex', paddingRight: i % 2 === 0 ? '0.5rem' : 0 }}>
              <span style={{ width: '50%', color: '#0f172a', fontWeight: '600' }}>{vi ? labelVi : labelEn}</span>
              <span style={{ width: '50%' }}>{value || '-'}</span>
            </div>
          ))}
          <div style={{ width: '100%', display: 'flex', marginTop: '0.2rem' }}>
            <span style={{ width: 'calc(25% - 0.25rem)', color: '#0f172a', fontWeight: '600' }}>{vi ? 'Phụ kiện' : 'Attach'}</span>
            <span style={{ width: 'calc(75% + 0.25rem)' }}>{fl.attachment || '-'}</span>
          </div>
        </div>

        {/* Price Box */}
        <div style={{ display: 'flex', flexDirection: 'column', borderLeft: '3px solid #cbd5e1', paddingLeft: '1rem', marginBottom: '1rem', marginTop: '1rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
            {vi ? 'Giá bán (Đã gồm VAT)' : 'Sales Price (Incl. Tax)'}
          </div>
          <div style={{ color: '#c2272d', fontWeight: 900, fontSize: '1.6rem', letterSpacing: '-0.5px', lineHeight: 1 }}>
            {fl.price ? (
              <>
                {fl.price.toLocaleString('vi-VN')}
                <span style={{ fontSize: '0.9rem', color: '#475569', marginLeft: '0.2rem', fontWeight: 700 }}>VNĐ</span>
              </>
            ) : (
              dict.common.contact
            )}
          </div>
        </div>
      </Link>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
        <CatalogInquiryButton
          lang={lang}
          dict={dict}
          forkliftId={fl.id}
          forkliftName={`${fl.maker} ${fl.model}`}
          internalCode={fl.internalCode || ''}
        />
        <a href="tel:84362396092" style={{ flex: 1, minWidth: '85px', backgroundColor: 'white', color: '#f97316', border: '1px solid #f97316', textAlign: 'center', padding: '0.75rem 0.5rem', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.9rem', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
          📞 {vi ? 'Gọi' : 'Call'}
        </a>
        <DownloadForkliftImagesButton
          forkliftId={fl.id}
          forkliftName={`${fl.maker} ${fl.model}`}
          internalCode={fl.internalCode || ''}
          lang={lang}
          variant="card"
        />
      </div>
    </div>
  );
}
