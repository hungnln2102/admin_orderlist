# Archived Operational Scripts

Thư mục này chứa các script vận hành/cứu dữ liệu/migration dữ liệu đơn lẻ (one-off scripts) đã thực thi thành công trong quá khứ và được lưu trữ cho mục đích tham khảo lịch sử (audit trail).

## Danh sách script

1. `inspect_order_and_slots.js`: Script kiểm tra thông tin đơn hàng 1422 và biên lai 43.
2. `match_receipt_95110228_to_order_1422.js`: Script hạch toán và phân bổ biên lai 95110228 cho đơn 1422.
3. `fix_webhook_bank_match_and_rebalance.js`: Script đối soát và bù trừ số dư giữa tài khoản 1004 và tài khoản MB Bank.
4. `merge_duplicate_accounts_and_resequence.js`: Script gộp các tài khoản trùng lặp và đánh lại sequence ID kho hàng.
5. `migrate_adobe_edu_and_resequence.js`: Script chuẩn hóa dữ liệu tài khoản Adobe Edu và đánh lại sequence ID.
6. `migrate_canva_youtube_and_resequence.js`: Script chuẩn hóa dữ liệu tài khoản Canva / YouTube và đánh lại sequence ID.
7. `migrate_googleone_and_resequence_ids.js`: Script chuẩn hóa dữ liệu tài khoản Google One và đánh lại sequence ID.

