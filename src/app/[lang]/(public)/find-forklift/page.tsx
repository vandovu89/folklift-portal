import type { Metadata } from 'next';
import { getDictionary } from '@/dictionaries';
import FindForkliftWizard from './FindForkliftWizard';
import RoiCalculator from '@/components/RoiCalculator';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  return {
    title: lang === 'vi' ? 'Trợ lý Chọn Xe Nâng Phù Hợp | Xe Nâng MCK Japan' : 'Find My Forklift | MCK Japan Forklifts',
    description: lang === 'vi'
      ? 'Trả lời 4 câu hỏi đơn giản để nhận gợi ý 3 chiếc xe nâng phù hợp nhất trong kho của Xe Nâng MCK Japan.'
      : 'Answer 4 simple questions to get the 3 best-matching forklifts in stock at MCK Japan.'
  };
}

export default async function FindForkliftPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const dict = await getDictionary(lang as 'en' | 'vi');

  return (
    <div style={{ minHeight: '80vh' }}>
      <div style={{ background: 'var(--primary)', padding: 'clamp(2.5rem, 6vw, 4rem) 5%', color: 'white', textAlign: 'center' }}>
        <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.8rem)', fontWeight: 800, marginBottom: '0.6rem' }}>
          {lang === 'vi' ? 'Trợ lý Chọn Xe Nâng Thông Minh' : 'Find My Forklift'}
        </h1>
        <p style={{ fontSize: '1.05rem', opacity: 0.9, maxWidth: '700px', margin: '0 auto' }}>
          {lang === 'vi'
            ? 'Không cần rành kỹ thuật: trả lời 4 câu hỏi, hệ thống sẽ đề xuất 3 chiếc xe phù hợp nhất đang có trong kho.'
            : 'No technical knowledge needed: answer 4 questions and we will suggest the 3 best forklifts in stock.'}
        </p>
      </div>
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2.5rem 5%' }}>
        <FindForkliftWizard lang={lang} dict={dict} />
        <RoiCalculator lang={lang} />
      </main>
    </div>
  );
}
