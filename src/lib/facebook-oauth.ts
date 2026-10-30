/**
 * Facebook Login (OAuth) cho trang quản trị: đăng nhập Meta, liệt kê Fanpage (pages_show_list),
 * đăng ký Webhook cho Page (pages_manage_metadata). Gửi tin nhắn (pages_messaging) nằm trong lib/messenger.ts.
 */
import { SignJWT, jwtVerify } from 'jose';

export const GRAPH_VERSION = process.env.FACEBOOK_GRAPH_VERSION || 'v23.0';
const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`;

// Các quyền xin khi đăng nhập — trùng với các quyền gửi xét duyệt
export const FACEBOOK_SCOPES = (process.env.FACEBOOK_SCOPES || 'pages_show_list,pages_manage_metadata,pages_messaging')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

// Các sự kiện Messenger mà Page đăng ký nhận qua Webhook
export const WEBHOOK_FIELDS = ['messages', 'messaging_postbacks'];

export const FB_STATE_COOKIE = 'fb_oauth_state';
export const FB_USER_COOKIE = 'fb_user_session';

export function getFacebookAppConfig() {
  const appId = process.env.FACEBOOK_APP_ID || process.env.META_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET || process.env.META_APP_SECRET;
  return { appId, appSecret, configured: Boolean(appId && appSecret) };
}

export function getRedirectUri(origin: string) {
  return `${origin}/api/facebook/oauth/callback`;
}

export function buildLoginDialogUrl(origin: string, state: string) {
  const { appId } = getFacebookAppConfig();
  const params = new URLSearchParams({
    client_id: appId || '',
    redirect_uri: getRedirectUri(origin),
    state,
    response_type: 'code',
    // Cho phép người dùng cấp lại quyền đã từ chối trước đó
    auth_type: 'rerequest'
  });
  // App loại Business dùng "Facebook Login for Business": quyền được khai báo trong Configuration (config_id)
  const configId = process.env.FACEBOOK_LOGIN_CONFIG_ID;
  if (configId) params.set('config_id', configId);
  else params.set('scope', FACEBOOK_SCOPES.join(','));
  return `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth?${params.toString()}`;
}

async function graphGet(path: string, params: Record<string, string>) {
  const res = await fetch(`${GRAPH}/${path}?${new URLSearchParams(params).toString()}`, { cache: 'no-store' });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.message || `Graph API error (${res.status})`);
  }
  return data;
}

// Đổi code lấy User Access Token, sau đó đổi sang token dài hạn (~60 ngày)
export async function exchangeCodeForUserToken(code: string, origin: string) {
  const { appId, appSecret } = getFacebookAppConfig();
  const shortLived = await graphGet('oauth/access_token', {
    client_id: appId || '',
    client_secret: appSecret || '',
    redirect_uri: getRedirectUri(origin),
    code
  });
  const longLived = await graphGet('oauth/access_token', {
    grant_type: 'fb_exchange_token',
    client_id: appId || '',
    client_secret: appSecret || '',
    fb_exchange_token: shortLived.access_token
  });
  return longLived.access_token as string;
}

export async function getFacebookUser(userToken: string) {
  return graphGet('me', { fields: 'id,name', access_token: userToken }) as Promise<{ id: string; name: string }>;
}

// Quyền người dùng đã thực sự cấp (để hiển thị trạng thái granted/declined)
export async function getGrantedPermissions(userToken: string) {
  const data = await graphGet('me/permissions', { access_token: userToken });
  return (data.data || []) as Array<{ permission: string; status: 'granted' | 'declined' }>;
}

export interface ManagedPage {
  id: string;
  name: string;
  category?: string;
  access_token: string;
  picture?: { data?: { url?: string } };
}

// pages_show_list: danh sách Fanpage người dùng quản lý (kèm Page Access Token dài hạn)
export async function listManagedPages(userToken: string): Promise<ManagedPage[]> {
  const pages: ManagedPage[] = [];
  let data = await graphGet('me/accounts', {
    fields: 'id,name,category,access_token,picture{url}',
    limit: '100',
    access_token: userToken
  });
  pages.push(...(data.data || []));
  while (data.paging?.next) {
    const res = await fetch(data.paging.next, { cache: 'no-store' });
    data = await res.json();
    if (data.error) break;
    pages.push(...(data.data || []));
  }
  return pages;
}

// pages_manage_metadata: đăng ký / huỷ / kiểm tra App nhận Webhook của Page
export async function subscribePageWebhooks(pageId: string, pageToken: string) {
  const res = await fetch(`${GRAPH}/${pageId}/subscribed_apps`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ subscribed_fields: WEBHOOK_FIELDS.join(','), access_token: pageToken })
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error?.message || 'Subscribe failed');
  return data.success === true;
}

export async function unsubscribePageWebhooks(pageId: string, pageToken: string) {
  const res = await fetch(`${GRAPH}/${pageId}/subscribed_apps?access_token=${encodeURIComponent(pageToken)}`, {
    method: 'DELETE'
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error?.message || 'Unsubscribe failed');
  return data.success === true;
}

export async function getPageSubscription(pageId: string, pageToken: string) {
  const { appId } = getFacebookAppConfig();
  const data = await graphGet(`${pageId}/subscribed_apps`, { access_token: pageToken });
  const apps = (data.data || []) as Array<{ id: string; name: string; subscribed_fields?: string[] }>;
  const ours = apps.find(a => !appId || a.id === appId);
  return { subscribed: Boolean(ours), fields: ours?.subscribed_fields || [] };
}

// Tên hiển thị của khách nhắn tin (best effort, có thể bị Meta giới hạn)
export async function getMessengerProfile(psid: string, pageToken: string) {
  try {
    const data = await graphGet(psid, { fields: 'first_name,last_name,profile_pic', access_token: pageToken });
    return {
      name: [data.first_name, data.last_name].filter(Boolean).join(' ') || null,
      picture: (data.profile_pic as string) || null
    };
  } catch {
    return { name: null, picture: null };
  }
}

// User Access Token được giữ trong cookie httpOnly có ký, chỉ sống 30 phút để chọn Page
const sessionKey = () =>
  new TextEncoder().encode(`${process.env.JWT_SECRET || 'super_secret_jwt_key_forlift_portal_2026'}:facebook-login`);

export async function signFacebookSession(payload: { userToken: string; userId: string; userName: string }) {
  return new SignJWT(payload).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('30m').sign(sessionKey());
}

export async function readFacebookSession(token?: string) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, sessionKey());
    return payload as unknown as { userToken: string; userId: string; userName: string };
  } catch {
    return null;
  }
}
