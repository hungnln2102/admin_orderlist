/**
 * realtimeStreamService.js
 * Dịch vụ Server-Sent Events (SSE) quản lý các kết nối thời gian thực tới trình duyệt Admin
 * Tương thích 100% Nginx Proxy qua header X-Accel-Buffering: no
 */

class RealtimeStreamService {
  constructor() {
    this.clients = new Set();
    this.heartbeatTimer = null;
    this.startHeartbeat();
  }

  /**
   * Đăng ký kết nối SSE mới từ Client (Trình duyệt của Admin)
   */
  handleConnection(req, res) {
    // 1. Thiết lập các header SSE chuẩn
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no", // Bắt buộc cho Nginx reverse proxy trên VPS
      "Access-Control-Allow-Credentials": "true",
    });

    // 2. Gửi tín hiệu chào mừng ban đầu
    const initialPayload = JSON.stringify({
      type: "SYSTEM_CONNECTED",
      timestamp: Date.now(),
      message: "Kết nối Realtime SSE thành công",
    });
    res.write(`data: ${initialPayload}\n\n`);

    // 3. Lưu client vào danh sách hoạt động
    this.clients.add(res);
    console.log(`📡 [RealtimeSSE] Client kết nối thành công. Tổng clients online: ${this.clients.size}`);

    // 4. Lắng nghe sự kiện ngắt kết nối khi Admin đóng tab hoặc rớt mạng
    req.on("close", () => {
      this.clients.delete(res);
      console.log(`📡 [RealtimeSSE] Client đã ngắt kết nối. Còn lại: ${this.clients.size}`);
    });
  }

  /**
   * Broadcast sự kiện tới tất cả các client đang online
   * @param {string} type - Tên sự kiện (ORDER_PAID, SUPPLIER_DEBT_PAID...)
   * @param {object} payload - Dữ liệu chi tiết sự kiện
   */
  broadcast(type, payload = {}) {
    if (this.clients.size === 0) return;

    const data = JSON.stringify({
      type,
      payload,
      timestamp: Date.now(),
    });
    const message = `data: ${data}\n\n`;

    for (const client of this.clients) {
      try {
        client.write(message);
      } catch (err) {
        console.error("[RealtimeSSE] Lỗi gửi dữ liệu tới client, dọn dẹp:", err.message);
        this.clients.delete(client);
      }
    }
  }

  /**
   * Duy trì kết nối bằng Heartbeat Ping mỗi 20 giây
   * Ngăn chặn Nginx hoặc trình duyệt đóng kết nối timeout
   */
  startHeartbeat() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => {
      if (this.clients.size === 0) return;
      const ping = `: keep-alive\n\n`;
      for (const client of this.clients) {
        try {
          client.write(ping);
        } catch {
          this.clients.delete(client);
        }
      }
    }, 20000);
  }
}

// Instance singleton dùng chung cho toàn hệ thống
const realtimeStreamService = new RealtimeStreamService();

module.exports = realtimeStreamService;

