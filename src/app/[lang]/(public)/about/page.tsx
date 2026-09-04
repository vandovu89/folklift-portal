import { getDictionary } from '@/dictionaries';

export default async function AboutPage({ params }: { params: Promise<{ lang: string }> }) {
  const resolvedParams = await params;
  const dict = await getDictionary(resolvedParams.lang as 'en' | 'vi');

  return (
    <div style={{ background: 'white', minHeight: '80vh' }}>
      <div style={{ background: 'var(--primary)', padding: '5rem 5%', color: 'white', textAlign: 'center' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 800 }}>{dict.nav.about}</h1>
      </div>
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '5rem 5%', fontSize: '1.1rem', lineHeight: 1.8, color: '#333' }}>
        <h2 style={{ color: 'var(--primary)', marginBottom: '1.5rem', fontSize: '2rem' }}>Câu chuyện của Việt Nhật</h2>
        <p style={{ marginBottom: '2rem' }}>
          Việt Nhật được thành lập với sứ mệnh mang đến giải pháp nâng hạ tối ưu nhất cho các doanh nghiệp Việt Nam. 
          Kế thừa công nghệ và quy chuẩn khắt khe từ Nhật Bản, chúng tôi cam kết chất lượng trên từng chiếc xe nâng được bán ra.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '3rem', marginTop: '4rem' }}>
          <div>
            <h3 style={{ color: 'var(--primary)', marginBottom: '1rem', fontSize: '1.5rem' }}>Tầm Nhìn</h3>
            <p>Trở thành nhà cung cấp thiết bị công nghiệp hàng đầu khu vực, đóng góp vào sự phát triển bền vững của nền kinh tế số và tự động hóa.</p>
          </div>
          <div>
            <h3 style={{ color: 'var(--primary)', marginBottom: '1rem', fontSize: '1.5rem' }}>Sứ Mệnh</h3>
            <p>Cung cấp sản phẩm chất lượng cao, dịch vụ tận tâm và giải pháp đột phá, giúp khách hàng tối ưu hóa chi phí vận hành.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
