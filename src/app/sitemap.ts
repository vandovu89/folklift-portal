import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';
import { SITE_URL, PUBLIC_FORKLIFT_STATUSES } from '@/lib/seo';

// Sitemap đọc DB nên render lại định kỳ thay vì đóng băng lúc build.
export const revalidate = 3600;

function withAlternates(path: string) {
  return {
    languages: {
      vi: `${SITE_URL}/vi${path}`,
      en: `${SITE_URL}/en${path}`,
    },
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Các trang tĩnh công khai (path sau locale)
  const staticRoutes: { path: string; priority: number; changeFrequency: 'daily' | 'weekly' | 'monthly' }[] = [
    { path: '', priority: 1.0, changeFrequency: 'daily' },
    { path: '/catalog', priority: 0.9, changeFrequency: 'daily' },
    { path: '/find-forklift', priority: 0.7, changeFrequency: 'weekly' },
    { path: '/customer-stories', priority: 0.6, changeFrequency: 'weekly' },
    { path: '/media', priority: 0.6, changeFrequency: 'weekly' },
    { path: '/about', priority: 0.6, changeFrequency: 'monthly' },
    { path: '/contact', priority: 0.6, changeFrequency: 'monthly' },
    { path: '/policies', priority: 0.4, changeFrequency: 'monthly' },
    { path: '/privacy-policy', priority: 0.3, changeFrequency: 'monthly' },
    { path: '/terms-of-service', priority: 0.3, changeFrequency: 'monthly' },
    { path: '/data-deletion', priority: 0.2, changeFrequency: 'monthly' },
  ];

  const staticEntries: MetadataRoute.Sitemap = staticRoutes.flatMap((route) =>
    (['vi', 'en'] as const).map((lang) => ({
      url: `${SITE_URL}/${lang}${route.path}`,
      changeFrequency: route.changeFrequency,
      priority: lang === 'vi' ? route.priority : Math.round(route.priority * 0.8 * 10) / 10,
      alternates: withAlternates(route.path),
    }))
  );

  // Chỉ đưa vào sitemap những xe đang hiển thị công khai — xe đã bán / nháp
  // bị noindex ở trang chi tiết, đưa vào sitemap chỉ làm tăng "Not indexed".
  try {
    const forklifts = await prisma.forklift.findMany({
      where: { status: { in: PUBLIC_FORKLIFT_STATUSES } },
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 5000,
    });

    const forkliftEntries: MetadataRoute.Sitemap = forklifts.flatMap((f) =>
      (['vi', 'en'] as const).map((lang) => ({
        url: `${SITE_URL}/${lang}/machine/${f.id}`,
        lastModified: f.updatedAt,
        changeFrequency: 'weekly' as const,
        priority: lang === 'vi' ? 0.8 : 0.6,
        alternates: withAlternates(`/machine/${f.id}`),
      }))
    );

    return [...staticEntries, ...forkliftEntries];
  } catch (error) {
    console.error('[Sitemap] Failed to fetch forklifts:', error);
    return staticEntries;
  }
}
