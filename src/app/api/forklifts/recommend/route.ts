import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseCapacityKg, parseLiftHeightMm, isElectricPower } from '@/lib/utils';

const PUBLIC_STATUSES = ['Available', 'Incoming', 'Reserved', 'Unpacking', 'InJapan'];
// Điểm tối đa: tải 40 + chiều cao 25 + môi trường 20 + ngân sách 15 + điểm cộng 10
const MAX_SCORE = 110;

type Environment = 'indoor' | 'outdoor' | 'mixed';

interface RecommendRequest {
  loadKg?: number;        // Khối lượng hàng nặng nhất cần nâng
  liftMm?: number;        // Chiều cao nâng cần thiết
  environment?: Environment;
  budgetMax?: number;     // Ngân sách tối đa (VNĐ), 0 = không giới hạn
  lang?: string;
}

// Trợ lý chọn xe: chấm điểm toàn bộ xe đang bán theo 4 câu trả lời và trả về top 3 kèm lý do
export async function POST(request: Request) {
  try {
    const { loadKg = 0, liftMm = 0, environment = 'mixed', budgetMax = 0, lang = 'vi' }: RecommendRequest = await request.json();
    const t = (vi: string, en: string) => (lang === 'vi' ? vi : en);

    const forklifts = await prisma.forklift.findMany({
      where: { status: { in: PUBLIC_STATUSES } },
      include: {
        media: {
          where: { isPublic: true, fileType: 'IMAGE' },
          orderBy: [{ isThumbnail: 'desc' }, { order: 'asc' }, { createdAt: 'asc' }],
          take: 1
        }
      }
    });

    const scored = forklifts.map(f => {
      const capacity = parseCapacityKg(f.loadCapacity);
      const lift = parseLiftHeightMm(f.liftHeight);
      const electric = isElectricPower(f.powerType);
      const reasons: string[] = [];
      const cautions: string[] = [];
      let score = 0;

      // 1. Tải trọng (40 điểm): phải nâng được hàng, dư tải vừa phải là tốt nhất
      if (loadKg > 0) {
        if (capacity === null) {
          score += 10;
        } else if (capacity < loadKg) {
          return null; // Không đủ tải => loại
        } else {
          const ratio = capacity / loadKg;
          score += ratio <= 1.5 ? 40 : ratio <= 2 ? 30 : 15;
          reasons.push(t(`Tải trọng ${capacity.toLocaleString('vi-VN')} kg đáp ứng hàng ${loadKg.toLocaleString('vi-VN')} kg`,
            `${capacity.toLocaleString('en-US')} kg capacity handles your ${loadKg.toLocaleString('en-US')} kg loads`));
          if (ratio > 2) cautions.push(t('Xe dư tải khá nhiều so với nhu cầu', 'Capacity is well above your needs'));
        }
      } else {
        score += 20;
      }

      // 2. Chiều cao nâng (25 điểm)
      if (liftMm > 0) {
        if (lift === null) {
          score += 8;
        } else if (lift >= liftMm) {
          score += 25;
          reasons.push(t(`Nâng cao tới ${lift.toLocaleString('vi-VN')} mm`, `Lifts up to ${lift.toLocaleString('en-US')} mm`));
        } else {
          score -= 15;
          cautions.push(t(`Chiều cao nâng ${lift.toLocaleString('vi-VN')} mm thấp hơn yêu cầu`, `Lift height ${lift.toLocaleString('en-US')} mm is below your requirement`));
        }
      } else {
        score += 12;
      }

      // 3. Môi trường làm việc (20 điểm)
      if (environment === 'indoor') {
        if (electric) {
          score += 20;
          reasons.push(t('Xe điện: không khói, êm, phù hợp kho kín / kho thực phẩm', 'Electric: zero fumes and quiet, ideal indoors'));
        } else {
          score += 5;
          cautions.push(t('Xe động cơ đốt trong có khí thải khi chạy trong kho kín', 'Combustion engine produces fumes indoors'));
        }
      } else if (environment === 'outdoor') {
        if (!electric) {
          score += 20;
          reasons.push(t('Xe động cơ bền bỉ khi chạy ngoài trời, đường gồ ghề, trời mưa', 'Engine forklift is robust outdoors and on rough ground'));
        } else {
          score += 8;
          cautions.push(t('Xe điện cần hạn chế chạy dưới mưa và nền gồ ghề', 'Electric forklifts should avoid rain and rough ground'));
        }
      } else {
        score += 14;
      }

      // 4. Ngân sách (15 điểm)
      if (budgetMax > 0) {
        if (!f.price) {
          score += 6;
        } else if (f.price <= budgetMax) {
          score += 15;
          reasons.push(t('Nằm trong ngân sách của bạn', 'Within your budget'));
        } else {
          const over = (f.price - budgetMax) / budgetMax;
          if (over > 0.3) return null; // Vượt quá xa ngân sách => loại
          score += Math.round(5 - over * 20);
          cautions.push(t(`Vượt ngân sách khoảng ${Math.round(over * 100)}%`, `About ${Math.round(over * 100)}% over budget`));
        }
      } else {
        score += 10;
      }

      // Điểm cộng: sẵn hàng, giờ chạy thấp, đời mới
      if (f.status === 'Available') {
        score += 5;
        reasons.push(t('Có sẵn tại kho, giao ngay', 'In stock, ready to deliver'));
      }
      if (f.hour !== null && f.hour < 5000) score += 3;
      if (f.year !== null && f.year >= 2015) score += 2;

      return {
        id: f.id,
        maker: f.maker,
        model: f.model,
        year: f.year,
        hour: f.hour,
        powerType: f.powerType,
        loadCapacity: f.loadCapacity,
        liftHeight: f.liftHeight,
        price: f.price,
        status: f.status,
        thumbnail: f.media[0]?.url || null,
        score,
        matchPercent: Math.max(0, Math.min(100, Math.round((score / MAX_SCORE) * 100))),
        reasons,
        cautions
      };
    });

    const top = scored
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    return NextResponse.json({ success: true, results: top, totalMatched: scored.filter(Boolean).length });
  } catch (error) {
    console.error('Recommend forklift error:', error);
    return NextResponse.json({ success: false, error: 'Failed to recommend forklifts' }, { status: 500 });
  }
}
