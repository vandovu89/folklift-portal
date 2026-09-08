import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendTextMessage, sendGenericTemplate, sendSenderAction } from '@/lib/messenger';
import { processAiChat } from '@/lib/gemini';

// GET: Xác thực Webhook với Meta Developer
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.META_VERIFY_TOKEN || process.env.MESSENGER_VERIFY_TOKEN || 'vietnhat_forklift_secret_token_2026';

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('[Messenger Webhook]: Verified successfully!');
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    });
  }

  console.warn('[Messenger Webhook]: Verification failed. Token mismatch.');
  return new NextResponse('Forbidden', { status: 403 });
}

// POST: Nhận sự kiện tin nhắn từ Meta
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.object !== 'page') {
      return NextResponse.json({ status: 'not_a_page_event' }, { status: 404 });
    }

    // Xử lý song song các entry
    for (const entry of body.entry || []) {
      const pageId = entry.id; // Meta Page ID
      
      // 1. Tìm thông tin Fanpage trong Database
      const fbPage = await prisma.facebookPage.findUnique({
        where: { pageId }
      });

      // Nếu Page chưa được cấu hình hoặc đang tắt bot thì bỏ qua
      if (!fbPage || !fbPage.isActive) {
        continue;
      }

      for (const event of entry.messaging || []) {
        const senderPsid = event.sender?.id;
        if (!senderPsid) continue;

        // Bỏ qua tin nhắn do chính page gửi đi
        if (event.message?.is_echo) continue;

        const messageText = event.message?.text || event.postback?.title || event.postback?.payload;
        if (!messageText) continue;

        // Bật trạng thái "Đang gõ..." (typing indicator)
        await sendSenderAction(fbPage.accessToken, senderPsid, 'typing_on');

        // 2. Tìm hoặc tạo ChatSession
        let session = await prisma.chatSession.findFirst({
          where: {
            senderId: senderPsid,
            facebookPageId: fbPage.id
          },
          include: {
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 10
            }
          }
        });

        if (!session) {
          session = await prisma.chatSession.create({
            data: {
              channel: 'MESSENGER',
              senderId: senderPsid,
              facebookPageId: fbPage.id
            },
            include: { messages: true }
          });
        }

        // Lưu tin nhắn của khách vào DB
        await prisma.chatMessage.create({
          data: {
            sessionId: session.id,
            role: 'user',
            content: messageText
          }
        });

        // Chuẩn bị lịch sử tin nhắn
        const history = (session.messages || [])
          .reverse()
          .map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content
          }));

        // 3. Xử lý câu trả lời bằng Gemini AI
        const aiResult = await processAiChat({
          userMessage: messageText,
          history,
          pageName: fbPage.pageName,
          customGreeting: fbPage.greeting,
          facebookPageId: fbPage.id,
          chatSessionId: session.id
        });

        // Lưu câu trả lời của AI vào DB
        await prisma.chatMessage.create({
          data: {
            sessionId: session.id,
            role: 'assistant',
            content: aiResult.replyText
          }
        });

        // Tắt typing indicator
        await sendSenderAction(fbPage.accessToken, senderPsid, 'typing_off');

        // 4. Gửi câu trả lời về cho khách qua Facebook Send API
        await sendTextMessage(fbPage.accessToken, senderPsid, aiResult.replyText);

        // 5. Nếu có danh sách xe gợi ý và có ảnh, gửi kèm Generic Template thẻ xe
        if (aiResult.foundForklifts && aiResult.foundForklifts.length > 0) {
          const cards = aiResult.foundForklifts
            .filter(f => f.imageUrl) // Ưu tiên xe có ảnh
            .slice(0, 4) // Gửi tối đa 4 thẻ để tránh nghẽn chat
            .map(f => ({
              title: `${f.maker} ${f.model}`,
              subtitle: `Tải: ${f.loadCapacity || 'N/A'} | Đời: ${f.year || 'N/A'} | ${f.powerType || ''}`,
              image_url: f.imageUrl || undefined,
              default_action: {
                type: 'web_url' as const,
                url: f.detailUrl
              },
              buttons: [
                {
                  type: 'web_url' as const,
                  url: f.detailUrl,
                  title: 'Xem chi tiết xe'
                }
              ]
            }));

          if (cards.length > 0) {
            await sendGenericTemplate(fbPage.accessToken, senderPsid, cards);
          }
        }
      }
    }

    // Meta quy định bắt buộc phải trả về 200 OK ngay lập tức
    return NextResponse.json({ status: 'EVENT_RECEIVED' }, { status: 200 });
  } catch (error: any) {
    console.error('[Messenger Webhook POST Error]:', error);
    // Vẫn trả về 200 để Meta không retry liên tục làm treo webhook
    return NextResponse.json({ status: 'ERROR_HANDLED' }, { status: 200 });
  }
}
