Dưới đây là danh sách toàn bộ các dữ liệu tạm thời (dummy data) trong hệ thống ở Phase 1 để tạo hình giao diện. Cần chuẩn bị thông tin thật để thay thế:

### 1. Thông tin liên hệ cơ bản (Nằm trong file cấu hình ngôn ngữ)
* **Tên công ty:** Kyowa Forklift Vietnam
* **Địa chỉ:** Khu Công nghiệp ABC, Quận XYZ, TP. Hà Nội, Việt Nam
* **Hotline:** 0909.123.456
* **Email:** contact@kyowaforklift.vn
* *(Các thông tin này đang hiển thị ở phần Footer và Trang Liên hệ)*

### 2. Nội dung các trang tĩnh (Corporate Pages)
* **Trang Về chúng tôi (About Us):**
  * **Câu chuyện công ty:** "Kyowa Forklift được thành lập với sứ mệnh..."
  * **Tầm nhìn & Sứ mệnh:** Đang sử dụng các đoạn text mẫu chung chung về phát triển bền vững và cung cấp thiết bị công nghiệp.
* **Trang Chính sách (Policies):**
  * **Bảo hành:** Đang để là "từ 6 tháng đến 12 tháng".
  * **Giao nhận:** Đang ghi là "Miễn phí bán kính 50km (Miền Bắc) và 3-5 ngày (Miền Nam)".
  * **Đổi trả:** Đang để là "Cam kết hoàn tiền/đổi trả trong 7 ngày đầu tiên".
* **Trang Chủ (Homepage):**
  * **Hình nền (Hero Banner):** Đang dùng 1 bức ảnh chụp xe nâng ngẫu nhiên (chất lượng cao) lấy từ kho ảnh miễn phí Unsplash. 
  * **Các lý do chọn Kyowa:** "Chất lượng đảm bảo", "Giá cả cạnh tranh", "Hỗ trợ toàn diện" cùng mô tả ngắn bên dưới.
  * **Logo:** Đang dùng text cứng (`KYOWAFORKLIFT`). Nếu bạn có file ảnh Logo chính thức (.png hoặc .svg) thì chúng ta sẽ thay vào Navbar và Footer.

### 3. Cấu hình Kỹ thuật và Tích hợp
* **Google Maps (ở Footer):** Đang được trỏ mặc định về tọa độ chung của "Thành phố Hà Nội". Cần đường link bản đồ chính xác của kho/văn phòng.
* **Đường link tạo mã QR Code:** Đang sử dụng domain giả định `https://forklift.example.com/machine/[ID]`. Khi hệ thống có tên miền chính thức (ví dụ: `kyowaforklift.vn`), chúng ta sẽ cập nhật lại để mã QR quét ra đúng website thật.