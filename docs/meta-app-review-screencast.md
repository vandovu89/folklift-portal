# Meta App Review — gửi lại pages_show_list, pages_manage_metadata, pages_messaging

## Lý do bị từ chối (tóm tắt)

| Yêu cầu của Meta | Trước đây | Bây giờ |
|---|---|---|
| Quy trình đăng nhập Meta | Không có — dán Page Access Token thủ công | Nút **Continue with Facebook** (Facebook Login) |
| Người dùng cấp quyền | Không thấy | Hộp thoại cấp quyền của Meta + chip trạng thái *granted* từng quyền |
| Chọn tài sản (Page) — `pages_show_list` | Không có | Danh sách Page người dùng quản lý, có ảnh, tên, Page ID, ô chọn |
| `pages_manage_metadata` | Không thể hiện | Kết nối Page tự đăng ký Webhook; cột **Messenger webhook** có Subscribe/Unsubscribe |
| `pages_messaging`: gửi từ UI app → hiện trong Messenger | Chỉ có bot tự trả lời | Tab **Messenger Inbox**: chọn hội thoại, gõ, bấm **Send** |
| Giao diện tiếng Anh | Tiếng Việt | Mở `/en/admin/...` hoặc bấm nút **EN** trên header |

## Việc cần làm trước khi quay

1. **Biến môi trường production** (Vercel → Settings → Environment Variables), rồi redeploy:
   - `FACEBOOK_APP_ID` = App ID
   - `FACEBOOK_APP_SECRET` = App Secret (Meta → App settings → Basic)
   - (Chỉ khi app dùng *Facebook Login for Business*) `FACEBOOK_LOGIN_CONFIG_ID` = ID của Configuration có 3 quyền trên
2. **Meta App Dashboard**
   - Thêm product *Facebook Login* (hoặc *Facebook Login for Business*).
   - *Valid OAuth Redirect URIs*: `https://www.xenangmck.jp/api/facebook/oauth/callback`
     (thêm cả `https://xenangmck.jp/api/facebook/oauth/callback` nếu trang chạy được ở cả 2 tên miền).
   - *App domains*: `xenangmck.jp`, `www.xenangmck.jp`.
   - Messenger → Webhooks: Callback `https://www.xenangmck.jp/api/webhook/messenger` đã verify, field `messages`, `messaging_postbacks`.
3. Tài khoản Facebook dùng để quay phải có vai trò (Admin/Developer/Tester) trong app, và là quản trị viên của Page.
4. **Để thấy lại hộp thoại cấp quyền**: vào Facebook → Settings → *Business integrations* → gỡ app, hoặc dùng cửa sổ ẩn danh.
5. Một tài khoản Facebook **thứ hai** (hoặc điện thoại khác) đóng vai khách hàng nhắn tin vào Page — Page không thể tự nhắn cho chính mình.
6. Chuẩn bị 2 cửa sổ cạnh nhau: trái = trình duyệt admin (`https://www.xenangmck.jp/en/admin/facebook-pages`), phải = Messenger (messenger.com) của tài khoản khách. Ngôn ngữ Facebook của cả hai tài khoản đặt **English (US)**.

> Có thể quay 1 video chung cho cả 3 quyền, nhưng nên tải video đó lên ở cả 3 mục.

## Kịch bản quay (≈ 3–4 phút, có chú thích chữ trên video)

Thêm caption bằng tiếng Anh ở góc màn hình cho từng bước (dùng trình chỉnh video hoặc công cụ quay có annotation).

