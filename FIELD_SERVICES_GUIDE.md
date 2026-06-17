# Hướng Dẫn Quản Lý Dịch Vụ Đi Kèm - Field Services Management

## 📋 Tổng Quan Tính Năng
Chủ sân có thể quản lý các dịch vụ đi kèm (amenities) tại các sân của mình, chẳng hạn như:
- Bắt cá cứu cánh
- Nước ngọt/nước ấm
- Thuê áo
- Đồ uống lạnh
- Dây/bóng thay thế
- Mát-xa/xoa bóp
- v.v...

---

## 🛠️ Cài Đặt & Triển Khai

### 1. **Database Migration**
Chạy migration SQL để tạo bảng `field_services`:

```bash
cd backend
# Chạy file migration:
# src/migrations/20260617_field_services.sql
```

**Hoặc chạy SQL trực tiếp:**
```sql
CREATE TABLE `field_services` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `field_id` int(11) NOT NULL,
  `service_name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `price` decimal(10,2) NOT NULL,
  `quantity_available` int(11) DEFAULT 1,
  `unit` varchar(50) DEFAULT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_service_field` (`field_id`),
  CONSTRAINT `fk_service_field` FOREIGN KEY (`field_id`) REFERENCES `fields` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
```

### 2. **Backend Setup**
Các file đã được tạo/cập nhật:

- ✅ `src/controllers/serviceController.js` - Logic dịch vụ
- ✅ `src/routes/serviceRoutes.js` - API endpoints
- ✅ `index.js` - Đã thêm route integration

Không cần thêm thao tác, tất cả đã được cấu hình sẵn.

### 3. **Frontend Setup**
Các component đã được tạo:

- ✅ `src/components/owners/OwnerServices.jsx` - Form quản lý dịch vụ cho từng sân
- ✅ `src/components/owners/OwnerServicesList.jsx` - Danh sách tổng hợp dịch vụ
- ✅ `src/pages/owners/OwnerFieldDetail.jsx` - Đã tích hợp OwnerServices
- ✅ `src/pages/owners/OwnerDashboard.jsx` - Đã tích hợp OwnerServicesList

---

## 📱 Hướng Dẫn Sử Dụng

### Chủ Sân - Quản Lý Dịch Vụ

#### **Cách 1: Từ Dashboard (Tổng quát)**
1. Chủ sân đăng nhập vào Owner Dashboard
2. Cuộn xuống phần **"Dịch vụ của tôi"**
3. Xem danh sách tất cả dịch vụ của các sân
4. Nhấp vào icon Trash để xóa dịch vụ

#### **Cách 2: Từ Chi Tiết Sân (Chi tiết hơn)**
1. Dashboard → Chọn một sân → Click "Sửa" hoặc tên sân
2. Đi đến trang Chi tiết sân (OwnerFieldDetail)
3. Cuộn xuống phần **"Dịch vụ đi kèm"**
4. Click nút **"Thêm dịch vụ"** (màu xanh dương)

#### **Thêm Dịch Vụ Mới**
Form bao gồm các trường:

| Trường | Bắt buộc | Mô tả |
|--------|----------|--------|
| Tên dịch vụ | ✓ | Tên dịch vụ (VD: Bắt cá cứu cánh) |
| Mô tả | | Mô tả chi tiết về dịch vụ |
| Giá (VNĐ) | ✓ | Giá dịch vụ |
| Đơn vị | | Đơn vị tính (VD: cái, bộ, chai) |
| Số lượng có sẵn | | Mặc định = 1 |

#### **Chỉnh Sửa Dịch Vụ**
- Click icon Edit (bút chì xanh) trên dịch vụ
- Sửa các thông tin
- Click **"Lưu"** để cập nhật

#### **Xóa Dịch Vụ**
- Click icon Trash (thùng rác đỏ)
- Xác nhận xóa
- Dịch vụ bị xóa khỏi danh sách

---

## 🔌 API Endpoints

### Dành cho Mobile/Frontend

```
Base URL: http://localhost:3000/api/services
```

#### **1. Lấy danh sách dịch vụ của 1 sân**
```
GET /field/:fieldId

Response:
{
  "success": true,
  "services": [
    {
      "id": 1,
      "field_id": 5,
      "service_name": "Bắt cá cứu cánh",
      "description": "Bắt cá chuyên nghiệp",
      "price": 50000,
      "quantity_available": 3,
      "unit": "bộ",
      "status": "active",
      "created_at": "2026-06-17T10:00:00Z",
      "updated_at": "2026-06-17T10:00:00Z"
    }
  ]
}
```

#### **2. Tạo dịch vụ mới**
```
POST /
Content-Type: application/json

Request:
{
  "clerk_user_id": "user_123",
  "field_id": 5,
  "service_name": "Nước ngọt lạnh",
  "description": "Nước cam, cam chanh",
  "price": 15000,
  "quantity_available": 20,
  "unit": "chai"
}

Response:
{
  "success": true,
  "message": "Dịch vụ được tạo thành công.",
  "service": { ... }
}
```

