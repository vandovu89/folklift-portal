import { prisma } from '@/lib/prisma';

export interface LogParams {
  eventType: 'VERIFY' | 'MESSAGE_IN' | 'AI_REPLY' | 'SEND_SUCCESS' | 'SEND_ERROR' | 'PAGE_NOT_FOUND' | 'BOT_DISABLED' | 'ERROR';
  pageId?: string;
  pageName?: string;
  senderId?: string;
  message?: string;
  details?: any;
  status?: 'SUCCESS' | 'WARNING' | 'ERROR' | 'INFO';
}

/**
 * Ghi log hoạt động của Bot: vừa in ra console server vừa lưu vào Database
 */
export async function logBotActivity(params: LogParams) {
  const timestamp = new Date().toLocaleTimeString('vi-VN');
  const tag = `[FB BOT ${params.eventType}]`;
  const pageInfo = params.pageName ? `Page: ${params.pageName} (${params.pageId})` : (params.pageId ? `PageId: ${params.pageId}` : '');
  const senderInfo = params.senderId ? `Sender: ${params.senderId}` : '';

  // 1. In ra console server (Vercel / Local) với icon trực quan
  const icon = 
    params.status === 'ERROR' || params.eventType.includes('ERROR') ? '❌' :
    params.status === 'WARNING' || params.eventType === 'PAGE_NOT_FOUND' || params.eventType === 'BOT_DISABLED' ? '⚠️' :
    params.eventType === 'MESSAGE_IN' ? '📩' :
    params.eventType === 'AI_REPLY' ? '🤖' :
    params.eventType === 'SEND_SUCCESS' ? '📤' :
    params.eventType === 'VERIFY' ? '🔑' : 'ℹ️';

  console.log(`${icon} ${tag} ${timestamp} | ${pageInfo} ${senderInfo} | ${params.message || ''}`);
  if (params.details) {
    if (params.status === 'ERROR') {
      console.error('[Bot Log Details]:', params.details);
    } else {
      console.log('[Bot Log Details]:', typeof params.details === 'string' ? params.details : JSON.stringify(params.details));
    }
  }

  // 2. Lưu vào Database (chạy nền, không chặn luồng chính)
  try {
    let detailsString = '';
    if (params.details) {
      if (typeof params.details === 'string') {
        detailsString = params.details;
      } else {
        try {
          detailsString = JSON.stringify(params.details, null, 2);
        } catch {
          detailsString = String(params.details);
        }
      }
    }

    await prisma.botLog.create({
      data: {
        pageId: params.pageId || null,
        pageName: params.pageName || null,
        eventType: params.eventType,
        senderId: params.senderId || null,
        message: params.message || null,
        details: detailsString || null,
        status: params.status || (params.eventType.includes('ERROR') ? 'ERROR' : 'INFO')
      }
    });
  } catch (dbError) {
    console.error('[Failed to write BotLog to DB]:', dbError);
  }
}
