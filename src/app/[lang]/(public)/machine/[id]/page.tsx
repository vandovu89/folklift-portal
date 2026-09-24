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
import { FaMoneyBillWave } from 'react-icons/fa';

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
        
        {/* FOMO Banner */}
        <div className="fomo-banner">
          <span style={{ fontSize: '1.2rem' }}>🔥</span> 
          {resolvedParams.lang === 'vi' ? 'Đang có nhiều khách hàng quan tâm đến chiếc xe này trong 24h qua!' : 'Many customers are currently viewing this forklift!'}
        </div>

        <div className="glass-panel" style={{ display: 'flex', flexWrap: 'wrap', overflow: 'hidden' }}>
          
          {/* Cột Trái (60%) */}
          <div style={{ flex: '1 1 60%', background: 'var(--surface)', display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', minWidth: '300px' }}>
            <PublicImageSlider media={forklift.media} />
            
            {/* Inquiry Form */}
            <div style={{ marginTop: '1rem' }}>
              <InquiryForm forkliftId={forklift.id} lang={resolvedParams.lang} dictionary={dict} />
            </div>
          </div>

          {/* Cột Phải (40%) */}
          <div style={{ flex: '1 1 40%', padding: '2.5rem', minWidth: '300px', borderLeft: '1px solid var(--surface-border)', background: 'var(--surface-hover)' }}>
            <div className="machine-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 100%' }}>
                <div className="machine-badges" style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {forklift.status === 'Incoming' && <span className="badge machine-badge" style={{ backgroundColor: '#f97316', color: 'white', padding: '0.4rem 0.8rem', width: 'auto', height: 'auto', display: 'inline-block' }}>Sắp về kho</span>}
                  {forklift.status === 'Reserved' && <span className="badge machine-badge" style={{ backgroundColor: '#eab308', color: 'white', padding: '0.4rem 0.8rem', width: 'auto', height: 'auto', display: 'inline-block' }}>Đã nhận cọc</span>}
                  {forklift.status === 'Available' && <span className="badge badge-success machine-badge" style={{ padding: '0.4rem 0.8rem', width: 'auto', height: 'auto', display: 'inline-block' }}>Sẵn sàng giao</span>}
                  {forklift.year && <span className="badge machine-badge" style={{ backgroundColor: '#3b82f6', color: 'white', padding: '0.4rem 0.8rem', width: 'auto', height: 'auto', display: 'inline-block' }}>Đời {forklift.year}</span>}
                </div>
                <h1 className="machine-title-text" style={{ fontSize: '2.2rem', margin: '0 0 0.5rem 0', textTransform: 'uppercase', lineHeight: '1.3' }}>
                  {resolvedParams.lang === 'vi' ? 'Xe nâng ' : 'Forklift '}
                  {forklift.loadCapacity ? `${formatCapacity(forklift.loadCapacity, resolvedParams.lang as 'vi' | 'en')} ` : ''}
                  <span style={{ color: 'var(--primary)' }}>{forklift.maker}</span> {forklift.model}
                </h1>
                <p style={{ color: '#64748b', marginBottom: '1.5rem', marginTop: '0.5rem', fontSize: '1rem' }}>
                  Mã nội bộ: <strong>{forklift.internalCode || forklift.id.substring(0, 8)}</strong> • 
                  Nhiên liệu: <strong>{forklift.powerType || 'N/A'}</strong>
                </p>
              </div>
            </div>

            <div style={{ margin: '1.5rem 0', padding: '1.5rem', background: 'rgba(225, 29, 72, 0.05)', borderRadius: '12px', border: '1px solid rgba(225, 29, 72, 0.1)' }}>
              <div style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '0.5rem' }}>{resolvedParams.lang === 'vi' ? 'Giá tham khảo' : 'Reference Price'}</div>
              <div style={{ fontSize: 'clamp(1.5rem, 5vw, 2.5rem)', fontWeight: '800', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ whiteSpace: 'nowrap' }}>
                  {forklift.price ? `${forklift.price.toLocaleString('vi-VN')} VNĐ` : dict.common.contact}
                </span>
              </div>
            </div>

            <div className="hotline-box hover-scale">
              <div style={{ color: '#64748b', fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '1px' }}>{resolvedParams.lang === 'vi' ? 'Tư vấn miễn phí 24/7' : 'Free Consultation 24/7'}</div>
              <a href="tel:0901234567">090 123 4567</a>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
              <a href="https://zalo.me/0901234567" target="_blank" className="btn-primary hover-lift-sm" style={{ flex: '1 1 calc(50% - 0.5rem)', textAlign: 'center', backgroundColor: '#0068ff', borderColor: '#0068ff', fontSize: '1rem', padding: '0.8rem', borderRadius: '8px' }}>
                <span style={{ fontSize: '1.2rem' }}>💬</span> Nhắn tin Zalo
              </a>
              <a href="#inquiry-form" className="btn-primary hover-lift-sm" style={{ flex: '1 1 calc(50% - 0.5rem)', textAlign: 'center', backgroundColor: 'var(--primary)', borderColor: 'var(--primary)', fontSize: '1rem', padding: '0.8rem', borderRadius: '8px' }}>
                <span style={{ fontSize: '1.2rem' }}>✉️</span> Yêu cầu báo giá
              </a>
            </div>

            <div className="machine-qr-container" style={{ background: 'white', padding: '1rem', borderRadius: '12px', border: '1px solid var(--surface-border)', marginTop: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ flexShrink: 0, width: '80px', height: '80px' }}>
                <QRCodeComponent value={qrUrl} />
              </div>
              <div>
                <strong style={{ display: 'block', marginBottom: '0.2rem', color: '#1e293b' }}>{resolvedParams.lang === 'vi' ? 'Lưu thông tin' : 'Save Info'}</strong>
                <span style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: '1.4', display: 'block' }}>
                  {resolvedParams.lang === 'vi' ? 'Quét mã QR bằng Zalo/Camera để lưu lại trang này vào điện thoại của bạn.' : 'Scan with your camera to save this page on your phone.'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* SEO Description Content */}
        <div className="glass-panel" style={{ marginTop: '2rem', padding: '2.5rem' }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', borderBottom: '2px solid var(--primary)', display: 'inline-block', paddingBottom: '0.5rem', color: '#1e293b' }}>
            {resolvedParams.lang === 'vi' ? 'Mô tả chi tiết' : 'Description'}
          </h3>
          <div style={{ lineHeight: '1.8', color: '#334155', fontSize: '1.05rem' }}>
            <p style={{ marginBottom: '1rem' }}>
              Chiếc xe nâng <strong>{forklift.maker} {forklift.model}</strong> là giải pháp nâng hạ tối ưu cho kho bãi của bạn. 
              Với tải trọng nâng {forklift.loadCapacity || 'đang cập nhật'}, chiều cao nâng {forklift.liftHeight || 'đang cập nhật'}, và hoạt động bằng {forklift.powerType || 'nhiên liệu chuyên dụng'}, 
              xe đảm bảo hiệu suất làm việc cao và bền bỉ trong môi trường công nghiệp.
            </p>
            <p>
              Tình trạng xe hiện tại: <strong>{forklift.condition || 'Hoạt động tốt'}</strong>. 
              Xe đã được kiểm tra kỹ thuật kỹ lưỡng, bảo dưỡng định kỳ và sẵn sàng đưa vào sử dụng ngay. Liên hệ ngay qua Hotline hoặc Zalo để nhận báo giá tốt nhất và các ưu đãi đi kèm.
            </p>
          </div>
        </div>

        {/* Specifications Table */}
        <div className="glass-panel" style={{ marginTop: '2rem', padding: '2.5rem' }}>
          <h3 style={{ marginBottom: '2rem', fontSize: '1.5rem', borderBottom: '2px solid var(--primary)', display: 'inline-block', paddingBottom: '0.5rem', color: '#1e293b' }}>
            {dict.machine.specifications}
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '3rem' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--surface-border)' }}>
              <thead>
                <tr>
                  <th colSpan={2} style={{ background: '#f8fafc', borderBottom: '2px solid var(--surface-border)', textAlign: 'center', fontSize: '1.1rem', color: '#0f172a', padding: '1rem' }}>
                    {resolvedParams.lang === 'vi' ? 'Thông số chung' : 'General Specs'}
                  </th>
                </tr>
              </thead>
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
                    <td style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--surface-border)', color: '#64748b', width: '40%', background: '#fdfdfd' }}>{spec.label}</td>
                    <td style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--surface-border)', fontWeight: '600', color: '#1e293b' }}>{spec.value || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--surface-border)' }}>
              <thead>
                <tr>
                  <th colSpan={2} style={{ background: '#f8fafc', borderBottom: '2px solid var(--surface-border)', textAlign: 'center', fontSize: '1.1rem', color: '#0f172a', padding: '1rem' }}>
                    {resolvedParams.lang === 'vi' ? 'Chi tiết kỹ thuật' : 'Technical Details'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: dict.machine.attachment, value: forklift.attachment },
                  { label: dict.machine.liftHeight, value: forklift.liftHeight },
                  { label: dict.machine.loadCapacity, value: forklift.loadCapacity },
                  { label: dict.machine.weight, value: forklift.weight },
                  { label: dict.machine.condition, value: forklift.condition },
                  { label: dict.machine.location, value: forklift.location },
                  { label: dict.machine.otherSpecs, value: forklift.otherSpecs },
                ].map((spec, index) => (
                  <tr key={index}>
                    <td style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--surface-border)', color: '#64748b', width: '40%', background: '#fdfdfd' }}>{spec.label}</td>
                    <td style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--surface-border)', fontWeight: '600', color: '#1e293b' }}>{spec.value || '-'}</td>
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
