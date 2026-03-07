# Mục lục tài liệu

Tài liệu dự án gom theo nhóm. File đã gộp: dùng ít file hơn, dễ tìm.

---

## Nghiệp vụ & luồng

| File | Mô tả |
|------|--------|
| [BUSINESS_RULES.md](./BUSINESS_RULES.md) | Rule nghiệp vụ: đơn hàng, sản phẩm, NCC, hoàn tiền, unique, v.v. |
| [orders_merge_single_table.md](./orders_merge_single_table.md) | Gom 3 bảng đơn → 1 bảng `order_list`, thiết kế và migration. |
| [ORDER_STATUS_FLOW.md](./ORDER_STATUS_FLOW.md) | Luồng trạng thái đơn: UNPAID → PAID → EXPIRED, renewal, refund. |
| [order-tables.md](./order-tables.md) | Mô tả bảng đơn (order_list, cột, schema). |
| [WEBHOOK_FLOW_EXPLAINED.md](./WEBHOOK_FLOW_EXPLAINED.md) | Luồng webhook thanh toán, renewal, cập nhật đơn. |

---

## Tối ưu & cải thiện (đã gộp)

| File | Mô tả |
|------|--------|
| [OPTIMIZATION.md](./OPTIMIZATION.md) | **Gộp**: tóm tắt, ưu tiên, tiến độ, roadmap tối ưu (DB, validation, refactor, logging, transaction). |
| [IMPROVEMENTS.md](./IMPROVEMENTS.md) | **Gộp**: tổng kết và tiến độ các cải thiện đã làm (bảo mật, logging, frontend, v.v.). |

---

## Kỹ thuật & audit

| File | Mô tả |
|------|--------|
| [API.md](./API.md) | Mô tả API endpoints. |
| [db-type-refactor.md](./db-type-refactor.md) | Refactor kiểu dữ liệu DB (date, numeric, v.v.). |
| [TRANSACTION_AUDIT.md](./TRANSACTION_AUDIT.md) | Audit transaction, vớiTransaction, webhook. |
| [VALIDATION_AUDIT.md](./VALIDATION_AUDIT.md) | Audit validation, middleware. |

---

## Cấu trúc frontend

| File | Mô tả |
|------|--------|
| [RESTRUCTURE_INDEX.md](./RESTRUCTURE_INDEX.md) | Chỉ mục tái cấu trúc: Orders, PriceList, PackageProduct, Dashboard, BEM. |
| [BEM_NAMING.md](./BEM_NAMING.md) | Quy ước đặt tên class BEM. |

---

## Testing

| File | Mô tả |
|------|--------|
| [TESTING_GUIDE.md](./TESTING_GUIDE.md) | Hướng dẫn chạy test, script test. |
| [TEST_RESULTS.md](./TEST_RESULTS.md) | Kết quả test. |
| [TEST_CASES_SUPPLIER_PAYMENT.md](./TEST_CASES_SUPPLIER_PAYMENT.md) | Test case thanh toán NCC, xóa đơn, days còn lại. |

---

## Vận hành & deploy

| File | Mô tả |
|------|--------|
| [deploy-vps.md](./deploy-vps.md) | Deploy lên VPS. |
| [sync-product-images.md](./sync-product-images.md) | Đồng bộ ảnh sản phẩm. |
| [telegram-notification-fix.md](./telegram-notification-fix.md) | Sửa lỗi thông báo Telegram. |

---

## Khác

| File | Mô tả |
|------|--------|
| [Adobe_Auto_Login (2).md](./Adobe_Auto_Login%20(2).md) | Ghi chú riêng (Adobe auto login). |

---

## Database & migrations

- **Mục lục migration** (thứ tự chạy, mô tả từng file): [../database/migrations/README.md](../database/migrations/README.md)
- **Database README**: [../database/README.md](../database/README.md)

---

*Cập nhật: sau khi gom file OPTIMIZATION_* và IMPROVEMENTS_* vào OPTIMIZATION.md và IMPROVEMENTS.md.*
