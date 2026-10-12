import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://xenangmck.jp';

  // Các trang tĩnh công khai hợp lệ
  const staticRoutes = [
    { path: '/vi', priority: 1.0, changeFrequency: 'daily' as const },
    { path: '/en', priority: 0.8, changeFrequency: 'weekly' as const },
    { path: '/vi/catalog', priority: 0.9, changeFrequency: 'daily' as const },
    { path: '/en/catalog', priority: 0.8, changeFrequency: 'daily' as const },
    { path: '/vi/about', priority: 0.7, changeFrequency: 'monthly' as const },
    { path: '/en/about', priority: 0.6, changeFrequency: 'monthly' as const },
    { path: '/vi/contact', priority: 0.7, changeFrequency: 'monthly' as const },
    { path: '/en/contact', priority: 0.6, changeFrequency: 'monthly' as const },
    { path: '/vi/policies', priority: 0.6, changeFrequency: 'monthly' as const },
    { path: '/vi/privacy-policy', priority: 0.5, changeFrequency: 'monthly' as const },
    { path: '/en/privacy-policy', priority: 0.5, changeFrequency: 'monthly' as const },
    { path: '/vi/terms-of-service', priority: 0.5, changeFrequency: 'monthly' as const },
    { path: '/en/terms-of-service', priority: 0.5, changeFrequency: 'monthly' as const },
    { path: '/vi/data-deletion', priority: 0.4, changeFrequency: 'monthly' as const },
  ];

  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: `${baseUrl}${route.path}`,
    lastModified: new Date(),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  // Lấy danh sách xe nâng từ Database để Google index từng chiếc xe
  try {
    const forklifts = await prisma.forklift.findMany({
      select: { id: true },
      take: 2000,
    });

    const forkliftEntries: MetadataRoute.Sitemap = forklifts.flatMap((f) => [
      {
        url: `${baseUrl}/vi/machine/${f.id}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.85,
      },
      {
        url: `${baseUrl}/en/machine/${f.id}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.75,
      },
    ]);

    return [...staticEntries, ...forkliftEntries];
  } catch (error) {
    console.error('[Sitemap] Failed to fetch forklifts:', error);
    return staticEntries;
  }
}
