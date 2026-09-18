import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '@/lib/prisma';
import { logBotActivity } from '@/lib/bot-logger';
import { getBaseUrl } from '@/lib/url';

// Khởi tạo client Gemini động theo biến môi trường
function getGenAIClient() {
  const apiKey = process.env.GEMINI_API_KEY || '';
  return apiKey ? new GoogleGenerativeAI(apiKey) : null;
}

export interface ForkliftSearchResult {
  id: string;
  maker: string;
  model: string;
  year?: number | null;
  loadCapacity?: string | null;
  powerType?: string | null;
  liftHeight?: string | null;
  mast?: string | null;
  hour?: number | null;
  condition?: string | null;
  price?: number | null;
  imageUrl?: string | null;
  detailUrl: string;
}

/**
 * Chuẩn hóa loại nhiên liệu từ tiếng Việt hoặc tiếng Anh sang các giá trị lưu trong DB (BATTERY, DIESEL, GASOLINE)
 */
function normalizePowerType(input?: string): string[] {
  if (!input) return [];
  const clean = input.toLowerCase().trim();
  if (clean.includes('điện') || clean.includes('dien') || clean.includes('battery') || clean.includes('pin') || clean.includes('acquy') || clean.includes('ắc quy')) {
    return ['BATTERY', 'điện', 'dien'];
  }
  if (clean.includes('dầu') || clean.includes('dau') || clean.includes('diesel')) {
    return ['DIESEL', 'dầu', 'dau'];
  }
  if (clean.includes('xăng') || clean.includes('xang') || clean.includes('gas') || clean.includes('gasoline')) {
    return ['GASOLINE', 'xăng', 'xang', 'gas'];
  }
  return [input.trim().toUpperCase(), input.trim()];
}

/**
 * Chuẩn hóa kiểu dáng vận hành (ngồi lái / đứng lái) sang các giá trị lưu trong DB (COUNTER, REACH)
 */
function normalizeCategory(input?: string): string[] {
  if (!input) return [];
  const clean = input.toLowerCase().trim();
  if (clean.includes('ngồi') || clean.includes('ngoi') || clean.includes('counter')) {
    return ['COUNTER', 'ngồi lái', 'ngoi lai'];
  }
  if (clean.includes('đứng') || clean.includes('dung') || clean.includes('reach')) {
    return ['REACH', 'đứng lái', 'dung lai'];
  }
  return [input.trim().toUpperCase(), input.trim()];
}

/**
 * Trích xuất số kg từ tải trọng (ví dụ: "2.5 tấn" -> 2500, "1500kg" -> 1500, "3 tấn" -> 3000)
 */
function parseCapacityKg(input?: string | number | null): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === 'number') return input;
  const clean = input.toString().toLowerCase().trim();
  const tonMatch = clean.match(/(\d+(\.\d+)?)\s*(tấn|t|tan)/);
  if (tonMatch) return Math.round(parseFloat(tonMatch[1]) * 1000);
  const numMatch = clean.match(/\d+(\.\d+)?/);
  if (numMatch) {
    const val = parseFloat(numMatch[0]);
    if (val < 20) return Math.round(val * 1000); // Nhập số tấn viết tắt như "2", "2.5", "3"
    return Math.round(val);
  }
  return null;
}

/**
 * Trích xuất milimet (mm) từ chiều cao nâng (ví dụ: "3m" -> 3000, "4.5 mét" -> 4500, "4000" -> 4000)
 */
function parseLiftHeightMm(input?: string | number | null): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === 'number') return input;
  const clean = input.toString().toLowerCase().trim();
  const mMatch = clean.match(/(\d+(\.\d+)?)\s*(m|mét|met)/);
  if (mMatch) return Math.round(parseFloat(mMatch[1]) * 1000);
  const numMatch = clean.match(/\d+(\.\d+)?/);
  if (numMatch) {
    const val = parseFloat(numMatch[0]);
    if (val < 20) return Math.round(val * 1000); // Ví dụ "3", "4.5"
    return Math.round(val);
  }
  return null;
}

