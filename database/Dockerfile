FROM postgres:16-alpine

# Copy initialization SQL + migrations + seeds into the standard init directory
COPY init.sql /docker-entrypoint-initdb.d/00-init.sql
COPY migrations/ /docker-entrypoint-initdb.d/migrations/
COPY seeds/ /docker-entrypoint-initdb.d/seeds/
