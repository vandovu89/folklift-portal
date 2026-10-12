import { Metadata } from 'next';
import Link from 'next/link';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  return {
    title: lang === 'en' 
      ? 'Terms of Service | Viet Nhat Forklifts' 
      : 'Điều Khoản Dịch Vụ | Xe Nâng Việt Nhật',
    description: lang === 'en'
      ? 'Terms of Service for Viet Nhat Forklift portal and Facebook Messenger services.'
      : 'Điều khoản dịch vụ áp dụng cho cổng thông tin xe nâng và ứng dụng chatbot Facebook Messenger.'
  };
}

export default async function TermsOfServicePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const isEn = lang === 'en';

  return (
    <div style={{ background: '#f8fafc', minHeight: '80vh', paddingBottom: '5rem' }}>
      {/* Header Banner */}
      <div style={{ background: 'linear-gradient(135deg, #0369a1 0%, #0284c7 100%)', padding: '4rem 5%', color: 'white', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.8rem' }}>
          {isEn ? 'Terms of Service' : 'Điều Khoản Dịch Vụ'}
        </h1>
        <p style={{ opacity: 0.9, maxWidth: '750px', margin: '0 auto', fontSize: '1.05rem', lineHeight: 1.6 }}>
          {isEn 
            ? 'Guidelines and legal terms governing the use of our Website, Products, and Facebook Chatbot Services.'
            : 'Các quy định và thỏa thuận pháp lý khi sử dụng Website, Sản phẩm và Dịch vụ Chatbot của Xe Nâng Việt Nhật.'}
        </p>
        <div style={{ marginTop: '1rem', fontSize: '0.9rem', opacity: 0.8 }}>
          {isEn ? 'Last updated: October 2026' : 'Cập nhật lần cuối: Tháng 10/2026'}
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: '960px', margin: '-2rem auto 0 auto', padding: '0 1.5rem' }}>
        <div style={{ background: 'white', borderRadius: '16px', padding: '3rem', boxShadow: '0 10px 35px rgba(0,0,0,0.06)', lineHeight: 1.8, color: '#334155' }}>
          
          {/* Section 1 */}
          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ color: '#0369a1', fontSize: '1.5rem', marginBottom: '1rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem' }}>
              {isEn ? '1. Acceptance of Terms' : '1. Chấp thuận điều khoản'}
            </h2>
            <p>
              {isEn ? (
                <>
                  By accessing or using the website at <strong>https://xenangmck.jp</strong>, or interacting with our <strong>Facebook Messenger Chatbot</strong>, you agree to be bound by these Terms of Service. If you do not agree to these terms, please refrain from using our digital services.
                </>
              ) : (
                <>
                  Bằng việc truy cập, tra cứu thông tin trên trang web <strong>https://xenangmck.jp</strong> hoặc tương tác với <strong>Chatbot Facebook Messenger</strong> của chúng tôi, quý khách đồng ý tuân thủ các Điều khoản dịch vụ này. Nếu không đồng ý, quý khách vui lòng ngừng sử dụng các dịch vụ trực tuyến của chúng tôi.
                </>
              )}
            </p>
          </section>

          {/* Section 2 */}
          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ color: '#0369a1', fontSize: '1.5rem', marginBottom: '1rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem' }}>
              {isEn ? '2. Description of Services' : '2. Mô tả dịch vụ'}
            </h2>
            <p>
              {isEn ? (
                <>
                  Viet Nhat Co., Ltd. provides an online inventory catalog of Japanese imported electric, diesel, and gasoline forklifts, transparent battery health statistics, and an automated AI customer assistance chatbot connected via Meta&apos;s Messenger API to provide real-time responses to customer inquiries.
                </>
              ) : (
                <>
                  Công ty TNHH Kinh Doanh SX &amp; TM Việt Nhật cung cấp cổng thông tin tra cứu danh mục xe nâng nhập khẩu Nhật Bản (xe nâng điện, dầu, xăng, phụ kiện), dữ liệu thực tế về tình trạng bình ắc quy và hệ thống trợ lý ảo AI Chatbot kết nối qua Facebook Messenger API nhằm hỗ trợ tư vấn tức thì cho khách hàng.
                </>
              )}
            </p>
          </section>

          {/* Section 3 */}
          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ color: '#0369a1', fontSize: '1.5rem', marginBottom: '1rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem' }}>
              {isEn ? '3. User Conduct and Responsibilities' : '3. Quy định sử dụng và trách nhiệm của người dùng'}
            </h2>
            <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <li>
                {isEn 
                  ? 'Users must not use the website or Messenger bot for unlawful purposes, transmitting harmful code, or attempting denial-of-service attacks.'
                  : 'Không sử dụng website hoặc chatbot vào các mục đích vi phạm pháp luật, truyền bá mã độc hoặc thực hiện các hành vi gây cản trở hoạt động của hệ thống.'}
              </li>
              <li>
                {isEn
                  ? 'Users must provide accurate inquiry information when requesting formal commercial quotations.'
                  : 'Cung cấp thông tin liên hệ chính xác khi có nhu cầu nhận báo giá và tư vấn mua xe nâng.'}
              </li>
              <li>
                {isEn
                  ? 'Automated scraping or reverse engineering of the portal without prior consent is prohibited.'
                  : 'Nghiêm cấm mọi hành vi sao chép tự động (scraping) hoặc can thiệp trái phép vào cơ sở dữ liệu của cổng thông tin.'}
              </li>
            </ul>
          </section>

          {/* Section 4 */}
          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ color: '#0369a1', fontSize: '1.5rem', marginBottom: '1rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem' }}>
              {isEn ? '4. Forklift Specifications and Quotations' : '4. Thông số kỹ thuật & Báo giá xe'}
            </h2>
            <p>
              {isEn ? (
                <>
                  Product descriptions, specifications, battery health reports, and estimated pricing provided via the website and AI Messenger Bot are for informational and preliminary reference purposes. Formal contracts and commercial terms will be confirmed in writing between the two parties prior to vehicle delivery.
                </>
              ) : (
                <>
                  Các thông số kỹ thuật, hình ảnh thực tế, tình trạng bình ắc quy và mức giá tư vấn do website hoặc AI Messenger Bot cung cấp mang tính chất tham khảo chuẩn xác tại thời điểm kiểm tra. Giá bán chính thức và các điều khoản giao hàng sẽ được hai bên xác nhận bằng văn bản / hợp đồng mua bán trước khi bàn giao xe.
                </>
              )}
            </p>
          </section>

          {/* Section 5 */}
          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ color: '#0369a1', fontSize: '1.5rem', marginBottom: '1rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem' }}>
              {isEn ? '5. Intellectual Property' : '5. Quyền sở hữu trí tuệ'}
            </h2>
            <p>
              {isEn ? (
                <>
                  All trademarks, logos, texts, photographs, and system designs published on this website are the property of Viet Nhat Co., Ltd. or their respective makers (Komatsu, Toyota, Nichiyu, TCM, Sumitomo...). Reproduction without permission is prohibited.
                </>
              ) : (
                <>
                  Toàn bộ logo, hình ảnh xe thực tế, nội dung và giao diện hệ thống thuộc quyền sở hữu của Công ty TNHH Kinh Doanh SX &amp; TM Việt Nhật hoặc các thương hiệu sản xuất xe (Komatsu, Toyota, Nichiyu, TCM, Sumitomo...). Nghiêm cấm sao chép khi chưa có sự đồng ý.
                </>
              )}
            </p>
          </section>

          {/* Section 6 */}
          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ color: '#0369a1', fontSize: '1.5rem', marginBottom: '1rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem' }}>
              {isEn ? '6. Privacy and Data Governance' : '6. Bảo mật và Quyền riêng tư'}
            </h2>
            <p>
              {isEn ? (
                <>
                  Your use of our services is also governed by our{' '}
                  <Link href={`/${lang}/privacy-policy`} style={{ color: '#0284c7', textDecoration: 'underline' }}>
                    Privacy Policy
                  </Link>
                  {' '}and our{' '}
                  <Link href={`/${lang}/data-deletion`} style={{ color: '#0284c7', textDecoration: 'underline' }}>
                    User Data Deletion Instructions
                  </Link>
                  .
                </>
              ) : (
                <>
                  Việc sử dụng dịch vụ của quý khách đồng thời chịu sự điều chỉnh của{' '}
                  <Link href={`/${lang}/privacy-policy`} style={{ color: '#0284c7', textDecoration: 'underline' }}>
                    Chính sách Quyền riêng tư
                  </Link>
                  {' '}và{' '}
                  <Link href={`/${lang}/data-deletion`} style={{ color: '#0284c7', textDecoration: 'underline' }}>
                    Quy trình Hướng dẫn xóa dữ liệu người dùng
                  </Link>
                  .
                </>
              )}
            </p>
          </section>

          {/* Section 7 */}
          <section>
            <h2 style={{ color: '#0369a1', fontSize: '1.5rem', marginBottom: '1rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem' }}>
              {isEn ? '7. Governing Law & Contact' : '7. Luật áp dụng & Liên hệ'}
            </h2>
            <p>
              {isEn ? (
                <>
                  These Terms of Service are governed by and construed in accordance with the laws of the Socialist Republic of Vietnam. For inquiries, please reach out to:
                </>
              ) : (
                <>
                  Các điều khoản dịch vụ này được điều chỉnh và giải thích theo pháp luật của Nước Cộng hòa Xã hội Chủ nghĩa Việt Nam. Mọi thắc mắc xin liên hệ:
                </>
              )}
            </p>
            <div style={{ marginTop: '0.8rem', background: '#f8fafc', padding: '1rem 1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <p style={{ margin: '0.3rem 0' }}><strong>Email:</strong> <a href="mailto:info@xenangmck.jp" style={{ color: '#0284c7' }}>info@xenangmck.jp</a></p>
              <p style={{ margin: '0.3rem 0' }}><strong>Hotline / Zalo:</strong> 0989 319 888</p>
              <p style={{ margin: '0.3rem 0' }}><strong>Đơn vị:</strong> CÔNG TY TNHH KINH DOANH SX &amp; TM VIỆT NHẬT</p>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
