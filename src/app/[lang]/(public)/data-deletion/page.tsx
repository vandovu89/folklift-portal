'use client';

import React, { useState } from 'react';
import { use } from 'react';
import Link from 'next/link';
import { FaTrashAlt, FaCheckCircle, FaExclamationTriangle, FaFacebook, FaEnvelope } from 'react-icons/fa';

export default function DataDeletionPage({ params }: { params: Promise<{ lang: string }> }) {
  const resolvedParams = use(params);
  const lang = resolvedParams.lang;
  const isEn = lang === 'en';

  const [formData, setFormData] = useState({
    name: '',
    emailOrPhone: '',
    facebookPsid: '',
    reason: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submittedCode, setSubmittedCode] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.emailOrPhone.trim()) {
      setErrorMsg(isEn ? 'Please provide your name and contact info.' : 'Vui lòng điền họ tên và thông tin liên hệ.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/facebook/data-deletion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit request');
      }
      setSubmittedCode(data.confirmation_code || `REQ-${Date.now().toString().slice(-6)}`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ background: '#f8fafc', minHeight: '80vh', paddingBottom: '5rem' }}>
      {/* Header Banner */}
      <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', padding: '4rem 5%', color: 'white', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem' }}>
          <FaTrashAlt color="#ef4444" />
          {isEn ? 'User Data Deletion Instructions' : 'Hướng Dẫn & Yêu Cầu Xóa Dữ Liệu Người Dùng'}
        </h1>
        <p style={{ opacity: 0.9, maxWidth: '750px', margin: '0 auto', fontSize: '1.05rem', lineHeight: 1.6 }}>
          {isEn 
            ? 'Compliant with Meta Platform Terms Section 4.f - Instructions for removing your data from our systems.'
            : 'Tuân thủ Điều khoản Nền tảng Meta Mục 4.f - Quy trình và hướng dẫn xóa dữ liệu người dùng khỏi hệ thống.'}
        </p>
      </div>

      <div style={{ maxWidth: '960px', margin: '-2rem auto 0 auto', padding: '0 1.5rem' }}>
        <div style={{ background: 'white', borderRadius: '16px', padding: '3rem', boxShadow: '0 10px 35px rgba(0,0,0,0.06)', lineHeight: 1.8, color: '#334155' }}>
          
          {/* Overview */}
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '1.5rem', marginBottom: '2.5rem' }}>
            <h3 style={{ color: '#1e40af', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem' }}>
              <FaFacebook /> {isEn ? 'Meta / Facebook Platform Compliance' : 'Chính sách bảo vệ dữ liệu người dùng Facebook'}
            </h3>
            <p style={{ margin: 0, fontSize: '0.95rem' }}>
              {isEn 
                ? 'According to Facebook Platform Rules, we provide a transparent mechanism for users to delete their activities and information exchanged with our Facebook App and Messenger Chatbot.'
                : 'Theo quy định của Nền tảng Facebook, chúng tôi cung cấp cơ chế minh bạch giúp người dùng có thể xóa mọi lịch sử tương tác, tin nhắn và thông tin cá nhân đã trao đổi với Chatbot và Ứng dụng Facebook của chúng tôi.'}
            </p>
          </div>

          {/* Option 1: Remove via Facebook App Settings */}
          <section style={{ marginBottom: '3rem' }}>
            <h2 style={{ color: '#0369a1', fontSize: '1.4rem', marginBottom: '1rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem' }}>
              {isEn ? 'Method 1: Remove App via your Facebook Settings' : 'Cách 1: Gỡ ứng dụng trực tiếp trên Facebook của bạn'}
            </h2>
            <p>
              {isEn ? 'You can revoke permissions and delete application connections directly inside Facebook:' : 'Quý khách có thể thu hồi quyền truy cập và gỡ bỏ liên kết ứng dụng trực tiếp trong cài đặt Facebook cá nhân:'}
            </p>
            <ol style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.6rem' }}>
              <li>
                {isEn ? 'Open Facebook and go to your ' : 'Mở Facebook và truy cập vào mục '}
                <strong>{isEn ? 'Settings & Privacy > Settings' : 'Cài đặt & Quyền riêng tư > Cài đặt'}</strong>.
              </li>
              <li>
                {isEn ? 'Navigate to the left sidebar and click ' : 'Ở thanh menu bên trái, tìm chọn mục '}
                <strong>{isEn ? 'Apps and Websites' : 'Ứng dụng và trang web (Apps and Websites)'}</strong>.
              </li>
              <li>
                {isEn ? 'Find our Application ("MCK Japan Forklift Portal" or connected Page service).' : 'Tìm tên Ứng dụng của chúng tôi ("Xe Nâng MCK Japan") trong danh sách đã cấp quyền.'}
              </li>
              <li>
                {isEn ? 'Click the ' : 'Bấm nút '}
                <strong>{isEn ? 'Remove (Gỡ)' : 'Gỡ (Remove)'}</strong> {isEn ? 'button to disconnect and revoke all data permissions.' : 'để xóa liên kết và ngừng mọi hoạt động cấp quyền.'}
              </li>
            </ol>
          </section>

          {/* Option 2: Request Full Data Deletion via Form */}
          <section style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ color: '#0369a1', fontSize: '1.4rem', marginBottom: '1rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem' }}>
              {isEn ? 'Method 2: Request Permanent Data Deletion from our Servers' : 'Cách 2: Gửi yêu cầu xóa vĩnh viễn dữ liệu trên hệ thống của chúng tôi'}
            </h2>
            <p style={{ marginBottom: '1.5rem' }}>
              {isEn 
                ? 'To completely purge all chat history, stored inquiry notes, and contact details from our database, please fill out the request form below or email us directly at info@xenangmck.jp:'
                : 'Để xóa sạch toàn bộ lịch sử trò chuyện với AI Bot, ghi chú tư vấn và thông tin liên hệ khỏi cơ sở dữ liệu của chúng tôi, quý khách có thể gửi yêu cầu trực tuyến bằng biểu mẫu dưới đây hoặc gửi email đến info@xenangmck.jp:'}
            </p>

            {submittedCode ? (
              <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '12px', padding: '2rem', textAlign: 'center' }}>
                <FaCheckCircle size={48} color="#10b981" style={{ marginBottom: '1rem' }} />
                <h3 style={{ color: '#065f46', margin: '0 0 0.5rem 0' }}>
                  {isEn ? 'Data Deletion Request Received!' : 'Đã tiếp nhận yêu cầu xóa dữ liệu thành công!'}
                </h3>
                <p style={{ color: '#047857', maxWidth: '600px', margin: '0 auto 1.5rem auto' }}>
                  {isEn
                    ? 'Your request has been logged. Our system will process the permanent deletion within 24–48 business hours in accordance with Meta Platform Guidelines.'
                    : 'Yêu cầu của bạn đã được ghi nhận vào hệ thống. Đội ngũ kỹ thuật sẽ tiến hành xóa dữ liệu vĩnh viễn trong vòng 24–48 giờ làm việc theo đúng tiêu chuẩn của Meta.'}
                </p>
                <div style={{ display: 'inline-block', background: 'white', border: '1px dashed #059669', padding: '0.8rem 1.5rem', borderRadius: '8px', fontWeight: 700, color: '#065f46', fontSize: '1.1rem' }}>
                  {isEn ? 'Confirmation Code: ' : 'Mã xác nhận yêu cầu: '} {submittedCode}
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ background: '#f8fafc', padding: '2rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                {errorMsg && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '0.8rem 1rem', borderRadius: '8px', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FaExclamationTriangle /> {errorMsg}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.2rem', marginBottom: '1.2rem' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.95rem' }}>
                      {isEn ? 'Your Full Name *' : 'Họ và tên của bạn *'}
                    </label>
                    <input 
                      type="text"
                      required
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      placeholder={isEn ? 'e.g. John Doe' : 'Ví dụ: Nguyễn Văn A'}
                      style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.95rem' }}>
                      {isEn ? 'Email or Phone Number *' : 'Email hoặc Số điện thoại *'}
                    </label>
                    <input 
                      type="text"
                      required
                      value={formData.emailOrPhone}
                      onChange={e => setFormData({ ...formData, emailOrPhone: e.target.value })}
                      placeholder={isEn ? 'e.g. contact@example.com' : 'Ví dụ: 0362xxxxxx hoặc email@gmail.com'}
                      style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '1.2rem' }}>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.95rem' }}>
                    {isEn ? 'Facebook Profile Link or PSID (Optional)' : 'Link Facebook cá nhân hoặc Tên hiển thị trên Facebook'}
                  </label>
                  <input 
                    type="text"
                    value={formData.facebookPsid}
                    onChange={e => setFormData({ ...formData, facebookPsid: e.target.value })}
                    placeholder={isEn ? 'Facebook Profile URL or username' : 'Link trang cá nhân hoặc tên nick Facebook đã nhắn tin vào Page'}
                    style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                  />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.95rem' }}>
                    {isEn ? 'Reason / Details (Optional)' : 'Lý do hoặc yêu cầu cụ thể (Không bắt buộc)'}
                  </label>
                  <textarea 
                    rows={3}
                    value={formData.reason}
                    onChange={e => setFormData({ ...formData, reason: e.target.value })}
                    placeholder={isEn ? 'e.g. Please delete all my chat sessions regarding forklift consultation.' : 'Ví dụ: Tôi muốn xóa toàn bộ lịch sử tư vấn xe nâng và số điện thoại đã để lại.'}
                    style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', resize: 'vertical' }}
                  />
                </div>

                <button 
                  type="submit"
                  disabled={submitting}
                  style={{
                    background: '#ef4444',
                    color: 'white',
                    padding: '0.9rem 2rem',
                    borderRadius: '8px',
                    fontWeight: 700,
                    border: 'none',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    fontSize: '1rem',
                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
                  }}
                >
                  <FaTrashAlt />
                  {submitting 
                    ? (isEn ? 'Submitting Request...' : 'Đang gửi yêu cầu...') 
                    : (isEn ? 'Submit Deletion Request' : 'Gửi Yêu Cầu Xóa Dữ Liệu')}
                </button>
              </form>
            )}
          </section>

          {/* Direct Contact info */}
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', fontSize: '0.95rem', color: '#64748b' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FaEnvelope color="#0284c7" />
              <span>Email: <a href="mailto:info@xenangmck.jp" style={{ color: '#0284c7' }}>info@xenangmck.jp</a></span>
            </div>
            <div>
              <Link href={`/${lang}/privacy-policy`} style={{ color: '#0284c7', textDecoration: 'underline' }}>
                {isEn ? 'View Privacy Policy' : 'Xem Chính sách Bảo mật'}
              </Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
