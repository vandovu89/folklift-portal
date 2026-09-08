import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '@/lib/prisma';

// Khởi tạo client Gemini
const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export interface ForkliftSearchResult {
  id: string;
  maker: string;
  model: string;
  year?: number | null;
  loadCapacity?: string | null;
  powerType?: string | null;
  liftHeight?: string | null;
  price?: number | null;
  imageUrl?: string | null;
  detailUrl: string;
}

/**
 * Tra cứu kho xe nâng thực tế từ Database theo tiêu chí khách hàng
 */
export async function searchForkliftsInDb(criteria: {
  maker?: string;
  powerType?: string;
  loadCapacity?: string;
  keyword?: string;
}): Promise<ForkliftSearchResult[]> {
  try {
    const where: any = {
      status: 'Published'
    };

    if (criteria.maker) {
      where.maker = { contains: criteria.maker, mode: 'insensitive' };
    }

    if (criteria.powerType) {
      where.powerType = { contains: criteria.powerType, mode: 'insensitive' };
    }

    if (criteria.loadCapacity) {
      where.loadCapacity = { contains: criteria.loadCapacity, mode: 'insensitive' };
    }

    if (criteria.keyword) {
      where.OR = [
        { model: { contains: criteria.keyword, mode: 'insensitive' } },
        { category: { contains: criteria.keyword, mode: 'insensitive' } },
        { type: { contains: criteria.keyword, mode: 'insensitive' } },
      ];
    }

    const forklifts = await prisma.forklift.findMany({
      where,
      take: 5,
      orderBy: { createdAt: 'desc' },
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
      maker: f.maker,
      model: f.model,
      year: f.year,
      loadCapacity: f.loadCapacity,
      powerType: f.powerType,
      liftHeight: f.liftHeight,
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
 * Định nghĩa Tools cho Gemini Function Calling
 */
const tools: any = [
  {
    functionDeclarations: [
      {
        name: 'searchForklifts',
        description: 'Tra cứu danh sách xe nâng đang có trong kho theo các tiêu chí như hãng, tải trọng, loại nhiên liệu (điện, dầu, xăng), hoặc từ khóa model.',
        parameters: {
          type: 'OBJECT',
          properties: {
            maker: {
              type: 'STRING',
              description: 'Hãng sản xuất xe nâng (ví dụ: Toyota, Komatsu, TCM, Mitsubishi, Nichiyu, Sumitomo...)'
            },
            powerType: {
              type: 'STRING',
              description: 'Loại nhiên liệu hoặc động cơ (ví dụ: Điện, Dầu, Xăng/Gas, Battery, Diesel...)'
            },
            loadCapacity: {
              type: 'STRING',
              description: 'Tải trọng nâng (ví dụ: 1.5 tấn, 2 tấn, 2.5 tấn, 3 tấn...)'
            },
            keyword: {
              type: 'STRING',
              description: 'Từ khóa tìm kiếm model hoặc phân loại (ví dụ: ngồi lái, đứng lái, reach truck, 7FD25, 8FB25...)'
            }
          }
        }
      },
      {
        name: 'saveCustomerContact',
        description: 'Lưu lại họ tên và số điện thoại của khách hàng khi khách muốn nhận báo giá hoặc nhờ chuyên viên liên hệ trực tiếp.',
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
Bạn là Trợ lý Ảo AI chuyên viên tư vấn xe nâng của "${params.pageName || 'Công ty Xe Nâng Việt Nhật'}".
Nhiệm vụ của bạn là:
1. Luôn lịch sự, niềm nở, tư vấn chuyên nghiệp, trả lời ngắn gọn, súc tích (phù hợp cho tin nhắn Facebook Messenger trên di động).
2. Khi khách hỏi về xe nâng (tải trọng, hãng xe, đời xe, giá bán, xe điện hay dầu):
   - Luôn sử dụng tool 'searchForklifts' để tìm các xe thực tế đang có trong kho dữ liệu của công ty.
   - Khi có kết quả tìm kiếm, giới thiệu tên xe, hãng, đời xe, tải trọng nâng và đính kèm đường link chi tiết xe để khách bấm vào xem ảnh và thông số.
   - Không bịa đặt thông tin xe không có trong kho.
3. Khi khách có vẻ quan tâm hoặc hỏi giá cụ thể / muốn mua / cần tư vấn kỹ hơn:
   - Hãy khéo léo xin Tên và Số điện thoại của khách hàng để chuyên viên kinh doanh gửi báo giá chi tiết và hình ảnh/video thực tế xe qua Zalo/điện thoại.
   - Khi khách cung cấp Tên và Số điện thoại, NGAY LẬP TỨC gọi tool 'saveCustomerContact' để lưu vào hệ thống và xác nhận với khách rằng chuyên viên sẽ liên hệ trong ít phút.
${params.customGreeting ? `Lưu ý đặc biệt từ trang: ${params.customGreeting}` : ''}
`.trim();

  try {
    // Sử dụng model gemini-1.5-flash hoặc gemini-2.0-flash
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
    // Thêm tin nhắn hiện tại
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

    // Nếu Gemini yêu cầu gọi tool
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
              response: { forklifts: searchResults }
            }
          });
        } else if (call.name === 'saveCustomerContact') {
          const args = call.args as any;
          await createInquiryFromChat({
            customerName: args.customerName,
            phone: args.phone,
            note: args.note,
            facebookPageId: params.facebookPageId,
            chatSessionId: params.chatSessionId
          });
          inquiryCreated = true;
          toolResponses.push({
            functionResponse: {
              name: 'saveCustomerContact',
              response: { success: true, message: 'Đã lưu thông tin liên hệ thành công.' }
            }
          });
        }
      }

      // Gửi kết quả tool về cho Gemini để sinh câu trả lời tự nhiên cuối cùng
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
      replyText: 'Dạ chào quý khách! Em là trợ lý tư vấn xe nâng Việt Nhật. Quý khách đang cần tìm dòng xe nâng tải trọng bao nhiêu tấn (chạy điện hay dầu) ạ? Quý khách cũng có thể để lại số điện thoại để bên em gửi báo giá và hình ảnh chi tiết qua Zalo nhé!'
    };
  }
}
