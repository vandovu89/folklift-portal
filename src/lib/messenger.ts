/**
 * Facebook Messenger Graph API Client
 * Hỗ trợ gửi tin nhắn đa Fanpage thông qua Page Access Token
 */

export interface QuickReply {
  content_type: 'text';
  title: string;
  payload: string;
}

export interface GenericElement {
  title: string;
  subtitle?: string;
  image_url?: string;
  default_action?: {
    type: 'web_url';
    url: string;
    messenger_extensions?: boolean;
    webview_height_ratio?: 'compact' | 'tall' | 'full';
  };
  buttons?: Array<{
    type: 'web_url' | 'postback';
    url?: string;
    title: string;
    payload?: string;
  }>;
}

/**
 * Gửi tin nhắn văn bản thông thường
 */
export async function sendTextMessage(
  pageAccessToken: string,
  recipientPsid: string,
  text: string,
  quickReplies?: QuickReply[]
) {
  const payload: any = {
    recipient: { id: recipientPsid },
    message: { text }
  };

  if (quickReplies && quickReplies.length > 0) {
    payload.message.quick_replies = quickReplies;
  }

  return callSendApi(pageAccessToken, payload);
}

/**
 * Gửi Generic Template (thẻ xe nâng: ảnh, tên xe, thông số, link xem chi tiết)
 */
export async function sendGenericTemplate(
  pageAccessToken: string,
  recipientPsid: string,
  elements: GenericElement[]
) {
  const payload = {
    recipient: { id: recipientPsid },
    message: {
      attachment: {
        type: 'template',
        payload: {
          template_type: 'generic',
          elements: elements.slice(0, 10) // Meta cho phép tối đa 10 thẻ
        }
      }
    }
  };

  return callSendApi(pageAccessToken, payload);
}

/**
 * Đánh dấu đã xem (mark seen) và hiển thị chỉ báo "Đang soạn tin..." (typing_on)
 */
export async function sendSenderAction(
  pageAccessToken: string,
  recipientPsid: string,
  action: 'mark_seen' | 'typing_on' | 'typing_off'
) {
  const payload = {
    recipient: { id: recipientPsid },
    sender_action: action
  };

  return callSendApi(pageAccessToken, payload);
}

/**
 * Gọi Meta Graph API Send Message
 */
async function callSendApi(pageAccessToken: string, requestBody: any) {
  const url = `https://graph.facebook.com/v20.0/me/messages?access_token=${encodeURIComponent(pageAccessToken)}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('[Messenger API Error]:', data);
      return { success: false, error: data };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error('[Messenger API Fetch Error]:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Kiểm tra tính hợp lệ của Page Access Token bằng cách gọi /me
 */
export async function verifyPageAccessToken(pageAccessToken: string) {
  try {
    const url = `https://graph.facebook.com/v20.0/me?fields=id,name&access_token=${encodeURIComponent(pageAccessToken)}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok || data.error) {
      return { valid: false, error: data.error?.message || 'Token không hợp lệ' };
    }

    return { valid: true, pageId: data.id, pageName: data.name };
  } catch (error: any) {
    return { valid: false, error: error.message };
  }
}
