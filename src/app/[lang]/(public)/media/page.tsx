import { pageMetadata } from '@/lib/seo';
import type { Metadata } from 'next';
import React from 'react';
import { prisma } from '@/lib/prisma';
import MediaGalleryClient from './MediaGalleryClient';
import { FadeIn } from '@/components/animations/FadeIn';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const isEn = lang === 'en';
  return pageMetadata({
    lang,
    path: '/media',
    title: isEn ? 'Forklift Videos – Tests, Deliveries, Container Unloading' : 'Video Xe Nâng Thực Tế – Test Máy, Bàn Giao, Rút Container',
    description: isEn ? 'Real videos of forklift tests, customer deliveries and container unloading of used Japanese forklifts at MCK.' : 'Video thực tế test máy, bàn giao và rút container xe nâng cũ nhập khẩu Nhật Bản tại kho Xe Nâng MCK.',
  });
}

export default async function MediaGalleryPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const isVi = lang === 'vi';

  const videos = await prisma.mediaVideo.findMany({
    orderBy: [
      { isFeatured: 'desc' },
      { createdAt: 'desc' }
    ]
  });

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', paddingBottom: '6rem' }}>
      {/* Hero Header */}
      <section style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)',
        color: 'white',
        padding: '5rem 5% 4rem 5%',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <FadeIn direction="up">
            <span style={{
              display: 'inline-block',
              padding: '0.4rem 1.2rem',
              borderRadius: '20px',
              background: 'rgba(56, 189, 248, 0.15)',
              color: '#38bdf8',
              fontSize: '0.85rem',
              fontWeight: 700,
              letterSpacing: '1px',
              textTransform: 'uppercase',
              marginBottom: '1rem',
              border: '1px solid rgba(56, 189, 248, 0.3)'
            }}>
              {isVi ? 'Thư Viện Video Truyền Thông' : 'Video & Media Gallery'}
            </span>
            <h1 style={{ fontSize: '2.8rem', fontWeight: 900, marginBottom: '1.2rem', letterSpacing: '-0.5px', lineHeight: 1.2 }}>
              {isVi ? 'Hình Ảnh & Video Vận Hành Thực Tế' : 'Real Forklift Operations & Deliveries'}
            </h1>
            <p style={{ fontSize: '1.15rem', color: '#cbd5e1', lineHeight: 1.6, maxWidth: '750px', margin: '0 auto' }}>
              {isVi
                ? 'Theo dõi cận cảnh quy trình kiểm định chất lượng, test tải xe nâng tại bãi, cảnh đập hộp rút container từ Nhật Bản và những khoảnh khắc bàn giao xe đến tận nhà xưởng quý khách.'
                : 'Watch up-close vehicle inspection tests, container unboxing directly from Japan, and proud delivery ceremonies to our valued customers nationwide.'}
            </p>
          </FadeIn>
        </div>
      </section>

      {/* Main Content Area */}
      <div style={{ maxWidth: '1400px', margin: '-2rem auto 0 auto', padding: '0 5%' }}>
        <MediaGalleryClient videos={videos} lang={lang} />
      </div>
    </div>
  );
}
