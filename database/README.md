Database
========

## Docker volume (Postgres 18+)

Gắn **một** volume tại `/var/lib/postgresql` (không mount trực tiếp `/var/lib/postgresql/data` — entrypoint 18+ sẽ từ chối). Ví dụ: `-v tên_volume:/var/lib/postgresql`.

## Structure
- `init.sql`: bootstrap entrypoint for a brand-new PostgreSQL volume.
- `migrations/000_consolidated_schema.sql`: one-file DDL-only schema snapshot used for new servers.
- `legacy_sql_migrations/`: archived historical SQL migrations kept for reference only.
- `seeds/`: optional seed SQL files kept for reference only. Data should be imported from a database backup separately.
- `Dockerfile`: custom Postgres image that copies `init.sql` and `migrations/000_consolidated_schema.sql` into `/docker-entrypoint-initdb.d/`.

Usage
- Local psql for a fresh database: `cd database && psql "$DATABASE_URL" -f migrations/000_consolidated_schema.sql`.
- Import business/static data from your database backup after the schema has been created.
- Docker Compose: `postgres` service now builds from `./database`, so edits under `database/` get picked up on rebuild.