export interface SearchForkliftsCriteria {
  maker?: string;
  powerType?: string;
  category?: string;
  loadCapacity?: string;
  minCapacityKg?: number;
  maxCapacityKg?: number;
  minLiftHeightMm?: number;
  maxLiftHeightMm?: number;
  keyword?: string;
  minYear?: number;
  maxYear?: number;
  minPrice?: number;
  maxPrice?: number;
  maxResults?: number;
}

/**
 * Tra cứu kho xe nâng thực tế từ Database theo tiêu chí khách hàng với bộ chuẩn hóa thông minh
 */
export async function searchForkliftsInDb(criteria: SearchForkliftsCriteria): Promise<ForkliftSearchResult[]> {
  try {
    const andConditions: any[] = [];

    // Lọc theo hãng sản xuất
    if (criteria.maker && criteria.maker.trim()) {
      andConditions.push({
        maker: { contains: criteria.maker.trim(), mode: 'insensitive' }
      });
    }

    // Lọc theo loại nhiên liệu (Điện, Dầu, Xăng/Gas) - Tự động map BATTERY / DIESEL / GASOLINE
    if (criteria.powerType && criteria.powerType.trim()) {
      const powerTypes = normalizePowerType(criteria.powerType);
      if (powerTypes.length > 0) {
        andConditions.push({
          OR: powerTypes.map(pt => ({ powerType: { contains: pt, mode: 'insensitive' } }))
        });
      }
    }

    // Lọc theo kiểu dáng xe (ngồi lái, đứng lái, reach truck, counter...)
    if (criteria.category && criteria.category.trim()) {
      const categories = normalizeCategory(criteria.category);
      if (categories.length > 0) {
        andConditions.push({
          OR: [
            ...categories.map(c => ({ category: { contains: c, mode: 'insensitive' } })),
            ...categories.map(c => ({ type: { contains: c, mode: 'insensitive' } }))
          ]
        });
      }
    }

    // Lọc theo khoảng năm sản xuất
    if (criteria.minYear || criteria.maxYear) {
      const yearCond: any = {};
      if (criteria.minYear) yearCond.gte = Number(criteria.minYear);
      if (criteria.maxYear) yearCond.lte = Number(criteria.maxYear);
      andConditions.push({ year: yearCond });
    }

    // Lọc theo khoảng giá
    if (criteria.minPrice || criteria.maxPrice) {
      const priceCond: any = {};
      if (criteria.minPrice) priceCond.gte = Number(criteria.minPrice);
      if (criteria.maxPrice) priceCond.lte = Number(criteria.maxPrice);
      andConditions.push({ price: priceCond });
    }

    // Lọc theo từ khóa tìm kiếm tổng hợp (Model, Mã nội bộ, Mã kho, Serial...)
    if (criteria.keyword && criteria.keyword.trim()) {
      const kw = criteria.keyword.trim();
      andConditions.push({
        OR: [
          { model: { contains: kw, mode: 'insensitive' } },
          { serialNo: { contains: kw, mode: 'insensitive' } },
          { maker: { contains: kw, mode: 'insensitive' } },
          { attachment: { contains: kw, mode: 'insensitive' } },
          { otherSpecs: { contains: kw, mode: 'insensitive' } }
        ]
      });
    }

    const where: any = { status: 'Available' };
    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    // Lấy ứng viên xe phù hợp từ database
    const candidates = await prisma.forklift.findMany({
      where,
      orderBy: [
        { year: 'desc' },
        { createdAt: 'desc' }
      ],
      include: {
        media: {
          where: { fileType: 'IMAGE' },
          take: 1
        }
      }
    });

    // Lọc số học tải trọng (kg) và chiều cao nâng (mm)
    const targetCapKg = criteria.loadCapacity ? parseCapacityKg(criteria.loadCapacity) : null;
    let minCap = criteria.minCapacityKg ? Number(criteria.minCapacityKg) : null;
    let maxCap = criteria.maxCapacityKg ? Number(criteria.maxCapacityKg) : null;

    // Nếu khách đưa tải trọng cụ thể mà không truyền min/max: áp dụng khoảng phù hợp (dung sai ~ 20%)
    if (targetCapKg && !minCap && !maxCap) {
      minCap = Math.round(targetCapKg * 0.85);
      maxCap = Math.round(targetCapKg * 1.2);
    }

    const minHeight = criteria.minLiftHeightMm ? Number(criteria.minLiftHeightMm) : null;
    const maxHeight = criteria.maxLiftHeightMm ? Number(criteria.maxLiftHeightMm) : null;

    let filtered = candidates.filter(f => {
      // Kiểm tra tải trọng
      if (minCap !== null || maxCap !== null) {
        const itemCap = parseCapacityKg(f.loadCapacity);
        if (itemCap !== null) {
          if (minCap !== null && itemCap < minCap) return false;
          if (maxCap !== null && itemCap > maxCap) return false;
        }
      }

      // Kiểm tra chiều cao nâng
      if (minHeight !== null || maxHeight !== null) {
        const itemHeight = parseLiftHeightMm(f.liftHeight);
        if (itemHeight !== null) {
          if (minHeight !== null && itemHeight < minHeight) return false;
          if (maxHeight !== null && itemHeight > maxHeight) return false;
        }
      }

      return true;
    });

    // Fallback: nếu lọc tải trọng/chiều cao quá hẹp ra 0 xe, nhưng có xe cùng hãng/nhiên liệu -> trả về candidates để gợi ý
    if (filtered.length === 0 && (minCap !== null || maxCap !== null) && candidates.length > 0) {
      filtered = candidates;
    }

    // Sắp xếp ưu tiên: nếu có tải trọng mục tiêu, ưu tiên xe có tải trọng gần nhất
    if (targetCapKg) {
      filtered.sort((a, b) => {
        const capA = parseCapacityKg(a.loadCapacity) || 0;
        const capB = parseCapacityKg(b.loadCapacity) || 0;
        return Math.abs(capA - targetCapKg) - Math.abs(capB - targetCapKg);
      });
    }

    const takeCount = criteria.maxResults && criteria.maxResults > 0 ? criteria.maxResults : 5;
    const finalForklifts = filtered.slice(0, takeCount);

    const baseUrl = getBaseUrl();

    return finalForklifts.map(f => ({
      id: f.id,
      maker: f.maker,
      model: f.model,
      year: f.year,
      loadCapacity: f.loadCapacity,
      powerType: f.powerType,
      liftHeight: f.liftHeight,
      mast: f.mast,
      hour: f.hour,
      condition: f.condition,
      price: f.price,
      imageUrl: f.media[0]?.url || null,
      detailUrl: `${baseUrl}/vi/machine/${f.id}`
    }));
  } catch (error) {
    console.error('[Search Forklifts Error]:', error);
    return [];
  }
}

