# Báo Cáo Nghiệm Thu: Dọn Dẹp Trùng Lặp Cấu Hình Hạn Dùng Trên Giao Diện SystemPage

- **Ngày thực hiện:** 2026-11-04 (Múi giờ: `Asia/Bangkok`)
- **Tác vụ:** Loại bỏ Box cấu hình rút gọn cũ ("Cảnh Báo Hết Hạn Đơn Hàng (Rút Gọn)") tại Tab "Cấu Hình Vận Hành & Giá", gom toàn bộ cấu hình hạn dùng và thông báo nhắc hạn (Đơn 0 ngày & Đơn N ngày) về một nguồn sự thật duy nhất (SSOT) tại Tab "Hạn Dùng & Cảnh Báo Đơn".
- **Trạng thái nghiệm thu:** ĐÃ HOÀN TẤT & ĐÃ TRIỂN KHAI THÀNH CÔNG LÊN VPS (PASSED 100%)

---

## 1. Phạm Vi Thay Đổi

1. **Mã nguồn Frontend (`frontend/src/pages/SystemPage.tsx`)**:
   - Xóa bỏ form nhập liệu rút gọn cũ chứa 2 trường `RENEWAL_WARN_DAYS` và `RENEWAL_NOTIFICATION_TIME` trong Tab `general`.
   - Thay thế bằng một **Card Điều Hướng (Navigation Banner)** trực quan mang huy hiệu `ĐÃ TÁCH RIÊNG`, kèm nút bấm *"Chuyển Sang Tab Hạn Dùng & Cảnh Báo Đơn"* trỏ trực tiếp sang `setActiveTab("expiry_alerts")`.
   - Giữ nguyên vẹn 100% logic cấu hình tại Tab chuyên biệt **"Hạn Dùng & Cảnh Báo Đơn"** (`expiry_alerts`), bao gồm:
     - Thẻ 1: Đơn Hết Hạn Hôm Nay (0 Ngày) — Toggle Bật/Tắt, Giờ phát thông báo (`ZERO_DAYS_NOTIFICATION_TIME`), Topic ID, Nút test.
     - Thẻ 2: Đơn Cận Hạn Cần Gia Hạn (N Ngày) — Số ngày cảnh báo (`RENEWAL_WARN_DAYS`), Giờ phát thông báo (`RENEWAL_NOTIFICATION_TIME`), Topic ID, Nút test.
     - Thẻ 3: Quét cập nhật trạng thái Database lúc 00:00 đêm ngầm.

---

## 2. Kết Quả Kiểm Thử & Triển Khai (Verification & Rollout)

1. **Kiểm tra an toàn dữ liệu Master**:
   - 3 file code Master đang làm dở (`orderService.js`, `OrderCreateEditModal.tsx`, `types.ts`) được bảo vệ nguyên vẹn 100% qua Git stash/pop.
2. **Build Frontend**:
   - Chạy `npm run build:frontend`: Hoàn tất không lỗi TypeScript hay bundle trong 10.63s.
3. **Triển khai VPS Production**:
   - Fast-forward commit `215964ba` lên nhánh `main` trên VPS.
   - Rebuild Docker image `admin_orderlist-frontend` và recreate container thành công.
   - Cả 2 dịch vụ `admin_orderlist-frontend` và `admin_orderlist-backend` đều đang chạy ở trạng thái `healthy`.

---

## 3. Kết Luận

- Triệt tiêu hoàn toàn sự cố hiển thị 2 form trùng lặp gây rối mắt.
- Giao diện đạt chuẩn **Single Source of Truth (SSOT)**: Một nơi duy nhất để cấu hình chu kỳ hạn dùng đơn hàng.

