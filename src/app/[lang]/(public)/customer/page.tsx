import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { CUSTOMER_COOKIE, verifyCustomerToken } from '@/lib/auth';
import CustomerPortal from './CustomerPortal';

export const metadata: Metadata = {
  title: 'Xe Của Tôi | Cổng Khách Hàng MCK Japan',
  robots: { index: false }
};

export default async function CustomerPortalPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const cookieStore = await cookies();
  const customerId = await verifyCustomerToken(cookieStore.get(CUSTOMER_COOKIE)?.value);
  if (!customerId) redirect(`/${lang}/customer/login`);

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: {
      id: true, name: true, phone: true, company: true, isActive: true,
      forklifts: {
        orderBy: { soldDate: 'desc' },
        select: {
          id: true, maker: true, model: true, internalCode: true, serialNo: true, year: true, hour: true,
          loadCapacity: true, powerType: true, soldDate: true,
          warrantyEndDate: true, maintenanceIntervalMonths: true, nextMaintenanceDate: true,
          media: {
            where: { isPublic: true, fileType: 'IMAGE' },
            orderBy: [{ isThumbnail: 'desc' }, { order: 'asc' }],
            take: 1,
            select: { url: true }
          },
          maintenanceLogs: { orderBy: { date: 'desc' }, take: 10, select: { id: true, date: true, hourMeter: true, description: true } }
        }
      },
      serviceRequests: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { id: true, type: true, status: true, message: true, createdAt: true, forkliftId: true }
      }
    }
  });

  // Tài khoản bị khóa hoặc đã xóa => về trang đăng nhập (cookie cũ hết hiệu lực)
  if (!customer || !customer.isActive) redirect(`/${lang}/customer/login`);

  return (
    <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2.5rem 5%' }}>
      <CustomerPortal lang={lang} customer={customer} />
    </main>
  );
}
