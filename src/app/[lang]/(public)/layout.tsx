import PublicNavbar from '@/components/PublicNavbar';
import PublicFooter from '@/components/PublicFooter';

export default async function PublicLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ lang: 'en' | 'vi' }>;
}) {
  const resolvedParams = await params;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--background)' }}>
      <PublicNavbar lang={resolvedParams.lang} />
      <div style={{ flex: 1 }}>
        {children}
      </div>
      <PublicFooter lang={resolvedParams.lang} />
    </div>
  );
}
