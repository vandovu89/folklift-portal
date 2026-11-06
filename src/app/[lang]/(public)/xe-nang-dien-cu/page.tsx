import type { Metadata } from 'next';
import LandingPage, { landingMetadata } from '@/components/LandingPage';
import { POWER_PAGES } from '@/lib/landing-pages';

export const dynamic = 'force-dynamic';

const page = POWER_PAGES.electric;

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  return landingMetadata(page, lang);
}

export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return <LandingPage page={page} lang={lang} />;
}
