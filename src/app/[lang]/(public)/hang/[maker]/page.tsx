import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import LandingPage, { landingMetadata } from '@/components/LandingPage';
import { brandPage } from '@/lib/landing-pages';

export const dynamic = 'force-dynamic';

type Params = Promise<{ lang: string; maker: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang, maker } = await params;
  const page = brandPage(maker);
  if (!page) return { robots: { index: false } };
  return landingMetadata(page, lang);
}

export default async function BrandPage({ params }: { params: Params }) {
  const { lang, maker } = await params;
  const page = brandPage(maker);
  if (!page) notFound();
  return <LandingPage page={page} lang={lang} />;
}
