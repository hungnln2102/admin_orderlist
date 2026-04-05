-- Giá sinh viên (MAVS): nội suy giữa MAVC (CTV) và MAVL (khách lẻ).
-- pct_stu = 0 → giá MAVC; = 1 → giá MAVL; NULL → dùng DEFAULT_PCT_STU trên backend (.env).

ALTER TABLE product.variant
  ADD COLUMN IF NOT EXISTS pct_stu numeric(12,6);

COMMENT ON COLUMN product.variant.pct_stu IS
  'Tỷ lệ 0–1: giá_MAVS = round(MAVC + pct_stu × (MAVL − MAVC)). NULL = dùng DEFAULT_PCT_STU.';
