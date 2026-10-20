'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FaArrowLeft, FaCheckCircle, FaExclamationTriangle, FaRedo } from 'react-icons/fa';
import CatalogInquiryButton from '@/components/CatalogInquiryButton';

interface Option<T> {
  value: T;
  vi: string;
  en: string;
  hint?: { vi: string; en: string };
  icon: string;
}

interface Answers {
  loadKg: number | null;
  liftMm: number | null;
  environment: 'indoor' | 'outdoor' | 'mixed' | null;
  budgetMax: number | null;
}

interface Recommendation {
  id: string;
  maker: string;
  model: string;
  year: number | null;
  hour: number | null;
  powerType: string | null;
  loadCapacity: string | null;
  liftHeight: string | null;
  price: number | null;
  status: string;
  thumbnail: string | null;
  matchPercent: number;
  reasons: string[];
  cautions: string[];
}

const LOAD_OPTIONS: Option<number>[] = [
  { value: 1000, icon: '📦', vi: 'Dưới 1 tấn', en: 'Under 1 ton', hint: { vi: 'Thùng carton, hàng tiêu dùng', en: 'Cartons, consumer goods' } },
  { value: 2000, icon: '🧱', vi: '1 – 2 tấn', en: '1 – 2 tons', hint: { vi: 'Pallet hàng thông thường', en: 'Standard pallets' } },
  { value: 3000, icon: '🏗️', vi: '2 – 3 tấn', en: '2 – 3 tons', hint: { vi: 'Vật liệu xây dựng, cuộn giấy', en: 'Building materials, paper rolls' } },
  { value: 5000, icon: '⚙️', vi: 'Trên 3 tấn', en: 'Over 3 tons', hint: { vi: 'Máy móc, thép, container', en: 'Machinery, steel, containers' } },
];

const LIFT_OPTIONS: Option<number>[] = [
  { value: 3000, icon: '⬆️', vi: 'Đến 3 mét', en: 'Up to 3 m', hint: { vi: 'Xếp 2–3 tầng pallet, lên xuống xe tải', en: '2–3 pallet levels, truck loading' } },
  { value: 4500, icon: '🏢', vi: '3 – 4,5 mét', en: '3 – 4.5 m', hint: { vi: 'Kệ kho tiêu chuẩn', en: 'Standard racking' } },
  { value: 6000, icon: '🗼', vi: 'Trên 4,5 mét', en: 'Over 4.5 m', hint: { vi: 'Kệ cao tầng', en: 'High-bay racking' } },
  { value: 0, icon: '🤷', vi: 'Chưa rõ', en: 'Not sure' },
];

const ENV_OPTIONS: Option<'indoor' | 'outdoor' | 'mixed'>[] = [
  { value: 'indoor', icon: '🏭', vi: 'Trong kho kín', en: 'Indoors', hint: { vi: 'Nền phẳng, cần sạch, ít tiếng ồn', en: 'Flat floor, clean, quiet' } },
  { value: 'outdoor', icon: '🌧️', vi: 'Ngoài trời / bãi', en: 'Outdoors / yard', hint: { vi: 'Nền gồ ghề, mưa nắng', en: 'Rough ground, all weather' } },
  { value: 'mixed', icon: '🔄', vi: 'Cả hai', en: 'Both', hint: { vi: 'Ra vào kho liên tục', en: 'In and out frequently' } },
];

const BUDGET_OPTIONS: Option<number>[] = [
  { value: 200000000, icon: '💵', vi: 'Dưới 200 triệu', en: 'Under 200M VND' },
  { value: 350000000, icon: '💰', vi: '200 – 350 triệu', en: '200 – 350M VND' },
  { value: 500000000, icon: '💎', vi: '350 – 500 triệu', en: '350 – 500M VND' },
  { value: 0, icon: '♾️', vi: 'Linh hoạt', en: 'Flexible' },
];

