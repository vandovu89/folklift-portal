import { getDictionary } from '@/dictionaries';

export default async function PoliciesPage({ params }: { params: Promise<{ lang: string }> }) {
  const resolvedParams = await params;
  const dict = await getDictionary(resolvedParams.lang as 'en' | 'vi');

  return (
    <div style={{ background: 'white', minHeight: '80vh' }}>
      <div style={{ background: 'var(--primary)', padding: '5rem 5%', color: 'white', textAlign: 'center' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 800 }}>{dict.nav.policies}</h1>
      </div>
      
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '5rem 5%', fontSize: '1.1rem', lineHeight: 1.8, color: '#333' }}>
        <section style={{ marginBottom: '4rem' }}>
          <h2 style={{ color: 'var(--primary)', fontSize: '1.8rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ width: '40px', height: '40px', background: 'var(--primary)', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>1</span>
            Chính Sách Bảo Hành (Xe Nâng Điện)
          </h2>
          <p style={{ marginBottom: '1rem' }}>
            Đối với các dòng xe nâng điện cũ được bán trực tiếp từ công ty, chúng tôi áp dụng chính sách bảo hành thiết thực và hiệu quả nhất cho khách hàng:
          </p>
          <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            <li><strong>Thời hạn & Phạm vi:</strong> Bảo hành <strong>03 tháng</strong>, tập trung hoàn toàn vào <strong>Bình ắc quy</strong> và <strong>Hệ thống điện / Bo mạch điện tử</strong> (những bộ phận cốt lõi của xe điện).</li>
            <li><strong>Điều kiện áp dụng:</strong> Chỉ áp dụng cho các xe do bên công ty trực tiếp bán ra (được quản lý chính xác theo Số Serial/Số khung xe trên hệ thống).</li>
            <li><strong>Chất lượng bình ắc quy:</strong> Trước khi bàn giao, 100% xe điện đều được kiểm tra test sạc và xả mô phỏng quá trình sử dụng ở điều kiện phun tải. Cam kết bình ắc quy còn tốt tương đương <strong>&gt;80%</strong> so với bình mới xuất xưởng.</li>
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

        <section style={{ marginTop: '4rem' }}>
          <h2 style={{ color: 'var(--primary)', fontSize: '1.8rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ width: '40px', height: '40px', background: 'var(--primary)', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>4</span>
            Hỗ Trợ Kỹ Thuật Trọn Đời
          </h2>
          <p style={{ marginBottom: '1rem' }}>
            Mô hình kinh doanh của chúng tôi là <strong>chỉ tập trung cung cấp xe nâng chất lượng cao, không kinh doanh dịch vụ sửa chữa để thu lợi nhuận</strong>.
          </p>
          <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            <li>Xe nâng điện Nhật Bản hoạt động rất ổn định, không hỏng vặt như xe dầu/xăng. Yếu tố quan trọng nhất giúp xe bền bỉ là bảo dưỡng và châm nước cất ắc quy định kỳ đúng tiêu chuẩn.</li>
            <li>Khi xe gặp sự cố ngoài thời gian bảo hành, công ty sẽ trực tiếp <strong>giới thiệu kỹ thuật viên sửa chữa uy tín</strong> cho quý khách. Khách hàng chỉ phải thanh toán chi phí nhân công và vật tư thực tế (rẻ hơn rất nhiều so với việc tự gọi thợ ngoài).</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
