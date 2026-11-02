# Rà soát toàn bộ dự án và tối ưu rác mã nguồn

**Ngày rà soát:** 2026-11-02 (Asia/Bangkok)  
**Phạm vi:** Backend, frontend, mobile, database, Docker, script, tài liệu, báo cáo và các thay đổi chưa commit trong workspace local. Đợt này chỉ đánh giá; không sửa hay xóa logic nghiệp vụ.

## Trạng thái nghiệm thu

**CHƯA ĐẠT.** Frontend build và Docker config hợp lệ, nhưng database dump bị theo dõi trong Git, mobile có dependency vulnerability Critical/High, và test backend không tái lập giữa các môi trường.

## Phát hiện

### P0 - Database dump bị theo dõi trong Git

- `db-backup-2026-10-06T17-01-00-174Z.dump` là PostgreSQL custom dump (header `PGDMP`), khoảng 1.1 MB, đã được commit trong lịch sử Git.
- `.gitignore:12` đã khai báo `*.dump`, nhưng ignore không áp dụng cho file đã track. Dump có thể chứa dữ liệu khách hàng, tài chính, session hoặc cấu hình nhạy cảm.
- Trước nghiệm thu cần: đưa backup vào kho private có kiểm soát truy cập, bỏ file khỏi index, purge Git history, rồi luân chuyển credential/secret có nguy cơ bị lộ. Chỉ xóa file ở commit mới là không đủ.

### P1 - Mobile lockfile có 43 advisory

- `mobile/expo-admin-app/package.json:15` đến `mobile/expo-admin-app/package.json:22` có dependency tree gồm 2 Critical, 12 High, 27 Moderate và 2 Low theo `npm audit --omit=dev`.
- Critical: `shell-quote`, `tar`; High gồm `ws`, `undici`, `node-forge`, `postcss`, `nanoid` và dependency bắc cầu khác. Audit báo có hướng nâng cấp.
- Vì `mobile/expo-admin-app/package.json:12` có script build APK, cần nâng dependency theo ma trận tương thích Expo/React Native, chạy lại `npm ci`, typecheck, build APK và audit. Không chạy `npm audit fix --force` mù quáng.

### P2 - Unit test backend phụ thuộc `.env` local

- `backend/tests/unit/autoBackupDatabaseTask.test.js:6` gọi resolver mà không cô lập `PG_DUMP_PATH`.
- `backend/src/scheduler/tasks/autoBackupDatabaseTask.js:16` đến `backend/src/scheduler/tasks/autoBackupDatabaseTask.js:20` đúng khi throw nếu path explicit không tồn tại, nhưng `.env` local hiện trỏ `/usr/bin/pg_dump`; `npm test` vì vậy chỉ pass 59/60 test trên Windows.
- Test cần set/restore environment tường minh và tách case path invalid phải throw khỏi case path trống trả `null` hoặc executable hợp lệ.

### P2 - `clearData` là mã chết có thao tác phá hủy

- Không có runtime import hay npm script gọi `backend/src/db/clearData.js`; chỉ có tham chiếu mô tả trong báo cáo cũ.
- `backend/src/db/clearData.js:16` đến `backend/src/db/clearData.js:71` hard-code schema cũ `business`, `billing`, `finance`; `backend/src/db/clearData.js:79` auto-run khi require và kết thúc process.
- Dù có guard production ở `backend/src/db/clearData.js:10`, file đặt trong `src/db` dễ bị gọi nhầm và không theo quy ước `dbSchema`/`tableName`. Xóa nếu bỏ dùng; nếu cần reset test, chuyển thành CLI explicit trong `backend/scripts/`, bắt buộc `TEST_DATABASE_URL` và không auto-run khi import.

### P3 - Thiếu gate lint và có điểm nóng về kích thước mã

- `backend/package.json` và `frontend/package.json` không có script `lint`; `frontend/tsconfig.json:15` và `frontend/tsconfig.json:16` tắt kiểm tra biến/parameter không dùng.
- Các hotspot trên 1,000 dòng: `backend/src/domains/orders/services/orderService.js` (1,558), `backend/src/domains/finance/services/financeHubService.js` (1,365), `frontend/src/pages/ExternalApiConfigPage.tsx` (1,422) và `frontend/src/features/warehouse/components/WarehouseAccountsTable.tsx` (1,197).
- Đây là backlog refactor, chưa có bằng chứng là mã chết. Tách dần theo use-case, repository, component và hook, có test hồi quy; không refactor hàng loạt chỉ để giảm số dòng.

### P3 - Archive migration và API alias cần gắn nhãn rõ hơn

- `database/legacy_sql_migrations/` có 87 file, nhưng `database/README.md:13` xác nhận chỉ để tham khảo. Prefix `058`, `060`, `066`, `074`, `080` bị lặp; không phải lỗi runtime nhưng dễ gây nhầm khi điều tra schema.
- Archive chỉ khoảng 0.25 MB, không cần xóa gấp. Giữ lịch sử, thêm manifest và quy tắc không chạy lại; chỉ tách khỏi checkout deploy khi có tag/backup được kiểm chứng.
- `backend/src/server.js:136` và `backend/src/server.js:137` mount cùng route dưới hai URL. Frontend đang dùng URL cũ; cần chọn canonical path, ghi deprecation và xóa alias sau khi client chuyển xong.

## Phần đạt

- `docker compose config --quiet` pass.
- `npm run build` trong `frontend/` pass (TypeScript và Vite production build).
- `npm audit --omit=dev` của backend và frontend không báo vulnerability production.
- `node_modules`, `frontend/dist`, `.tmp`, `.env`, browser profiles và log đều được ignore; đây là artifact local hợp lệ, không phải rác đang được Git theo dõi.
- Backend theo `domains/`, frontend theo `features/` và `shared/`; hướng tổ chức tốt nhưng thiếu enforcement tự động.

## Kiểm tra đã chạy

- `docker compose config --quiet`: pass.
- `npm run build` trong `frontend/`: pass.
- `npm test` trong `backend/`: fail, 59 pass và 1 fail (`autoBackupDatabaseTask`).
- `npm run typecheck` trong mobile: không chạy được vì chưa có `node_modules`; `tsc` không tồn tại.
- `npm audit --omit=dev`: backend/frontend không có advisory production; mobile có 43 advisory (2 Critical, 12 High, 27 Moderate, 2 Low).

## ACID và điều kiện nghiệm thu lại

- Không thay đổi hoặc chạy migration/transaction trong đợt này. Chưa có `TEST_DATABASE_URL` cô lập, nên không khẳng định rollback, isolation hoặc idempotency trên PostgreSQL thật.
- Trước nghiệm thu lại: purge dump khỏi Git history và rotate credential có nguy cơ lộ; nâng dependency mobile tương thích Expo; cô lập environment test backup; xóa/cô lập `clearData`; bổ sung lint rồi refactor từng hotspot và bỏ route alias theo kế hoạch tương thích.