/**
 * Lấy toàn bộ thông số kỹ thuật chi tiết của MỘT chiếc xe cụ thể
 */
export async function getForkliftDetailInDb(identifier: string) {
  try {
    if (!identifier) return null;
    const cleanId = identifier.trim();

    const forklift = await prisma.forklift.findFirst({
      where: {
        OR: [
          { id: cleanId },
          { model: { equals: cleanId, mode: 'insensitive' } },
          { model: { contains: cleanId, mode: 'insensitive' } }
        ]
      },
      include: {
        media: {
          where: { fileType: 'IMAGE' },
          take: 3
        }
      }
    });

    if (!forklift) return null;

    const baseUrl = getBaseUrl();

    return {
      id: forklift.id,
      serialNo: forklift.serialNo || 'Đang cập nhật',
      maker: forklift.maker,
      model: forklift.model,
      year: forklift.year ? `${forklift.year}` : 'Chưa rõ',
      hour: forklift.hour ? `${forklift.hour} giờ` : 'Chưa rõ',
      category: forklift.category || 'Xe nâng hạ',
      type: forklift.type || 'Tiêu chuẩn',
      powerType: forklift.powerType || 'Chưa rõ',
      loadCapacity: forklift.loadCapacity || 'Chưa rõ tải trọng',
      liftHeight: forklift.liftHeight || 'Chưa rõ chiều cao nâng',
      mast: forklift.mast || 'Cột nâng tiêu chuẩn',
      forkLength: forklift.forkLength || 'Càng nâng tiêu chuẩn',
      attachment: forklift.attachment || 'Không có phụ kiện kèm theo',
      dimensions: forklift.dimensions || 'Kích thước tiêu chuẩn',
      weight: forklift.weight || 'Trọng lượng theo catalogue',
      otherSpecs: forklift.otherSpecs || 'Không có ghi chú thêm',
      condition: forklift.condition || 'Hoạt động tốt',
      engineCondition: forklift.engineCondition || 'Bảo dưỡng định kỳ',
      location: forklift.location || 'Tại kho Việt Nhật',
      status: forklift.status === 'Available' ? 'Sẵn sàng giao dịch tại kho' : forklift.status,
      price: forklift.price ? `${forklift.price.toLocaleString('vi-VN')} VNĐ` : 'Giá thỏa thuận / Ưu đãi trực tiếp khi liên hệ',
      images: forklift.media.map(m => m.url),
      detailUrl: `${baseUrl}/vi/machine/${forklift.id}`
    };
  } catch (error) {
    console.error('[Get Forklift Detail Error]:', error);
    return null;
  }
}

