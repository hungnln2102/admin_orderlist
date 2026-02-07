-- Migration: Cho phép Tên Gói Sản Phẩm (package_name) trùng nhau
-- Chỉ Mã Sản Phẩm (variant.display_name) là không được trùng.
-- Date: 2026-02-07
-- Chạy trên DB local nếu gặp lỗi "Tên Gói Sản Phẩm không được trùng" (server đã chạy rồi thì bỏ qua).

-- Bỏ unique constraint trên product.package_name để nhiều sản phẩm có thể dùng chung tên gói
ALTER TABLE product.product DROP CONSTRAINT IF EXISTS package_package_name_key;
ALTER TABLE product.product DROP CONSTRAINT IF EXISTS product_package_name_key;
ALTER TABLE product.product DROP CONSTRAINT IF EXISTS product_product_package_name_key;
