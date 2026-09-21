# Kế hoạch Triển khai Hệ thống Quản lý Xe Nâng (5 Phases)

Dựa trên tài liệu yêu cầu nghiệp vụ "Requirement Specification Customer Confirmation v0.2", mục tiêu chính là số hóa dữ liệu từ file Excel, quản lý chi tiết tình trạng máy móc, và cung cấp trang thông tin chuyên nghiệp cho khách hàng.

Để đảm bảo dự án sớm đưa vào sử dụng và mang lại giá trị tức thì, hệ thống được đề xuất chia thành 5 giai đoạn (Phase). 
- **Phase 1 (Hoàn thành):** Thay thế Excel, số hóa dữ liệu cơ bản và cổng thông tin công khai (Public Portal).
- **Phase 2 (Đang triển khai):** Số hóa quy trình vận hành sâu (Kiểm tra, Sửa chữa), tối ưu bán hàng (CRM, Chi phí) và Trợ lý Content, Báo giá.
- **Phase 3 (Kế hoạch mở rộng):** Các giải pháp nâng cấp & tối ưu bán hàng.
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

## 🛠 PHASE 2: Chức năng Mở rộng (Vận hành & Bán hàng)
**Mục tiêu:** Hoàn thiện luồng quy trình nghiệp vụ chuyên sâu, tính toán chi phí/lợi nhuận, tự động hóa marketing, xuất báo giá và quản lý phễu bán hàng.

### 1. Module Quản lý Tình trạng (Inspection)
* Áp dụng **Checklist kiểm tra chi tiết** theo từng hạng mục (Engine, Transmission, Hydraulic, Mast, Tire, Electrical, Body, Safety) và đánh giá mức độ (Good, Fair, Needs Repair, NG).
* Upload ảnh minh chứng cho từng lỗi (Damage, Leakage...) đính kèm ngay trong mục kiểm tra.
* **Ràng buộc quy trình:** Tích hợp quy tắc (theo mục 21) bắt buộc phải tiến hành Repair nếu kết quả Inspection phát hiện lỗi (NG) trước khi chuyển sang trạng thái "Published". Khách hàng có thể xem được toàn bộ inspection.

### 2. Module Quản lý Sửa chữa & Bảo dưỡng (Repair)
* Tạo danh sách task/hạng mục sửa chữa dựa trên kết quả Inspection.
* Ghi nhận nội dung sửa chữa, tiến độ, người/đơn vị phụ trách, ngày hoàn thành.
* Cập nhật hình ảnh Before/After (Trước và sau khi sửa) và ghi nhận lịch sử bảo dưỡng.

### 3. Quản lý Chi phí, Giá & Lợi nhuận (Costing)
* Tracking tổng hợp chi phí cấu thành: Giá mua (Goods price), phí vận chuyển, chi phí inspection, chi phí phụ tùng và sửa chữa.
* Hệ thống tự động tính toán **Tổng giá vốn**, và so sánh với Giá bán để ra **Lợi nhuận dự kiến / thực tế**. (Thông tin này bảo mật nội bộ, giới hạn quyền xem).

### 4. Quản lý Khách hàng & Giao dịch Bán hàng (CRM & Sales)
* **Tiếp nhận Inquiry:** Khách hàng có thể gửi form yêu cầu (Inquiry) trực tiếp từ trang chi tiết của một máy cụ thể. Inquiry tự động gắn link với máy đó.
* **Quản lý phễu Sales:** Theo dõi và cập nhật trạng thái xử lý Inquiry (New -> Contacted -> Negotiating -> Quoted -> Won/Lost).
* **Quản lý Giao dịch (Chốt đơn):** Chức năng Reserved (đánh dấu giữ chỗ), ghi nhận thông tin chốt sale (Sold), cập nhật hợp đồng, giá bán chốt, thông tin khách hàng chi tiết, ngày bán, và người phụ trách giao dịch.
* **Hệ thống Tự động Xuất và Gửi Báo giá (Instant PDF Quotation):** Khách hàng tự điền form nhận báo giá. Hệ thống tự động render file PDF chuyên nghiệp (có logo, chữ ký, thông số) và gửi trực tiếp qua Zalo/Email.

