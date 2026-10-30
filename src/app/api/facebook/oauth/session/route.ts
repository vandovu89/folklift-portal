import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStaffUser } from '@/lib/auth';
import {
  getFacebookAppConfig,
  getGrantedPermissions,
  listManagedPages,
  readFacebookSession,
  FACEBOOK_SCOPES,
  FB_USER_COOKIE
} from '@/lib/facebook-oauth';

// GET: Trạng thái đăng nhập Facebook + quyền đã cấp + danh sách Page người dùng quản lý (pages_show_list)
export async function GET(req: NextRequest) {
  const { role } = await getStaffUser(req);
  if (role === 'GUEST') return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const configured = getFacebookAppConfig().configured;
  const session = await readFacebookSession(req.cookies.get(FB_USER_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ success: true, configured, loggedIn: false, requestedScopes: FACEBOOK_SCOPES });
  }

  try {
    const [permissions, pages, connected] = await Promise.all([
      getGrantedPermissions(session.userToken),
      listManagedPages(session.userToken),
      prisma.facebookPage.findMany({ select: { pageId: true } })
    ]);
    const connectedIds = new Set(connected.map(p => p.pageId));

    return NextResponse.json({
      success: true,
      configured,
      loggedIn: true,
      user: { id: session.userId, name: session.userName },
      requestedScopes: FACEBOOK_SCOPES,
      permissions: permissions.filter(p => FACEBOOK_SCOPES.includes(p.permission)),
      pages: pages.map(p => ({
        id: p.id,
        name: p.name,
        category: p.category || null,
        picture: p.picture?.data?.url || null,
        connected: connectedIds.has(p.id)
      }))
    });
  } catch (error: any) {
    const res = NextResponse.json({ success: false, configured, loggedIn: false, error: error.message }, { status: 200 });
    res.cookies.delete(FB_USER_COOKIE);
    return res;
  }
}

// DELETE: Đăng xuất phiên Facebook (chỉ xoá token tạm, không ảnh hưởng Page đã kết nối)
export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.delete(FB_USER_COOKIE);
  return res;
}
