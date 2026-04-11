-- init.sql — Bootstrap schema cho Docker container mới.
-- PostgreSQL tự chạy file này khi volume postgres_data chưa tồn tại.
-- Nếu DB đã có data (volume còn), file này bị bỏ qua.

-- 1. Full schema (tất cả tables, indexes, constraints)
\i /docker-entrypoint-initdb.d/migrations/000_full_schema.sql

-- 2. Seed data mặc định
\i /docker-entrypoint-initdb.d/seeds/seed_hero_banners_website_defaults.sql
