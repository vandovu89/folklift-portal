# Kế hoạch Triển khai Hệ thống Quản lý Xe Nâng (5 Phases)

Dựa trên tài liệu yêu cầu nghiệp vụ "Requirement Specification Customer Confirmation v0.2", mục tiêu chính là số hóa dữ liệu từ file Excel, quản lý chi tiết tình trạng máy móc, và cung cấp trang thông tin chuyên nghiệp cho khách hàng.

Để đảm bảo dự án sớm đưa vào sử dụng và mang lại giá trị tức thì, hệ thống được đề xuất chia thành 5 giai đoạn (Phase). 
- **Phase 1 (Hoàn thành):** Thay thế Excel, số hóa dữ liệu cơ bản và cổng thông tin công khai (Public Portal).
- **Phase 2 (Hoàn thành):** Số hóa quy trình vận hành sâu (Kiểm tra, Sửa chữa), tối ưu bán hàng (CRM, Chi phí, Báo giá PDF) và Trợ lý Content, Video, Media & Mạng xã hội.
- **Phase 3 (Đang triển khai - mục 1–4 hoàn thành):** Các giải pháp nâng cấp & tối ưu bán hàng.
- **Phase 4 (Kế hoạch tương lai):** Hệ thống Tự học AI "Học có kiểm duyệt" (Human-in-the-loop).
- **Phase 5 (Kế hoạch tương lai):** Huấn luyện AI chuyên sâu để chốt sale (Fine-tuning).

---

## 🚀 PHASE 1: Chức năng Core Cơ bản (Số hóa kho & Public Portal)
**Mục tiêu:** Cung cấp ngay một nền tảng tập trung để thay thế file Excel (TENDER LIST), giúp đội ngũ quản lý số hóa thông tin cốt lõi của xe nâng, đồng thời có ngay giao diện Web để gửi thông tin cho khách hàng (kèm QR Code).

### 1. Quản lý thông tin máy (Core CRUD)
* **Số hóa dữ liệu từ Excel:** Cho phép nhập/quản lý thông tin nhận diện (Mã nội bộ, Stock No., Serial/Chassis, Maker, Model, Year, Hour), Phân loại (Loại máy, nguồn nhiên liệu) và Thông số kỹ thuật (Mast, Max Load, Attachment...). Bao gồm cả **Import Excel hàng loạt**, **Export Excel (bảo mật giá nhập)** và **Xóa hàng loạt (Bulk Delete)**.
* **Hình ảnh & Tài liệu cơ bản:** Upload và quản lý album ảnh của máy, tài liệu đính kèm (sử dụng Cloudinary).
* **Quản lý vị trí & trạng thái cơ bản:** Cập nhật vị trí kho và chuyển đổi các trạng thái vòng đời cơ bản (Draft -> Ready -> Published -> Sold).
* **Ghi nhận tình trạng (Basic):** Ở Phase 1, tình trạng máy có thể được quản lý dưới dạng các trường ghi chú hoặc danh sách chọn đơn giản.

### 2. Trang thông tin công khai (Public Portal) & Danh mục máy
* **Danh mục máy công khai:** Khách hàng có thể truy cập website để xem danh sách các máy đang ở trạng thái được phép bán ("Published"). Hỗ trợ bộ lọc (Maker, model, giờ hoạt động, tải trọng, vị trí, giá...).
* **Trang chi tiết máy:** Hiển thị thông tin công khai (Thông số, tình trạng, hình ảnh public, giá bán hoặc liên hệ). Mở toàn bộ thông tin xe và giá cho khách (theo yêu cầu 21).
* **Đa ngôn ngữ:** Hỗ trợ giao diện Tiếng Việt và Tiếng Anh.
* **Chia sẻ & QR Code:** Tự động sinh URL riêng và **QR Code** cho từng máy để dán trực tiếp lên xe nâng hoặc chia sẻ nhanh qua LINE/WhatsApp/Zalo.

