import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import QRCodeComponent from './QRCodeComponent';
import { notFound } from 'next/navigation';

export default async function MachineDetail({ params }: { params: { id: string } }) {
  const forklift = await prisma.forklift.findUnique({
    where: { id: params.id }
  });

  if (!forklift) {
    notFound();
  }

  // URL giả định cho QR Code
  const qrUrl = `https://forklift.example.com/machine/${forklift.id}`;

  return (
    <div>
      <header style={{ padding: '1rem 5%', background: 'var(--surface)', borderBottom: '1px solid var(--surface-border)' }}>
        <Link href="/" style={{ color: 'var(--primary)', fontWeight: '600' }}>&larr; Trở về danh mục</Link>
      </header>
      
      <main style={{ padding: '3rem 5%', maxWidth: '1200px', margin: '0 auto' }}>
        <div className="glass-panel" style={{ display: 'flex', flexWrap: 'wrap', overflow: 'hidden' }}>
          
          <div style={{ flex: '1 1 500px', background: 'var(--surface-border)', minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <h2>[ Hình Ảnh Chi Tiết ]</h2>
          </div>

          <div style={{ flex: '1 1 400px', padding: '2.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{forklift.maker} {forklift.model}</h1>
                <p style={{ color: '#888', marginBottom: '1.5rem' }}>Mã kho: {forklift.stockNo || forklift.internalCode || 'N/A'}</p>
              </div>
              <div style={{ background: 'white', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--surface-border)' }}>
                <QRCodeComponent value={qrUrl} />
                <div style={{ fontSize: '0.7rem', textAlign: 'center', marginTop: '0.2rem' }}>Quét mã share</div>
              </div>
            </div>

            <div style={{ margin: '2rem 0', padding: '1.5rem', background: 'rgba(37, 99, 235, 0.05)', borderRadius: '12px', border: '1px solid rgba(37, 99, 235, 0.1)' }}>
              <div style={{ fontSize: '0.9rem', color: '#666' }}>Giá Bán Đề Xuất:</div>
              <div style={{ fontSize: '2.2rem', fontWeight: '800', color: 'var(--danger)' }}>
                {forklift.price ? `${forklift.price.toLocaleString('vi-VN')} ₫` : 'Liên Hệ Trực Tiếp'}
              </div>
            </div>

            <h3 style={{ marginBottom: '1rem', fontSize: '1.2rem', borderBottom: '2px solid var(--primary)', display: 'inline-block', paddingBottom: '0.3rem' }}>
              Thông Số Kỹ Thuật
            </h3>
            
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '0.8rem 0', borderBottom: '1px solid var(--surface-border)', color: '#666' }}>Nhà sản xuất</td>
                  <td style={{ padding: '0.8rem 0', borderBottom: '1px solid var(--surface-border)', fontWeight: '600' }}>{forklift.maker}</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.8rem 0', borderBottom: '1px solid var(--surface-border)', color: '#666' }}>Model</td>
                  <td style={{ padding: '0.8rem 0', borderBottom: '1px solid var(--surface-border)', fontWeight: '600' }}>{forklift.model}</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.8rem 0', borderBottom: '1px solid var(--surface-border)', color: '#666' }}>Năm sản xuất</td>
                  <td style={{ padding: '0.8rem 0', borderBottom: '1px solid var(--surface-border)', fontWeight: '600' }}>{forklift.year || '-'}</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.8rem 0', borderBottom: '1px solid var(--surface-border)', color: '#666' }}>Giờ hoạt động</td>
                  <td style={{ padding: '0.8rem 0', borderBottom: '1px solid var(--surface-border)', fontWeight: '600' }}>{forklift.hour || '-'}</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.8rem 0', borderBottom: '1px solid var(--surface-border)', color: '#666' }}>Nguồn nhiên liệu</td>
                  <td style={{ padding: '0.8rem 0', borderBottom: '1px solid var(--surface-border)', fontWeight: '600' }}>{forklift.powerType || '-'}</td>
                </tr>
              </tbody>
            </table>

            <div style={{ marginTop: '3rem' }}>
              <button className="btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }}>
                Gửi Yêu Cầu Tư Vấn Mua Xe
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