/**
 * Lưu thông tin khách hàng muốn được tư vấn trực tiếp vào bảng Inquiry
 */
export async function createInquiryFromChat(data: {
  customerName: string;
  phone: string;
  note?: string;
  forkliftId?: string;
  facebookPageId?: string;
  chatSessionId?: string;
}) {
  try {
    const inquiry = await prisma.inquiry.create({
      data: {
        customerName: data.customerName,
        phone: data.phone,
        message: data.note || 'Khách hàng để lại thông tin từ Facebook Messenger Bot',
        status: 'New',
        forkliftId: data.forkliftId || null,
        facebookPageId: data.facebookPageId || null,
        chatSession: data.chatSessionId ? {
          connect: { id: data.chatSessionId }
        } : undefined
      }
    });
    return inquiry;
  } catch (error) {
    console.error('[Create Inquiry From Chat Error]:', error);
    return null;
  }
}

/**
 * Định nghĩa Tools chuyên sâu cho Gemini Function Calling
 */
const tools: any = [
  {
    functionDeclarations: [
      {
        name: 'searchForklifts',
        description: 'Tìm kiếm danh sách xe nâng trong kho theo nhiều tiêu chí kỹ thuật: hãng, năm sản xuất, tải trọng (kg hoặc tấn), nhiên liệu (điện/dầu), kiểu dáng (ngồi lái/đứng lái), chiều cao nâng (mét hoặc mm), khoảng giá hoặc từ khóa.',
        parameters: {
          type: 'OBJECT',
          properties: {
            maker: {
              type: 'STRING',
              description: 'Hãng sản xuất xe nâng viết hoa (TOYOTA, KOMATSU, TCM, MITSUBISHI, NICHIYU, SUMITOMO...)'
            },
            powerType: {
              type: 'STRING',
              description: 'Loại nhiên liệu chuẩn hóa: BATTERY (xe nâng điện, bình ắc quy, pin), DIESEL (xe nâng dầu), GASOLINE (xe nâng xăng/gas).'
            },
            category: {
              type: 'STRING',
              description: 'Kiểu dáng điều khiển chuẩn hóa: COUNTER (xe ngồi lái, counter balance), REACH (xe đứng lái, reach truck).'
            },
            minCapacityKg: {
              type: 'INTEGER',
              description: 'Tải trọng nâng tối thiểu tính bằng KG (Ví dụ: "trên 2 tấn" -> 2000; "từ 2.5 tấn trở lên" -> 2500; "tầm 1.5 đến 2.5 tấn" -> 1500).'
            },
            maxCapacityKg: {
              type: 'INTEGER',
              description: 'Tải trọng nâng tối đa tính bằng KG (Ví dụ: "dưới 3 tấn" -> 3000; "tầm 1.5 đến 2.5 tấn" -> 2500).'
            },
            loadCapacity: {
              type: 'STRING',
              description: 'Tải trọng nâng cụ thể dạng chuỗi (Ví dụ: "1500", "2000", "2500", "3000", "1.5 tấn", "2 tấn", "2.5 tấn", "3 tấn").'
            },
            minLiftHeightMm: {
              type: 'INTEGER',
              description: 'Chiều cao nâng tối thiểu tính bằng milimet (Ví dụ: "cao 3m" -> 3000; "cao trên 4m" -> 4000; "cao 4.5 mét" -> 4500).'
            },
            maxLiftHeightMm: {
              type: 'INTEGER',
              description: 'Chiều cao nâng tối đa tính bằng milimet (mm).'
            },
            minYear: {
              type: 'INTEGER',
              description: 'Năm sản xuất tối thiểu (Ví dụ: "đời từ 2018 trở lên" -> 2018; "sau năm 2020" -> 2020)'
            },
            maxYear: {
              type: 'INTEGER',
              description: 'Năm sản xuất tối đa'
            },
            minPrice: {
              type: 'NUMBER',
              description: 'Mức giá tối thiểu bằng VNĐ'
            },
            maxPrice: {
              type: 'NUMBER',
              description: 'Mức giá tối đa bằng VNĐ (Ví dụ: "dưới 300 triệu" -> 300000000)'
            },
            keyword: {
              type: 'STRING',
              description: 'Từ khóa tìm kiếm model hoặc mã xe hoặc bộ công tác (Ví dụ: 7FD25, 8FB25, VN-01, gật gù, side shift, dịch giá...)'
            }
          }
        }
      },
      {
        name: 'getForkliftDetail',
        description: 'Lấy TOÀN BỘ thông số kỹ thuật chi tiết của MỘT chiếc xe cụ thể (tải trọng nâng tối đa kg, chiều cao nâng mast, chiều dài càng, bộ công tác, số giờ hoạt động, tình trạng máy, giá bán) theo mã xe, mã kho hoặc model.',
        parameters: {
          type: 'OBJECT',
          properties: {
            identifier: {
              type: 'STRING',
              description: 'Model hoặc ID của xe cần xem chi tiết'
            }
          },
          required: ['identifier']
        }
      },
      {
        name: 'saveCustomerContact',
        description: 'Lưu lại họ tên và số điện thoại của khách hàng khi khách muốn nhận báo giá, tư vấn chi tiết hoặc hỗ trợ xem xe trực tiếp tại kho.',
        parameters: {
          type: 'OBJECT',
          properties: {
            customerName: {
              type: 'STRING',
              description: 'Họ tên hoặc cách xưng hô của khách hàng'
            },
            phone: {
              type: 'STRING',
              description: 'Số điện thoại của khách hàng (bắt buộc)'
            },
            note: {
              type: 'STRING',
              description: 'Tóm tắt nhu cầu cụ thể của khách hoặc mã xe khách đang quan tâm'
            },
            forkliftId: {
              type: 'STRING',
              description: 'ID của xe khách đang quan tâm (nếu có)'
            }
          },
          required: ['customerName', 'phone']
        }
      }
    ]
  }
];

