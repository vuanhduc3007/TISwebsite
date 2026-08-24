# HƯỚNG DẪN QUẢN TRỊ DỰ ÁN QUA MYSQL DATABASE

Tệp hướng dẫn giúp bạn tự **Thêm**, **Sửa**, **Xóa** dự án và **Album Ảnh** trong Database một cách dễ dàng và tiện lợi. Website sẽ tự động lấy dữ liệu từ MySQL và hiển thị chuẩn hóa layout.

---

## 1. THÊM DỰ ÁN MỚI (VÀ ALBUM ẢNH DỰ ÁN)

### Bước 1: Chèn thông tin dự án mới vào bảng `projects`
Lĩnh vực `pillar` nhận 1 trong 3 giá trị:
- `'it'`: Công nghệ thông tin
- `'me'`: Hệ thống cơ điện & HVAC
- `'renewable'`: Năng lượng tái tạo (Điện mặt trời)

```sql
INSERT INTO projects (
  name,
  client,
  pillar,
  location,
  contract_value_vnd,
  contract_date,
  date_display,
  is_highlight,
  sort_order,
  status
) VALUES (
  'Hệ thống Điện mặt trời Mái nhà Nhà máy May 10kWp',  -- Tên dự án
  'Công ty CP May 10',                                -- Khách hàng / Chủ đầu tư
  'renewable',                                        -- Lĩnh vực: 'it', 'me', hoặc 'renewable'
  'Hà Nội',                                           -- Địa điểm thi công
  1250000000,                                         -- Giá trị hợp đồng (VNĐ - chỉ điền số)
  '2025-10-15',                                       -- Ngày hợp đồng (YYYY-MM-DD)
  '10/2025',                                          -- Chuỗi hiển thị ngày (tùy chọn)
  0,                                                  -- Nổi bật: 1 = Nổi bật (khung to), 0 = Bình thường
  5,                                                  -- Thứ tự sắp xếp
  'published'                                         -- Trạng thái: 'published' hoặc 'draft'
);
```

### Bước 2: Thêm các hình ảnh vào Album của dự án vừa tạo
Dùng `LAST_INSERT_ID()` để tự động lấy ID của dự án vừa tạo ở Bước 1:

```sql
INSERT INTO project_images (project_id, image_url, caption, sort_order) VALUES
(LAST_INSERT_ID(), '/images/projects/may10-panels-01.jpg', 'Mảng pin mái nhà xưởng', 1),
(LAST_INSERT_ID(), '/images/projects/may10-inverter-02.jpg', 'Tủ inverter trung tâm', 2),
(LAST_INSERT_ID(), '/images/projects/may10-overall-03.jpg', 'Toàn cảnh nhà máy', 3);
```

---

## 2. CHỈNH SỬA THÔNG TIN DỰ ÁN

### Sửa thông tin dự án có sẵn (ví dụ ID = 3):
```sql
UPDATE projects
SET
  name = 'Trang bị thiết bị một cửa điện tử các xã',
  client = 'Ủy ban Nhân dân tỉnh Lào Cai',
  location = 'Lào Cai',
  contract_value_vnd = 25000000000,
  is_highlight = 1
WHERE id = 3;
```

### Ẩn bớt 1 dự án (chuyển sang trạng thái Nháp `draft`):
```sql
UPDATE projects SET status = 'draft' WHERE id = 2;
```

### Hiện lại dự án:
```sql
UPDATE projects SET status = 'published' WHERE id = 2;
```

---

## 3. XÓA DỰ ÁN (TỰ ĐỘNG XÓA TOÀN BỘ ALBUM ẢNH DỰ ÁN)

Bảng ảnh `project_images` đã được thiết lập `ON DELETE CASCADE`, do đó khi bạn xóa 1 dòng dự án ở bảng `projects`, **toàn bộ ảnh album đi kèm sẽ tự động xóa sạch** mà không để lại rác:

```sql
-- Xóa dự án có ID = 1 (Tự động xóa luôn các ảnh của ID = 1)
DELETE FROM projects WHERE id = 1;
```

---

## 4. XÓA HOẶC THÊM ẢNH LẺ TRONG ALBUM CỦA DỰ ÁN NÀO ĐÓ

### Thêm 1 ảnh mới vào dự án ID = 4:
```sql
INSERT INTO project_images (project_id, image_url, caption, sort_order)
VALUES (4, '/images/projects/photo-new.jpg', 'Hình ảnh mới bổ sung', 10);
```

### Xóa 1 ảnh cụ thể có `id` ảnh trong bảng `project_images`:
```sql
DELETE FROM project_images WHERE id = 5;
```

---

## 5. RE-INIT DATABASE NHANH QUA LỆNH NODE
Trong thư mục dự án, bạn cũng có thể mở Terminal và gõ:
```bash
npm run db:init
```
Lệnh này sẽ tự động đọc file `sql/schema.sql` và nạp lại toàn bộ cấu trúc & dữ liệu mẫu vào MySQL.
