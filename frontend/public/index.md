# Admin Orderlist

Admin console for order, warehouse, supply, pricing, and payment operations.

## Main links

- API docs: `https://admin.mavrykpremium.com/docs/api`
- API catalog: `https://admin.mavrykpremium.com/.well-known/api-catalog`
- Auth guide: `https://admin.mavrykpremium.com/auth.md`
- Health check: `https://admin.mavrykpremium.com/api/health`

## Auth model

- Session cookie login for browser users.
- CSRF protection on protected write endpoints.
- OAuth/OIDC discovery not published by current app.