### 3. Phân quyền và Người dùng (Cơ bản)
* Các vai trò sử dụng ban đầu: Administrator (Quản trị toàn quyền), đăng nhập bảo mật bằng JWT.

### 4. Tích hợp AI & Đa kênh (Triển khai thêm ngoài kế hoạch ban đầu)
* **AI Chatbot (Gemini AI):** Trợ lý ảo AI tự động chui vào Database tìm xe theo yêu cầu phức tạp của khách, tư vấn kỹ thuật và chốt thông tin liên hệ.
* **Tích hợp Facebook Messenger:** Tự động kết nối Fanpage, trả lời tin nhắn khách trên Facebook và đẩy thông tin (Inquiry) thẳng về Admin.
* **Quản lý Fanpage:** Cho phép Admin bật/tắt Bot và thiết lập lời chào (Greeting/Custom Context) cho từng Fanpage trực tiếp trên hệ thống.
* **Hạ tầng Cloud:** Triển khai theo kiến trúc Serverless hiện đại với **Vercel** và cơ sở dữ liệu **Supabase (PostgreSQL)** đảm bảo tốc độ cao và tối ưu chi phí.

---

## 🛠 PHASE 2: Số hóa Vận hành & Nâng cấp Trải nghiệm Khách hàng
**Mục tiêu:** Hoàn thiện luồng quy trình nghiệp vụ chuyên sâu, tính toán chi phí/lợi nhuận, tự động hóa marketing, xuất báo giá, phễu bán hàng và tích hợp mạng xã hội đa kênh.

### A. Quản trị Bán hàng & Chi phí (CRM & Costing)
* **1. Dashboard Chi phí & Tính toán Lợi nhuận (Costing):** 🟢 *Đã triển khai.* Tracking chi phí cấu thành (giá nhập, vận chuyển, sửa chữa, phụ tùng) và tự động tính Tổng giá vốn và Lợi nhuận dự kiến / thực tế (bảo mật nội bộ).
* **2. Quản lý 7 Trạng thái xe thông minh:** 🟢 *Đã triển khai.* Hỗ trợ các trạng thái vòng đời chi tiết: Nhật Bản, Đang rút Container, Đang kiểm tra/sửa chữa, Sẵn sàng bán, Đã cọc/giữ chỗ, Đã bán, Đã xuất kho.
* **3. Tự động hóa Quản lý Nguồn Nhập & Mã Nội Bộ:** 🟢 *Đã triển khai.* Quản lý danh mục nguồn mua (Yahoo Auction, Đại lý Nhật...), tự động sinh và kiểm soát mã nội bộ.
* **4. Hệ thống tự động hóa Chính sách Đặc quyền & Bảo hành:** 🟢 *Đã triển khai.* Áp dụng chính sách bảo hành 3 tháng riêng cho Ắc quy / Bo mạch xe nâng điện, cam kết dung lượng bình >80%.
* **5. CRM: Phễu khách hàng & Quản lý Giao dịch (Chốt đơn):** 🟢 *Đã triển khai.* Quản lý Inquiry theo phễu (New -> Contacted -> Negotiating -> Quoted -> Won/Lost), gắn link xe nâng cụ thể, ghi nhận thông tin chốt bán, ngày bán, giá bán thực tế.
* **6. Phân quyền User chi tiết:** 🟢 *Đã triển khai.* Quản lý người dùng với các vai trò phân quyền bảo mật (Admin, Sales, Viewer), bảo vệ giá nhập và dữ liệu nhạy cảm.
* **7. Hệ thống Tự động Xuất và Gửi Báo giá (Instant PDF Quotation):** 🟢 *Đã triển khai.* Khách hàng hoặc Sale tạo báo giá nhanh. Hệ thống tự động sinh báo giá chuẩn A4/PDF chuyên nghiệp (logo công ty, hình ảnh xe, thông số kỹ thuật, bảng giá, con dấu và cam kết bảo hành) để in hoặc tải về gửi khách hàng.
* **8. Tổng hợp Dữ liệu Kế toán (Export to MISA):** 🟢 *Đã triển khai.* Bảng kê tổng hợp chi phí giá vốn, bảng kê bán hàng, xuất file Excel chuẩn template MISA và cơ chế khóa dữ liệu kế toán.

