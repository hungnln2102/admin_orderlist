# Task Theo Doi - Webhook Sepay Financial Reconcile

## Muc tieu

Dong bo luong webhook + thao tac thu cong de khong lech doanh thu/loi nhuan, su dung:

- `orders.payment_receipt`
- `orders.payment_receipt_financial_state`
- `orders.order_list`
- `partner.supplier_order_cost_log`
- `finance.dashboard_monthly_summary`

## P0 - Bat buoc

- [x] Webhook: set co `is_financial_posted`, `posted_revenue`, `posted_profit` ngay khi ghi so.
- [x] Chan double-post: neu `is_financial_posted = true` thi bo qua ghi so tai chinh lan 2.
- [x] Implement dung rule theo trang thai don:
  - `Chua Thanh Toan` / `Can Gia Han`: chay luong cu.
  - `Dang Xu Ly` / `Da Thanh Toan`: neu da co receipt theo `id_order` thi cong thang, neu chua co thi khong cong.
  - `Het Han`: xu ly theo policy da chot.
- [x] Webhook khong ma don: de trong `id_order`, van post doanh thu/loi nhuan theo policy hien tai.

## P1 - Nghiep vu van hanh

- [ ] Chuan hoa nut `Thanh Toan` / `Gia Han` thu cong de khong double-count voi receipt da post.
- [x] Tao API reconcile: gan `id_order` cho receipt khong ma.
- [x] Reconcile case 1 (don da gia han truoc): tao adjustment tru lai doanh thu + loi nhuan da cong tam.
- [x] Reconcile case 2 (`Chua Thanh Toan` / `Can Gia Han`): giu doanh thu, tru them `cost` vao loi nhuan.
- [x] Update co `reconciled_at`, `adjustment_applied` sau khi reconcile.

## P1 - Ky thuat an toan

- [x] Dedupe thong nhat: `sepay_transaction_id` -> `reference_code + transfer_type + amount + payment_date` -> fallback.
- [ ] Them audit log cho moi quyet dinh ghi so (`receipt_id`, `order_code`, `rule_branch`, `delta`).

## P2 - Ho tro doi soat

- [ ] Backfill state cho du lieu cu neu can doi soat lich su.
- [ ] Tao man hinh/bao cao danh sach receipt `id_order = ''` de xu ly dinh ky.
- [ ] Dong bo lai tai lieu `LUONG_LOI_NHUAN_HE_THONG.md` voi quy tac moi.

## Test cases bat buoc

- [ ] Duplicate webhook cung `sepay_transaction_id` khong duoc cong lan 2.
- [ ] Webhook khong ma don van tao state row va ghi so dung policy.
- [ ] Webhook co ma don vao tung trang thai don cho ra `revenue/profit` dung.
- [ ] Manual action sau webhook khong double-count.
- [ ] Reconcile 2 truong hop chay dung adjustment.

## Tien do

- [x] Tao bang `payment_receipt_financial_state`.
- [x] Backfill state row cho receipt cu.
- [x] Parser `id_order` chi nhan ma MAV hop le.
- [x] Dedupe Sepay bang `sepay_transaction_id` va fallback `reference_code`.
- [x] Hoan tat toan bo P0.

