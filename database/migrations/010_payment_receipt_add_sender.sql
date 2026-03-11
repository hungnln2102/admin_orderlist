-- Migration: 010_payment_receipt_add_sender
-- Mô tả: Thêm cột sender vào orders.payment_receipt (số tài khoản/sdt người chuyển) cho webhook Sepay.
-- Chạy: psql "$DATABASE_URL" -f database/migrations/010_payment_receipt_add_sender.sql

BEGIN;

ALTER TABLE orders.payment_receipt ADD COLUMN IF NOT EXISTS sender text;
COMMENT ON COLUMN orders.payment_receipt.sender IS 'Số tài khoản hoặc số điện thoại người chuyển (từ nội dung giao dịch).';

COMMIT;
