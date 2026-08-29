# Tài liệu Định nghĩa Yêu cầu (Requirement Definition)
**Dự án:** Hệ thống Quản lý Máy móc Cũ & Bán hàng (Forklift Portal)

---

## 1. Tổng quan & Mục tiêu
**1.1. Mục đích tài liệu**
Tài liệu dùng để xác nhận phạm vi và yêu cầu nghiệp vụ trước khi triển khai hệ thống. Tập trung vào hệ thống cần làm gì, dữ liệu cần quản lý, quy trình cần hỗ trợ và thông tin cần hiển thị.

**1.2. Mục tiêu hệ thống**
- Quản lý tập trung thông tin từng máy móc/xe nâng đã qua sử dụng thay cho việc phụ thuộc vào Excel (Dữ liệu mẫu: File TENDER LIST_20260807.xlsx).
- Quản lý chi tiết thông tin máy theo từng chủng loại với thông số kỹ thuật phù hợp.
- Quản lý tình trạng, quá trình kiểm tra (inspection), sửa chữa (repair), hình ảnh, lịch sử và vị trí/trạng thái từ lúc nhập hàng đến khi giao hàng.
- Quản lý thông tin chi phí cấu thành, giá bán, và tình hình kinh doanh.
- Tự động tạo trang thông tin sản phẩm chuyên nghiệp để chia sẻ cho khách hàng.
- Tăng tính minh bạch, dễ kiểm soát và khả năng truy xuất vòng đời (Timeline) của từng máy.

---

## 2. Người dùng & Quyền nghiệp vụ (Roles)
1. **Administrator:** Quản lý toàn bộ dữ liệu hệ thống, phân quyền và cấu hình nghiệp vụ.
2. **Manager:** Theo dõi và quản lý tổng thể kho (inventory), inspection, repair, cost, sales. Có quyền duyệt các nghiệp vụ cần kiểm soát.
3. **Sales:** Xem danh sách máy, quản lý bán hàng, khách hàng, inquiry, tạo báo giá (quotation) và giữ chỗ (reservation).
4. **Inspector:** Thực hiện kiểm tra (inspection), cập nhật tình trạng lỗi và tải ảnh minh chứng.
5. **Warehouse:** Quản lý vị trí vật lý của máy, nhập/xuất và cập nhật trạng thái kho.
6. **Viewer:** Xem các dữ liệu nội bộ được cấp quyền (không có quyền chỉnh sửa/xóa).

---

## 3. Yêu cầu Chức năng (Functional Requirements)

Hệ thống được chia thành 2 Phase triển khai để số hóa nhanh quy trình hiện tại (thay thế Excel) và mở rộng quản lý vận hành chuyên sâu sau đó.

### 3.1. Phase 1: Core & Public Portal (Số hóa Kho & Cổng Khách hàng)

**FR1. Quản lý thông tin máy (Core CRUD)**
- **Thông tin nhận diện:** Mã máy nội bộ, Stock No., Serial No./Chassis No., Nhà sản xuất (Toyota, Komatsu...), Model, Năm sản xuất, Giờ hoạt động.
- **Phân loại:** Chủng loại máy, Loại/kiểu máy (Counter, Reach...), Nguồn động lực/nhiên liệu (Battery, Diesel, Gasoline), Nhóm sản phẩm.
- **Thông số kỹ thuật:** Mast, Lift Height / Max View, Load Capacity / Max Load, Attachment, Fork Length, Kích thước tổng thể, Trọng lượng và các thông số khác tùy chủng loại.
- **Thông tin nguồn hàng:** Nguồn mua (Tender/Auction), URL nguồn, Offer Deadline, Ngày mua, Thông tin nhà cung cấp/đối tác.
- **Quản lý vị trí:** Ghi nhận khu vực/quốc gia, tỉnh/thành phố, Kho/Yard, khu vực trong kho, vị trí cụ thể và lịch sử thay đổi vị trí.
- **Quản lý trạng thái:** Luân chuyển vòng đời máy qua các trạng thái: `Draft` (chưa hoàn thiện) → `Incoming` (đã mua chờ về) → `Received` (đã nhận) → `Inspection` (đang kiểm tra) → `Repair` (đang sửa) → `Ready` (sẵn sàng bán) → `Published` (công khai bán) → `Negotiating` (đang đàm phán) → `Reserved` (đã giữ chỗ) → `Sold` (đã bán) → `Delivered` (đã giao) / `Hold` (tạm dừng) / `Cancelled` (hủy).

