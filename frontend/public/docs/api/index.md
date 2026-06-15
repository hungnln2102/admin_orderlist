# Admin Orderlist API

Base URL: `https://admin.mavrykpremium.com/api`

## Endpoints

- `GET /api/health` returns service health.
- `POST /api/auth/login` starts session-based login.
- `POST /api/auth/logout` ends current session.
- `GET /api/auth/me` returns current authenticated user.
- `GET /api/auth/csrf-token` returns CSRF token for protected writes.
- `POST /api/auth/change-password` changes current user password.

## Auth

- Browser session cookie authentication.
- CSRF token required for protected `POST` endpoints.
- No OAuth 2.0 or OpenID Connect discovery endpoint is published by this app.

## Health

- `GET /api/health`
- Returns `status`, `uptime`, `dbConnected`, `redisConnected`.
