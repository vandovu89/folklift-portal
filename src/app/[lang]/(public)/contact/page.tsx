import { getDictionary } from '@/dictionaries';
import { FaPhoneAlt, FaEnvelope, FaMapMarkerAlt, FaUniversity } from 'react-icons/fa';

export default async function ContactPage({ params }: { params: Promise<{ lang: string }> }) {
  const resolvedParams = await params;
  const dict = await getDictionary(resolvedParams.lang as 'en' | 'vi');

  return (
    <div style={{ background: 'var(--background)', minHeight: '80vh' }}>
      <div style={{ background: 'var(--primary)', padding: '5rem 5%', color: 'white', textAlign: 'center' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 800 }}>{dict.nav.contact}</h1>
      </div>
      
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '5rem 5%', display: 'flex', flexWrap: 'wrap', gap: '4rem' }}>
        <div style={{ flex: '1 1 400px' }}>
          <h2 style={{ fontSize: '2rem', color: 'var(--foreground)', marginBottom: '1rem', fontWeight: 800 }}>Hãy liên hệ với chúng tôi</h2>
          <p style={{ color: '#666', marginBottom: '3rem', fontSize: '1.1rem', lineHeight: 1.6 }}>
            Đội ngũ tư vấn của Việt Nhật luôn sẵn sàng giải đáp mọi thắc mắc của bạn về sản phẩm, dịch vụ và kỹ thuật.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
              <div style={{ width: '50px', height: '50px', background: 'white', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 5px 15px rgba(0,0,0,0.05)' }}>
                <FaMapMarkerAlt color="var(--primary)" size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.3rem', color: 'var(--foreground)' }}>Địa chỉ kho bãi</h3>
                <p style={{ color: '#666', lineHeight: 1.5 }}>{dict.footer.address}</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
              <div style={{ width: '50px', height: '50px', background: 'white', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 5px 15px rgba(0,0,0,0.05)' }}>
                <FaUniversity color="var(--primary)" size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.3rem', color: 'var(--foreground)' }}>Tài khoản ngân hàng</h3>
                <p style={{ color: '#666', lineHeight: 1.5 }}>{dict.footer.bank}</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
              <div style={{ width: '50px', height: '50px', background: 'white', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 5px 15px rgba(0,0,0,0.05)' }}>
                <FaEnvelope color="var(--primary)" size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.3rem', color: 'var(--foreground)' }}>Email</h3>
                <p style={{ color: '#666', lineHeight: 1.5 }}>{dict.footer.email}</p>
              </div>
            </div>
          </div>
        </div>

        <div style={{ flex: '1 1 500px', background: 'white', padding: '3rem', borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.05)' }}>
          <form style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#333' }}>Họ và Tên</label>
              <input type="text" className="form-control" placeholder="Nhập tên của bạn" style={{ padding: '1rem', background: 'var(--surface-border)' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#333' }}>Email / Số điện thoại</label>
              <input type="text" className="form-control" placeholder="Email hoặc số điện thoại" style={{ padding: '1rem', background: 'var(--surface-border)' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#333' }}>Nội dung lời nhắn</label>
              <textarea className="form-control" rows={5} placeholder="Bạn cần tư vấn về sản phẩm nào?" style={{ padding: '1rem', background: 'var(--surface-border)', resize: 'vertical' }}></textarea>
            </div>
            <button type="button" className="btn-primary" style={{ padding: '1rem', fontSize: '1.1rem', fontWeight: 700, borderRadius: '12px', marginTop: '1rem' }}>Gửi Yêu Cầu</button>
          </form>
        </div>
      </div>
    </div>
  );
}
