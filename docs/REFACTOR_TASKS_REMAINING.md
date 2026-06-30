# Remaining Refactor Tasks

> Scope: continue clean-code refactor without database schema changes. Preserve UI/API behavior and keep compatibility barrels while migrating callers gradually.

## Rules
- Keep shared code capability-based: `shared/date`, `shared/money`, `shared/pricing`, `shared/http`, `shared/vietqr`, etc.
- Keep business rules in feature/domain owners.
- Prefer focused modules/hooks/components over catch-all helpers.
- Validate after each meaningful slice with `cd frontend; npm run build` and targeted backend tests when backend is touched.

## Frontend Priority A: Large Components / Hooks
- [ ] Split expenses cost allocation table components (>390 lines) into row/table/summary/action helpers.
- [ ] Split `features/renew-adobe/components/AddTrackingOrdersModal.tsx` into form sections and hook actions.
- [ ] Split `features/bill-order/components/InvoicePreview.tsx` into header/items/totals/signature sections.
- [ ] Split `features/renew-adobe/pages/RenewSystemLogsPage.tsx` into filters/table/detail sections.
- [ ] Continue reducing `features/orders/utils/orderListTransform.ts` into virtual-field, filter/sort, and stats modules.
- [~] Split `features/invoices/components/ReceiptsTable.tsx` into row, edit cell, expanded detail, and empty/loading sections.
- [ ] Split `features/pricing/hooks/supplyActionHelpers.ts` into validation, payload, and mutation helpers.
- [ ] Split dashboard chart panel into chart config/data transform/visual sections.
- [ ] Split modal hooks: `EditOrderModal/useEditOrderLogic`, `CreateOrderModal` hooks and container.

## Frontend Priority B: Feature Utility Cleanup
- [ ] Remove remaining compatibility barrel reliance where safe (`lib/helpers`, `shared/utils/*`).
- [~] Review generated `pricing/*` modules and update direct imports away from `pricing/utils.ts` gradually.
- [ ] Review `package-product` normalizers/match utils and split domain rules from generic text/date parsing.
- [ ] Review `warehouse` and `supply` card components for presentational extraction.

## Backend Priority A: Domain Controller Thinning
- [ ] Split `domains/wallet/controller/index.js` into handlers/services by transaction type.
- [ ] Split `domains/orders/controller/crud/createOrder.js` into use-case/service/repository helpers.
- [ ] Split `services/pricing/core.js` into calculators, normalizers, and rule modules.
- [ ] Split order manual completion controllers into shared use-cases plus channel-specific adapters.
- [ ] Split shop-bank ledger service into ledger repository, balance calculator, and transaction service.

## Backend Priority B: Service Organization
- [ ] Review renew-adobe controllers and move workflow logic to domain services/use-cases.
- [ ] Review supplies handlers (`insights`, `list`, `mutations`) and extract repositories/mappers.
- [ ] Review dashboard finance summary files and isolate SQL builders from mappers.

## Validation Tasks
- [ ] Frontend build: `cd frontend; npm run build`.
- [ ] Backend focused Jest for touched domains.
- [ ] Backend broader Jest smoke if backend touched widely.
- [ ] `git diff --check` before handoff.


## Current Snapshot
- [x] 2026-06-30: Synced high-confidence completed checklist items in `docs/refactor-rebuild/REFACTOR_TASKS.md`.
- [x] 2026-06-30: Added `docs/refactor-rebuild/REMAINING_STATUS.md` as the current source for what is still open.
- [ ] Next: use `docs/refactor-rebuild/REMAINING_STATUS.md` before starting the next refactor slice.

## Completed in 2026-06-29 continuation
- [x] Bill order invoice preview split into document/print style modules.
- [x] Expense allocation table split into container/grid/header/footer/toolbar modules.
- [x] Pricing supply action helpers split by response, draft validation, state mutation, and record helpers.
- [x] Renew Adobe system logs split into domain-local formatter/meta components.
- [x] Dashboard financial charts split into panel orchestration and chart renderer.


## Completed in 2026-06-29 continuation batch 2
- [x] Expense allocation helper barrel split by responsibility.
- [x] Renew Adobe accounts table split into shell and responsive renderer.
- [x] Renew storefront status panel split into cards and orchestrator.
- [x] IP whitelist page split into feature-local page components.


