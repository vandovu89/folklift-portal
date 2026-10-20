import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { CUSTOMER_COOKIE, verifyCustomerToken } from '@/lib/auth';
import CustomerLoginForm from './CustomerLoginForm';

export const metadata: Metadata = {
  title: 'Cổng Khách Hàng | Xe Nâng MCK Japan',
  robots: { index: false }
};

export default async function CustomerLoginPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const cookieStore = await cookies();
  if (await verifyCustomerToken(cookieStore.get(CUSTOMER_COOKIE)?.value)) {
    redirect(`/${lang}/customer`);
  }

  return (
    <div style={{ minHeight: '75vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem 5%' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', padding: 'clamp(1.5rem, 4vw, 2.5rem)', background: 'white' }}>
        <div style={{ fontSize: '2.2rem', textAlign: 'center' }}>🛠️</div>
        <h1 style={{ fontSize: '1.5rem', textAlign: 'center', margin: '0.5rem 0', color: '#0f172a' }}>
          {lang === 'vi' ? 'Cổng Khách Hàng MCK Japan' : 'MCK Japan Customer Portal'}
        </h1>
        <p style={{ textAlign: 'center', color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          {lang === 'vi'
            ? 'Theo dõi xe đã mua, lịch bảo dưỡng, bảo hành và gọi thợ chỉ với một chạm.'
            : 'Track your forklifts, maintenance schedule and warranty, and request service in one tap.'}
        </p>
        <CustomerLoginForm lang={lang} />
        <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem', marginTop: '1.5rem' }}>
          {lang === 'vi'
            ? 'Tài khoản được MCK Japan cấp khi bàn giao xe. Quên mật khẩu? Gọi hotline 0362 396 092.'
            : 'Accounts are issued by MCK Japan at handover. Forgot your password? Call +84 362 396 092.'}
        </p>
      </div>
    </div>
  );
}
