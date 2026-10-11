/**
 * simulateWebhookApi.js
 * Giả lập bắn HTTP POST Request chuẩn như SePay gọi vào endpoint /api/webhooks/sepay trên port 3002 của backend.
 */
const http = require("http");

async function simulate() {
  const orderCode = process.argv[2] || "MAVCC3HXDE";
  const amount = Number(process.argv[3]) || 250000;

  const payload = JSON.stringify({
    id: Date.now(),
    gateway: "MBBank",
    transactionDate: new Date().toISOString(),
    accountNumber: "0378304963",
    transferType: "in",
    transferAmount: amount,
    accumulatedAmount: amount,
    content: `Thanh toan don hang ${orderCode}`,
    referenceCode: `REF_${Date.now()}`,
  });

  const options = {
    hostname: "localhost",
    port: 3002,
    path: "/api/webhooks/sepay",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(payload),
    },
  };

  console.log(`🚀 Đang bắn HTTP POST Webhook tới http://localhost:3002/api/webhooks/sepay cho đơn ${orderCode} (${amount} ₫)...`);

  const req = http.request(options, (res) => {
    let data = "";
    res.on("data", (chunk) => {
      data += chunk;
    });
    res.on("end", () => {
      console.log(`📥 Phản hồi từ Server (Status ${res.statusCode}):`);
      console.log(data);
    });
  });

  req.on("error", (error) => {
    console.error("❌ Lỗi kết nối HTTP:", error.message);
  });

  req.write(payload);
  req.end();
}

 simulate();
