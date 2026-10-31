# 📋 MASTER TASK BRIEF (TỔNG HỢP NHANH)

> **Người lập:** 📝 Thư Ký Quy Hoạch & Ký Ức Sống (Lead Planner & Chronicler)  
> **Chủ nhân tối cao:** 👑 Master (Sếp)  
> **Ngày lập:** 31/10/2026 (Múi giờ: `Asia/Bangkok`)  
> **Tài liệu Kế Hoạch Kỹ Thuật Chi Tiết (SSOT):** 👉 [`docs/plans/2026-10-31_master_task_plan.md`](file:///e:/Project/admin_store/admin_orderlist/docs/plans/2026-10-31_master_task_plan.md)

---

## 🎯 TÓM TẮT 4 HẠNG MỤC CỐT LÕI ĐÃ CHỐT VỚI MASTER

1. **Mục 1 — URL Pagination Sync**:
   - Dùng Query Params (`?page=3`) cho `OrdersPage`, `PricingPage`, `WarehousePage`, `ReceiptsPage`, `ExternalImportsPage`.
   - Giữ nguyên query filter khác, F5 không mất trang, nút Back/Forward tự nhiên.

2. **Mục 2 — Ranh Giới Kho Hàng: Quản Lý Tài Khoản & Tag Biến Thể**:
   - Kho Hàng (`/warehouse`) chỉ quản lý cấp độ **Tài Khoản & Tag Biến Thể** (VD: Google One: `5TB`, `2TB`, `100GB`), **loại bỏ khái niệm Slot** khỏi Kho Hàng.
   - Slot chỉ nằm ở Gói Sản Phẩm (`/package-products`) để chia nhỏ và bán cho khách.

3. **Mục 3 — Sắp Xếp Tab Đơn Hết Hạn**:
   - Tab `tab === "expired"` sắp xếp: `ORDER BY expired_at DESC NULLS LAST, id DESC`.
   - Đơn mới vừa hết hạn hôm nay/hôm qua luôn đứng đầu Trang 1. Các tab khác giữ nguyên 100%.

4. **Mục 4 — Suffix Slot NCC ID + Webhook Money Out + Luôn Sinh Biên Lai (TRỌNG TÂM)**:
   - VietQR NCC gắn số tiền: `totalDebt - supplier.id`.
   - Webhook Tiền Ra tự động khớp `transferAmount + supplier.id == currentDebt` ➔ Tự động tất toán nợ, tiền nợ về 0 ₫ không cần bấm tay.
   - Khoản chênh `supplier.id` được hạch toán minh bạch vào allocation `SUPPLIER_SUFFIX_DISCOUNT` (Chiết khấu định danh NCC), đảm bảo `thực chi + chiết khấu = tổng nợ`, khớp từng đồng xu trong kế toán.
   - Luôn luôn sinh Biên Lai Tiền Ra (`payment_receipt`) và phân bổ minh bạch trên `/invoices` (cả khi Webhook tự chạy lẫn khi bấm nút thủ công).
   - Tái sử dụng `receiptId` của webhook, dùng khóa `forUpdate()` chống race condition, chỉ phát event sau khi commit.

---

*Xem chi tiết kế hoạch kỹ thuật, data model, contract hook, test matrix và checklist hành động tại [docs/plans/2026-10-31_master_task_plan.md](file:///e:/Project/admin_store/admin_orderlist/docs/plans/2026-10-31_master_task_plan.md).*
