# Kế hoạch Triển khai Hệ thống Quản lý Xe Nâng (2 Phases)

Dựa trên tài liệu yêu cầu nghiệp vụ "Requirement Specification Customer Confirmation v0.2", mục tiêu chính là số hóa dữ liệu từ file Excel, quản lý chi tiết tình trạng máy móc, và cung cấp trang thông tin chuyên nghiệp cho khách hàng.

Để đảm bảo dự án sớm đưa vào sử dụng và mang lại giá trị tức thì, hệ thống được đề xuất chia thành 2 giai đoạn (Phase). Phase 1 tập trung vào việc **thay thế Excel, số hóa dữ liệu cơ bản và cổng thông tin công khai (Public Portal)**. Phase 2 sẽ tập trung vào **số hóa quy trình vận hành sâu (Kiểm tra, Sửa chữa) và tối ưu bán hàng (CRM, Chi phí)**.

---

## 🚀 PHASE 1: Chức năng Core Cơ bản (Số hóa kho & Public Portal)
**Mục tiêu:** Cung cấp ngay một nền tảng tập trung để thay thế file Excel (TENDER LIST), giúp đội ngũ quản lý số hóa thông tin cốt lõi của xe nâng, đồng thời có ngay giao diện Web để gửi thông tin cho khách hàng (kèm QR Code).

### 1. Quản lý thông tin máy (Core CRUD)
* **Số hóa dữ liệu từ Excel:** Cho phép nhập/quản lý thông tin nhận diện (Mã nội bộ, Stock No., Serial/Chassis, Maker, Model, Year, Hour), Phân loại (Loại máy, nguồn nhiên liệu) và Thông số kỹ thuật (Mast, Max Load, Attachment...).
* **Hình ảnh & Tài liệu cơ bản:** Upload và quản lý album ảnh của máy, tài liệu đính kèm (cho phép thiết lập ảnh/tài liệu nào được hiển thị public).
* **Quản lý vị trí & trạng thái cơ bản:** Cập nhật vị trí kho và chuyển đổi các trạng thái vòng đời cơ bản (Draft -> Ready -> Published -> Sold).
* **Ghi nhận tình trạng (Basic):** Ở Phase 1, tình trạng máy có thể được quản lý dưới dạng các trường ghi chú hoặc danh sách chọn đơn giản (tương tự file Excel hiện tại) để tiết kiệm thời gian nhập liệu ban đầu.

### 2. Trang thông tin công khai (Public Portal) & Danh mục máy
* **Danh mục máy công khai:** Khách hàng có thể truy cập website để xem danh sách các máy đang ở trạng thái được phép bán ("Published"). Hỗ trợ bộ lọc (Maker, model, giờ hoạt động, tải trọng, vị trí, giá...).
* **Trang chi tiết máy:** Hiển thị thông tin công khai (Thông số, tình trạng, hình ảnh public, giá bán hoặc liên hệ). Mở toàn bộ thông tin xe và giá cho khách (theo yêu cầu 21).
* **Đa ngôn ngữ:** Hỗ trợ giao diện Tiếng Việt và Tiếng Anh.
* **Chia sẻ & QR Code:** Tự động sinh URL riêng và **QR Code** cho từng máy để dán trực tiếp lên xe nâng hoặc chia sẻ nhanh qua LINE/WhatsApp/Zalo.

### 3. Phân quyền và Người dùng (Cơ bản)
* Các vai trò sử dụng ban đầu: Administrator (Quản trị toàn quyền), Manager (Quản lý chung), Viewer.

---

## 🛠 PHASE 2: Chức năng Mở rộng (Vận hành & Bán hàng)
**Mục tiêu:** Hoàn thiện luồng quy trình nghiệp vụ chuyên sâu, bao gồm đánh giá chất lượng chi tiết (Inspection), theo dõi sửa chữa (Repair), tính toán chi phí/lợi nhuận thực tế và quản lý phễu bán hàng (Inquiry/Sales).

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

### 4. Quản lý Khách hàng & Bán hàng (CRM)
* **Tiếp nhận Inquiry:** Khách hàng có thể gửi form yêu cầu (Inquiry) trực tiếp từ trang chi tiết của một máy cụ thể. Inquiry tự động gắn link với máy đó.
* **Quản lý phễu Sales:** Theo dõi và cập nhật trạng thái xử lý Inquiry (New -> Contacted -> Negotiating -> Quoted -> Won/Lost).
* **Quản lý Bán hàng:** Chức năng Reserved (đánh dấu giữ chỗ), ghi nhận thông tin chốt sale (Sold), giá bán chốt, thông tin khách hàng, ngày bán và người phụ trách.

### 5. Dashboard, Lịch sử (Timeline) & Phân quyền nâng cao
* **Dashboard thống kê:** Báo cáo tổng quan số lượng tồn kho, giá trị inventory, phân bổ trạng thái (đang sửa, đang chờ bán, tồn lâu), số lượng inquiry chưa xử lý.
* **Timeline lịch sử máy:** Ghi nhận tự động vòng đời của từng máy (từ Purchase -> Received -> Inspection -> Repair -> Published -> Sold/Delivered) kèm người thao tác và thời gian nhằm tăng tính minh bạch.
* **Mở rộng Role người dùng:** Bổ sung các quyền chi tiết cho Sales, Inspector, Warehouse để đảm bảo tính an toàn dữ liệu và đúng chức năng nghiệp vụ.

---
> [!NOTE] 
> **Lợi ích của việc phân chia Phase:**
> - **Triển khai nhanh (Time-to-market):** Doanh nghiệp sớm có Web Portal và hệ thống thay thế Excel để Marketing và Sales làm việc (chỉ cần sinh mã QR và link).
> - **Giảm rủi ro đào tạo:** Giúp nhân viên kho và kinh doanh quen dần với việc nhập liệu trên hệ thống trước khi phải thực hiện các nghiệp vụ sâu hơn như tick checklist kiểm tra hay điền chi phí sửa chữa.
> - **Tối ưu nguồn lực:** Các nghiệp vụ phức tạp (Costing, Inspection Rule) được phát triển ở Phase 2 sẽ chuẩn xác hơn dựa trên trải nghiệm thực tế từ Phase 1.
