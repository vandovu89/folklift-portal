import { Metadata } from 'next';
import Link from 'next/link';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  return {
    title: lang === 'en' 
      ? 'Privacy Policy | MCK Japan Forklifts' 
      : 'Chính Sách Quyền Riêng Tư & Bảo Mật | Xe Nâng MCK Japan',
    description: lang === 'en'
      ? 'Privacy Policy for MCK Japan Forklift portal and Facebook Messenger services.'
      : 'Chính sách bảo mật thông tin và quyền riêng tư cho cổng thông tin xe nâng và ứng dụng Facebook Messenger.'
  };
}

export default async function PrivacyPolicyPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const isEn = lang === 'en';

  return (
    <div style={{ background: '#f8fafc', minHeight: '80vh', paddingBottom: '5rem' }}>
      {/* Header Banner */}
      <div style={{ background: 'linear-gradient(135deg, #0369a1 0%, #0284c7 100%)', padding: '4rem 5%', color: 'white', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.8rem' }}>
          {isEn ? 'Privacy Policy' : 'Chính Sách Quyền Riêng Tư & Bảo Mật'}
        </h1>
        <p style={{ opacity: 0.9, maxWidth: '750px', margin: '0 auto', fontSize: '1.05rem', lineHeight: 1.6 }}>
          {isEn 
            ? 'Commitment to safeguarding personal data across our Website, Portal, and Facebook Messenger Services.'
            : 'Cam kết bảo vệ dữ liệu cá nhân trên Website, Hệ thống quản lý và Dịch vụ Chatbot Facebook Messenger.'}
        </p>
        <div style={{ marginTop: '1rem', fontSize: '0.9rem', opacity: 0.8 }}>
          {isEn ? 'Last updated: October 2026' : 'Cập nhật lần cuối: Tháng 10/2026'}
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: '960px', margin: '-2rem auto 0 auto', padding: '0 1.5rem' }}>
        <div style={{ background: 'white', borderRadius: '16px', padding: '3rem', boxShadow: '0 10px 35px rgba(0,0,0,0.06)', lineHeight: 1.8, color: '#334155' }}>
          
          {/* Introduction */}
          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ color: '#0369a1', fontSize: '1.5rem', marginBottom: '1rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem' }}>
              {isEn ? '1. Introduction' : '1. Giới thiệu chung'}
            </h2>
            <p>
              {isEn ? (
                <>
                  <strong>MCK JAPAN FORKLIFT</strong> (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), operating the domain <strong>https://xenangmck.jp</strong>, is committed to respecting and protecting the privacy of our website visitors, customers, and users interacting with our services, including our <strong>Facebook Messenger Chatbot</strong> and integrated systems.
                </>
              ) : (
                <>
                  <strong>XE NÂNG MCK JAPAN</strong> (&quot;chúng tôi&quot;), đơn vị vận hành trang web <strong>https://xenangmck.jp</strong>, cam kết tôn trọng và bảo vệ quyền riêng tư của khách hàng, khách truy cập và người dùng tương tác với dịch vụ của chúng tôi, bao gồm <strong>Chatbot AI trên Facebook Messenger</strong> và các hệ thống liên kết.
                </>
              )}
            </p>
          </section>

          {/* Data Collected */}
          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ color: '#0369a1', fontSize: '1.5rem', marginBottom: '1rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem' }}>
              {isEn ? '2. Information We Collect' : '2. Thông tin chúng tôi thu thập'}
            </h2>
            <p style={{ marginBottom: '0.8rem' }}>
              {isEn 
                ? 'Depending on how you interact with our services, we may collect the following data:'
                : 'Tùy thuộc vào cách bạn tương tác với dịch vụ, chúng tôi có thể thu thập các loại dữ liệu sau:'}
            </p>
            <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <li>
                <strong>{isEn ? 'Facebook Messenger Platform Data:' : 'Dữ liệu từ Facebook Messenger:'}</strong>{' '}
                {isEn 
                  ? 'When you message our Facebook Fanpage, we receive your Page-Scoped ID (PSID), public display name, interaction timestamp, and message contents (inquiries about forklift models, specifications, pricing).'
                  : 'Khi bạn gửi tin nhắn đến Fanpage Facebook của chúng tôi, hệ thống tiếp nhận mã định danh người dùng theo Trang (PSID), tên hiển thị công khai, thời gian tương tác và nội dung tin nhắn trao đổi (hỏi về model xe, thông số kỹ thuật, yêu cầu báo giá).'}
              </li>
              <li>
                <strong>{isEn ? 'Customer Inquiries & Contact Info:' : 'Thông tin liên hệ tự nguyện cung cấp:'}</strong>{' '}
                {isEn
                  ? 'Phone numbers, email addresses, or company names that you voluntarily share during consultations for receiving formal quotations or technical advice.'
                  : 'Số điện thoại, địa chỉ email, tên công ty hoặc vị trí kho bãi mà quý khách tự nguyện để lại trong quá trình nhận tư vấn báo giá xe nâng.'}
              </li>
              <li>
                <strong>{isEn ? 'Technical Log Data:' : 'Dữ liệu kỹ thuật & Nhật ký truy cập:'}</strong>{' '}
                {isEn
                  ? 'Standard web server logs, IP addresses, browser types, and cookie session identifiers to ensure application stability and security.'
                  : 'Nhật ký máy chủ web tiêu chuẩn, địa chỉ IP, loại trình duyệt nhằm đảm bảo an toàn bảo mật và tính ổn định của hệ thống.'}
              </li>
            </ul>
          </section>

          {/* Purpose of Processing */}
          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ color: '#0369a1', fontSize: '1.5rem', marginBottom: '1rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem' }}>
              {isEn ? '3. Purpose of Data Usage' : '3. Mục đích sử dụng dữ liệu'}
            </h2>
            <p>
              {isEn 
                ? 'We use the collected information strictly for legitimate business purposes:'
                : 'Chúng tôi chỉ sử dụng thông tin thu thập được cho các mục đích hợp pháp và minh bạch:'}
            </p>
            <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.6rem' }}>
              <li>{isEn ? 'Powering our AI Chatbot to provide instant, automated answers to forklift queries.' : 'Vận hành AI Chatbot trả lời tự động, tức thời các thắc mắc về thông số, tình trạng bình ắc quy và giá xe nâng.'}</li>
              <li>{isEn ? 'Enabling human customer service specialists to follow up with quotes and technical inspection reports.' : 'Hỗ trợ chuyên viên tư vấn liên hệ phản hồi, cung cấp báo giá chính xác và hỗ trợ kiểm tra xe thực tế.'}</li>
              <li>{isEn ? 'Complying with Meta Platform Policies and maintaining system operational integrity.' : 'Tuân thủ các điều khoản chính sách của Nền tảng Meta và bảo đảm an toàn hệ thống.'}</li>
            </ul>
          </section>

          {/* Data Sharing & Third Parties */}
          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ color: '#0369a1', fontSize: '1.5rem', marginBottom: '1rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem' }}>
              {isEn ? '4. Data Sharing & Third-Party Disclosure' : '4. Chia sẻ dữ liệu & Bên thứ ba'}
            </h2>
            <p>
              {isEn ? (
                <>
                  We <strong>NEVER</strong> sell, rent, or trade your personal information to third parties for marketing purposes. Data exchanged through Meta products is governed by Meta&apos;s Platform Policies. Third-party infrastructure providers (such as cloud hosting and AI language processing services) process data strictly under confidentiality agreements solely for application performance.
                </>
              ) : (
                <>
                  Chúng tôi <strong>TUYỆT ĐỐI KHÔNG</strong> bán, cho thuê hoặc thương mại hóa thông tin cá nhân của người dùng cho bất kỳ bên thứ ba nào. Dữ liệu xử lý qua Facebook Messenger tuân thủ Chính sách bảo mật của Meta. Các dịch vụ hạ tầng điện toán đám mây và xử lý ngôn ngữ chỉ xử lý dữ liệu phục vụ mục đích vận hành theo thỏa thuận bảo mật nghiêm ngặt.
                </>
              )}
            </p>
          </section>

          {/* Data Retention & Security */}
          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ color: '#0369a1', fontSize: '1.5rem', marginBottom: '1rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem' }}>
              {isEn ? '5. Data Retention & Security' : '5. Lưu trữ và Bảo mật dữ liệu'}
            </h2>
            <p>
              {isEn ? (
                <>
                  All communication logs and contact information are encrypted in transit (HTTPS / SSL) and stored in secure database environments with restricted access. We retain conversation records only for as long as necessary to provide customer support or until a user requests deletion.
                </>
              ) : (
                <>
                  Mọi dữ liệu trao đổi được mã hóa trong quá trình truyền tải (HTTPS / SSL) và lưu trữ an toàn với cơ chế phân quyền nghiêm ngặt. Dữ liệu hội thoại chỉ được lưu trữ trong khoảng thời gian cần thiết để chăm sóc khách hàng hoặc cho đến khi nhận được yêu cầu xóa từ người dùng.
                </>
              )}
            </p>
          </section>

          {/* User Rights & Data Deletion */}
          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ color: '#0369a1', fontSize: '1.5rem', marginBottom: '1rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem' }}>
              {isEn ? '6. User Rights & Data Deletion (Meta Compliance)' : '6. Quyền của người dùng & Yêu cầu xóa dữ liệu'}
            </h2>
            <p style={{ marginBottom: '1rem' }}>
              {isEn ? (
                <>
                  In full compliance with Meta Platform Terms (Section 4.f), you have the right to request the inspection, correction, or permanent deletion of any personal data or Facebook Messenger interaction records held by our system.
                </>
              ) : (
                <>
                  Tuân thủ đầy đủ Điều khoản Nền tảng Meta (Mục 4.f), quý khách hoàn toàn có quyền yêu cầu tra cứu, chỉnh sửa hoặc <strong>xóa bỏ vĩnh viễn</strong> mọi thông tin cá nhân và lịch sử hội thoại Messenger khỏi hệ thống của chúng tôi.
                </>
              )}
            </p>
            <div style={{ background: '#f1f5f9', borderLeft: '4px solid #0284c7', padding: '1.2rem', borderRadius: '8px' }}>
              <p style={{ margin: 0, fontWeight: 600 }}>
                {isEn ? 'Need your Facebook data removed?' : 'Quý khách muốn xóa dữ liệu tương tác Facebook?'}
              </p>
              <p style={{ margin: '0.5rem 0 0 0' }}>
                {isEn 
                  ? 'Please visit our dedicated instructions page: ' 
                  : 'Vui lòng truy cập trang hướng dẫn và gửi yêu cầu xóa dữ liệu tại: '}
                <Link href={`/${lang}/data-deletion`} style={{ color: '#0284c7', textDecoration: 'underline', fontWeight: 600 }}>
                  {isEn ? 'User Data Deletion Instructions' : 'Hướng dẫn & Yêu cầu xóa dữ liệu người dùng'}
                </Link>
              </p>
            </div>
          </section>

          {/* Contact Us */}
          <section>
            <h2 style={{ color: '#0369a1', fontSize: '1.5rem', marginBottom: '1rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem' }}>
              {isEn ? '7. Contact Us' : '7. Thông tin liên hệ'}
            </h2>
            <p>
              {isEn 
                ? 'For any questions, concerns, or privacy inquiries, please contact our Data Protection Officer at:'
                : 'Mọi thắc mắc liên quan đến chính sách quyền riêng tư hoặc dữ liệu người dùng, xin vui lòng liên hệ:'}
            </p>
            <div style={{ marginTop: '0.8rem', background: '#f8fafc', padding: '1rem 1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <p style={{ margin: '0.3rem 0' }}><strong>{isEn ? 'Company:' : 'Đơn vị:'}</strong> XE NÂNG MCK JAPAN</p>
              <p style={{ margin: '0.3rem 0' }}><strong>{isEn ? 'Email:' : 'Email hỗ trợ:'}</strong> <a href="mailto:info@xenangmck.jp" style={{ color: '#0284c7' }}>info@xenangmck.jp</a></p>
              <p style={{ margin: '0.3rem 0' }}><strong>{isEn ? 'Website:' : 'Website chính thức:'}</strong> https://xenangmck.jp</p>
              <p style={{ margin: '0.3rem 0' }}><strong>{isEn ? 'Address:' : 'Địa chỉ:'}</strong> Tầng 2 Shophouse Park 2-05, KĐT Eurowindow River Park, Đông Anh, Hà Nội</p>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
