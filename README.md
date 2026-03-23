# Hệ thống Đặt Sân Bóng Đá

## Giới thiệu
Hệ thống đặt sân bóng đá là một ứng dụng web toàn diện cho phép khách hàng dễ dàng tìm kiếm và đặt sân bóng đá, đồng thời hỗ trợ chủ sở hữu sân quản lý và quảng bá cơ sở vật chất của mình.

## Mục tiêu đề tài

### Mục tiêu tổng quát
- Xây dựng một nền tảng trực tuyến tiện lợi cho việc đặt sân bóng đá, kết nối khách hàng với chủ sở hữu sân một cách hiệu quả.
- Tạo ra một hệ thống quản lý toàn diện cho cả khách hàng và chủ sở hữu sân.

### Mục tiêu cụ thể
1. **Đối với khách hàng:**
   - Cung cấp giao diện thân thiện để tìm kiếm và đặt sân bóng đá theo vị trí, thời gian và loại sân.
   - Cho phép xem chi tiết sân, đánh giá và nhận xét từ người dùng khác.
   - Hỗ trợ thanh toán trực tuyến an toàn và tiện lợi.
   - Quản lý lịch sử đặt sân và theo dõi trạng thái booking.

2. **Đối với chủ sở hữu sân:**
   - Cung cấp công cụ quản lý sân bóng đá hiệu quả.
   - Cho phép cập nhật thông tin sân, giá cả và hình ảnh.
   - Hỗ trợ quản lý đặt sân và giao tiếp với khách hàng.
   - Theo dõi doanh thu và thống kê sử dụng sân.

3. **Đối với hệ thống:**
   - Đảm bảo tính bảo mật và an toàn cho dữ liệu người dùng.
   - Xây dựng kiến trúc backend ổn định và scalable.
   - Tạo giao diện frontend responsive và dễ sử dụng.
   - Tích hợp các dịch vụ thanh toán và thông báo.

### Mục tiêu kỹ thuật
- Phát triển ứng dụng web full-stack với Node.js backend và React frontend.
- Sử dụng PostgreSQL làm cơ sở dữ liệu chính.
- Tích hợp Stripe cho thanh toán trực tuyến.
- Triển khai hệ thống upload hình ảnh và quản lý file.
- Đảm bảo responsive design cho các thiết bị di động.

## Tính năng chính

### Cho khách hàng:
- Đăng ký/đăng nhập tài khoản
- Tìm kiếm sân bóng đá theo vị trí, thời gian
- Xem chi tiết sân và đánh giá
- Đặt sân và thanh toán online
- Quản lý booking cá nhân
- Gửi tin nhắn cho chủ sở hữu
- Đánh giá và nhận xét sau khi sử dụng

### Cho chủ sở hữu:
- Đăng ký/đăng nhập tài khoản
- Quản lý thông tin sân bóng đá
- Xử lý yêu cầu đặt sân
- Giao tiếp với khách hàng qua tin nhắn
- Theo dõi doanh thu và thống kê
- Cập nhật hình ảnh và thông tin sân

## Cấu trúc dự án
```
football_booking/
├── backend/                 # Backend Node.js
│   ├── src/
│   │   ├── config/         # Cấu hình database, Stripe
│   │   ├── controllers/    # Logic xử lý API
│   │   ├── middleware/     # Middleware upload
│   │   └── routes/         # Định tuyến API
│   ├── uploads/            # Thư mục upload file
│   └── package.json
├── frontend/                # Frontend React + Vite
│   ├── src/
│   │   ├── components/     # Components React
│   │   ├── layouts/        # Layouts cho các role
│   │   ├── pages/          # Các trang ứng dụng
│   │   └── router/         # Router configuration
│   └── package.json
├── database.sql            # Schema database
└── README.md               # Tài liệu dự án
```

## Công nghệ sử dụng
- **Backend:** Node.js, Express.js
- **Frontend:** React, Vite
- **Database:** PostgreSQL
- **Authentication:** JWT
- **Payment:** Stripe
- **File Upload:** Multer
- **Styling:** CSS, Responsive Design

## Cài đặt và chạy

### Yêu cầu hệ thống
- Node.js (v16+)
- PostgreSQL
- npm hoặc yarn

### Cài đặt Backend
```bash
cd backend
npm install
# Cấu hình database trong src/config/db.js
npm start
```

### Cài đặt Frontend
```bash
cd frontend
npm install
npm run dev
```

### Cấu hình Database
- Import file `database.sql` vào PostgreSQL
- Cập nhật thông tin kết nối trong `backend/src/config/db.js`

## Đóng góp
Để đóng góp cho dự án, vui lòng tạo issue hoặc pull request trên repository.

## Giấy phép
Dự án này được phân phối dưới giấy phép MIT.