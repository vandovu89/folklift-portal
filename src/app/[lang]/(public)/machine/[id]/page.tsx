import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import QRCodeComponent from './QRCodeComponent';
import { notFound } from 'next/navigation';
import { getDictionary } from '@/dictionaries';
import LangSwitcher from '@/components/LangSwitcher';
import PublicImageSlider from '@/components/PublicImageSlider';
import InquiryForm from './InquiryForm';
import { getBaseUrl } from '@/lib/url';
import { formatCapacity } from '@/lib/utils';

export default async function MachineDetail({ params }: { params: Promise<{ id: string, lang: string }> }) {
  const resolvedParams = await params;
  const dict = await getDictionary(resolvedParams.lang as 'en' | 'vi');
  
  const forklift = await prisma.forklift.findUnique({
    where: { id: resolvedParams.id },
    include: {
      media: {
        where: { isPublic: true, fileType: 'IMAGE' },
        orderBy: [
          { isThumbnail: 'desc' },
          { createdAt: 'asc' }
        ]
      }
    }
  });

  if (!forklift) {
    notFound();
  }

  const baseUrl = getBaseUrl();
  const qrUrl = `${baseUrl}/${resolvedParams.lang}/machine/${forklift.id}`;

  return (
    <div>
      <main style={{ padding: '3rem 5%', maxWidth: '1200px', margin: '0 auto' }}>
        <Link href={`/${resolvedParams.lang}/catalog`} style={{ color: 'var(--primary)', fontWeight: '600', display: 'inline-block', marginBottom: '1.5rem', textDecoration: 'none' }}>
          &larr; {dict.common.back}
        </Link>
        <div className="glass-panel" style={{ display: 'flex', flexWrap: 'wrap', overflow: 'hidden' }}>
          
          <div style={{ flex: '1 1 500px', background: 'var(--surface)', display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', minWidth: 0, maxWidth: '100%' }}>
            <PublicImageSlider media={forklift.media} />
          </div>

          <div style={{ flex: '1 1 400px', padding: '2.5rem', minWidth: 0, maxWidth: '100%' }}>
            <div className="machine-header">
              <div>
                <div className="machine-title-row">
                  <h1 className="machine-title-text" style={{ fontSize: '2rem', margin: 0, textTransform: 'uppercase' }}>
                    {resolvedParams.lang === 'vi' ? 'Xe nâng ' : 'Forklift '}
                    {forklift.loadCapacity ? `${formatCapacity(forklift.loadCapacity, resolvedParams.lang as 'vi' | 'en')} ` : ''}
                    {forklift.maker} {forklift.model}
                  </h1>
                  <div className="machine-badges">
                    {forklift.status === 'Incoming' && <span className="badge machine-badge" style={{ backgroundColor: '#f97316', color: 'white' }}>Sắp về kho</span>}
                    {forklift.status === 'Reserved' && <span className="badge machine-badge" style={{ backgroundColor: '#eab308', color: 'white' }}>Đã nhận cọc</span>}
                    {forklift.status === 'Available' && <span className="badge badge-success machine-badge">Sẵn sàng giao</span>}
                  </div>
                </div>
                <p style={{ color: '#888', marginBottom: '1.5rem' }}>Mã nội bộ: {forklift.internalCode || forklift.id.substring(0, 8)}</p>
              </div>
              <div className="machine-qr-container" style={{ background: 'white', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--surface-border)' }}>
                <QRCodeComponent value={qrUrl} />
                <div style={{ fontSize: '0.7rem', textAlign: 'center', marginTop: '0.2rem' }}>Quét mã share</div>
              </div>
            </div>

            <div style={{ margin: '2rem 0', padding: '1.5rem', background: 'rgba(37, 99, 235, 0.05)', borderRadius: '12px', border: '1px solid rgba(37, 99, 235, 0.1)' }}>
              <div style={{ fontSize: '0.9rem', color: '#666' }}>{dict.machine.price}:</div>
              <div style={{ fontSize: '2.2rem', fontWeight: '800', color: 'var(--danger)' }}>
                {forklift.price ? `${forklift.price.toLocaleString('vi-VN')} VNĐ` : dict.common.contact}
              </div>
            </div>

            <div style={{ marginTop: '2rem' }}>
              <InquiryForm forkliftId={forklift.id} lang={resolvedParams.lang} dictionary={dict} />
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ marginTop: '2rem', padding: '2.5rem' }}>
          <h3 style={{ marginBottom: '2rem', fontSize: '1.5rem', borderBottom: '2px solid var(--primary)', display: 'inline-block', paddingBottom: '0.5rem' }}>
            {dict.machine.specifications}
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '4rem' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {[
                  { label: dict.machine.maker, value: forklift.maker },
                  { label: dict.machine.model, value: forklift.model },
                  { label: dict.machine.serialNo, value: forklift.serialNo },
                  { label: dict.machine.year, value: forklift.year },
                  { label: dict.machine.hour, value: forklift.hour },
                  { label: dict.machine.powerType, value: forklift.powerType },
                  { label: dict.machine.category, value: forklift.category },
                  { label: dict.machine.forkLength, value: forklift.forkLength },
                ].map((spec, index) => (
                  <tr key={index}>
                    <td style={{ padding: '1rem 1.5rem 1rem 0', borderBottom: '1px solid var(--surface-border)', color: '#666', width: '50%' }}>{spec.label}</td>
                    <td style={{ padding: '1rem 0', borderBottom: '1px solid var(--surface-border)', fontWeight: '600' }}>{spec.value || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {[
                  { label: dict.machine.attachment, value: forklift.attachment },
                  { label: dict.machine.liftHeight, value: forklift.liftHeight },
                  { label: dict.machine.loadCapacity, value: forklift.loadCapacity },
                  { label: dict.machine.forkLength, value: forklift.forkLength },
                  { label: dict.machine.condition, value: forklift.condition },
                  { label: dict.machine.location, value: forklift.location },
                  { label: dict.machine.otherSpecs, value: forklift.otherSpecs },
                ].map((spec, index) => (
                  <tr key={index}>
                    <td style={{ padding: '1rem 1.5rem 1rem 0', borderBottom: '1px solid var(--surface-border)', color: '#666', width: '50%' }}>{spec.label}</td>
                    <td style={{ padding: '1rem 0', borderBottom: '1px solid var(--surface-border)', fontWeight: '600' }}>{spec.value || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
