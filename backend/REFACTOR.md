## Backend refactor snapshot

What changed:
- Added a proper Knex client (`src/db/knexClient.js`) with a small helper layer (`withTransaction`) and shared normalizers/SQL utilities in `src/utils`.
- Split routes/controllers for: auth, dashboard, banks, package products, warehouse, scheduler, and payment receipts/payment supply confirmation.
- Introduced a Postgres migration to convert text columns to typed data: `migrations/001_normalize_types.sql` (see `docs/db-type-refactor.md` for usage).
- New entrypoint option: `npm run start:new` will boot `src/server.js` (uses the modular routers). The legacy `index.js` is still the default until all routes are migrated.

Pending to finish the refactor:
- Migrate the remaining endpoints (orders, supplies, product pricing/descriptions, supply payments listing/creation, delete flows) into `src/controllers` + `src/routes`.
- Replace the legacy `index.js` with `src/server.js` once parity is reached.
- Update scheduler/supply/order logic to use the new type-safe columns after running the migration.

Notes:
- Allowlist/front-end origins, session, and webhook configs are centralized in `src/config/appConfig.js`.
- Knex uses the `SCHEMA_*` values to set the search path; ensure `DATABASE_URL` is set when running `npm run start:new`.
