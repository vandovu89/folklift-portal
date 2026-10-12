import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * Facebook Data Deletion Callback & User Request Handler
 * Compliant with Meta Platform Terms Section 4.f
 */
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';

    // Case 1: Automated Facebook Callback with signed_request (form-urlencoded or multipart)
    if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const signedRequest = formData.get('signed_request') as string | null;

      let userId = 'unknown_user';

      if (signedRequest) {
        try {
          const parts = signedRequest.split('.');
          if (parts.length === 2) {
            const payload = Buffer.from(parts[1], 'base64').toString('utf-8');
            const data = JSON.parse(payload);
            if (data.user_id) {
              userId = data.user_id;
            }
          }
        } catch (e) {
          console.warn('[Facebook Data Deletion] Parse error:', e);
        }
      }

      const confirmationCode = `DEL-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      console.log(`[Facebook Data Deletion] Received automated request for user: ${userId}, confirmation code: ${confirmationCode}`);

      // Return required Meta response format
      return NextResponse.json({
        url: `https://xenangmck.jp/vi/data-deletion?code=${confirmationCode}`,
        confirmation_code: confirmationCode
      });
    }

    // Case 2: JSON submission from the website's data deletion form
    const body = await req.json();
    const { name, emailOrPhone, facebookPsid, reason } = body;

    const confirmationCode = `REQ-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    console.log('[Facebook Data Deletion] Manual request submitted:', {
      name,
      emailOrPhone,
      facebookPsid,
      reason,
      confirmationCode,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      confirmation_code: confirmationCode,
      message: 'Yêu cầu xóa dữ liệu đã được tiếp nhận thành công'
    });
  } catch (error: any) {
    console.error('[Facebook Data Deletion Error]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
