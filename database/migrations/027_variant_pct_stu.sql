-- Giá sinh viên (MAVS): cùng công thức 2 bậc như khách lẻ; bậc 2 dùng pct_stu thay pct_khách
-- (sau giá CTV/sỉ = bậc 1 từ giá nguồn + %CTV).

ALTER TABLE product.variant
  ADD COLUMN IF NOT EXISTS pct_stu numeric(12,6);

COMMENT ON COLUMN product.variant.pct_stu IS
  'Biên lớp 2 cho MAVS (cùng nghĩa pct_khách). NULL/ trống: dùng pct_khách như khách lẻ.';
