# Expo Mobile Bootstrap

Ứng dụng mobile bootstrap cho `admin_orderlist`, chạy độc lập và gọi API backend hiện có.

## Mục tiêu bootstrap

- Tạo nền tảng Expo + TypeScript trong repo hiện tại mà không thay đổi backend.
- Kiểm tra nhanh kết nối backend bằng endpoint `GET /api/health`.
- Chuẩn bị cấu trúc theo feature để mở rộng dần.

## Cấu trúc thư mục

```txt
mobile/expo-admin-app/
  App.tsx
  src/
    config/
      env.ts
    features/
      health-check/
        screens/
          HealthCheckScreen.tsx
    shared/
      api/
        client.ts
        types.ts
```

## Chạy local trên Windows

1. Mở backend:

```powershell
cd backend
npm run dev
```

2. Chạy Expo app:

```powershell
cd mobile/expo-admin-app
copy .env.example .env
npm run start
```

3. Chạy trên Android emulator:

```powershell
npm run android
```

## Cấu hình API base URL

- Android Emulator: `http://10.0.2.2:3001`
- iOS Simulator: `http://localhost:3001`
- Thiết bị thật: `http://<LAN_IP_MAY_TINH>:3001` (ví dụ `http://192.168.1.25:3001`)

Thiết lập trong file `.env`:

```env
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3001
```

## Ghi chú kỹ thuật quan trọng

Backend hiện dùng session cookie + CSRF. Bản bootstrap này mới kiểm tra endpoint public (`/api/health`).  
Khi triển khai đăng nhập/ghi dữ liệu, cần thêm chiến lược auth phù hợp cho mobile (ưu tiên access token riêng cho mobile hoặc endpoint auth chuyên biệt), tránh phụ thuộc hoàn toàn vào browser cookie flow.

## Build APK với Expo EAS

1. Cài EAS CLI (nếu máy chưa có):

```powershell
npm install -g eas-cli
```

2. Đăng nhập Expo account (bước này cần thao tác thủ công):

```powershell
eas login
```

3. Vào thư mục app và build APK bằng profile `preview`:

```powershell
cd mobile/expo-admin-app
npm run build:apk
```

4. Sau khi build xong, EAS sẽ trả về link tải file `.apk`.

### Ghi chú env cho bản build

- `EXPO_PUBLIC_*` được nhúng vào app tại thời điểm build.
- Trước khi chạy build, cần đặt đúng `EXPO_PUBLIC_API_BASE_URL` cho môi trường cần dùng (staging/prod).
- Có thể cấu hình env trong dashboard EAS (Environment Variables/Secrets) nếu không muốn lưu trực tiếp trong repo.
