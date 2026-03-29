-- Migration: 017_normalize_variant_margin_ratios
-- Mô tả:
--   Chuẩn hóa 2 cột pricing `pct_ctv` và `pct_khach` trong `product.variant`
--   từ dạng hệ số cũ (ví dụ 1.2, 1.3) sang dạng biên độ trực tiếp
--   dùng cho công thức mới:
--
--     Giá bán = Giá gốc / (1 - x)
--
--   Quy tắc chuẩn hóa:
--     1.2 -> 0.2
--     1.3 -> 0.3
--     1.0 -> 0.0
--
-- Lưu ý:
--   - Chỉ cập nhật các giá trị nằm trong khoảng [1, 10).
--   - Các giá trị đã ở dạng 0.x sẽ được giữ nguyên.
--   - `pct_promo` không bị thay đổi trong migration này.
--   - Nếu DB có giá trị >= 10 ở 2 cột này, cần review thủ công trước khi chuẩn hóa.
--
-- Query kiểm tra trước khi chạy:
--   SELECT id, pct_ctv, pct_khach
--   FROM product.variant
--   WHERE (pct_ctv IS NOT NULL AND pct_ctv >= 10)
--      OR (pct_khach IS NOT NULL AND pct_khach >= 10)
--   ORDER BY id;

BEGIN;

UPDATE product.variant
SET pct_ctv = ROUND((pct_ctv - 1)::numeric, 6)
WHERE pct_ctv IS NOT NULL
  AND pct_ctv >= 1
  AND pct_ctv < 10;

UPDATE product.variant
SET pct_khach = ROUND((pct_khach - 1)::numeric, 6)
WHERE pct_khach IS NOT NULL
  AND pct_khach >= 1
  AND pct_khach < 10;

COMMIT;
