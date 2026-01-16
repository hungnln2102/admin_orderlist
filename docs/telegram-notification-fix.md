# Hướng dẫn Khắc phục Vấn đề Thông báo Telegram

## Vấn đề
Khi tạo đơn hàng thành công nhưng không gửi thông báo về bot Telegram.

## Nguyên nhân
File `.env` thiếu các biến cấu hình cần thiết cho việc gửi thông báo đơn hàng qua Telegram:
- `TELEGRAM_CHAT_ID`: ID của group/chat nhận thông báo
- Các biến cấu hình khác cho QR code và inline buttons

## Giải pháp đã áp dụng

### 1. Đã thêm các biến môi trường vào `.env`:
```env
# Telegram Order Notifications
TELEGRAM_CHAT_ID=-1002934465528
ORDER_NOTIFICATION_TOPIC_ID=1
SEND_ORDER_NOTIFICATION=true
SEND_ORDER_TO_TOPIC=true

# QR Payment Info
ORDER_QR_ACCOUNT_NUMBER=9183400998
ORDER_QR_BANK_CODE=VPB
ORDER_QR_NOTE_PREFIX=Thanh toan
SEND_ORDER_COPY_BUTTONS=true
```

### 2. Đã thêm hàm `buildCopyKeyboard` vào `telegramOrderNotification.js`
Hàm này tạo inline keyboard với các nút copy mã đơn hàng và nội dung chuyển khoản.

## Cách kiểm tra

### Bước 1: Restart Backend Server
```bash
cd backend
npm run dev
```

### Bước 2: Tạo đơn hàng mới từ frontend
- Truy cập trang tạo đơn hàng
- Điền đầy đủ thông tin
- Submit form

### Bước 3: Kiểm tra Telegram
- Mở Telegram group có ID: `-1002934465528`
- Kiểm tra topic có ID: `1`
- Xem có nhận được thông báo đơn hàng mới không

## Thông tin thông báo sẽ bao gồm:
✅ Mã đơn hàng
📌 Tên sản phẩm
🧾 Thông tin đơn hàng
📅 Ngày bắt đầu
⏳ Thời hạn
📅 Ngày hết hạn
💰 Giá bán
👤 Tên khách hàng
💳 Hướng dẫn thanh toán (STK + Nội dung)
🖼️ QR Code thanh toán (nếu có)
🔘 Inline buttons để copy thông tin

## Lưu ý quan trọng

### Kiểm tra TELEGRAM_CHAT_ID
Nếu bạn muốn gửi thông báo đến group khác, hãy thay đổi giá trị `TELEGRAM_CHAT_ID`:
- Để lấy Chat ID của group, thêm bot vào group và gửi tin nhắn bất kỳ
- Truy cập: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
- Tìm `chat.id` trong response

### Kiểm tra Topic ID
Nếu group của bạn có sử dụng topics (forum mode):
- Mở topic muốn nhận thông báo
- Kiểm tra URL, topic ID sẽ xuất hiện sau `/` cuối cùng
- Cập nhật `ORDER_NOTIFICATION_TOPIC_ID` trong `.env`

### Tắt gửi thông báo (nếu cần)
Để tạm thời tắt gửi thông báo:
```env
SEND_ORDER_NOTIFICATION=false
```

### Debug
Nếu vẫn không nhận được thông báo, kiểm tra console log của backend:
```
[Order][Telegram] Notify failed
```

## Kiểm tra code flow

1. **POST /api/orders** → `backend/src/controllers/Order/crudRoutes.js` (line 28)
2. Tạo đơn hàng thành công → `line 45`
3. Commit transaction → `line 47`
4. Normalize order data → `line 48`
5. Gửi response về client → `line 49`
6. **Gửi thông báo Telegram** → `line 50-52`
   - Gọi `sendOrderCreatedNotification(normalized)`
   - File: `backend/src/services/telegramOrderNotification.js`
   - Function: `sendOrderCreatedNotification` (line 286)

## Các biến môi trường liên quan

| Biến | Mô tả | Giá trị mặc định |
|------|-------|------------------|
| `TELEGRAM_BOT_TOKEN` | Token của bot Telegram | (bắt buộc) |
| `TELEGRAM_CHAT_ID` | ID của chat/group nhận thông báo | `-1002934465528` |
| `ORDER_NOTIFICATION_TOPIC_ID` | ID của topic trong group | `1` |
| `SEND_ORDER_NOTIFICATION` | Bật/tắt gửi thông báo | `true` |
| `SEND_ORDER_TO_TOPIC` | Gửi vào topic hay không | `true` |
| `ORDER_QR_ACCOUNT_NUMBER` | Số tài khoản cho QR | `9183400998` |
| `ORDER_QR_BANK_CODE` | Mã ngân hàng | `VPB` |
| `ORDER_QR_NOTE_PREFIX` | Prefix cho nội dung CK | `Thanh toan` |
| `SEND_ORDER_COPY_BUTTONS` | Hiển thị nút copy | `true` |
