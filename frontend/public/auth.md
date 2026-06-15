# Auth.md

## Service

- Name: Admin Orderlist
- Base URL: `https://admin.mavrykpremium.com`
- API Base URL: `https://admin.mavrykpremium.com/api`

## Authentication

- Primary auth model: browser session cookie.
- Login endpoint: `POST /api/auth/login`.
- Session inspection: `GET /api/auth/me`.
- Logout endpoint: `POST /api/auth/logout`.
- CSRF token endpoint: `GET /api/auth/csrf-token`.

## Agent access

- OAuth 2.0 / OpenID Connect discovery is not available yet.
- Programmatic agent registration is not available yet.
- Agents need operator-provisioned browser session or future OAuth support.

## Contact

- See `https://admin.mavrykpremium.com/docs/api` for public API notes.
