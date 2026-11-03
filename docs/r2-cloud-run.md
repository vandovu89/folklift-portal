# Chuyển lưu trữ sang Cloudflare R2 + Render video bằng FFmpeg trên Google Cloud Run

Tài liệu này hướng dẫn bật luồng mới:

- **Mọi file tải lên mới** (ảnh, tài liệu, clip quay xe) đi thẳng từ trình duyệt lên **Cloudflare R2**: không còn giới hạn 100MB/file của Cloudinary Free (giới hạn hệ thống: 2GB/file).
- **Video AI** được dựng bởi **worker FFmpeg** (`render-worker/`) chạy trên **Google Cloud Run**: ghép clip, chuẩn hóa khung dọc 9:16, lồng giọng ElevenLabs, xuất MP4 độc lập lên R2. Không còn tốn credit Cloudinary.
- File cũ trên Cloudinary **giữ nguyên** và vẫn hiển thị bình thường.

> Khi **chưa** khai báo biến môi trường R2 + worker trên Vercel, hệ thống tự chạy luồng Cloudinary cũ. Vì vậy có thể deploy code trước, bật luồng mới sau.

---

## Bước 1 — Tạo bucket Cloudflare R2

1. Đăng nhập [dash.cloudflare.com](https://dash.cloudflare.com) → **R2 Object Storage** (lần đầu cần thêm phương thức thanh toán; 10GB đầu miễn phí).
2. **Create bucket** → tên `mck-media` → Location: **Asia-Pacific (APAC)**.
3. Bật truy cập công khai (bucket → **Settings** → **Public access**):
   - **Khuyên dùng:** **Custom Domains** → gắn tên miền riêng, VD `media.xenangmck.jp` (tên miền phải đang dùng DNS của Cloudflare).
   - Tạm thời để test: bật **Public Development URL** (`https://pub-xxxx.r2.dev`). Cloudflare giới hạn tốc độ URL r2.dev, **không dùng cho production**.
   - Ghi lại URL này → `R2_PUBLIC_URL` (không có dấu `/` ở cuối).
4. **CORS policy** (bucket → Settings → CORS policy → Edit), dán (thay domain web thật):

   ```json
   [
     {
       "AllowedOrigins": ["https://xenangmck.jp", "https://www.xenangmck.jp", "https://vietnhat-forklift.vercel.app", "http://localhost:3000"],
       "AllowedMethods": ["GET", "PUT", "HEAD"],
       "AllowedHeaders": ["Content-Type"],
       "ExposeHeaders": ["ETag"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```

5. **API token**: R2 → **Manage R2 API Tokens** → **Create API token**
   - Permissions: **Object Read & Write**
   - Specify bucket: chỉ `mck-media`
   - Sau khi tạo, ghi lại: **Access Key ID** → `R2_ACCESS_KEY_ID`, **Secret Access Key** → `R2_SECRET_ACCESS_KEY` (chỉ hiện 1 lần).
   - **Account ID** (hiện ở trang R2 Overview) → `R2_ACCOUNT_ID`.

---

## Bước 2 — Deploy worker FFmpeg lên Google Cloud Run

1. Tạo project trên [console.cloud.google.com](https://console.cloud.google.com) và **gắn tài khoản thanh toán** (Cloud Run có free tier hằng tháng nhưng vẫn bắt buộc có billing).
2. Cài [Google Cloud CLI](https://cloud.google.com/sdk/docs/install), rồi đăng nhập và bật dịch vụ:

   ```bash
   gcloud auth login
   gcloud config set project <PROJECT_ID>
   gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
   ```

3. Tạo một chuỗi bí mật dùng chung giữa web và worker (giữ kín, dùng ở cả Bước 2 và Bước 3):

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

4. Deploy từ thư mục `render-worker` (Cloud Build tự build Docker image có FFmpeg):

   ```bash
   gcloud run deploy mck-render-worker \
     --source render-worker \
     --region asia-southeast1 \
     --cpu 2 --memory 2Gi \
     --no-cpu-throttling \
     --concurrency 10 --min-instances 0 --max-instances 2 \
     --timeout 300 \
     --allow-unauthenticated \
     --set-env-vars "R2_ACCOUNT_ID=<...>,R2_ACCESS_KEY_ID=<...>,R2_SECRET_ACCESS_KEY=<...>,R2_BUCKET=mck-media,R2_PUBLIC_URL=<https://media.xenangmck.jp>,WORKER_SECRET=<chuỗi bí mật>,CALLBACK_URL_PREFIXES=https://<domain-web>/"
   ```

   - `--allow-unauthenticated`: Cloud Run nhận request từ Vercel; worker tự kiểm tra `WORKER_SECRET` nên người ngoài không gọi được.
   - `--no-cpu-throttling`: **bắt buộc**. Worker trả lời ngay cho web rồi mới render ở nền; thiếu cờ này Cloud Run sẽ bóp CPU và FFmpeg gần như dừng.
   - `CALLBACK_URL_PREFIXES`: domain web thật (VD `https://xenangmck.jp/`). Nếu cần nhiều domain (giá trị có dấu phẩy), đổi ký tự phân cách của `gcloud` sang `@`: `--set-env-vars "^@^R2_BUCKET=mck-media@CALLBACK_URL_PREFIXES=https://a.com/,https://b.com/@..."`, hoặc sửa biến trong Cloud Run Console sau khi deploy.
   - Có thể đưa `R2_SECRET_ACCESS_KEY` và `WORKER_SECRET` vào **Secret Manager** (`--set-secrets`) thay vì để dạng env.

5. Ghi lại **Service URL** in ra cuối lệnh (VD `https://mck-render-worker-xxxx-as.a.run.app`) → `RENDER_WORKER_URL`.
6. Kiểm tra: mở `<Service URL>/healthz` → `{"ok":true,...}`.

---

## Bước 3 — Khai báo biến môi trường trên Vercel

Vercel → Project → **Settings → Environment Variables** (Production + Preview), thêm:

| Biến | Giá trị |
|---|---|
| `R2_ACCOUNT_ID` | Account ID Cloudflare |
| `R2_ACCESS_KEY_ID` | Access Key ID của R2 token |
| `R2_SECRET_ACCESS_KEY` | Secret Access Key của R2 token |
| `R2_BUCKET` | `mck-media` |
| `R2_PUBLIC_URL` | `https://media.xenangmck.jp` (hoặc URL r2.dev khi test) |
| `RENDER_WORKER_URL` | Service URL của Cloud Run |
| `RENDER_WORKER_SECRET` | Chuỗi bí mật ở Bước 2.3 (giống `WORKER_SECRET` của worker) |

Rồi **Redeploy** bản production. Database đã có bảng `VideoRenderJob` (đã chạy `prisma db push`).

> **Bật đồng thời R2 và worker.** Nếu chỉ khai báo R2 mà chưa có worker, clip mới nằm trên R2 nhưng không render được (modal sẽ báo "worker render chưa được cấu hình").

---

## Bước 4 — Kiểm tra sau khi bật

1. Admin → sửa một xe → **Quản lý Hình ảnh** → tải 1 ảnh: ảnh hiện bình thường, URL bắt đầu bằng `R2_PUBLIC_URL`.
2. **AI Video Studio** → dòng hướng dẫn hiện "mỗi clip < 2GB" → tải 1 clip > 100MB (có hiện % tiến độ).
3. Viết kịch bản → **Tạo Video Lồng Tiếng AI** → modal hiện "Đang ghép clip & dựng video..." → khoảng 1–3 phút sau video MP4 hiện ra.
4. Cloud Run → service → **Logs**: thấy các dòng `Tải ... clip`, `FFmpeg: ...`, `Xong sau ...s`.

---

## AI Video Studio (dựng video nhiều cảnh)

Trang **Admin → AI Video Studio** (`/admin/studio`) dùng chung R2 + worker ở trên, không cần thêm biến môi trường mới:

- AI (Gemini) lên storyboard: chia cảnh, chọn ảnh/clip thật của xe, viết lời đọc và chữ trên màn hình.
- Mỗi cảnh có giọng đọc ElevenLabs riêng (lưu ở `projects/<id>/voice/` trên R2). Lời đọc không đổi thì không gọi lại ElevenLabs.
- Worker dựng timeline: ảnh có chuyển động zoom/lia, clip, thẻ chữ, chữ tiếng Việt trên màn hình. Video thành phẩm lưu ở `renders/projects/<id>/`.

**Khi cập nhật code cần:**

1. Đồng bộ DB: `npx prisma db push` (tạo bảng `VideoProject`, thêm `VideoRenderJob.projectId`, cho phép `VideoRenderJob.forkliftId` để trống).
2. **Deploy lại worker** (chạy lại lệnh `gcloud run deploy` ở Bước 2). Image mới cài thêm font `fonts-noto-core` để vẽ chữ tiếng Việt. Worker cũ không hiểu job timeline và sẽ trả lỗi `clips không hợp lệ`.
3. (Tùy chọn) `FONT_FILE` trên worker: đường dẫn font khác thay cho `/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf`.

---

## Chi phí ước tính

**Cloudflare R2** (lưu trữ $0.015/GB/tháng, 10GB đầu miễn phí, **không tính phí băng thông tải về**):
- Video thành phẩm ~30–60MB/video. Clip gốc quay điện thoại 100–300MB/clip là phần chiếm dung lượng chính.
- VD 80GB clip + video/tháng → ~$1/tháng, cộng dồn theo thời gian. Có thể thêm **Object lifecycle rule** trên R2 để tự xoá thư mục `raw-clips/` sau 60–90 ngày (video thành phẩm trong `renders/` và ảnh xe trong `forklifts/` không bị ảnh hưởng). Lưu ý: clip đã bị xoá thì không render lại từ clip đó được.

**Google Cloud Run** (`--no-cpu-throttling` tính tiền theo thời gian instance còn sống, kể cả lúc chờ):
- Mỗi lần render, instance chạy vài phút rồi có thể còn giữ tới ~15 phút trước khi tắt. Các video làm liền nhau dùng chung 1 instance.
- Free tier hằng tháng của Cloud Run (instance-based) đủ cho khoảng **100+ lần bật instance**. Thực tế 5 sales làm rải rác cả ngày: ước tính **$0–15/tháng** (trường hợp xấu nhất instance chạy gần như cả ngày làm việc: ~$25–30/tháng).
- Muốn giảm thêm: hạ `--cpu 1 --memory 1Gi` (render chậm hơn ~2 lần), hoặc chuyển sang gọi qua Cloud Tasks (trả tiền đúng thời gian render) — cần thêm tài khoản dịch vụ Google trên Vercel.

So với Cloudinary Plus $89/tháng, luồng mới rẻ hơn đáng kể và không giới hạn dung lượng mỗi file.

---

## Chạy thử worker trên máy (tuỳ chọn)

```bash
cd render-worker
docker build -t mck-render-worker:local .
docker run --rm -p 18080:8080 -e WORKER_SECRET=dev -e R2_ACCOUNT_ID=... -e R2_ACCESS_KEY_ID=... -e R2_SECRET_ACCESS_KEY=... -e R2_BUCKET=mck-media -e R2_PUBLIC_URL=https://... -e CALLBACK_URL_PREFIXES=http://host.docker.internal:3000/ mck-render-worker:local
```

Rồi đặt trong `.env.local` của web: `RENDER_WORKER_URL=http://localhost:18080`, `RENDER_WORKER_SECRET=dev`, `RENDER_CALLBACK_BASE_URL=http://host.docker.internal:3000` cùng các biến `R2_*`.