### 5. Dashboard, Lịch sử (Timeline) & Phân quyền nâng cao
* **Dashboard thống kê:** Báo cáo tổng quan số lượng tồn kho, giá trị inventory, phân bổ trạng thái (đang sửa, đang chờ bán, tồn lâu), số lượng inquiry chưa xử lý.
* **Timeline lịch sử máy:** Ghi nhận tự động vòng đời của từng máy (từ Purchase -> Received -> Inspection -> Repair -> Published -> Sold/Delivered) kèm người thao tác và thời gian nhằm tăng tính minh bạch.
* **Mở rộng Role người dùng:** Bổ sung các quyền chi tiết cho Sales, Inspector, Warehouse để đảm bảo tính an toàn dữ liệu và đúng chức năng nghiệp vụ.

### 6. Trợ lý Content & Tự động hóa Facebook (AI Social Media Manager)
* Sinh tự động bài viết Facebook chuẩn SEO bằng AI dựa trên thông số máy.
* Tính năng Auto-post đẩy thẳng bài đăng và hình ảnh lên Fanpage, tiết kiệm thời gian cho Marketing.

### 7. Tổng hợp Dữ liệu Kế toán (Export to MISA)
* **Bảng kê Tổng hợp Chi phí & Giá vốn:** Tự động gom toàn bộ các khoản chi liên quan đến 1 chiếc xe (Giá nhập, vận chuyển, sửa chữa) thành một bảng kê duy nhất.
* **Bảng kê Giao dịch Bán hàng:** Ghi nhận chính xác giá chốt bán, số tiền cọc (Deposit), số tiền còn lại phải thu.
* **Xuất Excel chuẩn định dạng MISA:** Tính năng xuất danh sách phát sinh chi phí/doanh thu ra file Excel với các cột tương thích sẵn template của MISA, kế toán chỉ việc import thẳng vào phần mềm.
* **Chốt số liệu & Khóa dữ liệu (Data Locking):** Trạng thái "Đã chuyển Kế toán" để khóa các giao dịch/chi phí, tránh bị sửa đổi làm lệch số với MISA.

---

## 📈 PHASE 3: Các Tính năng Nâng cấp & Tối ưu Bán hàng (Mở rộng)
**Mục tiêu:** Cung cấp các công cụ sắc bén giúp đội ngũ Sale tự động hóa công việc, tăng cường trải nghiệm người dùng và gia tăng tỷ lệ chuyển đổi.

### 1. Công cụ Tính toán Hiệu quả Đầu tư (ROI & Cost Calculator)
* Ứng dụng kéo-thả để so sánh chi phí nhiên liệu/vận hành (Xe Điện vs Xe Dầu).
* Tạo động lực mạnh mẽ để chốt sale bằng cách chứng minh số tiền khách hàng có thể tiết kiệm được.

### 2. Bản đồ Minh bạch Tình trạng Xe (Visual Condition Mapping)
* Sơ đồ 2D cho phép đánh dấu vị trí các bộ phận có sửa chữa, thay thế hoặc xước xát.
* Khách bấm vào các "chấm đỏ" trên bản đồ 2D để xem ảnh thực tế. Tăng uy tín và độ tin cậy.

### 3. Trợ lý Ảo Chọn Xe Thông Minh (AI "Find My Forklift" Wizard)
* Luồng khảo sát ngắn (Wizard) 3-4 câu hỏi đơn giản để phân loại nhu cầu khách hàng.
* Tự động đề xuất top 3 sản phẩm phù hợp nhất trong kho mà không cần hiểu biết kỹ thuật sâu.

### 4. Hồ sơ Quản lý Xe & Hậu mãi (Post-Sale Customer Portal)
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
