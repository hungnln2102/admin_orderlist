-- Nghiệp vụ bảng chi phí ngoài luồng chỉ thêm + xóa, không sửa.
-- Bỏ cột updated_at để tránh gây hiểu nhầm.

ALTER TABLE finance.store_profit_expenses
  DROP COLUMN IF EXISTS updated_at;
