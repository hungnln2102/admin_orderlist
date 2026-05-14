-- init.sql - Bootstrap schema for a brand-new Docker PostgreSQL volume.
-- PostgreSQL runs this file only when postgres_data is empty.
-- Current bootstrap uses one consolidated schema snapshot instead of replaying
-- legacy hotfix migrations one by one.

\i /docker-entrypoint-initdb.d/migrations/000_consolidated_schema.sql
