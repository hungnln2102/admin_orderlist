Database
========

Structure
- `init.sql`: bootstrap entrypoint (can `\i migrations/001_normalize_types.sql` or create schema/tables).
- `migrations/`: migrated from backend (e.g., `001_normalize_types.sql`).
- `seeds/`: optional seed SQL files executed on first init.
- `Dockerfile`: custom Postgres image that copies `init.sql`, `migrations/`, and `seeds/` into `/docker-entrypoint-initdb.d/`.

Usage
- Local psql: `cd database && psql "$DATABASE_URL" -v schema=mavryk -f migrations/001_normalize_types.sql`.
- Docker Compose: `postgres` service now builds from `./database`, so edits under `database/` get picked up on rebuild.
