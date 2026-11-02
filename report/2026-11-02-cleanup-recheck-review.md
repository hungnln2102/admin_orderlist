# Recheck dọn dẹp dự án

**Ngày kiểm tra:** 2026-11-02 (Asia/Bangkok)  
**Phạm vi:** Xác minh các thay đổi dọn mã chết, artifact, archive, route alias và test sau báo cáo `2026-11-02-clean-dead-code-tests-va-plans-review.md`.

## Trạng thái nghiệm thu

**CHƯA ĐẠT cho hạng mục bảo mật và chất lượng toàn dự án; ĐẠT một phần cho dọn cấu trúc.** Việc xóa file dump khỏi HEAD, bỏ mã truncate và cô lập test đã đúng. Tuy nhiên database dump vẫn còn trong lịch sử Git có thể truy cập được, dependency mobile vẫn có advisory nghiêm trọng, và chưa có lint/typecheck khả dụng.

## Phát hiện

### P0 - Database dumps vẫn hiện diện trong Git history

- File `db-backup-2026-10-06T17-01-00-174Z.dump` đã không còn trong index hiện tại, nhưng `git rev-list --objects --all` vẫn thấy bốn dump: ngày 2026-05-22, 2026-07-18, 2026-10-05 và 2026-10-06.
- Vì các blob này còn ở reachable commits, mọi clone/fetch lịch sử vẫn có thể lấy dữ liệu. Nhận định “triệt tiêu nguy cơ khi clone repository” trong `report/2026-11-02-clean-dead-code-tests-va-plans-review.md` là chưa chính xác.
- Điều kiện bắt buộc: dùng quy trình rewrite history đã được phê duyệt, force-push các nhánh/tags liên quan, xóa clone/cache cũ có kiểm soát, và rotate secret/dữ liệu nhạy cảm có thể đã nằm trong dump.

### P1 - Mobile vẫn có 43 dependency advisory và không thể typecheck

- `mobile/expo-admin-app/package.json:15` đến `mobile/expo-admin-app/package.json:22` và lockfile hiện vẫn cho `npm audit --omit=dev` kết quả 2 Critical, 12 High, 27 Moderate, 2 Low.
- `mobile/expo-admin-app/node_modules` chưa tồn tại, nên `npm run typecheck` thất bại vì không tìm thấy `tsc`.
- Hạng mục này chưa được dọn; cần cài dependency từ lockfile, nâng cấp theo compatibility matrix Expo/React Native, sau đó chạy audit, typecheck và build APK.

### P2 - Gỡ API alias có rủi ro tương thích ngoài repository

- `backend/src/server.js:136` chỉ còn canonical path `/api/store-profit-expenses`, còn alias `/api/finance/store-profit-expenses` đã bị bỏ.
- Frontend trong repository dùng canonical path, nên không phát hiện lỗi nội bộ. Tuy nhiên chưa có contract test, telemetry hoặc thông báo deprecation chứng minh không còn client ngoài repo dùng alias cũ.
- Trước deploy cần kiểm tra access log hoặc công bố breaking change; nếu chưa thể xác minh, giữ alias có thời hạn và log warning thay vì xóa ngay.

### P3 - Lint gate chưa được bổ sung

- `backend/package.json` và `frontend/package.json` vẫn không có script `lint`; `frontend/tsconfig.json:15` và `frontend/tsconfig.json:16` tiếp tục tắt cảnh báo unused.
- Đây không chặn việc dọn hiện tại, nhưng dead code sẽ quay lại mà không có CI gate.

## Phần đạt

- `backend/src/db/clearData.js` đã bị xóa; scan không còn import/reference runtime.
- Bảy one-off scripts đã được đưa vào `backend/scripts/archived/` và có `backend/scripts/archived/README.md` mô tả mục đích.
- Tám tài liệu kế hoạch đã hoàn thành được chuyển vào `docs/plans/archived/` kèm `README.md`; rename giữ được Git history.
- `backend/tests/unit/autoBackupDatabaseTask.test.js` đã cô lập `PG_DUMP_PATH`; `npm test` pass 61/61.
- `npm run build` trong frontend và `docker compose config --quiet` đều pass.

## Kiểm tra đã chạy

- `git status --short`, `git diff --cached`, `git diff`, `git rev-list --objects --all`.
- `npm test` trong backend: 61 pass, 0 fail.
- `npm run build` trong frontend: pass; `npm run lint`: không có script.
- `npm run typecheck` và `npm audit --omit=dev` trong mobile: typecheck fail do thiếu dependency; audit còn 43 advisory.
- `docker compose config --quiet`: pass.

## Điều kiện nghiệm thu lại

1. Purge tất cả dump khỏi Git history và xử lý secret có nguy cơ lộ.
2. Khắc phục dependency mobile, cài dependency và chạy đủ audit/typecheck/build.
3. Xác minh client ngoài repository trước khi phát hành route alias đã bị xóa.
4. Thêm lint vào backend/frontend và CI để ngăn rác mã nguồn tái phát.
