import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendTextMessage, sendGenericTemplate, sendSenderAction } from '@/lib/messenger';
import { processAiChat } from '@/lib/gemini';
import { logBotActivity } from '@/lib/bot-logger';

// GET: Xác thực Webhook với Meta Developer
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.META_VERIFY_TOKEN || process.env.MESSENGER_VERIFY_TOKEN || 'vietnhat_forklift_secret_token_2026';

  if (mode === 'subscribe' && token === verifyToken) {
    await logBotActivity({
      eventType: 'VERIFY',
      message: 'Meta xác thực Webhook thành công (hub.challenge được phản hồi)',
      status: 'SUCCESS',
      details: { mode, tokenReceived: token }
    });

    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    });
  }

  await logBotActivity({
    eventType: 'ERROR',
    message: 'Meta xác thực Webhook THẤT BẠI: Verify Token không khớp!',
    status: 'ERROR',
    details: {
      expectedToken: verifyToken,
      receivedToken: token,
      mode
    }
  });

  return new NextResponse('Forbidden', { status: 403 });
}

// POST: Nhận sự kiện tin nhắn từ Meta
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.object !== 'page') {
      await logBotActivity({
        eventType: 'ERROR',
        message: 'Gói tin webhook không phải loại page event',
        status: 'WARNING',
        details: body
      });
      return NextResponse.json({ status: 'not_a_page_event' }, { status: 404 });
    }

    // Xử lý các entry từ Meta
    for (const entry of body.entry || []) {
      const pageId = entry.id; // Meta Page ID
      
      // 1. Tìm thông tin Fanpage trong Database
      const fbPage = await prisma.facebookPage.findUnique({
        where: { pageId }
      });

      // Nếu Page chưa được cấu hình trong hệ thống
      if (!fbPage) {
        await logBotActivity({
          eventType: 'PAGE_NOT_FOUND',
          pageId,
          message: `Nhận tin nhắn từ Facebook Page ID "${pageId}" nhưng Page này CHƯA ĐƯỢC KẾT NỐI trong trang Admin!`,
          status: 'WARNING',
          details: {
            guide: 'Hãy vào /admin/facebook-pages và bấm "Thêm Fanpage mới" với đúng Page ID này.',
            entry
          }
        });
        continue;
      }

      // Nếu Page đang tắt bot
      if (!fbPage.isActive) {
        await logBotActivity({
          eventType: 'BOT_DISABLED',
          pageId: fbPage.pageId,
          pageName: fbPage.pageName,
          message: `Fanpage "${fbPage.pageName}" đang ở trạng thái TẠM DỪNG BOT. Đã bỏ qua tin nhắn.`,
          status: 'INFO'
        });
        continue;
      }

      for (const event of entry.messaging || []) {
        const senderPsid = event.sender?.id;
        if (!senderPsid) continue;

        // Bỏ qua tin nhắn do chính page gửi đi (echo)
        if (event.message?.is_echo) continue;

        const messageText = event.message?.text || event.postback?.title || event.postback?.payload;
        if (!messageText) continue;

        // Ghi log tin nhắn đến từ khách hàng
        await logBotActivity({
          eventType: 'MESSAGE_IN',
          pageId: fbPage.pageId,
          pageName: fbPage.pageName,
          senderId: senderPsid,
          message: `Khách nhắn: "${messageText}"`,
          status: 'INFO'
        });

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

        // Ghi log AI đã sinh câu trả lời
        await logBotActivity({
          eventType: 'AI_REPLY',
          pageId: fbPage.pageId,
          pageName: fbPage.pageName,
          senderId: senderPsid,
          message: `AI đã tạo câu trả lời (Gợi ý ${aiResult.foundForklifts?.length || 0} xe, Tạo Lead: ${aiResult.inquiryCreated ? 'CÓ' : 'KHÔNG'})`,
          status: 'INFO',
          details: {
            replyText: aiResult.replyText,
            foundForklifts: aiResult.foundForklifts?.map(f => `${f.maker} ${f.model} (${f.loadCapacity || ''})`)
          }
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

        const textToSend = (aiResult.replyText && aiResult.replyText.trim().length > 0)
          ? aiResult.replyText.trim()
          : 'Dạ chào quý khách! Em là chuyên viên tư vấn xe nâng Việt Nhật. Em đã ghi nhận yêu cầu của quý khách và sẽ kiểm tra kho báo giá trong giây lát nhé!';

        // 4. Gửi câu trả lời về cho khách qua Facebook Send API
        const sendResult = await sendTextMessage(fbPage.accessToken, senderPsid, textToSend);

        if (sendResult.success) {
          await logBotActivity({
            eventType: 'SEND_SUCCESS',
            pageId: fbPage.pageId,
            pageName: fbPage.pageName,
            senderId: senderPsid,
            message: `Đã gửi tin nhắn phản hồi thành công đến Facebook khách hàng!`,
            status: 'SUCCESS'
          });
        } else {
          await logBotActivity({
            eventType: 'SEND_ERROR',
            pageId: fbPage.pageId,
            pageName: fbPage.pageName,
            senderId: senderPsid,
            message: `Gửi tin nhắn qua Facebook thất bại! Kiểm tra lại Token hoặc quyền của Page.`,
            status: 'ERROR',
            details: sendResult.error
          });
        }

        // 5. Nếu có danh sách xe gợi ý và có ảnh, gửi kèm Generic Template thẻ xe
        if (aiResult.foundForklifts && aiResult.foundForklifts.length > 0) {
          const cards = aiResult.foundForklifts
            .filter(f => f.imageUrl)
            .slice(0, 4)
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
            const cardSendResult = await sendGenericTemplate(fbPage.accessToken, senderPsid, cards);
            if (!cardSendResult.success) {
              await logBotActivity({
                eventType: 'SEND_ERROR',
                pageId: fbPage.pageId,
                pageName: fbPage.pageName,
                senderId: senderPsid,
                message: `Gửi thẻ xe nâng (Generic Template) thất bại!`,
                status: 'WARNING',
                details: cardSendResult.error
              });
            }
          }
        }
      }
    }

    return NextResponse.json({ status: 'EVENT_RECEIVED' }, { status: 200 });
  } catch (error: any) {
    await logBotActivity({
      eventType: 'ERROR',
      message: `Lỗi ngoại lệ trong Webhook POST: ${error.message}`,
      status: 'ERROR',
      details: error.stack
    });

    return NextResponse.json({ status: 'ERROR_HANDLED' }, { status: 200 });
  }
}
