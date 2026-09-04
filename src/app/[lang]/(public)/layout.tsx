import PublicNavbar from '@/components/PublicNavbar';
import PublicFooter from '@/components/PublicFooter';
import { getDictionary } from '@/dictionaries';

export default async function PublicLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const resolvedParams = await params;
  const lang = resolvedParams.lang as 'en' | 'vi';
  const dict = await getDictionary(lang);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--background)' }}>
      <PublicNavbar lang={lang} dict={dict} />
      <div style={{ flex: 1 }}>
        {children}
      </div>
      <PublicFooter lang={lang} />
    </div>
  );
}
