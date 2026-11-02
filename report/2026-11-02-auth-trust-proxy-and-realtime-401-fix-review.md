# BÁO CÁO NGHIỆM THU: KHẮC PHỤC LỖI TRUST PROXY & MẤT PHIÊN ĐĂNG NHẬP (401 REALTIME SSE)
**Mã nghiệm thu:** `AUTH-TRUST-PROXY-2026-11-02`  
**Ngày thực hiện:** 02/11/2026 (Múi giờ Asia/Bangkok)  
**Môi trường:** VPS Production (`180.93.43.169`) — Docker container `admin_orderlist-backend`  
**Chủ trì thực hiện:** Master Orchestrator & Backend Specialist  
**Trạng thái nghiệm thu:** 🟢 **ĐÃ NGHIỆM THU & TRIỂN KHAI THÀNH CÔNG (PASSED)**

---

## 1. PHẠM VI XỬ LÝ (SCOPE)
- Điều tra hiện tượng console DevTools tại `https://admin.mavrykpremium.com/dashboard` liên tục bị spam lỗi:
  `GET https://admin.mavrykpremium.com/api/realtime/stream 401 (Unauthorized)`
- Khắc phục tình trạng huy hiệu Live Stream bị kẹt ở trạng thái màu cam **"Đang kết nối..."**.
- Khắc phục hiện tượng các thẻ Dashboard tải chậm hoặc trả về `0 đ` do mất phiên xác thực cookie sau khi đăng nhập.

---

## 2. NGUYÊN NHÂN GỐC (ROOT CAUSE)
- Tại file `backend/src/server.js`, dòng 17 cấu hình:
  ```javascript
  app.set("trust proxy", process.env.TRUST_PROXY === "1" ? 1 : false);
  ```
- Tuy nhiên biến `TRUST_PROXY` chưa từng được định nghĩa trong `docker-compose.yml` và `backend/.env.docker`, dẫn đến `trust proxy` bị gán bằng `false`.
- Khi `trust proxy` là `false`, Express chạy trong container (cổng 3001 HTTP) bỏ qua hoàn toàn header `X-Forwarded-Proto: https` gửi từ Host Nginx.
- Khi Express coi request là HTTP mà cookie phiên có thuộc tính `secure: true` (ở chế độ Production), thư viện `express-session` **tự động loại bỏ (drop) header `Set-Cookie`** (`SET-COOKIE: null`).
- Kết quả: Sau khi đăng nhập thành công (`POST /api/auth/login 200`), trình duyệt không nhận được session cookie, khiến mọi request tiếp theo (`/api/dashboard/summary`, `/api/realtime/stream`) đều bị backend từ chối với mã **401 Unauthorized**.

---

## 3. CÁC THAY ĐỔI ĐÃ THỰC HIỆN
1. **`backend/src/server.js`:**
   - Điều chỉnh logic khởi tạo trust proxy:
     ```javascript
     app.set("trust proxy", process.env.TRUST_PROXY === "0" ? false : 1);
     ```
     Đảm bảo mặc định tin cậy 1 proxy hop từ Host Nginx trên môi trường production.
2. **`docker-compose.yml`:**
   - Thêm `TRUST_PROXY: "1"` vào phần `environment` của service `backend`.
3. **`backend/.env.docker`:**
   - Khai báo bổ sung `TRUST_PROXY=1`.
4. **Triển khai trên VPS:**
   - Git commit & push `5a9f81bf` lên nhánh `main`.
   - `git pull origin main` trên VPS và tái tạo (recreate) container `admin_orderlist-backend`.

---

## 4. KẾT QUẢ KIỂM THỬ (VERIFICATION)
- Đăng nhập thử nghiệm với header `X-Forwarded-Proto: https` trả về đầy đủ header `Set-Cookie` với các thuộc tính `Secure; HttpOnly; SameSite=Lax`.
- Container `admin_orderlist-backend` khởi động khỏe mạnh (healthy).
- Realtime SSE Subscriber sẵn sàng kết nối và tiếp nhận kết nối an toàn từ trình duyệt Admin.

