-- Migration: Create form_desc schema and tables (form_name, inputs, form_input)
-- Date: 2026-02-28
-- Liên kết trang Form thông tin với bảng inputs

CREATE SCHEMA IF NOT EXISTS form_desc;

-- Bảng form_name: định nghĩa form
CREATE TABLE IF NOT EXISTS form_desc.form_name (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng inputs: danh sách các loại input (text, email, password...)
CREATE TABLE IF NOT EXISTS form_desc.inputs (
  id SERIAL PRIMARY KEY,
  input_name VARCHAR(255),
  input_type VARCHAR(100) DEFAULT 'text',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng form_input: liên kết form với các input (nhiều-nhiều)
CREATE TABLE IF NOT EXISTS form_desc.form_input (
  id SERIAL PRIMARY KEY,
  form_id INTEGER NOT NULL REFERENCES form_desc.form_name(id) ON DELETE CASCADE,
  input_id INTEGER NOT NULL REFERENCES form_desc.inputs(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  UNIQUE(form_id, input_id)
);

CREATE INDEX IF NOT EXISTS idx_form_input_form_id ON form_desc.form_input(form_id);
CREATE INDEX IF NOT EXISTS idx_form_input_input_id ON form_desc.form_input(input_id);

-- Insert mẫu (User, Pass, Email) nếu bảng inputs trống
INSERT INTO form_desc.inputs (input_name, input_type)
SELECT n, t FROM (VALUES ('User', 'text'), ('Pass', 'password'), ('Email', 'email')) AS v(n, t)
WHERE NOT EXISTS (SELECT 1 FROM form_desc.inputs LIMIT 1);
