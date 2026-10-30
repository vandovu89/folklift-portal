import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStaffUser } from '@/lib/auth';
import { getPageSubscription, subscribePageWebhooks, unsubscribePageWebhooks } from '@/lib/facebook-oauth';

type Ctx = { params: Promise<{ id: string }> };

async function loadPage(req: NextRequest, ctx: Ctx, adminOnly: boolean) {
  const { role } = await getStaffUser(req);
  if (role === 'GUEST' || (adminOnly && role !== 'ADMIN')) {
    return { error: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 }) };
  }
  const { id } = await ctx.params;
  const page = await prisma.facebookPage.findUnique({ where: { id } });
  if (!page) return { error: NextResponse.json({ success: false, error: 'Page not found' }, { status: 404 }) };
  return { page };
}

// GET: Kiểm tra App đã đăng ký nhận Webhook của Page chưa (pages_manage_metadata)
export async function GET(req: NextRequest, ctx: Ctx) {
  const { page, error } = await loadPage(req, ctx, false);
  if (error) return error;
  try {
    const status = await getPageSubscription(page.pageId, page.accessToken);
    return NextResponse.json({ success: true, ...status });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message });
  }
}

// POST: Đăng ký Webhook (messages, messaging_postbacks) cho Page
export async function POST(req: NextRequest, ctx: Ctx) {
  const { page, error } = await loadPage(req, ctx, true);
  if (error) return error;
  try {
    await subscribePageWebhooks(page.pageId, page.accessToken);
    const status = await getPageSubscription(page.pageId, page.accessToken);
    return NextResponse.json({ success: true, ...status });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message });
  }
}

// DELETE: Huỷ đăng ký Webhook cho Page
export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { page, error } = await loadPage(req, ctx, true);
  if (error) return error;
  try {
    await unsubscribePageWebhooks(page.pageId, page.accessToken);
    return NextResponse.json({ success: true, subscribed: false, fields: [] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