**FR2. Quản lý Hình ảnh & Tài liệu**
- Mỗi máy có thư viện hình ảnh và tài liệu riêng biệt.
- **Phân loại nhóm ảnh:** Ảnh tổng thể (Front, Rear, Left, Right), Ảnh kỹ thuật (Engine, Mast, Fork, Tire, Battery...), Ảnh tình trạng (Damage, Leakage, Wear...), Ảnh Inspection, Ảnh Before/After khi sửa.
- **Tài liệu đính kèm:** Inspection Report, Invoice, Auction/Tender doc, Maintenance record...
- Cấp quyền cấu hình (Flag): Đánh dấu cho phép hình ảnh/tài liệu nào được hiển thị công khai cho khách hàng.

**FR3. Trang Thông tin Sản phẩm Khách hàng (Public Portal)**
- **Danh mục máy công khai:** Khách hàng xem danh sách máy đang ở trạng thái `Published`. Hỗ trợ Tìm kiếm (Mã máy, Maker, Model) và Lọc/Sắp xếp (Loại, nhiên liệu, năm, tải trọng, vị trí, giá).
- **Trang chi tiết máy:** Hiển thị công khai thông số kỹ thuật, hình ảnh cho phép, giá bán, thông tin nhà sản xuất, năm, giờ hoạt động, tình trạng máy tổng quan và thông tin liên hệ của doanh nghiệp. (Mở hết thông tin xe và giá theo yêu cầu khách hàng).
- **Phân loại Dữ liệu Ẩn:** Các thông tin tuyệt đối KHÔNG hiển thị ra Public bao gồm: Giá mua, Chi phí sửa chữa chi tiết, Tổng giá vốn, Lợi nhuận/Margin, Ghi chú nội bộ.
- **Hỗ trợ Đa ngôn ngữ:** Cung cấp cả giao diện Tiếng Việt và Tiếng Anh.

**FR4. Tiện ích Tiếp cận & Chia sẻ**
- Tự động sinh URL riêng biệt cho từng máy (Copy link dễ dàng).
- **QR Code:** Tự động tạo mã QR riêng cho từng máy để có thể in và dán trực tiếp lên xe nâng hoặc chia sẻ qua các kênh như LINE, WhatsApp.

---

### 3.2. Phase 2: Vận hành, Chi phí & Quản lý Bán hàng (CRM)

**FR5. Quản lý Tình trạng chi tiết (Inspection Module)**
- Checklist kiểm tra chi tiết theo từng chủng loại máy. Lưu vết ngày giờ và nhân sự thực hiện (Inspector).
- **Hạng mục kiểm tra:** Engine (tình trạng, khởi động, rò rỉ), Transmission (vận hành), Hydraulic (nâng/hạ, rò rỉ), Mast (chain, fork, attachment), Tire, Electrical/Battery, Body (trầy xước, móp), Safety.
- **Mức đánh giá:** `Good`, `Fair`, `Needs Repair`, `NG`, `Unknown`.
- Hỗ trợ đính kèm ảnh chụp trực tiếp vào từng hạng mục lỗi. Báo cáo tổng hợp inspection report (Summary có thể public).

**FR6. Quản lý Sửa chữa & Bảo dưỡng (Repair Module)**
- Khởi tạo danh sách các hạng mục cần sửa chữa trực tiếp từ kết quả Inspection (các lỗi NG/Needs Repair).
- Ghi nhận chi tiết: Nội dung sửa chữa, Mức độ ưu tiên, Người/đơn vị phụ trách, Ngày bắt đầu/hoàn thành, Trạng thái sửa, Phụ tùng sử dụng, Chi phí.
- Quản lý ảnh Before & After cho từng hạng mục sửa.

