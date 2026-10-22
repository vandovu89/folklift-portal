import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_forlift_portal_2026';
const secretKey = () => new TextEncoder().encode(JWT_SECRET);
// Token khách hàng ký bằng khóa riêng: nếu khách chép token sang cookie auth_token thì proxy admin
// và các route cũ (vốn chỉ chặn role GUEST) cũng không xác thực được.
const customerSecretKey = () => new TextEncoder().encode(`${JWT_SECRET}:customer-portal`);

// Cookie của nhân viên (admin/sales/viewer) và của khách hàng hậu mãi được tách riêng.
export const STAFF_COOKIE = 'auth_token';
export const CUSTOMER_COOKIE = 'customer_token';

function readCookie(request: Request, name: string): string | undefined {
  const cookie = request.headers.get('cookie');
  if (!cookie) return undefined;
  for (const part of cookie.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('=');
  }
  return undefined;
}

export async function getStaffUser(request: Request): Promise<{ role: string; id: string | null }> {
  const token = readCookie(request, STAFF_COOKIE);
  if (!token) return { role: 'GUEST', id: null };
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (!payload.role) return { role: 'GUEST', id: null };
    return { role: payload.role as string, id: payload.id as string };
  } catch {
    return { role: 'GUEST', id: null };
  }
}

// Dùng trong Server Component: đọc quyền nhân viên từ cookie của request hiện tại
export async function getServerStaffRole(): Promise<string> {
  const { cookies } = await import('next/headers');
  const token = (await cookies()).get(STAFF_COOKIE)?.value;
  if (!token) return 'GUEST';
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return (payload.role as string) || 'GUEST';
  } catch {
    return 'GUEST';
  }
}

export async function signCustomerToken(customerId: string): Promise<string> {
  return new SignJWT({ kind: 'CUSTOMER', customerId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(customerSecretKey());
}

export async function verifyCustomerToken(token?: string): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, customerSecretKey());
    if (payload.kind !== 'CUSTOMER' || typeof payload.customerId !== 'string') return null;
    return payload.customerId;
  } catch {
    return null;
  }
}

export async function getCustomerId(request: Request): Promise<string | null> {
  return verifyCustomerToken(readCookie(request, CUSTOMER_COOKIE));
}
