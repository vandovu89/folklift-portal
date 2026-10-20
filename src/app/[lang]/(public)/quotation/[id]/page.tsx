import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { formatCapacity } from '@/lib/utils';
import PrintQuotationButton from './PrintQuotationButton';
import { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ id: string, lang: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const forklift = await prisma.forklift.findUnique({
    where: { id: resolvedParams.id },
    select: { maker: true, model: true }
  });

  return {
    title: forklift 
      ? `Báo Giá Xe Nâng ${forklift.maker} ${forklift.model} | Xe Nâng MCK Japan`
      : 'Bảng Báo Giá Xe Nâng | Xe Nâng MCK Japan',
    robots: { index: false, follow: false } // Báo giá không cần Google index
  };
}

export default async function QuotationPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string, lang: string }>;
  searchParams: Promise<{ customerName?: string, phone?: string, company?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedQuery = await searchParams;

  const forklift = await prisma.forklift.findUnique({
    where: { id: resolvedParams.id },
    include: {
      media: {
        where: { isPublic: true, fileType: 'IMAGE' },
        orderBy: [{ isThumbnail: 'desc' }, { order: 'asc' }],
        take: 1
      }
    }
  });

  if (!forklift) {
    notFound();
  }

  const today = new Date();
  const quotationCode = `BG-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}-${forklift.internalCode || forklift.id.slice(0, 4).toUpperCase()}`;
  const validUntil = new Date(today);
  validUntil.setDate(today.getDate() + 15);

  const mainImage = forklift.media?.[0]?.url || 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80';
  const isElectric = forklift.powerType?.toLowerCase().includes('điện') || forklift.powerType?.toLowerCase().includes('battery') || forklift.powerType?.toLowerCase().includes('electric');

  return (
    <div style={{ background: '#f1f5f9', minHeight: '100vh', padding: '2rem 1rem' }}>
      
      {/* Action Bar (Ẩn khi in) */}
      <div className="no-print" style={{ maxWidth: '900px', margin: '0 auto 1.5rem auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <Link 
          href={`/${resolvedParams.lang}/machine/${forklift.id}`} 
          style={{ color: '#0284c7', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
        >
          &larr; Quay lại thông tin xe
        </Link>
        <div style={{ display: 'flex', gap: '0.8rem' }}>
          <PrintQuotationButton />
        </div>
      </div>

      {/* Tờ Báo Giá A4 Chuẩn */}
      <div className="quotation-paper" style={{
        maxWidth: '850px',
        margin: '0 auto',
        background: 'white',
        padding: '40px 45px',
        borderRadius: '8px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        color: '#1e293b',
        fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        lineHeight: 1.5,
        fontSize: '13.5px'
      }}>
        
        {/* Header Công Ty */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0284c7', paddingBottom: '16px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <Image 
              src="/logo.png" 
              alt="Logo Xe Nâng MCK" 
              width={75} 
              height={75} 
              style={{ objectFit: 'contain' }}
            />
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: 800, color: '#0369a1', margin: 0, textTransform: 'uppercase' }}>
                XE NÂNG MCK JAPAN
              </h2>
              <div style={{ fontSize: '12px', color: '#475569', marginTop: '3px', lineHeight: 1.4 }}>
                <div><strong>Văn phòng:</strong> Park 2-05, KĐT Eurowindow River Park, Đông Anh, Hà Nội</div>
                <div><strong>Kho bãi:</strong> Thôn Bình Phú, xã Việt Yên, tỉnh Hưng Yên</div>
                <div><strong>Hotline / Zalo:</strong> 0362-396-092 &bull; <strong>Email:</strong> info@xenangmck.jp</div>
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: '12px', color: '#64748b' }}>
            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '13px' }}>Số: {quotationCode}</div>
            <div>Ngày: {today.toLocaleDateString('vi-VN')}</div>
            <div>Hiệu lực đến: {validUntil.toLocaleDateString('vi-VN')}</div>
          </div>
        </div>

        {/* Tiêu đề Báo Giá */}
        <div style={{ textAlign: 'center', margin: '20px 0 24px 0' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0', textTransform: 'uppercase', letterSpacing: '1px' }}>
            BẢNG BÁO GIÁ THIẾT BỊ XE NÂNG NHẬT BẢN
          </h1>
          <div style={{ fontSize: '13px', color: '#64748b', fontStyle: 'italic' }}>
            Kính gửi: <strong>{resolvedQuery.customerName || 'Quý Khách Hàng / Quý Doanh Nghiệp'}</strong>
            {resolvedQuery.company ? ` - ${resolvedQuery.company}` : ''}
            {resolvedQuery.phone ? ` (${resolvedQuery.phone})` : ''}
          </div>
        </div>

        <p style={{ margin: '0 0 16px 0', fontSize: '13px', textAlign: 'justify' }}>
          Xe Nâng MCK Japan trân trọng gửi tới Quý khách hàng báo giá chi tiết dòng thiết bị xe nâng nhập khẩu trực tiếp từ Nhật Bản theo thông số kỹ thuật như sau:
        </p>

        {/* Khung Thông Tin Xe & Hình Ảnh */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: '20px', marginBottom: '20px', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0369a1', margin: '0 0 10px 0', textTransform: 'uppercase' }}>
              Xe Nâng {forklift.maker} {forklift.model}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', fontSize: '13px' }}>
              <div><strong>Hãng sản xuất:</strong> {forklift.maker}</div>
              <div><strong>Model:</strong> {forklift.model}</div>
              <div><strong>Số Serial:</strong> {forklift.serialNo || 'Theo khung máy'}</div>
              <div><strong>Năm sản xuất:</strong> {forklift.year || 'N/A'}</div>
              <div><strong>Tải trọng nâng:</strong> {forklift.loadCapacity ? formatCapacity(forklift.loadCapacity, 'vi') : '-'}</div>
              <div><strong>Chiều cao nâng:</strong> {forklift.liftHeight || '3,000 mm'}</div>
              <div><strong>Loại nhiên liệu:</strong> {forklift.powerType || 'Điện'}</div>
              <div><strong>Giờ hoạt động:</strong> {forklift.hour ? `${forklift.hour} giờ` : 'N/A'}</div>
              <div><strong>Chiều dài càng:</strong> {forklift.forkLength || '1070 mm'}</div>
              <div><strong>Phụ kiện đính kèm:</strong> {forklift.attachment || 'Càng tiêu chuẩn'}</div>
              <div style={{ gridColumn: '1 / -1' }}>
                <strong>Tình trạng bình ắc quy:</strong> {forklift.condition || 'Cam kết dung lượng >80% so với bình mới, test tải thực tế'}
              </div>
            </div>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '100%', height: '140px', position: 'relative', borderRadius: '6px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={mainImage} 
                alt={forklift.model} 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', fontStyle: 'italic' }}>Hình ảnh thực tế của xe</div>
          </div>
        </div>

        {/* Bảng Đơn Giá */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#0284c7', color: 'white' }}>
              <th style={{ padding: '8px 12px', border: '1px solid #0284c7', textAlign: 'center', width: '40px' }}>STT</th>
              <th style={{ padding: '8px 12px', border: '1px solid #0284c7', textAlign: 'left' }}>Tên Hàng Hóa / Quy Cách</th>
              <th style={{ padding: '8px 12px', border: '1px solid #0284c7', textAlign: 'center', width: '70px' }}>ĐVT</th>
              <th style={{ padding: '8px 12px', border: '1px solid #0284c7', textAlign: 'center', width: '50px' }}>SL</th>
              <th style={{ padding: '8px 12px', border: '1px solid #0284c7', textAlign: 'right', width: '150px' }}>Thành Tiền (VNĐ)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '10px 12px', border: '1px solid #cbd5e1', textAlign: 'center' }}>01</td>
              <td style={{ padding: '10px 12px', border: '1px solid #cbd5e1' }}>
                <strong>Xe nâng {forklift.maker} {forklift.model}</strong>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  Xuất xứ Nhật Bản, tình trạng nguyên bản, đã kiểm tra kỹ thuật và vệ sinh bảo dưỡng hoàn chỉnh.
                </div>
              </td>
              <td style={{ padding: '10px 12px', border: '1px solid #cbd5e1', textAlign: 'center' }}>Chiếc</td>
              <td style={{ padding: '10px 12px', border: '1px solid #cbd5e1', textAlign: 'center' }}>01</td>
              <td style={{ padding: '10px 12px', border: '1px solid #cbd5e1', textAlign: 'right', fontWeight: 800, color: '#b91c1c', fontSize: '14px' }}>
                {forklift.price ? `${forklift.price.toLocaleString('vi-VN')} VNĐ` : 'Thương lượng'}
              </td>
            </tr>
            {isElectric && (
              <tr style={{ background: '#f8fafc' }}>
                <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1', textAlign: 'center' }}>02</td>
                <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1' }}>
                  <strong>Quà tặng: 01 Máy lọc nước tinh khiết RO chuyên dụng</strong>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Phục vụ châm nước bình ắc quy định kỳ theo chuẩn kỹ thuật Nhật Bản.</div>
                </td>
                <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1', textAlign: 'center' }}>Bộ</td>
                <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1', textAlign: 'center' }}>01</td>
                <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1', textAlign: 'right', color: '#16a34a', fontWeight: 700 }}>
                  Tặng kèm (0 VNĐ)
                </td>
              </tr>
            )}
            <tr style={{ background: '#f1f5f9', fontWeight: 800 }}>
              <td colSpan={4} style={{ padding: '10px 12px', border: '1px solid #cbd5e1', textAlign: 'right' }}>
                TỔNG GIÁ TRỊ THANH TOÁN (ĐÃ BAO GỒM VAT):
              </td>
              <td style={{ padding: '10px 12px', border: '1px solid #cbd5e1', textAlign: 'right', color: '#b91c1c', fontSize: '15px' }}>
                {forklift.price ? `${forklift.price.toLocaleString('vi-VN')} VNĐ` : 'Thương lượng'}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Cam Kết & Điều Khoản */}
        <div style={{ marginBottom: '24px', background: '#fafafa', padding: '12px 16px', borderRadius: '6px', border: '1px solid #e5e7eb', fontSize: '12.5px' }}>
          <div style={{ fontWeight: 700, color: '#0369a1', marginBottom: '4px' }}>ĐIỀU KHOẢN BẢO HÀNH &amp; THANH TOÁN:</div>
          <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <li><strong>Chính sách Bảo hành:</strong> Bảo hành <strong>03 tháng</strong> cho <strong>Bình ắc quy</strong> và <strong>Bo mạch / Hệ thống điện tử</strong>. Cam kết bình điện còn tốt &gt;80% dung lượng.</li>
            <li><strong>Đổi trả:</strong> Cam kết hoàn tiền 100% hoặc đổi xe tương đương trong <strong>07 ngày</strong> nếu phát sinh lỗi kỹ thuật nghiêm trọng.</li>
            <li><strong>Giao nhận:</strong> Giao xe tận nơi toàn quốc. Miễn phí vận chuyển bán kính 50km từ kho Hà Nội.</li>
            <li><strong>Thanh toán:</strong> Chuyển khoản qua VPBank (STK: 5252729999) hoặc Ngân hàng Á Châu ACB CN Đông Anh (STK: 100661008) - CT TNHH KD SX &amp; TM VIỆT NHẬT.</li>
          </ul>
        </div>

        {/* Chữ Ký & Con Dấu */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '30px', textAlign: 'center' }}>
          <div>
            <div style={{ fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>ĐẠI DIỆN KHÁCH HÀNG</div>
            <div style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic', marginTop: '2px' }}>(Ký và ghi rõ họ tên)</div>
          </div>
          <div>
            <div style={{ fontWeight: 700, color: '#0369a1', textTransform: 'uppercase' }}>XE NÂNG MCK JAPAN</div>
            <div style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic', marginTop: '2px' }}>Đại diện bán hàng</div>
            <div style={{ height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#dc2626', fontWeight: 800, border: '2px dashed #dc2626', padding: '4px 14px', borderRadius: '6px', fontSize: '13px', transform: 'rotate(-5deg)' }}>
                ĐÃ XÁC NHẬN BÁO GIÁ
              </span>
            </div>
            <div style={{ fontWeight: 700, color: '#0f172a' }}>Phòng Kinh Doanh Xe Nâng</div>
          </div>
        </div>

      </div>

      {/* Print Stylesheet */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body {
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .quotation-paper {
            box-shadow: none !important;
            border-radius: 0 !important;
            padding: 0 !important;
            max-width: 100% !important;
            margin: 0 !important;
          }
          @page {
            size: A4 portrait;
            margin: 12mm;
          }
        }
      `}} />

    </div>
  );
}
