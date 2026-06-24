# Renew Adobe Flow Audit

Mục đích: chốt flow chính/patch flow trước khi tách D6-D7, tránh tiếp tục vá thêm trong controller/scheduler/facade.

## Flow Chính

| Flow | Source hiện tại | Vai trò | Boundary cần giữ |
| --- | --- | --- | --- |
| Check account | `backend/src/domains/renew-adobe/controller/checkAccounts.js` -> `adobeRenewV2.checkAccount` | Check Adobe account, sync mapping/tracking, auto-delete user quá hạn/quá slot | Controller chỉ nhận request/response; use-case xử lý check/sync/delete. |
| Batch add users | `backend/src/domains/renew-adobe/controller/batchUsers.js` -> `adobeRenewV2.addUsersWithProduct` | Add users theo batch, dùng cookies/org/product context | Tách validation/batch orchestration/retry result mapper. |
| Public Fix ADES | `backend/src/domains/renew-adobe/controller/publicFixAdes.js` -> `services/fix-ades/checkService.js` | Public website check/renew/sync Fix ADES có eligibility tracking | Đã tách email helper và renew-flow result mapper; còn tách eligibility + sync tracking helper. |
| Adobe renew v2 facade | `backend/src/services/renew-adobe/adobe-renew-v2/facade.js` | Facade orchestration cho login/check/add/renew/delete | Tách theo login/session, account lookup/check, add users, renew action, post-check. |
| Post-check scheduler | `backend/src/scheduler/tasks/renewAdobePostCheckFlow.js` | Cron tìm user chưa assign và reassign vào account còn slot | Scheduler nên chỉ gọi use-case `runRenewAdobePostCheckUseCase`. |

## Patch/Duplicate Flow Đã Xử Lý

- `normalizeEmail` duplicate đã gom về `backend/src/domains/renew-adobe/helpers/email.js`.
- `normalizeCheckResultForRenewFlow` duplicate đã gom về `backend/src/domains/fix-ades/helpers/renewFlowResult.js`.

## Slice Đề Xuất Tiếp Theo

1. Tách `publicFixAdes.js` eligibility helpers: `ensureFixAdesEligible`, `findFixAdesTrackingRow`, `applyFixAdesTrackingFilter` sang `controller/publicFixAdesEligibility.js`.
2. Tách scheduler post-check thành `backend/src/domains/renew-adobe/use-cases/runRenewAdobePostCheckUseCase.js`, scheduler chỉ gọi use-case.
3. Tách `adobe-renew-v2/facade.js` theo group export hiện có, nhưng phải thêm focused tests trước.
4. Sau mỗi slice, chạy publicFixAdes tests/scheduler syntax check.

## Không Làm Trong Cùng Slice

- Không vừa tách facade vừa đổi retry/login/session behavior.
- Không đổi response shape public Fix ADES.
- Không đổi cron trigger hoặc jobRun logging format.