**FR7. Quản lý Chi phí & Tính lợi nhuận (Costing)**
- Ghi nhận và cộng dồn các loại chi phí phát sinh: Giá mua (Goods Price), phí Auction/Tender, phí vận chuyển, phí kiểm tra, phí phụ tùng & sửa chữa, các loại phí khác.
- Hệ thống tự động tổng hợp **Tổng giá vốn**.
- Quản lý Giá bán đề xuất (Asking Price), Giá bán thực tế (khi chốt). Từ đó tính toán tự động **Lợi nhuận dự kiến** và **Lợi nhuận thực tế**. (Chỉ giới hạn cho Admin/Manager).

**FR8. Quản lý Khách hàng & Bán hàng (CRM Module)**
- **Khách hàng:** Quản lý danh bạ Tên công ty, Người liên hệ, Email, Số điện thoại, ID LINE/WhatsApp.
- **Inquiry:** Khách hàng gửi yêu cầu trực tiếp trên trang Public của một chiếc máy. Inquiry này được tự động liên kết (link) với máy đó. Ghi nhận thời gian, nội dung, thông tin liên hệ.
- **Trạng thái Inquiry:** `New` → `Contacted` → `Negotiating` → `Quoted` → `Won` / `Lost`. Có khu vực lưu lịch sử trao đổi.
- **Nghiệp vụ Sales:** Hỗ trợ tạo báo giá (Quotation), cập nhật giá chốt/điều kiện, đánh dấu Giữ chỗ (Reservation) để chặn khách khác, và hoàn tất Bán (Sold).

**FR9. Dashboard Thống kê**
- Tổng quan kho: Tổng số lượng máy, số máy phân theo Trạng thái / Chủng loại / Nhà sản xuất / Vị trí.
- Tracking tiến độ: Danh sách máy đang sửa, đang kiểm tra, sẵn sàng bán, đang public, tồn kho quá lâu.
- Tracking Sale: Lượng inquiry chưa xử lý, tổng giá trị Inventory.

**FR10. Lịch sử Thay đổi và Vòng đời máy (Timeline & Audit Log)**
- **Timeline Sự kiện vòng đời:** Purchase, Received, Inspection, Repair, Location Change, Published, Inquiry, Price Change, Reserved, Sold, Delivered.
- **Audit Log:** Bắt buộc ghi nhận người thao tác, thời gian, lưu lại giá trị Cũ và Mới của các trường dữ liệu nhạy cảm (Status, Location, Condition, Inspection, Price, Cost, Customer). Không cho phép sửa xóa dữ liệu lịch sử nếu không có quyền cao nhất.

---

## 4. Các Quy tắc Nghiệp vụ Đặc thù (Business Rules)
*Dựa trên nội dung thống nhất ở phần 21:*
1. **Quy tắc Kiểm định:** 
   - Bắt buộc phải có kết quả Inspection thì máy mới được phép chuyển sang trạng thái Published.
   - Checklist thay đổi hoặc giống nhau theo từng Category máy (sẽ cấu hình).
2. **Quy tắc Sửa chữa:**
   - Nếu kết quả Inspection phát hiện ra hạng mục lỗi nặng (NG), **BẮT BUỘC** phải tiến hành Sửa chữa (Repair) trước khi được chuyển sang trạng thái Published.
3. **Quy tắc Công khai thông tin (Public Web):**
   - Giá bán công khai trên web.
   - Tình trạng tổng thể theo mức đánh giá (`Good`/`Fair`/`Needs Repair`/`NG`) được công khai.
   - Khách hàng được xem toàn bộ thông tin xe, giá và Summary Report (Inspection & Repair nếu được phép).
4. **Quy tắc Bán hàng:**
   - Một máy vẫn có thể tiếp nhận nhiều Inquiry từ nhiều khách hàng khác nhau cho đến khi máy chuyển sang trạng thái Reserved hoặc Sold.
5. **Nằm NGOÀI phạm vi:** 
   - Không cần quản lý bảo hành.
   - Không cần quản lý hóa đơn (Invoice/Accounting), chỉ quản lý ở mức độ ghi nhận Sales thông tin.
   - Không hỗ trợ đa tiền tệ (Multi-currency).
   - Không tích hợp tự động (crawler) với hệ thống Tender/Auction khác bên ngoài.
