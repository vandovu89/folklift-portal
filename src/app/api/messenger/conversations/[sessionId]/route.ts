import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStaffUser } from '@/lib/auth';
import { sendTextMessage } from '@/lib/messenger';

type Ctx = { params: Promise<{ sessionId: string }> };

// GET: Toàn bộ tin nhắn của một hội thoại Messenger
export async function GET(req: NextRequest, ctx: Ctx) {
  const { role } = await getStaffUser(req);
  if (role === 'GUEST') return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { sessionId } = await ctx.params;
  const session = await prisma.chatSession.findUnique({
    where: { id: sessionId },
    include: { messages: { orderBy: { createdAt: 'asc' }, take: 200 } }
  });
  if (!session) return NextResponse.json({ success: false, error: 'Conversation not found' }, { status: 404 });

  return NextResponse.json({
    success: true,
    messages: session.messages.map(m => ({ id: m.id, role: m.role, content: m.content, createdAt: m.createdAt }))
  });
}

// POST: Nhân viên gửi tin nhắn trả lời khách từ trang quản trị qua Send API (pages_messaging)
export async function POST(req: NextRequest, ctx: Ctx) {
  const { role } = await getStaffUser(req);
  if (role === 'GUEST' || role === 'VIEWER') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
  }

  const { sessionId } = await ctx.params;
  const { text } = await req.json();
  if (!text || !String(text).trim()) {
    return NextResponse.json({ success: false, error: 'Message is empty' }, { status: 400 });
  }

  const session = await prisma.chatSession.findUnique({
    where: { id: sessionId },
    include: { facebookPage: true }
  });
  if (!session?.facebookPage) {
    return NextResponse.json({ success: false, error: 'Conversation is not linked to a Facebook Page' }, { status: 404 });
  }

  const result = await sendTextMessage(session.facebookPage.accessToken, session.senderId, String(text).trim());
  if (!result.success) {
    const fbError = typeof result.error === 'object' ? result.error?.error : null;
    // 2018278: ngoài cửa sổ 24 giờ kể từ tin nhắn cuối của khách
    const outsideWindow = fbError?.error_subcode === 2018278 || fbError?.code === 10;
    return NextResponse.json({
      success: false,
      error: outsideWindow
        ? 'Cannot send: more than 24 hours since the customer\'s last message (Messenger policy).'
        : fbError?.message || 'Failed to send message via Messenger'
    }, { status: 502 });
  }

  const message = await prisma.chatMessage.create({
    data: { sessionId: session.id, role: 'assistant', content: String(text).trim() }
  });
  await prisma.chatSession.update({ where: { id: session.id }, data: { updatedAt: new Date() } });

  return NextResponse.json({
    success: true,
    messageId: result.data?.message_id,
    message: { id: message.id, role: message.role, content: message.content, createdAt: message.createdAt }
  });
}