#### **3. Cập nhật dịch vụ**
```
PUT /:id
Content-Type: application/json

Request:
{
  "clerk_user_id": "user_123",
  "service_name": "Nước ngọt lạnh",
  "price": 20000,
  "quantity_available": 25,
  "status": "active"
}

Response:
{
  "success": true,
  "message": "Dịch vụ được cập nhật thành công.",
  "service": { ... }
}
```

#### **4. Xóa dịch vụ**
```
DELETE /:id
Content-Type: application/json

Request:
{
  "clerk_user_id": "user_123"
}

Response:
{
  "success": true,
  "message": "Dịch vụ được xóa thành công."
}
```

#### **5. Lấy tất cả dịch vụ của chủ sân**
```
GET /owner/services/list?clerk_user_id=user_123

Response:
{
  "success": true,
  "services": [
    {
      "id": 1,
      "field_id": 5,
      "service_name": "Bắt cá cứu cánh",
      "price": 50000,
      "fields": {
        "id": 5,
        "field_name": "Sân Tuấn Phong"
      }
    }
  ]
}
```

---

## 🎨 Giao Diện Người Dùng

### Owner Dashboard
```
┌─────────────────────────────┐
│     Sân của tôi             │
│  [+ Thêm sân]              │
├─────────────────────────────┤
│ • Sân A  ⬜ [Sửa] [Xóa]    │
│ • Sân B  ⬜ [Sửa] [Xóa]    │
└─────────────────────────────┘

┌─────────────────────────────┐
│  🏷️ Dịch vụ của tôi         │
├─────────────────────────────┤
│ Bắt cá cứu cánh (Sân A)    │
│   50.000đ/bộ | Hoạt động  │
│   [Xóa]                    │
├─────────────────────────────┤
│ Nước ngọt lạnh (Sân B)     │
│   15.000đ/chai | Hoạt động│
│   [Xóa]                    │
└─────────────────────────────┘

┌──────────────────────────────┐
│  Yêu cầu đặt sân            │
│  [Bộ lọc...]               │
├──────────────────────────────┤
│ • Booking 1  [Xác nhận]    │
│ • Booking 2  [Xác nhận]    │
└──────────────────────────────┘
```

### Field Detail (Chi tiết sân)
```
┌──────────────────────────────┐
│  Sân Tuấn Phong             │
│  📍 Địa chỉ...             │
│  ⭐ 4.5 (25 đánh giá)      │
│  🕐 Còn 5 slot trống       │
└──────────────────────────────┘

┌──────────────────────────────┐
│  🏷️ Dịch vụ đi kèm          │
│         [+ Thêm dịch vụ]   │
├──────────────────────────────┤
│ Bắt cá cứu cánh             │
│ Bắt cá chuyên nghiệp        │
│ 50.000đ/bộ | Có sẵn: 3    │
│ [Sửa] [Xóa]                │
└──────────────────────────────┘

┌──────────────────────────────┐
│  📊 Đánh giá                 │
│  (Hiển thị các đánh giá)   │
└──────────────────────────────┘
```

---

## ⚠️ Quy Tắc & Hạn Chế

1. **Xác thực**: Chỉ chủ sân của bộ sân đó mới có thể quản lý dịch vụ
2. **Bắt buộc**: Tên dịch vụ và giá là bắt buộc
3. **Giá**: Phải >= 0
4. **Số lượng**: Phải >= 1
5. **Xóa**: Khi xóa sân, tất cả dịch vụ của sân đó cũng bị xóa

---

## 🔄 Workflow Tương Lai

### Các tính năng có thể mở rộng:

1. **Booking Services** - Cho phép khách hàng đặt dịch vụ kèm booking sân
   - Thêm bảng `booking_services` (liên kết booking + services)
   - Cập nhật total_price của booking

2. **Service Statistics** - Thống kê dịch vụ được đặt nhiều nhất

3. **Service Categories** - Phân loại dịch vụ (thức ăn, dụng cụ, v.v...)

4. **Service Availability** - Lập lịch khả dụng dịch vụ theo ngày/giờ

5. **Service Reviews** - Khách hàng đánh giá dịch vụ riêng

---

## 🐛 Khắc Phục Lỗi

### API trả về 401
```
❌ Lỗi: "Bạn không có quyền thực hiện hành động này."
✅ Giải pháp: Kiểm tra clerk_user_id có chính xác không
```

### API trả về 403
```
❌ Lỗi: "Sân này không thuộc về bạn."
✅ Giải pháp: Chỉ có thể quản lý dịch vụ của sân của mình
```

### API trả về 404
```
❌ Lỗi: "Dịch vụ không tồn tại."
✅ Giải pháp: Kiểm tra service ID có chính xác không
```

### Form không gửi được
```
❌ Lỗi: "Thông tin dịch vụ không đầy đủ"
✅ Giải pháp: Nhập đầy đủ tên dịch vụ (*) và giá (*)
```

---

## 📞 Hỗ Trợ

Nếu gặp vấn đề, kiểm tra:
1. ✅ Database migration đã chạy?
2. ✅ Backend server chạy ở port 3000?
3. ✅ Frontend chạy ở port 3001/5173?
4. ✅ Clerk authentication hoạt động?
5. ✅ Console log có lỗi gì không?

---

**Ngày tạo**: 2026-06-17  
**Phiên bản**: 1.0
