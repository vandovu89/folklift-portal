import Link from 'next/link';
import type { Metadata } from 'next';
import { getDictionary } from '@/dictionaries';
import { pageMetadata, normalizeLang, SITE_URL } from '@/lib/seo';
import { allLandingPages, type LandingContent, type LandingFaq } from '@/lib/landing-pages';
import { findLandingForklifts } from '@/lib/forklift-queries';
import ForkliftCard from '@/components/ForkliftCard';

export function landingMetadata(page: LandingContent, lang: string): Metadata {
  const c = normalizeLang(lang) === 'vi' ? page.vi : page.en;
  return pageMetadata({ lang, path: page.path, title: c.title, description: c.description });
}

function jsonLdScript(data: object) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}

const fmtVnd = (n: number) => n.toLocaleString('vi-VN');

/** Trang đích theo từ khóa: H1 + giới thiệu + danh sách xe + hướng dẫn + FAQ. */
export default async function LandingPage({ page, lang: rawLang }: { page: LandingContent; lang: string }) {
  const lang = normalizeLang(rawLang);
  const vi = lang === 'vi';
  const dict = await getDictionary(lang);
  const forklifts = await findLandingForklifts(page.filter);
  const c = vi ? page.vi : page.en;
  const label = page.label[lang];

  // FAQ giá lấy từ dữ liệu thật trong kho — luôn đúng, không cần cập nhật tay.
  const prices = forklifts.map((f) => f.price).filter((p): p is number => typeof p === 'number' && p > 0);
  const faq: LandingFaq[] = vi ? [...page.vi.faq] : [];
  if (vi && prices.length > 0) {
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    faq.unshift({
      q: `Giá ${label.toLowerCase()} bao nhiêu?`,
      a: min === max
        ? `Hiện Xe Nâng MCK có ${forklifts.length} xe, giá ${fmtVnd(min)} VNĐ (đã gồm VAT). Giá phụ thuộc đời xe, tải trọng, chiều cao nâng và tình trạng.`
        : `Hiện Xe Nâng MCK có ${forklifts.length} xe, giá từ ${fmtVnd(min)} đến ${fmtVnd(max)} VNĐ (đã gồm VAT). Giá phụ thuộc đời xe, tải trọng, chiều cao nâng, số giờ hoạt động và tình trạng ắc quy/động cơ.`,
    });
  }

  const url = `${SITE_URL}/${lang}${page.path}`;
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: vi ? 'Trang chủ' : 'Home', item: `${SITE_URL}/${lang}` },
      { '@type': 'ListItem', position: 2, name: label, item: url },
    ],
  };
  const itemListLd = forklifts.length > 0 && {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: c.h1,
    numberOfItems: forklifts.length,
    itemListElement: forklifts.slice(0, 30).map((f, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${SITE_URL}/${lang}/machine/${f.id}`,
      name: `${f.maker} ${f.model}`,
    })),
  };
  const faqLd = faq.length > 0 && {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  const related = allLandingPages().filter((p) => p.path !== page.path);
  const panel: React.CSSProperties = { padding: '2rem', marginTop: '2rem', backgroundColor: 'white' };
  const h2: React.CSSProperties = { fontSize: '1.5rem', color: '#0f172a', marginBottom: '1rem', fontWeight: 800 };
  const text: React.CSSProperties = { lineHeight: 1.8, color: '#334155', fontSize: '1.05rem' };

  return (
    <div>
      {jsonLdScript(breadcrumbLd)}
      {itemListLd && jsonLdScript(itemListLd)}
      {faqLd && jsonLdScript(faqLd)}
      <main style={{ padding: '2rem 5% 3rem', maxWidth: '1600px', margin: '0 auto', minHeight: '80vh' }}>
        <nav aria-label="Breadcrumb" style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '1rem' }}>
          <Link href={`/${lang}`} style={{ color: 'var(--primary)', textDecoration: 'none' }}>{vi ? 'Trang chủ' : 'Home'}</Link>
          <span style={{ margin: '0 0.5rem' }}>›</span>
          <span aria-current="page">{label}</span>
        </nav>

        <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 900, color: '#0f172a', lineHeight: 1.2, marginBottom: '1rem' }}>{c.h1}</h1>
        <div style={{ ...text, maxWidth: '900px' }}>
          {c.intro.map((p, i) => <p key={i} style={{ marginBottom: '0.8rem' }}>{p}</p>)}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '2rem 0 1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h2 style={{ fontSize: '1.5rem', color: 'var(--primary)', margin: 0 }}>
            {vi ? `${label} đang có` : `${label} available`} ({forklifts.length})
          </h2>
          <Link href={`/${lang}/catalog`} style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
            {vi ? 'Xem toàn bộ xe nâng →' : 'Browse all forklifts →'}
          </Link>
        </div>

        {forklifts.length === 0 ? (
          <div className="glass-panel" style={{ padding: '3rem 2rem', textAlign: 'center', backgroundColor: 'white' }}>
            <p style={{ ...text, marginBottom: '1.5rem' }}>
              {vi
                ? `Hiện kho chưa có ${label.toLowerCase()} sẵn. Chúng tôi nhập theo đơn từ Nhật Bản – gửi tải trọng và chiều cao nâng bạn cần để nhận danh sách xe kèm hình ảnh.`
                : `No ${label.toLowerCase()} in stock right now. We import to order from Japan – tell us the capacity and lift height you need.`}
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href={`/${lang}/find-forklift`} className="btn-primary" style={{ padding: '0.8rem 1.5rem', borderRadius: '8px', textDecoration: 'none' }}>
                {vi ? 'Gửi yêu cầu tìm xe' : 'Request a forklift'}
              </Link>
              <a href="https://zalo.me/84362396092" target="_blank" rel="noopener noreferrer" style={{ padding: '0.8rem 1.5rem', borderRadius: '8px', textDecoration: 'none', border: '1px solid var(--primary)', color: 'var(--primary)', fontWeight: 600 }}>
                {vi ? 'Nhắn Zalo' : 'Chat on Zalo'}
              </a>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2rem' }}>
            {forklifts.map((fl) => <ForkliftCard key={fl.id} fl={fl} lang={lang} dict={dict} />)}
          </div>
        )}

        {vi && page.vi.sections.map((s) => (
          <section key={s.heading} className="glass-panel" style={panel}>
            <h2 style={h2}>{s.heading}</h2>
            <div style={text}>
              {s.paragraphs?.map((p, i) => <p key={i} style={{ marginBottom: '0.8rem' }}>{p}</p>)}
              {s.bullets && (
                <ul style={{ paddingLeft: '1.3rem', margin: 0 }}>
                  {s.bullets.map((b, i) => <li key={i} style={{ marginBottom: '0.4rem' }}>{b}</li>)}
                </ul>
              )}
            </div>
          </section>
        ))}

        {faq.length > 0 && (
          <section className="glass-panel" style={panel}>
            <h2 style={h2}>Câu hỏi thường gặp</h2>
            {faq.map((f) => (
              <details key={f.q} style={{ borderTop: '1px solid #e2e8f0', padding: '0.9rem 0' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 700, color: '#0f172a', fontSize: '1.05rem' }}>{f.q}</summary>
                <p style={{ ...text, marginTop: '0.6rem', marginBottom: 0 }}>{f.a}</p>
              </details>
            ))}
          </section>
        )}

        <section className="glass-panel" style={panel}>
          <h2 style={h2}>{vi ? 'Xem thêm' : 'See also'}</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
            {related.map((p) => (
              <Link key={p.path} href={`/${lang}${p.path}`} style={{ padding: '0.5rem 1rem', borderRadius: '999px', border: '1px solid #cbd5e1', color: '#0f172a', textDecoration: 'none', fontWeight: 600, fontSize: '0.95rem' }}>
                {p.label[lang]}
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
