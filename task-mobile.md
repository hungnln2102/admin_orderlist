# Task Mobile APK - admin_orderlist

## Muc tieu

- Hoan thien va phat hanh ban `.apk` noi bo cho app tai `mobile/expo-admin-app`.

## Trang thai tong quan

- [x] Bootstrap Expo app (`mobile/expo-admin-app`)
- [x] Cau hinh EAS build APK (`eas.json`, profile `preview`)
- [x] Bo sung script build (`build:apk`) va huong dan README
- [/] Hoan tat build APK release noi bo (dang blocker login Expo + chua co artifact)

## P0 - Bat buoc de ra APK

- [/] Xac nhan moi truong local (da check bang command line)
  - [/] `node -v` dat LTS (hien tai v22.22.0, can doi ve Node LTS)
  - [x] `npm -v` hoat dong binh thuong (11.11.0)
  - [/] `eas --version` hoat dong (`eas` global chua co; da xac nhan `npx eas-cli --version` = 18.13.0)
- [/] Dang nhap Expo account (blocker thao tac thu cong)
  - [/] Chay `eas login` (chua thuc hien duoc trong phien tu dong)
  - [/] Xac nhan login thanh cong (`npx eas-cli whoami` tra ve "Not logged in")
- [/] Cau hinh env cho mobile
  - [x] Tao `.env` tu `.env.example` (da tao file `.env`)
  - [/] Dat `EXPO_PUBLIC_API_BASE_URL` dung server (dang la `http://10.0.2.2:3001`, can user xac nhan)
  - [/] Kiem tra backend co endpoint health (timeout khi goi `/health`)
- [x] Kiem tra truoc khi build
  - [x] Chay `npm run typecheck` trong `mobile/expo-admin-app` (pass)
- [/] Build APK (dang blocker login Expo)
  - [/] Chay `npm run build:apk` (script da doi sang `npx eas-cli`, hien fail vi chua login Expo)
  - [ ] Luu link artifact tu EAS
  - [ ] Tai file `.apk` ve may

## P1 - Bat buoc de APK dung duoc

- [/] Cai APK tren may Android that (cho artifact APK)
- [/] Smoke test luong chinh (cho cai APK tren may that)
  - [/] App mo duoc, khong crash (chua test duoc)
  - [/] Health check API pass (chua test tren thiet bi)
  - [/] Cac man chinh tai du lieu thanh cong (chua test duoc)
- [/] Xu ly loi blocker (neu co)
  - [/] Network / DNS / SSL (health timeout, can xac nhan backend/public host)
  - [/] Auth / token / 401 (chua den buoc test auth tren may)
  - [/] Timeout / retry (co dau hieu timeout endpoint health)

## P2 - San sang ban giao noi bo

- [/] Chot version release (cho sau khi build thanh cong)
  - [/] Cap nhat `version` (hien tai 1.0.0)
  - [/] Cap nhat `android.versionCode` (chua co trong `app.json`)
- [/] Viet release note ngan (cho sau khi co artifact)
  - [/] Build number (chua co)
  - [/] Danh sach thay doi (dang tong hop)
  - [/] Loi da biet (neu co) (da ghi login Expo + health timeout)
- [/] Chia se kenh tai APK cho team (cho sau khi co file APK)

## Lenh nhanh

```powershell
cd E:\Project\admin_store\admin_orderlist\mobile\expo-admin-app
npm run typecheck
eas login
npm run build:apk
```

## Nhat ky cap nhat

- 2026-05-16: Tao task file ban dau cho luong hoan thien APK.
- 2026-05-16: Da chay check moi truong/typecheck/build thu; blocker chinh la chua login Expo va endpoint health timeout.
- 2026-05-16: Da cap nhat script `eas:configure`/`build:apk` sang `npx eas-cli` de khong phu thuoc `eas` global.
