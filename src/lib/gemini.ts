import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '@/lib/prisma';

// Khởi tạo client Gemini
const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export interface ForkliftSearchResult {
  id: string;
  internalCode?: string | null;
  stockNo?: string | null;
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
 * Chuẩn hóa chuỗi tìm kiếm tải trọng (hỗ trợ cả "2000kg" và "2 tấn")
 */
function normalizeCapacityTerms(input?: string): string[] {
  if (!input) return [];
  const clean = input.toLowerCase().trim();
  const terms: string[] = [clean];

  // Nếu nhập dạng kg (ví dụ: 2500kg, 2500 kg, 2000kg)
  const kgMatch = clean.match(/(\d+)\s*kg/);
  if (kgMatch) {
    const kg = parseInt(kgMatch[1], 10);
    const ton = kg / 1000;
    terms.push(`${ton} tấn`, `${ton}t`, `${ton}`, `${kg}`);
    if (ton % 1 === 0) terms.push(`${ton}.0 tấn`);
  }

  // Nếu nhập dạng tấn (ví dụ: 2.5 tấn, 2.5t, 3 tấn)
  const tonMatch = clean.match(/(\d+(\.\d+)?)\s*(tấn|t|tan)/);
  if (tonMatch) {
    const ton = parseFloat(tonMatch[1]);
    const kg = Math.round(ton * 1000);
    terms.push(`${ton}`, `${kg}`, `${ton} tấn`, `${ton}t`);
  }

  return Array.from(new Set(terms));
}

/**
 * Tra cứu kho xe nâng thực tế từ Database theo tiêu chí khách hàng
 */
export async function searchForkliftsInDb(criteria: {
  maker?: string;
  powerType?: string;
  category?: string;
  loadCapacity?: string;
  keyword?: string;
  minYear?: number;
  maxYear?: number;
  minPrice?: number;
  maxPrice?: number;
  maxResults?: number;
}): Promise<ForkliftSearchResult[]> {
  try {
    const where: any = {
      status: 'Published'
    };

    // Lọc theo hãng sản xuất
    if (criteria.maker) {
      where.maker = { contains: criteria.maker.trim(), mode: 'insensitive' };
    }

    // Lọc theo loại nhiên liệu (Điện, Dầu, Xăng/Gas)
    if (criteria.powerType) {
      where.powerType = { contains: criteria.powerType.trim(), mode: 'insensitive' };
    }

    // Lọc theo phân loại xe (ngồi lái, đứng lái, reach truck, counter...)
    if (criteria.category) {
      where.OR = where.OR || [];
      where.OR.push(
        { category: { contains: criteria.category.trim(), mode: 'insensitive' } },
        { type: { contains: criteria.category.trim(), mode: 'insensitive' } }
      );
    }

    // Lọc theo khoảng năm sản xuất
    if (criteria.minYear || criteria.maxYear) {
      where.year = {};
      if (criteria.minYear) where.year.gte = Number(criteria.minYear);
      if (criteria.maxYear) where.year.lte = Number(criteria.maxYear);
    }

    // Lọc theo khoảng giá
    if (criteria.minPrice || criteria.maxPrice) {
      where.price = {};
      if (criteria.minPrice) where.price.gte = Number(criteria.minPrice);
      if (criteria.maxPrice) where.price.lte = Number(criteria.maxPrice);
    }

    // Lọc theo tải trọng (thông minh với cả kg và tấn)
    if (criteria.loadCapacity) {
      const capTerms = normalizeCapacityTerms(criteria.loadCapacity);
      const capConditions = capTerms.map(t => ({
        loadCapacity: { contains: t, mode: 'insensitive' as const }
      }));
      if (where.OR) {
        where.AND = [{ OR: capConditions }];
      } else {
        where.OR = capConditions;
      }
    }

    // Lọc theo từ khóa tìm kiếm tổng hợp (Model, Mã nội bộ, Mã kho, Serial...)
    if (criteria.keyword) {
      const kw = criteria.keyword.trim();
      const kwConditions = [
        { model: { contains: kw, mode: 'insensitive' as const } },
        { internalCode: { contains: kw, mode: 'insensitive' as const } },
        { stockNo: { contains: kw, mode: 'insensitive' as const } },
        { serialNo: { contains: kw, mode: 'insensitive' as const } },
        { maker: { contains: kw, mode: 'insensitive' as const } },
        { category: { contains: kw, mode: 'insensitive' as const } },
        { type: { contains: kw, mode: 'insensitive' as const } }
      ];

      if (where.AND) {
        where.AND.push({ OR: kwConditions });
      } else if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: kwConditions }];
        delete where.OR;
      } else {
        where.OR = kwConditions;
      }
    }

    const takeCount = criteria.maxResults && criteria.maxResults > 0 ? criteria.maxResults : 5;

    const forklifts = await prisma.forklift.findMany({
      where,
      take: takeCount,
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

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vietnhat-forklift.vercel.app';

    return forklifts.map(f => ({
      id: f.id,
      internalCode: f.internalCode,
      stockNo: f.stockNo,
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
          { internalCode: { equals: cleanId, mode: 'insensitive' } },
          { stockNo: { equals: cleanId, mode: 'insensitive' } },
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

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vietnhat-forklift.vercel.app';

    return {
      id: forklift.id,
      internalCode: forklift.internalCode || 'Đang cập nhật',
      stockNo: forklift.stockNo || 'Đang cập nhật',
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
      status: forklift.status === 'Published' ? 'Sẵn sàng giao dịch tại kho' : forklift.status,
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
        description: 'Tìm kiếm danh sách xe nâng trong kho theo nhiều tiêu chí linh hoạt: hãng, năm sản xuất (minYear/maxYear), tải trọng nâng (kg hoặc tấn), nhiên liệu (điện/dầu), khoảng giá (minPrice/maxPrice), hoặc từ khóa model/mã xe.',
        parameters: {
          type: 'OBJECT',
          properties: {
            maker: {
              type: 'STRING',
              description: 'Hãng sản xuất xe nâng (Toyota, Komatsu, TCM, Mitsubishi, Nichiyu, Sumitomo...)'
            },
            powerType: {
              type: 'STRING',
              description: 'Loại nhiên liệu hoặc động cơ (Điện, Dầu, Xăng/Gas, Battery, Diesel...)'
            },
            category: {
              type: 'STRING',
              description: 'Phân loại kiểu dáng (ngồi lái, đứng lái, reach truck, counter...)'
            },
            loadCapacity: {
              type: 'STRING',
              description: 'Tải trọng nâng (ví dụ: 1.5 tấn, 2 tấn, 2.5 tấn, 3 tấn, 2500kg, 3000kg...)'
            },
            minYear: {
              type: 'INTEGER',
              description: 'Năm sản xuất tối thiểu (ví dụ: 2020 nếu khách hỏi "sau năm 2020")'
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
              description: 'Mức giá tối đa bằng VNĐ (ví dụ: 300000000 nếu khách hỏi dưới 300 triệu)'
            },
            keyword: {
              type: 'STRING',
              description: 'Từ khóa tìm kiếm model hoặc mã xe (ví dụ: 7FD25, 8FB25, VN-01, mã kho...)'
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
              description: 'Mã nội bộ (internalCode), mã kho (stockNo), model hoặc ID của xe cần xem chi tiết'
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
  if (!genAI) {
    return {
      replyText: 'Xin chào quý khách! Hệ thống đang kết nối đến chuyên viên tư vấn. Quý khách vui lòng để lại số điện thoại hoặc liên hệ hotline để được phục vụ nhanh nhất.'
    };
  }

  const systemInstruction = `
Bạn là Chuyên viên Tư vấn Kỹ thuật & Bán hàng AI của "${params.pageName || 'Công ty Xe Nâng Việt Nhật'}".
Bạn am hiểu sâu sắc về các dòng xe nâng (Toyota, Komatsu, TCM, Mitsubishi, Nichiyu...) và có quyền truy cập trực tiếp vào hệ thống cơ sở dữ liệu kho xe của công ty.

QUY TẮC TƯ VẤN & SỬ DỤNG TOOLS:
1. Khi khách hỏi tìm xe (hãng, đời xe, năm sản xuất, tải trọng, chạy điện hay dầu, khoảng giá):
   - LUÔN gọi tool 'searchForklifts' với các bộ lọc chính xác (maker, minYear, maxYear, loadCapacity, powerType, minPrice, maxPrice, keyword).
   - Tuyệt đối không bịa đặt thông tin xe nếu trong kho không có.
   - Khi có kết quả tìm kiếm, tóm tắt thông số chính (Hãng, Model, Tải trọng, Chiều cao nâng, Năm sản xuất) và gửi link xe để khách xem chi tiết.

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

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction,
      tools
    });

    // Chuyển đổi lịch sử chat cho Gemini SDK
    const contents: any[] = [];
    for (const msg of params.history.slice(-8)) {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      });
    }
    contents.push({
      role: 'user',
      parts: [{ text: params.userMessage }]
    });

    const chat = model.startChat({
      history: contents.slice(0, -1)
    });

    const result = await chat.sendMessage(params.userMessage);
    const response = await result.response;
    const functionCalls = response.functionCalls();

    let foundForklifts: ForkliftSearchResult[] = [];
    let inquiryCreated = false;

    // Vòng lặp xử lý Function Calling
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
                forklifts: searchResults
              }
            }
          });
        } else if (call.name === 'getForkliftDetail') {
          const args = call.args as any;
          const detail = await getForkliftDetailInDb(args.identifier);
          if (detail) {
            foundForklifts = [{
              id: detail.id,
              internalCode: detail.internalCode,
              stockNo: detail.stockNo,
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
      return {
        replyText: followUpResponse.text(),
        foundForklifts,
        inquiryCreated
      };
    }

    return {
      replyText: response.text(),
      foundForklifts,
      inquiryCreated
    };
  } catch (error: any) {
    console.error('[Gemini Chat Error]:', error);
    return {
      replyText: 'Dạ chào quý khách! Em là chuyên viên tư vấn xe nâng Việt Nhật. Quý khách đang quan tâm dòng xe nâng tải trọng bao nhiêu tấn hoặc mã xe cụ thể nào ạ? Quý khách cũng có thể để lại số điện thoại để bên em gửi báo giá và hình ảnh chi tiết qua Zalo nhé!'
    };
  }
}