### B. Tích hợp Mạng Xã Hội & Đa Phương Tiện (Social Network & Media)
* **7. Trợ lý Content & Tự động hóa Facebook (AI Social Media Manager):** 🟢 *Đã triển khai.* Sinh bài viết chuẩn SEO và đăng bài tự động lên Fanpage Facebook trực tiếp từ dữ liệu xe.
* **8. Trang "Góc Khách Hàng": Hình ảnh bàn giao & Đánh giá (Testimonials):** 🟢 *Đã triển khai.* Mục hình ảnh bàn giao xe tại kho/xưởng cho các doanh nghiệp đối tác kèm đánh giá thực tế trên website và trang quản trị riêng, gia tăng uy tín và tỷ lệ chốt sale.
* **9. Video Review: Gắn Link YouTube/TikTok chạy trực tiếp trên từng xe:** 🟢 *Đã triển khai.* Nhúng video vận hành thực tế (YouTube/TikTok Shorts/Reels) ngay trên trang chi tiết xe để khách xem khả năng nâng hạ thực tế.
* **10. AI Video: Bot tự động đề xuất video YouTube/TikTok khi tư vấn:** 🟢 *Đã triển khai.* Khi khách hỏi bot tư vấn về xe hoặc muốn xem video máy chạy thực tế, AI Bot tự động gửi link/video YouTube/TikTok của xe đó cho khách.
* **11. Thư viện Truyền thông: Chuyên mục Video bàn giao xe / kho bãi (Media Gallery):** 🟢 *Đã triển khai.* Trang tổng hợp video chuyên nghiệp về kho bãi, xe mới về, quy trình test tải xe nâng Nhật Bản, kèm trang Admin quản lý.
* **12. Floating Social Buttons: Nút liên hệ nhanh qua đa nền tảng:** 🟢 *Đã triển khai.* Bộ nút floating liên hệ đa kênh nổi bật góc màn hình (Gọi Hotline nhanh với hiệu ứng rung chuông, Zalo, Facebook Messenger, xem YouTube/TikTok).
* **13. Trợ lý Sản xuất Video Tự động bằng AI (AI Video Sales Assistant):** 🟢 *Đã triển khai.* Tự động sinh kịch bản review xe bằng AI, quản lý render video và gắn làm video review chính thức cho xe.

---

## 📈 PHASE 3: Các Tính năng Nâng cấp & Tối ưu Bán hàng (Mở rộng)
**Mục tiêu:** Cung cấp các công cụ sắc bén giúp đội ngũ Sale tự động hóa công việc, tăng cường trải nghiệm người dùng và gia tăng tỷ lệ chuyển đổi.

### 1. Công cụ Tính toán Hiệu quả Đầu tư (ROI & Cost Calculator) 🟢 *Đã triển khai*
* Ứng dụng kéo-thả để so sánh chi phí nhiên liệu/vận hành (Xe Điện vs Xe Dầu).
* Tạo động lực mạnh mẽ để chốt sale bằng cách chứng minh số tiền khách hàng có thể tiết kiệm được.

### 2. Bản đồ Minh bạch Tình trạng Xe (Visual Condition Mapping) 🟢 *Đã triển khai*
* Sơ đồ 2D cho phép đánh dấu vị trí các bộ phận có sửa chữa, thay thế hoặc xước xát.
* Khách bấm vào các "chấm đỏ" trên bản đồ 2D để xem ảnh thực tế. Tăng uy tín và độ tin cậy.

