import { prisma } from '@/lib/prisma';
import { getBaseUrl } from '@/lib/url';
import PrintQrClient, { ForkliftPrintData } from './PrintQrClient';
import { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
  searchParams
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ ids?: string; id?: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const resolvedQuery = await searchParams;
  const idList = (resolvedQuery.ids || resolvedQuery.id || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  let title = 'In Mã QR Xe Nâng | Xe Nâng Việt Nhật';
  if (idList.length === 1) {
    const fl = await prisma.forklift.findUnique({
      where: { id: idList[0] },
      select: { maker: true, model: true, internalCode: true }
    });
    if (fl) {
      title = `In Tem QR: ${fl.internalCode ? `[${fl.internalCode}] ` : ''}${fl.maker} ${fl.model}`;
    }
  } else if (idList.length > 1) {
    title = `In Tem QR (${idList.length} xe) | Xe Nâng Việt Nhật`;
  }

  return {
    title,
    robots: { index: false, follow: false }
  };
}

export default async function PrintQrPage({
  params,
  searchParams
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ ids?: string; id?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedQuery = await searchParams;
  const lang = resolvedParams.lang || 'vi';

  const rawIds = (resolvedQuery.ids || resolvedQuery.id || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  let forkliftsRaw: any[] = [];

  if (rawIds.length > 0) {
    forkliftsRaw = await prisma.forklift.findMany({
      where: {
        id: { in: rawIds }
      },
      include: {
        media: {
          where: { isPublic: true, fileType: 'IMAGE' },
          orderBy: [
            { isThumbnail: 'desc' },
            { order: 'asc' },
            { createdAt: 'asc' }
          ],
          take: 1
        }
      }
    });

    // Preserve the original selection order if possible
    forkliftsRaw.sort((a, b) => {
      const idxA = rawIds.indexOf(a.id);
      const idxB = rawIds.indexOf(b.id);
      return idxA - idxB;
    });
  } else {
    // If no ID specified, fetch the first 30 available forklifts so the user has something to preview/select
    forkliftsRaw = await prisma.forklift.findMany({
      take: 30,
      orderBy: { createdAt: 'desc' },
      include: {
        media: {
          where: { isPublic: true, fileType: 'IMAGE' },
          orderBy: [
            { isThumbnail: 'desc' },
            { order: 'asc' },
            { createdAt: 'asc' }
          ],
          take: 1
        }
      }
    });
  }

  const baseUrl = getBaseUrl();

  const forklifts: ForkliftPrintData[] = forkliftsRaw.map(fl => ({
    id: fl.id,
    internalCode: fl.internalCode,
    maker: fl.maker,
    model: fl.model,
    serialNo: fl.serialNo,
    year: fl.year,
    hour: fl.hour,
    powerType: fl.powerType,
    loadCapacity: fl.loadCapacity,
    liftHeight: fl.liftHeight,
    forkLength: fl.forkLength,
    attachment: fl.attachment,
    condition: fl.condition,
    price: fl.price,
    status: fl.status,
    imageUrl: fl.media?.[0]?.url || null
  }));

  return (
    <PrintQrClient 
      initialForklifts={forklifts} 
      baseUrl={baseUrl} 
      lang={lang} 
      isAllSample={rawIds.length === 0}
    />
  );
}