## Completed in 2026-06-29 continuation batch 3
- [x] Product edit panel split into form sections/actions/style modules.
- [x] Warehouse storage mobile actions/details split into focused components.
- [x] Supplier detail monthly orders panel split into dedicated component.


## Completed in 2026-06-29 continuation batch 4
- [x] Active Keys page split into page-local components.
- [x] Package Form Modal slot config/actions split.
- [x] Package Product page hook route-sync and slot-card derivation split.
- [x] Order list stats transform split from list transform.
- [x] Create Order modal footer split and validated.


## Completed in 2026-06-29 continuation batch 5
- [x] Package match utils split into matcher/key modules.
- [x] Shared HTML normalize split into DOM helpers and combined-content splitter.
- [x] Order row actions split into dedicated cell component.

## Batch 6 Progress
- [x] Extract CreateOrder modal header into feature-local component.
- [ ] Continue shrinking CreateOrder modal/hooks without moving business rules into global shared helpers.
- [ ] Continue large-file audit after each safe extraction.
- [x] Move EditOrder order-code/product-option rules into a feature-local helper module.
- [x] Reuse supply-domain import-price rule from `features/supply/utils/supplierRules.ts`.
- [x] Split Add Mcoin modal into a feature-local component.
- [x] Split Add Mcoin history table/mobile cards into a feature-local component.
- [x] Split Article rich editor toolbar into a feature-local component.
- [x] Split package stock manual entry fields into a feature-local component.
- [x] Split package stock dropdown menu/search/list into a feature-local component.
- [x] Split CreateOrder modal derived rules into a local rule module.
- [x] Split Renew Adobe add-admin IMAP alias section into a feature-local component.
- [x] Split create-product basics label/option rules into a local rules module.
- [x] Split wallet type table rendering into a dashboard feature component.
- [x] Split CreateOrder credit-note state/effects into a modal-local hook.
- [ ] Continue deeper hook refactors only with focused validation because remaining large hooks own async side effects.
- [x] Split supplier overview/stat cards into a supply feature component.
- [x] Split warehouse mobile view card into a storage-mobile component.
- [x] Split CTV list table/card/pagination into a feature-local component.
- [x] Split AddTrackingOrders order table/status pill into a feature-local component.
- [x] Split PackageRow slot/capacity calculations into a package feature helper.
- [x] Split ProductRow display/profit/preview calculations into a pricing feature view-model helper.
- [x] Refactor Renew Adobe Admin hook into feature-local flow hooks.
- [x] Keep Renew Adobe Admin public hook contract stable after flow split.

## Completed in 2026-06-29 continuation batch 7
- [x] Refactor package form state into feature-local rules, warehouse-items hook, and stock/storage controls hook.
- [x] Keep package form hook public contract stable after state split.
- [x] Refactor EditOrder resource loading into a modal-domain hook.
- [x] Keep EditOrder pricing and supply behavior stable after resource split.
- [ ] Continue next large feature slice: `RichTextEditorToolbar`, `DashboardDateRangeFilter`, `CreateOrderModal`, or `articleSeoReview`.
- [x] Split article SEO text/slug/keyword helpers into content feature-local utility.
- [x] Split dashboard date-range popover into dashboard feature component.
- [x] Split product rich editor toolbar action rows into editor feature component.
- [x] Split CreateOrder import-package rule/load/submit metadata flow into modal-local hook.

## Completed in 2026-06-30 continuation batch
- [x] Clean up rich editor toolbar actions with local action config groups.
- [x] Split Renew Adobe account action buttons into feature component.
- [x] Split Renew Adobe account mobile card and display helpers into feature component.
- [x] Split CreateOrder modal form body into component-level section composition.
- [x] Split EditOrder supply selection and recalc rules into modal-domain helper.
- [x] Split CreateOrder import-package save metadata hook.
- [x] Split CreateOrder submit-state label/can-submit rules.
- [x] Split CreateOrder date input handlers and custom-month date sync.
- [x] Split EditOrder open/reset and product-dependent refresh effects into lifecycle hook.
- [x] Split dashboard wallet withdraw flow into feature-local hook.
- [x] Split dashboard wallet tab/action controls into feature-local component.
- [x] Split Renew profile check action button states into storefront-check component.