/**
 * Chuẩn hóa lịch sử chat đảm bảo đúng chuẩn của Gemini:
 * - Bắt đầu bằng 'user'
 * - Xen kẽ 'user' và 'model'
 * - Kết thúc bằng 'model' trước khi gọi sendMessage('user')
 */
function sanitizeGeminiHistory(history: Array<{ role: 'user' | 'assistant'; content: string }>) {
  const contents: any[] = [];
  let lastRole: string | null = null;

  for (const msg of history) {
    const role = msg.role === 'assistant' ? 'model' : 'user';
    // Bỏ qua nếu tin đầu tiên không phải là user
    if (contents.length === 0 && role !== 'user') {
      continue;
    }
    // Gộp nếu hai lượt cùng role liên tiếp
    if (role === lastRole) {
      contents[contents.length - 1].parts[0].text += `\n${msg.content}`;
    } else {
      contents.push({
        role,
        parts: [{ text: msg.content }]
      });
      lastRole = role;
    }
  }

  // Kết thúc history bằng 'model' trước khi userMessage mới được gửi qua sendMessage
  if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
    contents.pop();
  }

  return contents;
}

/**
 * Xử lý cuộc trò chuyện với Gemini AI
 */
export async function processAiChat(params: {
  userMessage: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  pageName?: string;
  customGreeting?: string | null;
  facebookPageId?: string;
  chatSessionId?: string;
}): Promise<{
  replyText: string;
  foundForklifts?: ForkliftSearchResult[];
  inquiryCreated?: boolean;
}> {
  const genAI = getGenAIClient();
  if (!genAI) {
    return {
      replyText: 'Xin chào quý khách! Hệ thống đang kết nối đến chuyên viên tư vấn. Quý khách vui lòng để lại số điện thoại hoặc liên hệ hotline để được phục vụ nhanh nhất.'
    };
  }

  const systemInstruction = `
Bạn là Chuyên viên Tư vấn Kỹ thuật & Bán hàng AI của "${params.pageName || 'Công ty Xe Nâng Việt Nhật'}".
Bạn am hiểu sâu sắc về các dòng xe nâng (Toyota, Komatsu, TCM, Mitsubishi, Nichiyu...) và có quyền truy cập trực tiếp vào hệ thống cơ sở dữ liệu kho xe của công ty.

QUY TẮC TƯ VẤN & SỬ DỤNG TOOLS:
1. Khi khách hỏi tìm xe (hãng, đời xe, năm sản xuất, tải trọng, chạy điện hay dầu, ngồi lái hay đứng lái, chiều cao nâng, khoảng giá):
   - BẮT BUỘC phân tích sâu yêu cầu của khách và quy đổi chính xác sang các tham số chuẩn khi gọi 'searchForklifts':
     + Nhiên liệu/Động cơ: "điện" / "ắc quy" / "pin" -> powerType: "BATTERY"; "dầu" / "diesel" -> powerType: "DIESEL"; "xăng" / "gas" -> powerType: "GASOLINE".
     + Kiểu dáng vận hành: "ngồi lái" -> category: "COUNTER"; "đứng lái" / "reach truck" -> category: "REACH".
     + Tải trọng (Quy đổi TẤN sang KG: 1 tấn = 1000kg):
       * Khách hỏi tải trọng cụ thể: "xe 1.5 tấn" -> loadCapacity: "1500"; "xe 2 tấn" -> loadCapacity: "2000"; "xe 2.5 tấn" -> loadCapacity: "2500"; "xe 3 tấn" -> loadCapacity: "3000".
       * Khách hỏi khoảng hoặc điều kiện: "trên 2 tấn" -> minCapacityKg: 2000; "dưới 3 tấn" -> maxCapacityKg: 3000; "tầm 1.5 đến 2.5 tấn" -> minCapacityKg: 1500, maxCapacityKg: 2500.
     + Chiều cao nâng (Quy đổi MÉT sang MILIMET: 1m = 1000mm):
       * "cao 3m" -> minLiftHeightMm: 3000; "trên 4m" -> minLiftHeightMm: 4000; "cao 4.5 mét" -> minLiftHeightMm: 4500.
     + Hãng sản xuất (maker): Giữ tên hãng chuẩn: TOYOTA, KOMATSU, TCM, MITSUBISHI, NICHIYU, SUMITOMO.
     + Năm sản xuất & Giá: "đời từ 2018" -> minYear: 2018; "dưới 200 triệu" -> maxPrice: 200000000.
   - Tuyệt đối không bịa đặt thông tin xe nếu trong kho không có.
   - Khi có kết quả tìm kiếm, tóm tắt thông số chính (Hãng, Model, Tải trọng, Chiều cao nâng, Năm sản xuất) và gửi kèm đường link xe để khách bấm vào xem chi tiết hình ảnh thực tế.
   - BẮT BUỘC: Sau khi nhận kết quả từ tool, bạn PHẢI tạo câu trả lời bằng văn bản tiếng Việt hoàn chỉnh gửi cho khách hàng. Nếu kho không có xe thỏa mãn tiêu chí (danh sách rỗng), hãy lịch sự thông báo mẫu xe này hiện đang tạm hết và khéo léo xin Tên/Số điện thoại để khi có xe về bên em báo ngay.

2. Khi khách hỏi về MỘT chiếc xe cụ thể (ví dụ: "cho tôi báo giá mã xe A", "xe này nâng tối đa bao nhiêu kg?", "xe cao mấy mét?", "bình điện thế nào?"):
   - LUÔN gọi tool 'getForkliftDetail' với mã xe hoặc model của xe đó để đọc toàn bộ 100% thông số kỹ thuật thực tế từ database.
   - Trả lời rõ ràng, chính xác về tải trọng nâng, chiều cao nâng, loại cột nâng (mast), phụ kiện (attachment), tình trạng xe.

3. XỬ LÝ VỀ GIÁ BÁN:
   - Nếu xe có giá cụ thể: Báo giá rõ ràng bằng VNĐ.
   - Nếu xe chưa công khai giá hoặc để "Giá thỏa thuận": Giải thích rằng giá xe phụ thuộc vào cấu hình phụ kiện, gói bảo hành và chi phí giao xe tận nơi; sau đó khéo léo xin Tên và Số điện thoại để chuyên viên gửi báo giá tại kho kèm ưu đãi tốt nhất qua Zalo.

4. XỬ LÝ KHI KHÁCH CUNG CẤP THÔNG TIN LIÊN HỆ:
   - Khi khách để lại Tên và Số điện thoại: NGAY LẬP TỨC gọi tool 'saveCustomerContact' để lưu vào hệ thống.
   - Xác nhận với khách rằng thông tin đã được ghi nhận và chuyên viên kinh doanh sẽ liên hệ lại trong ít phút.

5. KIẾN THỨC DOANH NGHIỆP:
   - Nguồn gốc: 100% xe nâng bãi nhập khẩu trực tiếp từ Nhật Bản, có giấy tờ hải quan và đăng kiểm đầy đủ.
   - Kho bãi: Sẵn sàng tại kho Hà Nội và TP.HCM / Bình Dương, hỗ trợ khách đến xem và chạy thử xe trực tiếp.
   - Giao hàng & Bảo hành: Giao xe toàn quốc, bảo hành từ 6 đến 12 tháng tùy dòng xe, hỗ trợ bảo dưỡng định kỳ.
   - Giọng điệu: Thân thiện, lịch thiệp, tư vấn kỹ thuật dễ hiểu, câu trả lời gọn gàng phù hợp cho tin nhắn di động.

${params.customGreeting ? `Lưu ý riêng của Fanpage này: ${params.customGreeting}` : ''}
`.trim();

  // Thử lần lượt các model được hỗ trợ: gemini-3-flash-preview, gemini-3.1-flash-lite
  const supportedModels = ['gemini-3-flash-preview', 'gemini-3.1-flash-lite'];

  for (const modelName of supportedModels) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction,
        tools
      });

      const cleanHistory = sanitizeGeminiHistory(params.history.slice(-8));

      const chat = model.startChat({
        history: cleanHistory
      });

      const result = await chat.sendMessage(params.userMessage);
      const response = await result.response;
      const functionCalls = response.functionCalls();

      let foundForklifts: ForkliftSearchResult[] = [];
      let inquiryCreated = false;

      // Vòng lặp xử lý Function Calling nếu Gemini gọi tool
      if (functionCalls && functionCalls.length > 0) {
        const toolResponses: any[] = [];

        for (const call of functionCalls) {
          if (call.name === 'searchForklifts') {
            const args = call.args as any;
            const searchResults = await searchForkliftsInDb(args);
            foundForklifts = searchResults;
            toolResponses.push({
              functionResponse: {
                name: 'searchForklifts',
                response: {
                  totalFound: searchResults.length,
                  forklifts: searchResults,
                  note: searchResults.length === 0 ? 'Hiện không có xe nào trong kho thỏa mãn tiêu chí này. Hãy thông báo lịch sự cho khách và xin SĐT để báo khi có hàng.' : 'Đã tìm thấy xe phù hợp trong kho.'
                }
              }
            });
          } else if (call.name === 'getForkliftDetail') {
            const args = call.args as any;
            const detail = await getForkliftDetailInDb(args.identifier);
            if (detail) {
              foundForklifts = [{
                id: detail.id,
                maker: detail.maker,
                model: detail.model,
                loadCapacity: detail.loadCapacity,
                liftHeight: detail.liftHeight,
                imageUrl: detail.images[0] || null,
                detailUrl: detail.detailUrl
              }];
            }
            toolResponses.push({
              functionResponse: {
                name: 'getForkliftDetail',
                response: {
                  found: !!detail,
                  forklift: detail || 'Không tìm thấy xe nâng với mã hoặc model này trong kho.'
                }
              }
            });
          } else if (call.name === 'saveCustomerContact') {
            const args = call.args as any;
            await createInquiryFromChat({
              customerName: args.customerName,
              phone: args.phone,
              note: args.note,
              forkliftId: args.forkliftId,
              facebookPageId: params.facebookPageId,
              chatSessionId: params.chatSessionId
            });
            inquiryCreated = true;
            toolResponses.push({
              functionResponse: {
                name: 'saveCustomerContact',
                response: { success: true, message: 'Đã lưu thông tin liên hệ của khách hàng vào hệ thống thành công.' }
              }
            });
          }
        }

        // Gửi kết quả tool về cho Gemini để tổng hợp câu trả lời tự nhiên
        const followUp = await chat.sendMessage(toolResponses);
        const followUpResponse = await followUp.response;
        let reply = '';
        try {
          reply = followUpResponse.text() || '';
        } catch {
          reply = '';
        }

        // Định dạng danh sách xe thành văn bản rõ ràng, dễ đọc trên di động
        const formatForkliftsText = (list: ForkliftSearchResult[]) => {
          return list.slice(0, 4).map((f, i) => {
            const cap = f.loadCapacity ? `Tải: ${f.loadCapacity}kg` : '';
            const height = f.liftHeight ? `Nâng: ${f.liftHeight}mm` : '';
            const fuel = f.powerType ? `Máy: ${f.powerType}` : '';
            const yr = f.year ? `Đời: ${f.year}` : '';
            const specs = [cap, height, yr, fuel].filter(Boolean).join(' | ');
            return `🚜 [${i + 1}] ${f.maker} ${f.model} (${specs})\n👉 Xem chi tiết xe: ${f.detailUrl}`;
          }).join('\n\n');
        };

        // Đảm bảo tin nhắn phản hồi luôn có danh sách xe đầy đủ
        if (foundForklifts.length > 0) {
          const listText = formatForkliftsText(foundForklifts);
          if (!reply || !reply.trim()) {
            reply = `Dạ chào quý khách! Em gửi quý khách thông tin các mẫu xe nâng đang có sẵn tại kho phù hợp với nhu cầu:\n\n${listText}\n\nQuý khách ưng ý mẫu nào hoặc muốn xem thêm ảnh/video, cứ nhắn em hoặc để lại số điện thoại để bên em gửi báo giá tốt nhất qua Zalo nhé!`;
          } else {
            // Nếu AI sinh text nhưng chưa liệt kê link chi tiết của xe, nối danh sách vào cuối
            if (!reply.includes('/machine/')) {
              reply = `${reply.trim()}\n\nDanh sách xe gợi ý phù hợp:\n${listText}`;
            }
          }
        } else {
          if (!reply || !reply.trim()) {
            reply = 'Dạ chào quý khách! Hiện tại trong kho của Việt Nhật đang tạm hết dòng xe đúng như tiêu chí này. Quý khách vui lòng để lại số điện thoại hoặc kết nối Zalo để khi có đợt xe mới về bên em báo ngay nhé!';
          }
        }

        return {
          replyText: reply,
          foundForklifts,
          inquiryCreated
        };
      }

      let reply = response.text() || '';
      if (!reply || !reply.trim()) {
        reply = 'Dạ chào quý khách! Em là chuyên viên tư vấn xe nâng Việt Nhật. Quý khách đang quan tâm dòng xe nâng tải trọng bao nhiêu tấn hoặc mã xe cụ thể nào ạ?';
      }

      return {
        replyText: reply,
        foundForklifts,
        inquiryCreated
      };
    } catch (modelError: any) {
      console.warn(`[Gemini Model ${modelName} Error]:`, modelError.message);
      // Nếu là lỗi model cuối cùng thì mới log và trả về fallback
      if (modelName === supportedModels[supportedModels.length - 1]) {
        await logBotActivity({
          eventType: 'ERROR',
          pageId: params.facebookPageId,
          pageName: params.pageName,
          message: `Lỗi xử lý Gemini AI (${modelName}): ${modelError.message}`,
          details: modelError.stack || modelError,
          status: 'ERROR'
        });
      }
    }
  }

  // Fallback an toàn nếu tất cả model đều bị lỗi
  return {
    replyText: 'Dạ chào quý khách! Em là chuyên viên tư vấn xe nâng Việt Nhật. Quý khách đang quan tâm dòng xe nâng tải trọng bao nhiêu tấn hoặc mã xe cụ thể nào ạ? Quý khách cũng có thể để lại số điện thoại để bên em gửi báo giá và hình ảnh chi tiết qua Zalo nhé!'
  };
}

