import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStaffUser } from '@/lib/auth';
import { getMessengerProfile } from '@/lib/facebook-oauth';

// GET: Danh sách hội thoại Messenger (mới nhất trước) kèm tin nhắn cuối và tên khách
export async function GET(req: NextRequest) {
  const { role } = await getStaffUser(req);
  if (role === 'GUEST') return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const sessions = await prisma.chatSession.findMany({
    where: { channel: 'MESSENGER', facebookPageId: { not: null } },
    orderBy: { updatedAt: 'desc' },
    take: 30,
    include: {
      facebookPage: { select: { id: true, pageId: true, pageName: true, accessToken: true } },
      messages: { orderBy: { createdAt: 'desc' }, take: 1 }
    }
  });

  const conversations = await Promise.all(
    sessions.map(async s => {
      const profile = s.facebookPage
        ? await getMessengerProfile(s.senderId, s.facebookPage.accessToken)
        : { name: null, picture: null };
      const last = s.messages[0];
      return {
        id: s.id,
        senderId: s.senderId,
        customerName: profile.name,
        customerPicture: profile.picture,
        page: s.facebookPage ? { id: s.facebookPage.id, pageId: s.facebookPage.pageId, pageName: s.facebookPage.pageName } : null,
        lastMessage: last ? { role: last.role, content: last.content, createdAt: last.createdAt } : null,
        updatedAt: s.updatedAt
      };
    })
  );

  return NextResponse.json({ success: true, conversations });
}