export default function FindForkliftWizard({ lang, dict }: { lang: string; dict: unknown }) {
  const t = (vi: string, en: string) => (lang === 'vi' ? vi : en);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({ loadKg: null, liftMm: null, environment: null, budgetMax: null });
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Recommendation[] | null>(null);
  const [error, setError] = useState('');

  const fetchResults = async (final: Answers) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/forklifts/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...final, lang })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setResults(data.results);
    } catch {
      setError(t('Không tải được gợi ý. Vui lòng thử lại.', 'Could not load recommendations. Please try again.'));
    }
    setLoading(false);
  };

  const choose = (key: keyof Answers, value: Answers[keyof Answers]) => {
    const next = { ...answers, [key]: value };
    setAnswers(next);
    if (step < 3) {
      setStep(step + 1);
    } else {
      setStep(4);
      fetchResults(next);
    }
  };

  const restart = () => {
    setAnswers({ loadKg: null, liftMm: null, environment: null, budgetMax: null });
    setResults(null);
    setStep(0);
  };

  const questions = [
    { key: 'loadKg' as const, title: t('Hàng nặng nhất bạn cần nâng là bao nhiêu?', 'How heavy is your heaviest load?'), options: LOAD_OPTIONS },
    { key: 'liftMm' as const, title: t('Bạn cần nâng hàng lên cao bao nhiêu?', 'How high do you need to lift?'), options: LIFT_OPTIONS },
    { key: 'environment' as const, title: t('Xe sẽ làm việc ở đâu là chủ yếu?', 'Where will the forklift mainly work?'), options: ENV_OPTIONS },
    { key: 'budgetMax' as const, title: t('Ngân sách dự kiến của bạn?', 'What is your budget?'), options: BUDGET_OPTIONS },
  ];

  const renderQuestion = () => {
    const q = questions[step];
    return (
      <div>
        <h2 style={{ fontSize: 'clamp(1.3rem, 3vw, 1.7rem)', color: '#0f172a', marginBottom: '1.5rem', textAlign: 'center' }}>{q.title}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '1rem' }}>
          {q.options.map(opt => {
            const selected = answers[q.key] === opt.value;
            return (
              <button
                key={String(opt.value)}
                type="button"
                onClick={() => choose(q.key, opt.value)}
                className="hover-lift-sm"
                style={{
                  background: selected ? '#eff6ff' : 'white',
                  border: `2px solid ${selected ? '#0284c7' : '#e2e8f0'}`,
                  borderRadius: '12px',
                  padding: '1.3rem 1rem',
                  cursor: 'pointer',
                  textAlign: 'center',
                  color: '#0f172a'
                }}
              >
                <div style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>{opt.icon}</div>
                <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{lang === 'vi' ? opt.vi : opt.en}</div>
                {opt.hint && <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.3rem' }}>{lang === 'vi' ? opt.hint.vi : opt.hint.en}</div>}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderResults = () => {
    if (loading) {
      return <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>🔎 {t('Đang tìm những chiếc xe phù hợp nhất trong kho...', 'Finding the best matches in stock...')}</div>;
    }
    if (error) {
      return <div style={{ textAlign: 'center', padding: '2rem', color: '#dc2626' }}>{error}</div>;
    }
    if (!results || results.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p style={{ color: '#475569', marginBottom: '1rem' }}>
            {t('Hiện chưa có xe trong kho khớp hoàn toàn với nhu cầu của bạn. Để lại thông tin, MCK Japan sẽ tìm xe từ Nhật Bản cho bạn!',
              'No forklift in stock fully matches your needs yet. Leave your details and MCK Japan will source one from Japan for you!')}
          </p>
          <Link href={`/${lang}/contact`} className="btn-primary" style={{ textDecoration: 'none' }}>{t('Liên hệ tư vấn', 'Contact us')}</Link>
        </div>
      );
    }
    return (
      <div>
        <h2 style={{ fontSize: 'clamp(1.3rem, 3vw, 1.7rem)', color: '#0f172a', marginBottom: '0.4rem', textAlign: 'center' }}>
          🎯 {t(`Top ${results.length} xe phù hợp nhất với bạn`, `Your top ${results.length} matches`)}
        </h2>
        <p style={{ textAlign: 'center', color: '#64748b', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          {t('Dựa trên tải trọng, chiều cao nâng, môi trường làm việc và ngân sách bạn chọn.', 'Based on your load, lift height, work environment and budget.')}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '1.2rem' }}>
          {results.map((r, i) => (
            <div key={r.id} style={{ background: 'white', borderRadius: '12px', border: i === 0 ? '2px solid #0284c7' : '1px solid #e2e8f0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ position: 'relative', aspectRatio: '4 / 3', background: '#f1f5f9' }}>
                {r.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.thumbnail} alt={`${r.maker} ${r.model}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '3rem' }}>🚜</div>
                )}
                <span style={{ position: 'absolute', top: '0.6rem', left: '0.6rem', background: i === 0 ? '#0284c7' : '#0f172a', color: 'white', padding: '0.25rem 0.6rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 700 }}>
                  {i === 0 ? t('⭐ Phù hợp nhất', '⭐ Best match') : `#${i + 1}`} · {r.matchPercent}%
                </span>
              </div>
              <div style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: '1.15rem', margin: '0 0 0.3rem', color: '#0f172a' }}>
                  <span style={{ color: 'var(--primary)' }}>{r.maker}</span> {r.model}
                </h3>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.6rem' }}>
                  {[r.year && `${t('Đời', 'Year')} ${r.year}`, r.hour !== null && `${r.hour.toLocaleString('vi-VN')} ${t('giờ', 'h')}`, r.powerType].filter(Boolean).join(' • ')}
                </div>
                <div style={{ color: '#c2272d', fontWeight: 800, fontSize: '1.2rem', marginBottom: '0.7rem' }}>
                  {r.price ? `${r.price.toLocaleString('vi-VN')} VNĐ` : t('Liên hệ', 'Contact')}
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 0.8rem', fontSize: '0.85rem', display: 'grid', gap: '0.3rem' }}>
                  {r.reasons.map(reason => (
                    <li key={reason} style={{ display: 'flex', gap: '0.4rem', color: '#166534' }}><FaCheckCircle style={{ flexShrink: 0, marginTop: '0.15rem' }} /> {reason}</li>
                  ))}
                  {r.cautions.map(caution => (
                    <li key={caution} style={{ display: 'flex', gap: '0.4rem', color: '#b45309' }}><FaExclamationTriangle style={{ flexShrink: 0, marginTop: '0.15rem' }} /> {caution}</li>
                  ))}
                </ul>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', flexWrap: 'wrap' }}>
                  <Link href={`/${lang}/machine/${r.id}`} className="btn-secondary" style={{ flex: 1, textAlign: 'center', textDecoration: 'none', minWidth: '110px' }}>
                    {t('Xem chi tiết', 'View details')}
                  </Link>
                  <CatalogInquiryButton lang={lang} dict={dict} forkliftId={r.id} forkliftName={`${r.maker} ${r.model}`} internalCode="" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="glass-panel" style={{ padding: 'clamp(1.2rem, 4vw, 2.5rem)', background: '#f8fafc' }}>
      {step < 4 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <button
            type="button"
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            aria-label={t('Quay lại', 'Back')}
            style={{ background: 'none', border: 'none', cursor: step === 0 ? 'default' : 'pointer', color: step === 0 ? '#cbd5e1' : '#0284c7', fontSize: '1.1rem' }}
          >
            <FaArrowLeft />
          </button>
          <div style={{ flex: 1, display: 'flex', gap: '0.4rem' }}>
            {questions.map((q, i) => (
              <div key={q.key} style={{ flex: 1, height: '6px', borderRadius: '3px', background: i <= step ? '#0284c7' : '#e2e8f0', transition: 'background 0.2s' }} />
            ))}
          </div>
          <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>{step + 1}/4</span>
        </div>
      )}

      {step < 4 ? renderQuestion() : renderResults()}

      {step === 4 && !loading && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem', flexWrap: 'wrap' }}>
          <button type="button" onClick={restart} className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <FaRedo /> {t('Làm lại khảo sát', 'Start over')}
          </button>
          <Link href={`/${lang}/catalog`} className="btn-secondary" style={{ textDecoration: 'none' }}>
            {t('Xem toàn bộ kho xe', 'Browse all forklifts')}
          </Link>
        </div>
      )}
    </div>
  );
}
