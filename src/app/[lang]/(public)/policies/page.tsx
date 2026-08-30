import { getDictionary } from '@/dictionaries';

export default async function PoliciesPage({ params }: { params: Promise<{ lang: 'en' | 'vi' }> }) {
  const resolvedParams = await params;
  const dict = await getDictionary(resolvedParams.lang);

  return (
    <div style={{ background: 'white', minHeight: '80vh' }}>
      <div style={{ background: 'var(--primary)', padding: '5rem 5%', color: 'white', textAlign: 'center' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 800 }}>{dict.nav.policies}</h1>
      </div>
      
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '5rem 5%', fontSize: '1.1rem', lineHeight: 1.8, color: '#333' }}>
        <section style={{ marginBottom: '4rem' }}>
          <h2 style={{ color: 'var(--primary)', fontSize: '1.8rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ width: '40px', height: '40px', background: 'var(--primary)', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>1</span>
            Chính Sách Bảo Hành
          </h2>
          <p style={{ marginBottom: '1rem' }}>
            Tất cả xe nâng được mua tại Kyowa Forklift đều được bảo hành chính hãng từ <strong>6 tháng đến 12 tháng</strong> (tùy thuộc vào dòng xe và thỏa thuận trên hợp đồng).
          </p>
          <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            <li>Bảo hành 100% chi phí linh kiện và nhân công nếu lỗi thuộc về nhà sản xuất.</li>
            <li>Hỗ trợ thay thế xe tương đương trong thời gian chờ sửa chữa (áp dụng cho khách hàng VIP).</li>
            <li>Không bảo hành đối với các trường hợp hao mòn tự nhiên (lốp xe, dầu nhớt) hoặc lỗi do vận hành sai quy cách.</li>
          </ul>
        </section>

        <section style={{ marginBottom: '4rem' }}>
          <h2 style={{ color: 'var(--primary)', fontSize: '1.8rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ width: '40px', height: '40px', background: 'var(--primary)', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>2</span>
            Chính Sách Giao Nhận
          </h2>
          <p style={{ marginBottom: '1rem' }}>
            Chúng tôi cung cấp dịch vụ giao xe nâng tận nơi trên toàn quốc bằng các phương tiện vận tải chuyên dụng.
          </p>
          <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            <li><strong>Khu vực miền Bắc:</strong> Giao hàng miễn phí trong bán kính 50km từ kho bãi.</li>
            <li><strong>Khu vực miền Trung & miền Nam:</strong> Thời gian vận chuyển từ 3-5 ngày làm việc, chi phí thỏa thuận.</li>
            <li>Khách hàng có quyền kiểm tra vận hành thử trước khi ký biên bản bàn giao.</li>
          </ul>
        </section>

        <section>
          <h2 style={{ color: 'var(--primary)', fontSize: '1.8rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ width: '40px', height: '40px', background: 'var(--primary)', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>3</span>
            Chính Sách Đổi Trả
          </h2>
          <p style={{ marginBottom: '1rem' }}>
            Cam kết hoàn tiền 100% hoặc đổi xe mới trong vòng <strong>7 ngày</strong> đầu tiên nếu xe phát sinh lỗi kỹ thuật nghiêm trọng không thể khắc phục, được xác nhận bởi chuyên gia của hai bên.
          </p>
        </section>
      </div>
    </div>
  );
}
