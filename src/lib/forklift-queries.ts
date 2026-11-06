import { prisma } from '@/lib/prisma';
import { PUBLIC_FORKLIFT_STATUSES } from '@/lib/seo';
import { powerKind } from '@/lib/utils';
import type { LandingFilter } from '@/lib/landing-pages';
import type { ForkliftCardData } from '@/components/ForkliftCard';

const firstPublicImage = {
  media: {
    where: { isPublic: true, fileType: 'IMAGE' },
    orderBy: [{ isThumbnail: 'desc' as const }, { order: 'asc' as const }, { createdAt: 'asc' as const }],
    take: 1,
    select: { url: true },
  },
};

/**
 * Xe đang hiển thị công khai khớp bộ lọc của trang đích.
 * Lọc nhiên liệu bằng powerKind() trong JS vì cột powerType là chữ tự do
 * ("XE NÂNG ĐIỆN ", "Battery", ...), giống cách catalog xử lý tải trọng.
 */
export async function findLandingForklifts(filter: LandingFilter): Promise<ForkliftCardData[]> {
  const forklifts = await prisma.forklift.findMany({
    where: {
      status: { in: PUBLIC_FORKLIFT_STATUSES },
      ...(filter.kind === 'maker' ? { maker: { equals: filter.maker, mode: 'insensitive' as const } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    include: firstPublicImage,
  });
  if (filter.kind === 'power') return forklifts.filter((f) => powerKind(f.powerType) === filter.power);
  return forklifts;
}

/** Xe tương tự: ưu tiên cùng hãng + cùng nhiên liệu, sau đó cùng nhiên liệu. */
export async function findSimilarForklifts(
  current: { id: string; maker: string; powerType: string | null },
  limit = 4,
): Promise<ForkliftCardData[]> {
  const candidates = await prisma.forklift.findMany({
    where: { status: { in: PUBLIC_FORKLIFT_STATUSES }, id: { not: current.id } },
    orderBy: { createdAt: 'desc' },
    include: firstPublicImage,
    take: 200,
  });
  const kind = powerKind(current.powerType);
  const score = (f: ForkliftCardData) =>
    (f.maker.toUpperCase() === current.maker.toUpperCase() ? 2 : 0) + (powerKind(f.powerType) === kind ? 1 : 0);
  return candidates
    .map((f, i) => ({ f, s: score(f), i }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .slice(0, limit)
    .map((x) => x.f);
}
