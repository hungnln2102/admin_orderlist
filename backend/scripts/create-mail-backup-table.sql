-- Tạo bảng mail_backup trong schema identity (dùng cho đọc mail OTP theo từng mailbox).
-- Ứng dụng đang dùng SCHEMA_IDENTITY (mặc định "identity"), nên bảng phải là identity.mail_backup.
--
-- Chạy (từ thư mục backend, thay your_db bằng tên database thật):
--   psql -U postgres -d your_db -f scripts/create-mail-backup-table.sql
--
-- Nếu bạn đã tạo mail_backup ở schema khác (vd. public): tạo lại trong identity bằng script này,
-- hoặc copy: INSERT INTO identity.mail_backup SELECT * FROM public.mail_backup;

-- Tạo schema identity nếu chưa có (PostgreSQL)
CREATE SCHEMA IF NOT EXISTS identity;

-- Bảng mail_backup: mỗi dòng = 1 hộp thư (email + app password); email = IMAP login, alias_prefix = filter thư lấy OTP
CREATE TABLE IF NOT EXISTS identity.mail_backup (
  id            SERIAL PRIMARY KEY,
  email         VARCHAR(255) NOT NULL,
  app_password  VARCHAR(255) NOT NULL,
  note          TEXT,
  provider      VARCHAR(64) DEFAULT 'gmail',
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  alias_prefix  VARCHAR(255)
);

-- Nếu bảng đã tồn tại nhưng chưa có alias_prefix (chạy đúng schema của bạn, vd. system_renew_adobe):
-- ALTER TABLE system_renew_adobe.mail_backup ADD COLUMN IF NOT EXISTS alias_prefix VARCHAR(255);

-- Gợi ý: thêm bản ghi (email = đăng nhập IMAP, alias_prefix = chuỗi filter thư, vd. +acc1 hoặc acc1)
-- INSERT INTO identity.mail_backup (email, app_password, provider, note, alias_prefix)
-- VALUES ('your@gmail.com', 'xxxx xxxx xxxx xxxx', 'gmail', 'Mail nhận OTP Adobe', 'acc1');
