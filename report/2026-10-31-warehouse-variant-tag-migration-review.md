# Khắc phục lỗi Warehouse thiếu cột `variant_tag`

- Ngày xử lý: 31/10/2026 (Asia/Bangkok)
- Phạm vi: lỗi `42703` khi `GET /api/warehouse` gọi `listWarehouseAccounts()`.
- Trạng thái nghiệm thu: **ĐÃ NGHIỆM THU LIVE**

## Nguyên nhân gốc

Runtime đã đọc và ghi `warehouse.account_slots.variant_tag` trong `backend/src/domains/warehouse/services/warehouseService.js`, đồng thời cột đã được khai báo tại `backend/src/db/tables.js`. Tuy nhiên migration thêm cột `backend/src/db/migrations/20261031000001_add_variant_tag_to_warehouse_account_slots.js` vẫn ở trạng thái pending trong database đang chạy. Vì vậy PostgreSQL trả `42703: column ss.variant_tag does not exist`.

## Khắc phục

- Đã chạy `npx.cmd knex migrate:latest --knexfile knexfile.js` từ `backend/`.
- Migration `20261031000001_add_variant_tag_to_warehouse_account_slots.js` đã chạy ở batch 11.
- Không loại bỏ `variant_tag` khỏi runtime query vì đó chỉ là né lỗi, làm mất chức năng tag biến thể và tạo lệch schema/code.

## Kiểm tra đã chạy

- `npx.cmd knex migrate:list --knexfile knexfile.js`: 18 migration completed, không còn migration pending.
- Probe trực tiếp `warehouse.account_slots`: chọn được cột `variant_tag` thành công.
- Gọi trực tiếp `listWarehouseAccounts()`: thành công, trả 79 tài khoản.
- `git diff --check`: không có lỗi whitespace; chỉ có cảnh báo line ending trên worktree đã tồn tại.

## Điều kiện theo dõi

- Backend đang chạy cần reload/restart một lần nếu process không tự nhận thay đổi migration; sau đó tải lại trang Kho để xác nhận HTTP endpoint không còn log `42703`.
- Test Gate tích hợp vẫn cần `TEST_DATABASE_URL` trỏ vào database có tên chứa `test`; không liên quan tới lỗi thiếu cột này.
