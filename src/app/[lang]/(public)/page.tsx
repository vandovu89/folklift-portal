import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getDictionary } from '@/dictionaries';
import { FaGasPump, FaBatteryFull, FaCalendarAlt } from 'react-icons/fa';

export default async function HomePage({ params }: { params: Promise<{ lang: string }> }) {
  const resolvedParams = await params;
  const dict = await getDictionary(resolvedParams.lang as 'en' | 'vi');

  const featuredForklifts = await prisma.forklift.findMany({
    where: { status: 'Published' },
    orderBy: { createdAt: 'desc' },
    take: 4,
    include: {
      media: {
        where: { isPublic: true, fileType: 'IMAGE' },
        take: 1
      }
    }
  });

  return (
    <div>
      {/* Hero Section */}
      <section style={{ 
      height: '85vh', minHeight: '500px',
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(37, 99, 235, 0.8) 100%), url("https://images.unsplash.com/photo-1586528116311-ad8ed7c80a30?q=80&w=2070&auto=format&fit=crop")',
        backgroundSize: 'cover', backgroundPosition: 'center',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'white', textAlign: 'center', padding: '2rem',
        overflowX: 'hidden'
      }}>
        <div style={{ maxWidth: '900px', animation: 'fadeInUp 1s ease-out' }}>
          <span style={{ display: 'inline-block', padding: '0.5rem 1.5rem', background: 'rgba(255,255,255,0.1)', borderRadius: '50px', backdropFilter: 'blur(10px)', marginBottom: '1.5rem', fontSize: '0.9rem', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>
            Việt Nhật
          </span>
          <h1 style={{ fontSize: 'clamp(2rem, 8vw, 4.5rem)', fontWeight: 900, marginBottom: '1.5rem', lineHeight: 1.1, textShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
            {resolvedParams.lang === 'vi' ? 'Giải Pháp Nâng Hạ Toàn Diện' : 'Comprehensive Forklift Solutions'}
          </h1>
          <p style={{ fontSize: '1.25rem', opacity: 0.9, marginBottom: '3rem', lineHeight: 1.8 }}>
            {resolvedParams.lang === 'vi' 
              ? 'Chúng tôi chuyên cung cấp các dòng xe nâng chất lượng cao, nhập khẩu trực tiếp. Đảm bảo hiệu suất vượt trội và độ bền bỉ tối đa cho doanh nghiệp của bạn.' 
              : 'We specialize in providing high-quality, directly imported forklifts. Guaranteeing outstanding performance and maximum durability for your business.'}
          </p>
          <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href={`/${resolvedParams.lang}/catalog`} className="btn-primary" style={{ fontSize: '1.1rem', padding: '1rem 3rem', borderRadius: '50px', background: 'white', color: 'var(--primary)', fontWeight: 700, boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}>
              {dict.nav.catalog}
            </Link>
            <Link href={`/${resolvedParams.lang}/contact`} className="btn-secondary" style={{ fontSize: '1.1rem', padding: '1rem 3rem', borderRadius: '50px', border: '2px solid rgba(255,255,255,0.5)', color: 'white', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(5px)', fontWeight: 700 }}>
              {dict.common.contact}
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section style={{ padding: '7rem 5%', background: 'var(--background)' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
            <h2 style={{ fontSize: '3rem', color: 'var(--foreground)', fontWeight: 900, marginBottom: '1rem', letterSpacing: '-1px' }}>
              {resolvedParams.lang === 'vi' ? 'Sản Phẩm Nổi Bật' : 'Featured Products'}
            </h2>
            <div style={{ width: '100px', height: '5px', background: 'var(--primary)', margin: '0 auto', borderRadius: '5px' }}></div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2.5rem' }}>
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
                      <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--foreground)' }}>{fl.maker} {fl.model}</h3>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '1.2rem', color: '#666', fontSize: '0.95rem', marginBottom: '1.5rem', opacity: 0.9 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <FaCalendarAlt color="var(--primary)" /> {fl.year || 'N/A'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        {fl.powerType === 'BATTERY' ? <FaBatteryFull color="var(--primary)" /> : <FaGasPump color="var(--primary)" />} {fl.powerType}
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed var(--surface-border)', paddingTop: '1.5rem' }}>
                      <div style={{ fontWeight: 900, color: 'var(--danger)', fontSize: '1.4rem' }}>
                        {fl.price ? `¥ ${fl.price.toLocaleString('ja-JP')}` : dict.common.contact}
                      </div>
                      <span style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '0.9rem' }}>Xem chi tiết &rarr;</span>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
          
          <div style={{ textAlign: 'center', marginTop: '5rem' }}>
            <Link href={`/${resolvedParams.lang}/catalog`} className="btn-primary" style={{ padding: '1.2rem 4rem', borderRadius: '50px', fontSize: '1.1rem', fontWeight: 700, boxShadow: '0 10px 25px rgba(37,99,235,0.3)' }}>
              {resolvedParams.lang === 'vi' ? 'Khám Phá Toàn Bộ Danh Mục' : 'Explore Full Catalog'}
            </Link>
          </div>
        </div>
      </section>
      
      {/* Why Choose Us */}
      <section style={{ padding: '8rem 5%', background: 'white' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '3rem', color: 'var(--foreground)', fontWeight: 900, marginBottom: '1rem', letterSpacing: '-1px' }}>
            {resolvedParams.lang === 'vi' ? 'Tại Sao Chọn Chúng Tôi?' : 'Why Choose Us?'}
          </h2>
          <div style={{ width: '100px', height: '5px', background: 'var(--primary)', margin: '0 auto 5rem auto', borderRadius: '5px' }}></div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '3rem' }}>
            {[
              { title: resolvedParams.lang === 'vi' ? 'Chất lượng Đảm bảo' : 'Guaranteed Quality', desc: resolvedParams.lang === 'vi' ? '100% xe nâng được kiểm tra kỹ lưỡng bởi chuyên gia Nhật Bản trước khi giao đến tay khách hàng.' : '100% forklifts are thoroughly inspected by Japanese experts before delivery.', icon: '🏆' },
              { title: resolvedParams.lang === 'vi' ? 'Giá Cả Cạnh Tranh' : 'Competitive Pricing', desc: resolvedParams.lang === 'vi' ? 'Trực tiếp nhập khẩu không qua trung gian, mang đến mức giá tốt nhất cho doanh nghiệp.' : 'Directly imported without intermediaries, bringing the best prices for your business.', icon: '💰' },
              { title: resolvedParams.lang === 'vi' ? 'Hỗ trợ Toàn diện' : 'Comprehensive Support', desc: resolvedParams.lang === 'vi' ? 'Đội ngũ kỹ thuật viên giàu kinh nghiệm luôn sẵn sàng bảo dưỡng và sửa chữa tận nơi.' : 'Experienced technical team always ready for on-site maintenance and repair.', icon: '🛠️' }
            ].map((item, i) => (
              <div key={i} className="hover-lift-sm" style={{ padding: '3rem 2rem', background: 'var(--background)', borderRadius: '24px', cursor: 'default' }}>
                <div style={{ fontSize: '4rem', marginBottom: '2rem', filter: 'drop-shadow(0 10px 10px rgba(0,0,0,0.1))' }}>{item.icon}</div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--foreground)' }}>{item.title}</h3>
                <p style={{ color: '#666', lineHeight: 1.7, fontSize: '1.05rem' }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