### 3. Trợ lý Ảo Chọn Xe Thông Minh (AI "Find My Forklift" Wizard) 🟢 *Đã triển khai*
* Luồng khảo sát ngắn (Wizard) 3-4 câu hỏi đơn giản để phân loại nhu cầu khách hàng.
* Tự động đề xuất top 3 sản phẩm phù hợp nhất trong kho mà không cần hiểu biết kỹ thuật sâu.

### 4. Hồ sơ Quản lý Xe & Hậu mãi (Post-Sale Customer Portal) 🟢 *Đã triển khai*
* Cấp tài khoản cho khách hàng quản lý xe đã mua.
* Nhắc lịch bảo dưỡng định kỳ và cung cấp nút "Gọi thợ bảo dưỡng/Mua phụ tùng" trực tiếp.

### 5. Trải nghiệm Nghe - Nhìn Sống động (Video & Engine Sound)
* Tích hợp kho video xoay quanh xe và clip âm thanh nổ máy thực tế.
* Đánh mạnh vào tâm lý khách hàng B2B, giúp thợ máy dễ dàng phán đoán độ chất của xe.

### 6. Chế độ Xem Xe Thực tế Ảo (WebAR)
* Sử dụng WebAR để hiển thị xe nâng tỷ lệ 1:1 trong không gian thực qua camera điện thoại.

---

## 🧠 PHASE 4: Hệ thống Tự học AI "Học có kiểm duyệt" (Human-in-the-loop)
**Mục tiêu:** Kiểm soát và liên tục nạp kiến thức mới cho AI để nó thông minh lên mỗi ngày.

### 1. Giám sát & Đánh giá
* Giao diện cho phép Admin xem lại lịch sử chat để rút kinh nghiệm và đánh giá chất lượng tư vấn của Bot.
### 2. Ngân hàng Kiến thức (FAQ)
* Tính năng nạp kiến thức chuẩn, lưu trữ các câu hỏi thường gặp để Bot dùng làm tài liệu tham khảo (RAG).
### 3. Cập nhật kịch bản (Prompt Tuning)
* Cho phép Admin tùy biến "Giọng điệu", "Chính sách công ty" và "Quy tắc báo giá" trực tiếp từ giao diện Cài đặt (Settings) mà không cần can thiệp code.

---

## 🤖 PHASE 5: Huấn luyện AI Chuyên sâu (Fine-tuning)
**Mục tiêu:** Nâng cấp AI từ một "Trợ lý cung cấp thông tin" thành một "Chuyên gia Chốt Sale" mang bản sắc riêng của doanh nghiệp.

* **Huấn luyện mô hình tinh chỉnh (Fine-tuning):** Thu thập và đóng gói từ 1.000 đến 5.000 đoạn hội thoại tư vấn và chốt sale xuất sắc nhất trong quá khứ.
* **Cá nhân hóa tư duy Sale:** Huấn luyện (train) mô hình AI riêng để Bot học được 100% văn phong, cách xử lý từ chối, cách báo giá khéo léo và kỹ năng chốt đơn của những nhân sự xuất sắc nhất công ty.
* **Tự động hóa toàn diện:** Ở Phase này, hệ thống sẽ gần như tự vận hành khâu chăm sóc khách hàng ban đầu với tỷ lệ chuyển đổi cao nhất mà không cần con người can thiệp.

---
> [!NOTE] 
> **Lợi ích của việc phân chia Phase:**
> - **Triển khai nhanh (Time-to-market):** Doanh nghiệp sớm có Web Portal và hệ thống thay thế Excel để Marketing và Sales làm việc (chỉ cần sinh mã QR và link).
> - **Giảm rủi ro đào tạo:** Giúp nhân viên kho và kinh doanh quen dần với việc nhập liệu trên hệ thống trước khi phải thực hiện các nghiệp vụ sâu hơn như tick checklist kiểm tra hay điền chi phí sửa chữa.
> - **Tối ưu nguồn lực:** Các nghiệp vụ phức tạp (Costing, Inspection Rule) được phát triển ở Phase 2 sẽ chuẩn xác hơn dựa trên trải nghiệm thực tế từ Phase 1.
