import { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import Image from 'next/image';
import Link from 'next/link';
import { FaStar, FaQuoteLeft, FaCheckCircle, FaMapMarkerAlt, FaTruck } from 'react-icons/fa';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  return {
    title: lang === 'en'
      ? 'Customer Deliveries & Testimonials | MCK Japan Forklift'
      : 'Góc Khách Hàng - Hình Ảnh Bàn Giao & Đánh Giá | Xe Nâng MCK Japan',
    description: lang === 'en'
      ? 'Actual forklift delivery photos, company customer stories, and genuine reviews.'
      : 'Hình ảnh bàn giao xe nâng thực tế tại nhà máy kho xưởng, đánh giá và cảm nhận thực tế từ các doanh nghiệp đối tác.'
  };
}

export default async function CustomerStoriesPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const isEn = lang === 'en';

  const stories = await prisma.testimonial.findMany({
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div style={{ background: '#f8fafc', minHeight: '85vh', paddingBottom: '6rem' }}>
      
      {/* Banner Header */}
      <div style={{ background: 'linear-gradient(135deg, #0369a1 0%, #0284c7 100%)', padding: '4.5rem 5%', color: 'white', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.15)', padding: '0.4rem 1.2rem', borderRadius: '50px', fontSize: '0.9rem', marginBottom: '1.2rem' }}>
          <FaCheckCircle color="#38bdf8" /> {isEn ? '100% Genuine Partner Feedback' : 'Minh Bạch & Uy Tín Với Hơn 500+ Khách Hàng'}
        </div>
        <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 800, marginBottom: '1rem' }}>
          {isEn ? 'Customer Stories & Deliveries' : 'Góc Khách Hàng & Hình Ảnh Bàn Giao'}
        </h1>
        <p style={{ opacity: 0.95, maxWidth: '750px', margin: '0 auto', fontSize: '1.1rem', lineHeight: 1.6 }}>
          {isEn
            ? 'Real moments delivering Japanese imported forklifts directly to our enterprise clients across Vietnam.'
            : 'Khoảnh khắc bàn giao xe nâng Nhật Bản nhập khẩu nguyên bản trực tiếp tại nhà máy, kho xưởng của các đối tác trên toàn quốc.'}
        </p>
      </div>

      {/* Content Container */}
      <div style={{ maxWidth: '1280px', margin: '-2.5rem auto 0 auto', padding: '0 1.5rem' }}>
        
        {stories.length === 0 ? (
          <div style={{ background: 'white', padding: '4rem', textAlign: 'center', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
            <p style={{ color: '#64748b', fontSize: '1.1rem' }}>Hiện chưa có câu chuyện nào được đăng tải.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '2rem' }}>
            {stories.map((item) => (
              <div 
                key={item.id}
                style={{
                  background: 'white',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.06)',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                }}
              >
                {/* Ảnh Bàn Giao */}
                <div style={{ position: 'relative', width: '100%', height: '240px', background: '#0f172a' }}>
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                      src={item.imageUrl} 
                      alt={item.customerName}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                      <FaTruck size={48} />
                    </div>
                  )}

                  {item.forkliftModel && (
                    <div style={{
                      position: 'absolute',
                      bottom: '12px',
                      left: '12px',
                      background: 'rgba(15, 23, 42, 0.85)',
                      backdropFilter: 'blur(6px)',
                      color: 'white',
                      padding: '0.35rem 0.8rem',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}>
                      ⚡ {item.forkliftModel}
                    </div>
                  )}
                </div>

                {/* Nội Dung Review */}
                <div style={{ padding: '2rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  
                  {/* Rating Stars */}
                  <div style={{ display: 'flex', gap: '3px', marginBottom: '1rem', color: '#f59e0b' }}>
                    {Array.from({ length: item.rating }).map((_, i) => (
                      <FaStar key={i} size={18} />
                    ))}
                  </div>

                  {/* Lời Nhận Xét */}
                  <div style={{ position: 'relative', flex: 1, marginBottom: '1.5rem' }}>
                    <FaQuoteLeft size={24} color="#e2e8f0" style={{ position: 'absolute', top: '-10px', left: '-5px', zIndex: 0 }} />
                    <p style={{ position: 'relative', zIndex: 1, color: '#334155', lineHeight: 1.7, fontSize: '0.98rem', margin: 0, fontStyle: 'italic' }}>
                      &ldquo;{item.content}&rdquo;
                    </p>
                  </div>

                  {/* Thông Tin Khách Hàng */}
                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.2rem', marginTop: 'auto' }}>
                    <strong style={{ display: 'block', fontSize: '1.05rem', color: '#0f172a' }}>
                      {item.customerName}
                    </strong>
                    {item.companyName && (
                      <div style={{ fontSize: '0.9rem', color: '#0284c7', fontWeight: 600, marginTop: '2px' }}>
                        {item.companyName}
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748b', marginTop: '6px' }}>
                      {item.location && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <FaMapMarkerAlt color="#ef4444" /> {item.location}
                        </span>
                      )}
                      {item.deliveryDate && (
                        <span>
                          {new Date(item.deliveryDate).toLocaleDateString(isEn ? 'en-US' : 'vi-VN')}
                        </span>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            ))}
          </div>
        )}

        {/* CTA Báo Giá Cuối Trang */}
        <div style={{ marginTop: '4rem', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', borderRadius: '20px', padding: '3.5rem 2rem', textAlign: 'center', color: 'white' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '1rem' }}>
            {isEn ? 'Need a Reliable Forklift for your Warehouse?' : 'Doanh nghiệp của bạn đang cần nâng cấp xe nâng?'}
          </h2>
          <p style={{ color: '#94a3b8', maxWidth: '650px', margin: '0 auto 2rem auto', fontSize: '1.05rem', lineHeight: 1.6 }}>
            {isEn 
              ? 'Browse our extensive stock of Japanese electric and diesel forklifts with tested battery health.'
              : 'Khám phá ngay kho xe nâng bãi Nhật nhập khẩu nguyên bản tại Sóc Sơn, được bảo hành bình ắc quy và bo mạch 3 tháng.'}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <Link 
              href={`/${lang}/catalog`}
              style={{
                background: 'var(--primary)',
                color: 'white',
                padding: '0.9rem 2rem',
                borderRadius: '8px',
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(194, 39, 45, 0.4)'
              }}
            >
              Xem Kho Xe Nâng &rarr;
            </Link>
            <a 
              href="tel:0362396092"
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: 'white',
                padding: '0.9rem 2rem',
                borderRadius: '8px',
                fontWeight: 700,
                textDecoration: 'none'
              }}
            >
              📞 Hotline: 0362-396-092
            </a>
          </div>
        </div>

      </div>

    </div>
  );
}