| # | Thao tác | Caption gợi ý |
|---|---|---|
| 0 | Mở `https://www.xenangmck.jp/en/admin/facebook-pages` (đã đăng nhập admin). Rê chuột qua khung **How it works**. | "MCK Forklift admin dashboard. Our staff connect the company Facebook Page to reply to customer messages." |
| 1 | Bấm **Continue with Facebook**. | "Step 1 — Facebook Login: the Page admin logs in with Meta." |
| 2 | Hộp thoại Meta: đăng nhập (nếu cần) → màn chọn Page → **chọn Page "Xe Nâng …"** → màn liệt kê quyền → **Continue/Save**. Dừng 2–3 giây ở màn quyền. | "The user grants pages_show_list, pages_manage_metadata and pages_messaging." |
| 3 | Quay về app: banner xanh, thẻ "Permissions granted" có 3 chip **granted**. | "Back in our app: all three permissions are granted." |
| 4 | Ở **Select the Pages to connect**: rê chuột qua danh sách Page (ảnh, tên, Page ID). Tick Page. | "pages_show_list: we list the Pages this user manages so they can choose which one to connect." |
| 5 | Bấm **Connect selected Pages**. Banner "Pages connected". Kéo xuống bảng, cột **Messenger webhook** = *Subscribed — messages, messaging_postbacks*. | "pages_manage_metadata: connecting the Page subscribes our app to the Page's Messenger webhooks." |
| 6 | (Tuỳ chọn, minh hoạ rõ hơn) Bấm **Unsubscribe** → *Not subscribed* → bấm **Subscribe** lại → *Subscribed*. | "Admins can unsubscribe / re-subscribe the Page webhooks at any time." |
| 7 | Cửa sổ phải (Messenger, tài khoản khách): nhắn vào Page, ví dụ "Hi, do you have a 2.5 ton forklift?" | "A customer sends a message to the Page in Messenger." |
| 8 | Cửa sổ trái: bấm tab **Messenger Inbox** → **Refresh** → bấm hội thoại của khách. Thấy tên khách + "via <Page name> · Page ID …" và tin nhắn vừa gửi. | "The message arrives in our app through the webhook. The Page name and ID are shown." |
| 9 | Gõ: "Hello! This is MCK Forklift. Yes, we have 2.5 ton forklifts in stock. Can I have your phone number?" → bấm **Send**. Thấy "Message sent". | "pages_messaging: a staff member replies from our app." |
| 10 | Cửa sổ phải (Messenger): tin nhắn vừa gửi **xuất hiện** trong hội thoại. Dừng 3 giây. | "The reply is delivered to the customer in the native Messenger client." |
| 11 | (Tuỳ chọn) Mở **Activity logs** để thấy MESSAGE IN / SENT TO FB. | "Webhook and delivery logs." |

Lưu ý: hãy **để AI auto-reply ở trạng thái ON** khi quay. Khi Paused, webhook bỏ qua tin nhắn nên hội thoại sẽ không hiện trong Inbox. Bot sẽ tự trả lời trước, nên thêm caption "Our AI assistant also sends an automatic first reply" để người duyệt phân biệt với tin nhắn do nhân viên gửi ở bước 9.

## Ghi chú nộp kèm (dán vào ô "Tell us how you're using this permission")

**pages_show_list**
> MCK Forklift (xenangmck.jp) is a used-forklift dealer. Our admin dashboard lets our staff connect the company's Facebook Page. After Facebook Login, we call GET /me/accounts to show the list of Pages the user manages (name, picture, Page ID) so the admin can choose which Page to connect. The screencast shows: Facebook Login → permission grant → the Page list in our app → selecting and connecting a Page.

**pages_manage_metadata**
> When the admin connects a Page, our app calls POST /{page-id}/subscribed_apps (fields: messages, messaging_postbacks) so we receive Messenger webhooks for that Page. The dashboard shows the subscription status for each Page and lets the admin unsubscribe/re-subscribe. The screencast shows connecting the Page and the "Subscribed" status, then a customer message arriving through the webhook.

**pages_messaging**
> Customers message our Page on Messenger to ask about forklifts. Messages arrive via webhook into the "Messenger Inbox" in our dashboard. Staff reply from the inbox; replies are sent with the Send API (POST /me/messages, messaging_type RESPONSE, within the 24-hour window). An AI assistant also sends an automatic first answer with forklift suggestions. The screencast shows: selecting the Page (name and ID visible), a customer message in Messenger, a live reply sent from our app UI, and the same message delivered in the native Messenger client.

**Không phải** ứng dụng server-to-server, **không** dùng System User token — ghi rõ nếu form hỏi: "Our app uses Facebook Login with a user access token; Page access tokens are obtained from /me/accounts."

## Test instructions cho người duyệt (ô "App verification details")

> 1. Go to https://www.xenangmck.jp/en/login and log in with: username `<tài khoản test>` / password `<mật khẩu test>`.
> 2. Open "Facebook Pages" in the sidebar → click "Continue with Facebook".
> 3. Select your Page, grant the permissions, then click "Connect selected Pages".
> 4. Send a message to the Page from Messenger, open the "Messenger Inbox" tab, select the conversation and click "Send".

Hãy tạo một tài khoản admin riêng cho người duyệt (trang *Users & Roles*) thay vì đưa tài khoản thật.
