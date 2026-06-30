# Refactor Remaining Status

> Updated: 2026-06-30. Snapshot of open work in `docs/refactor-rebuild`. Database refactor is intentionally not started in the current phase.

## Checklist Summary

| File | Open | Done |
| --- | ---: | ---: |
| `REFACTOR_FROM_AGENT_GRAPH.md` | 94 | 3 |
| `CLEAN_CODE_AUDIT.md` | 48 | 0 |
| `DATABASE_REFACTOR_TASKS.md` | 40 | 0 |
| `REFACTOR_TASKS.md` | 36 | 54 |
| `MIGRATION_MAP.md` | 10 | 0 |
| `CODE_INVENTORY.md` | 8 | 0 |
| `README.md` | 0 | 0 |
| `RENEW_ADOBE_FLOW_AUDIT.md` | 0 | 0 |
| `SHARED_CONTRACTS.md` | 0 | 0 |

## Synced In This Update

- 2026-06-30: Completed Phase A A2-A5: API inventory, duplicate scan findings, source-of-truth decisions, and code inventory sync.
- 2026-06-30: Synced `REFACTOR_TASKS.md` by separating ongoing guardrails/DoD from remaining tasks and updating current execution order.
- 2026-06-30: Synced `SHARED_CONTRACTS.md` with current frontend/backend shared contracts and domain capability boundaries.
- Marked `E1.5` done: Create/Edit order modal refactors kept public props/contracts stable. `E1.4` remains open for owner migration.
- Marked `E3.3` done for frontend pricing split: calculation, row mapping, and formatting are now separate modules behind the compatibility barrel.
- Marked `E3.4` done: `productDescApi` moved from `frontend/src/lib` to `frontend/src/features/product-info/api`.
- Marked `E3.5` done: `VariantContentView` and `ImageUpload` were split into feature-local child components/sections.

## Recommended File Order

| Priority | File | Why First |
| ---: | --- | --- |
| 1 | `docs/refactor-rebuild/CODE_INVENTORY.md` | Next blocker: mark files as `keep`, `migrate`, `merge`, `deprecated`, or `delete` before moving/deleting code. |
| 2 | `docs/refactor-rebuild/CLEAN_CODE_AUDIT.md` | Record duplicate clusters and source-of-truth decisions after shared/domain boundary is clear. |
| 3 | `docs/API_CONTRACTS.md` | Must be completed before touching routes/API contracts for orders, wallet, payment slots, bank accounts, USDT wallets. |
| 4 | `docs/SMOKE_CHECKLIST.md` | Define behavior checks for the next UI/API slices before broader refactor continues. |
| 5 | `docs/refactor-rebuild/MIGRATION_MAP.md` | Used after source/target modules are clear; maps old imports/files to new owners. |
| 6 | `docs/refactor-rebuild/REFACTOR_FROM_AGENT_GRAPH.md` | Useful for graph/coupling cleanup, but should follow real inventory and contract decisions. |
| 7 | `docs/refactor-rebuild/REFACTOR_TASKS.md` | Already synced for current phase; update again after each completed slice. |
| 8 | `docs/refactor-rebuild/SHARED_CONTRACTS.md` | Already synced for current phase; update only when a new shared/domain contract is introduced. |
| 9 | `docs/refactor-rebuild/DATABASE_REFACTOR_TASKS.md` | Keep last because database refactor is intentionally paused until explicit approval. |

## Next Implementation Order

1. `orders` frontend/source-of-truth cleanup: `orderListTransform`, Create/Edit/Bill Order mapper overlap, modal ownership.
2. `product/supplier/pricing` backend capability owner: shared product lookup, supplier lookup, pricing calculation boundary.
3. `pricing/core.js` backend split after baseline tests.
4. `invoices/receipts` frontend cleanup: status/action/QR mapping and table split.
5. `renew-adobe` backend facade split and scheduler thinning.
6. Cutover/delete pass only after inventory, migration map, and `rg` caller checks are complete.

## Remaining Work By Group

### Tracking And Baseline

- Update `docs/API_CONTRACTS.md` for `orders`, `payment-slots`, `wallet`, `shop-bank-accounts`, and `usdt-wallets`.
- Run controlled duplicate scan and write findings into `CLEAN_CODE_AUDIT.md`.
- Update `CODE_INVENTORY.md` with `keep`, `migrate`, `merge`, `deprecated`, and `delete` statuses.
- Keep `SHARED_CONTRACTS.md` updated only when a new shared/domain contract is introduced.

### Frontend

- `orders`: audit `orderListTransform.ts`, consolidate DTO -> view-model source-of-truth, find duplicate mappers with Create/Edit/Bill Order, then move global order modal ownership if needed.
- `invoices/receipts`: audit `invoices/index.tsx` and `ReceiptsTable.tsx`, choose receipt status/action/QR source-of-truth, then split columns/actions/status badge.
- `pricing/product`: frontend split is mostly complete, but backend/frontend calculation ownership must be settled before removing caller-side calculations.
- Continue large-file cleanup from `docs/REFACTOR_TASKS_REMAINING.md`.

### Backend

- `orders/finance`: choose source-of-truth for create order validation and payment amount/key allocation.
- `product/supplier/pricing`: establish owner service/repository capability reused by orders, pricing, warehouse, and supply flows.
- `pricing`: add baseline tests for `backend/src/services/pricing/core.js`, then split parser/rules/calculators by boundary.
- `renew-adobe`: split `adobe-renew-v2/facade.js` into login, account lookup, renew action, and post-check modules.
- `money/ledger`: run webhook/payment-slot matching smoke when environment is available.

### Database

- All `DATABASE_REFACTOR_TASKS.md` items remain open.
- Do not touch database schema until explicitly approved.

### Cutover And Legacy Removal

- Run `rg` for every file/function before deletion.
- Update inventory/log for every deprecated or deleted file.
- Re-run graph comparison if the graph tool is available.

## How To Continue

- Use `docs/refactor-rebuild/REFACTOR_TASKS.md` for the canonical detailed checklist.
- Use this file for the current grouped summary.
- Avoid auto-copying Vietnamese checklist lines between files until encoding is normalized.
