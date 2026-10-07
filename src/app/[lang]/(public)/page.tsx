import Link from 'next/link';
import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { formatCapacity } from '@/lib/utils';
import { getDictionary } from '@/dictionaries';
import { FaGasPump, FaBatteryFull, FaCalendarAlt } from 'react-icons/fa';
import { FadeIn } from '@/components/animations/FadeIn';
import { StaggerContainer } from '@/components/animations/StaggerContainer';
import HeroSlider from '@/components/HeroSlider';
import HomeQuickSearch from '@/components/HomeQuickSearch';

export default async function HomePage({ params }: { params: Promise<{ lang: string }> }) {
  const resolvedParams = await params;
  const dict = await getDictionary(resolvedParams.lang as 'en' | 'vi');

  let sliderImages: string[] = [];
  try {
    const sliderDir = path.join(process.cwd(), 'public', 'slider');
    if (fs.existsSync(sliderDir)) {
      const files = fs.readdirSync(sliderDir);
      sliderImages = files
        .filter(f => f.toLowerCase().match(/\.(jpg|jpeg|png|webp)$/))
        .map(f => `/slider/${f}`);
    }
  } catch (error) {
    console.error('Error reading slider directory:', error);
  }

  const featuredForklifts = await prisma.forklift.findMany({
    where: { status: { in: ['Available', 'Incoming', 'Reserved', 'Unpacking', 'InJapan'] } },
    orderBy: { createdAt: 'desc' },
    take: 6,
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

  const stats = [
    { number: '500+', label: resolvedParams.lang === 'vi' ? 'Xe sẵn sàng giao' : 'Forklifts Ready' },
    { number: '10+', label: resolvedParams.lang === 'vi' ? 'Năm kinh nghiệm' : 'Years Experience' },
    { number: '12', label: resolvedParams.lang === 'vi' ? 'Tháng bảo hành' : 'Months Warranty' },
    { number: '24/7', label: resolvedParams.lang === 'vi' ? 'Hỗ trợ kỹ thuật' : 'Technical Support' },
  ];

  const brands = ['TOYOTA', 'KOMATSU', 'TCM', 'MITSUBISHI', 'NISSAN', 'NICHIYU'];

  return (
    <div>
      {/* Hero Section */}
      <HeroSlider dict={dict} lang={resolvedParams.lang} images={sliderImages} />
      
      {/* Quick Search */}
      <div style={{ padding: '0 5%' }}>
        <HomeQuickSearch lang={resolvedParams.lang} />
      </div>

      {/* Brands Section */}
      <section style={{ padding: '3rem 5%', background: 'white', textAlign: 'center' }}>
        <h3 style={{ fontSize: '1.2rem', color: '#64748b', fontWeight: 600, marginBottom: '2rem', textTransform: 'uppercase', letterSpacing: '2px' }}>
          {resolvedParams.lang === 'vi' ? 'Các Thương Hiệu Hàng Đầu' : 'Top Brands We Carry'}
        </h3>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '3rem', flexWrap: 'wrap', opacity: 0.7 }}>
          {brands.map(brand => (
            <Link key={brand} href={`/${resolvedParams.lang}/catalog?maker=${brand}`} style={{ textDecoration: 'none', color: '#1e293b', fontWeight: 900, fontSize: '1.8rem', letterSpacing: '-1px' }}>
              {brand}
            </Link>
          ))}
        </div>
      </section>

      {/* Stats Section */}
      <section style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)', color: 'white', padding: '5rem 5%' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem', textAlign: 'center' }}>
          {stats.map((stat, idx) => (
            <div key={idx}>
              <div style={{ fontSize: '3.5rem', fontWeight: 900, color: '#38bdf8', marginBottom: '0.5rem' }}>{stat.number}</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, opacity: 0.9 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section style={{ padding: '7rem 5%', background: 'var(--background)' }}>
        <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
          <FadeIn direction="up">
            <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
              <h2 style={{ fontSize: '3rem', color: 'var(--foreground)', fontWeight: 900, marginBottom: '1rem', letterSpacing: '-1px' }}>
                {resolvedParams.lang === 'vi' ? 'Sản Phẩm Nổi Bật' : 'Featured Products'}
              </h2>
              <div style={{ width: '100px', height: '5px', background: 'var(--primary)', margin: '0 auto', borderRadius: '5px' }}></div>
            </div>
          </FadeIn>

          <StaggerContainer style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2.5rem' }}>
            {featuredForklifts.map(fl => (
              <div key={fl.id} className="glass-panel hover-lift" style={{ overflow: 'hidden', cursor: 'pointer', borderRadius: '24px', border: '1px solid rgba(0,0,0,0.05)' }}>
                <Link href={`/${resolvedParams.lang}/machine/${fl.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ height: '280px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
                    {fl.media && fl.media.length > 0 ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={fl.media[0].url} alt={fl.model} className="hover-scale" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    ) : (
                      <span style={{ color: '#ccc' }}>[ NO IMAGE ]</span>
                    )}
                  </div>
                  <div style={{ padding: '2rem', borderTop: '1px solid var(--surface-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                      <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--foreground)', textTransform: 'uppercase' }}>
                        {resolvedParams.lang === 'vi' ? 'Xe nâng ' : 'Forklift '}
                        {fl.loadCapacity ? `${formatCapacity(fl.loadCapacity, resolvedParams.lang as 'vi' | 'en')} ` : ''}
                        {fl.maker} {fl.model}
                      </h3>
                      {fl.status === 'Incoming' && <span className="badge" style={{ backgroundColor: '#f97316', color: 'white', whiteSpace: 'nowrap' }}>Sắp về</span>}
                      {fl.status === 'Reserved' && <span className="badge" style={{ backgroundColor: '#eab308', color: 'white', whiteSpace: 'nowrap' }}>Đã cọc</span>}
                      {fl.status === 'Available' && <span className="badge badge-success" style={{ whiteSpace: 'nowrap' }}>Sẵn sàng</span>}
                      {fl.status === 'Unpacking' && <span className="badge" style={{ backgroundColor: '#8b5cf6', color: 'white', whiteSpace: 'nowrap' }}>Đang Rút Container</span>}
                      {fl.status === 'InJapan' && <span className="badge" style={{ backgroundColor: '#ec4899', color: 'white', whiteSpace: 'nowrap' }}>Nhật Bản</span>}
                    </div>
                    
                    <div style={{ display: 'flex', gap: '1.2rem', color: '#666', fontSize: '0.95rem', marginBottom: '1.5rem', opacity: 0.9 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <FaCalendarAlt color="var(--primary)" /> {fl.year || 'N/A'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        {fl.powerType === 'BATTERY' ? <FaBatteryFull color="var(--primary)" /> : <FaGasPump color="var(--primary)" />} {fl.powerType}
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px dashed var(--surface-border)', paddingTop: '1.5rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', borderLeft: '3px solid #cbd5e1', paddingLeft: '0.8rem' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.2rem' }}>
                          {resolvedParams.lang === 'vi' ? 'Giá bán' : 'Price'}
                        </div>
                        <div style={{ color: '#c2272d', fontWeight: 900, fontSize: '1.4rem', letterSpacing: '-0.5px', lineHeight: 1 }}>
                          {fl.price ? (
                            <>
                              {fl.price.toLocaleString('vi-VN')}
                              <span style={{ fontSize: '0.85rem', color: '#475569', marginLeft: '0.2rem', fontWeight: 700 }}>VNĐ</span>
                            </>
                          ) : (
                            dict.common.contact
                          )}
                        </div>
                      </div>
                      <span style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.2rem' }}>Xem chi tiết &rarr;</span>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </StaggerContainer>
          
          <div style={{ textAlign: 'center', marginTop: '5rem' }}>
            <Link href={`/${resolvedParams.lang}/catalog`} className="btn-primary" style={{ padding: '1.2rem 4rem', borderRadius: '50px', fontSize: '1.1rem', fontWeight: 700, boxShadow: '0 10px 25px rgba(37,99,235,0.3)' }}>
              {resolvedParams.lang === 'vi' ? 'Khám Phá Toàn Bộ Danh Mục' : 'Explore Full Catalog'}
            </Link>
          </div>
        </div>
      </section>
      
      {/* Why Choose Us */}
      <section style={{ padding: '8rem 5%', background: 'white' }}>
        <div style={{ maxWidth: '1600px', margin: '0 auto', textAlign: 'center' }}>
          <FadeIn direction="up">
            <h2 style={{ fontSize: '3rem', color: 'var(--foreground)', fontWeight: 900, marginBottom: '1rem', letterSpacing: '-1px' }}>
              {resolvedParams.lang === 'vi' ? 'Tại Sao Chọn Chúng Tôi?' : 'Why Choose Us?'}
            </h2>
            <div style={{ width: '100px', height: '5px', background: 'var(--primary)', margin: '0 auto 5rem auto', borderRadius: '5px' }}></div>
          </FadeIn>
          
          <StaggerContainer style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '3rem' }}>
            {[
              { title: resolvedParams.lang === 'vi' ? 'Chất lượng Đảm bảo' : 'Guaranteed Quality', desc: resolvedParams.lang === 'vi' ? '100% xe nâng được kiểm tra kỹ lưỡng bởi chuyên gia Nhật Bản trước khi giao đến tay khách hàng.' : '100% forklifts are thoroughly inspected by Japanese experts before delivery.', icon: '🏆' },
              { title: resolvedParams.lang === 'vi' ? 'Giá Cả Cạnh Tranh' : 'Competitive Pricing', desc: resolvedParams.lang === 'vi' ? 'Trực tiếp nhập khẩu không qua trung gian, mang đến mức giá tốt nhất cho doanh nghiệp.' : 'Directly imported without intermediaries, bringing the best prices for your business.', icon: '💰' },
              { title: resolvedParams.lang === 'vi' ? 'Hỗ trợ Toàn diện' : 'Comprehensive Support', desc: resolvedParams.lang === 'vi' ? 'Đội ngũ kỹ thuật viên giàu kinh nghiệm luôn sẵn sàng bảo dưỡng và sửa chữa tận nơi.' : 'Experienced technical team always ready for on-site maintenance and repair.', icon: '🛠️' }
            ].map((item, i) => (
              <div key={i} className="glass-panel hover-lift-sm" style={{ padding: '3rem 2rem', borderRadius: '24px', cursor: 'default', background: 'var(--surface)' }}>
                <div className={i % 2 === 0 ? "float-anim" : "float-anim-delay"} style={{ fontSize: '4rem', marginBottom: '2rem', filter: 'drop-shadow(0 10px 10px rgba(79, 70, 229, 0.2))' }}>{item.icon}</div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--foreground)' }}>{item.title}</h3>
                <p style={{ color: '#666', lineHeight: 1.7, fontSize: '1.05rem' }}>{item.desc}</p>
              </div>
            ))}
          </StaggerContainer>
        </div>
      </section>
    </div>
  );
}
