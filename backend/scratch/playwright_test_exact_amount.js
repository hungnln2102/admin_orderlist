require("module-alias/register");
const { chromium } = require("playwright");
const { spawn } = require("child_process");
const { db } = require("@/db");
require("dotenv").config();

let webhookProcess = null;

async function runTest() {
  console.log("=== BẮT ĐẦU CHẠY PLAYWRIGHT E2E TEST ===");
  
  console.log("Dọn dẹp đơn hàng test cũ...");
  try {
    await db('order_list').where({ customer: 'Playwright Test Customer' }).del();
    console.log("  - Đã dọn dẹp các đơn test cũ.");
  } catch (dbErr) {
    console.error("  - Lỗi khi dọn dẹp đơn hàng test cũ:", dbErr.message);
  }

  console.log("Khởi động Webhook server trên cổng 5000...");
  webhookProcess = spawn("node", ["webhook-server.js"], {
    cwd: process.cwd(),
    stdio: "inherit"
  });
  
  // Chờ 3 giây để webhook server khởi chạy hoàn tất
  await new Promise(resolve => setTimeout(resolve, 3000));

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Đặt kích thước màn hình
  await page.setViewportSize({ width: 1280, height: 800 });

  try {
    // 1. Điều hướng đến trang orders
    console.log("1. Điều hướng tới http://localhost:5173/orders...");
    await page.goto("http://localhost:5173/orders", { waitUntil: "networkidle" });

    // 2. Thực hiện đăng nhập
    console.log("2. Đăng nhập với admin/123456...");
    await page.fill('input[placeholder="Nhập tên đăng nhập"]', "admin");
    await page.fill('input[placeholder="Nhập mật khẩu"]', "123456");
    await page.click('button:has-text("Đăng nhập")');

    // Chờ chuyển hướng sau khi đăng nhập thành công
    console.log("Chờ chuyển hướng...");
    await page.waitForURL("**/dashboard", { timeout: 10000 });

    // Điều hướng lại sang trang orders
    console.log("Điều hướng lại sang /orders...");
    await page.goto("http://localhost:5173/orders", { waitUntil: "networkidle" });

    // Chờ cho trang Orders load xong
    console.log("Chờ trang Orders load xong...");
    await page.waitForSelector('button:has-text("Tạo Đơn")');
    await page.waitForTimeout(2000); // Chờ thêm 2s cho chắc chắn

    // 3. Click Tạo Đơn
    console.log("3. Mở form Tạo Đơn...");
    await page.click('button:has-text("Tạo Đơn")');
    await page.waitForSelector('input[name="customer"]');

    // Điền thông tin đơn hàng
    console.log("Điền thông tin khách hàng...");
    await page.fill('input[name="customer"]', "Playwright Test Customer");
    await page.fill('input[name="contact"]', "0912345678");

    // Bật chế độ nhập tay (custom mode) để nhập giá tùy ý
    console.log("Bật chế độ Nhập tay...");
    await page.click('button[title="Nhập tay"]');
    await page.waitForSelector('input[name="id_product"]');

    // Điền thông tin sản phẩm và nguồn hàng
    console.log("Điền thông tin sản phẩm và nguồn...");
    await page.fill('input[name="id_product"]', "Adobe_1PC--3m");
    await page.fill('input[name="supply"]', "Playwright Test Supplier");

    // Điền thông tin sản phẩm (bắt buộc)
    console.log("Điền thông tin chi tiết sản phẩm...");
    await page.fill('label:has-text("Thông tin sản phẩm") + input', "playwright_test_account@gmail.com");

    // Điền giá bán ngẫu nhiên độc nhất (ví dụ: 289555 VND)
    console.log("Điền giá bán...");
    await page.fill('input[name="price"]', "289555");
    
    // Chờ 1.5 giây để các side-effect/recalc của form chạy xong và ổn định
    await page.waitForTimeout(1500);

    // Đọc giá trị thực tế đang hiển thị trên ô input để sử dụng cho Webhook
    const priceValRaw = await page.inputValue('input[name="price"]');
    let testPrice = parseInt(priceValRaw.replace(/\D/g, ""), 10) || 289555;
    console.log(`=> Giá bán thực tế ghi nhận từ giao diện: ${testPrice} VND`);

    // Nhấn Lưu/Tạo đơn
    console.log("Nhấp Lưu đơn hàng...");
    await page.click('button[type="submit"][form="create-order-form"]');

    // Đợi modal đóng và danh sách load lại
    console.log("Đợi đơn hàng mới xuất hiện trên bảng...");
    await page.waitForTimeout(3000);

    // Trích xuất mã đơn hàng vừa tạo ở dòng đầu tiên
    // Selector cho dòng đầu tiên trên table: ta tìm text MAV...
    const firstRowText = await page.innerText('table tbody tr:first-child');
    const match = firstRowText.match(/\bMAV[A-Z0-9]{3,20}\b/i);
    if (!match) {
      throw new Error("Không tìm thấy mã đơn hàng MAV vừa tạo ở dòng đầu tiên!");
    }
    const orderCode = match[0].toUpperCase();

    // Truy vấn database để lấy giá thực tế đã lưu (bao gồm suffix/payment slot)
    const dbOrder = await db('order_list').where({ id_order: orderCode }).first();
    if (!dbOrder) {
      throw new Error(`Không tìm thấy đơn hàng ${orderCode} trong Database!`);
    }
    const actualDbPrice = Number(dbOrder.price);
    console.log(`=> Đã tạo đơn hàng thành công! Mã đơn: ${orderCode}, Giá UI: ${testPrice} VND, Giá thực tế Database (gồm suffix): ${actualDbPrice} VND`);
    testPrice = actualDbPrice;

    // Lưu screenshot trạng thái ban đầu (Chưa Thanh Toán)
    await page.screenshot({ path: "scratch/playwright_screenshot_unpaid.png" });
    console.log("Đã lưu screenshot trạng thái ban đầu: scratch/playwright_screenshot_unpaid.png");

    // --- GIẢ LẬP WEBHOOK 1: Sai số tiền (Chuyển khoản thiếu 100k) ---
    console.log(`\n4. Giả lập webhook chuyển khoản THIẾU tiền (100.000 / ${testPrice}) cho ${orderCode}...`);
    const payloadShortfall = {
      id: Date.now() + 10,
      gateway: "MBBank",
      transaction_date: new Date().toISOString().slice(0, 19).replace("T", " "),
      account_number: "0378304963",
      transfer_type: "in",
      transfer_amount: 100000,
      accumulated: 0,
      code: null,
      transaction_content: `Chuyen khoan thanh toan don ${orderCode}`,
      reference_number: `TXN${Date.now()}1`,
      description: `Testing shortfall with order code`,
      note: `Chuyen khoan thanh toan don ${orderCode}`
    };

    const res1 = await fetch("http://localhost:5000/api/payment/notify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Apikey 85WNPTNCVL59PHD11SRTX3B6E3S6NOV7MDEV8QIOFNWQKHCYMQCAQCFQJ7I2FWRM"
      },
      body: JSON.stringify(payloadShortfall)
    });
    const response1 = { status: res1.status, body: await res1.json() };

    console.log(`  - Webhook trả về HTTP ${response1.status}:`, response1.body);
    await page.waitForTimeout(3000); // Chờ backend xử lý bất đồng bộ

    // Reload lại trang
    console.log("Tải lại trang và kiểm tra trạng thái đơn...");
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    const rowLocator1 = page.locator(`table tbody tr:has-text("${orderCode}")`);
    const count1 = await rowLocator1.count();
    if (count1 > 0) {
      const rowText1 = await rowLocator1.first().innerText();
      console.log(`  - Nội dung dòng của đơn ${orderCode} sau Webhook 1:`, rowText1.replace(/\s+/g, ' '));
      const rowTextUpper1 = rowText1.toUpperCase();
      if (rowTextUpper1.includes("CHƯA THANH TOÁN") || rowTextUpper1.includes("UNPAID")) {
        console.log("✅ Chính xác: Đơn hàng vẫn Chưa Thanh Toán!");
      } else {
        console.warn("⚠️ Cảnh báo: Đơn hàng bị thay đổi trạng thái sai lệch!");
      }
    } else {
      console.log(`ℹ️ Đơn hàng ${orderCode} không hiển thị ở bảng hiện tại (có thể do bộ lọc trạng thái).`);
      const verifyOrder1 = await db('order_list').where({ id_order: orderCode }).first();
      console.log(`=> Trạng thái thực tế trong database của đơn ${orderCode}:`, verifyOrder1.status);
      const verifyStatusUpper1 = String(verifyOrder1?.status || "").toUpperCase();
      if (verifyStatusUpper1.includes("CHƯA THANH TOÁN") || verifyStatusUpper1.includes("UNPAID")) {
        console.log("✅ Xác nhận qua Database: Đơn hàng vẫn Chưa Thanh Toán!");
      } else {
        console.warn("⚠️ Cảnh báo: Đơn hàng bị thay đổi trạng thái sai lệch trong Database!");
      }
    }

    // --- GIẢ LẬP WEBHOOK 2: Đúng số tiền (Chuyển khoản đủ 289.555đ) KHÔNG ghi mã đơn ---
    console.log(`\n5. Giả lập webhook chuyển khoản ĐÚNG số tiền (${testPrice}) KHÔNG ghi mã đơn...`);
    const payloadExact = {
      id: Date.now() + 20,
      gateway: "MBBank",
      transaction_date: new Date().toISOString().slice(0, 19).replace("T", " "),
      account_number: "0378304963",
      transfer_type: "in",
      transfer_amount: testPrice,
      accumulated: 0,
      code: null,
      transaction_content: `MBCT NGO LE NGOC HUNG chuyen tien ${Date.now()}`,
      reference_number: `TXN${Date.now()}2`,
      description: `Testing exact amount without order code`,
      note: `MBCT NGO LE NGOC HUNG chuyen tien ${Date.now()}`
    };

    const res2 = await fetch("http://localhost:5000/api/payment/notify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Apikey 85WNPTNCVL59PHD11SRTX3B6E3S6NOV7MDEV8QIOFNWQKHCYMQCAQCFQJ7I2FWRM"
      },
      body: JSON.stringify(payloadExact)
    });
    const response2 = { status: res2.status, body: await res2.json() };

    console.log(`  - Webhook trả về HTTP ${response2.status}:`, response2.body);
    await page.waitForTimeout(3000); // Chờ backend xử lý bất đồng bộ

    // Reload lại trang
    console.log("Tải lại trang và kiểm tra trạng thái đơn...");
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    const rowLocator2 = page.locator(`table tbody tr:has-text("${orderCode}")`);
    const count2 = await rowLocator2.count();
    if (count2 > 0) {
      const rowText2 = await rowLocator2.first().innerText();
      console.log(`  - Nội dung dòng của đơn ${orderCode} sau Webhook 2:`, rowText2.replace(/\s+/g, ' '));
      const rowTextUpper2 = rowText2.toUpperCase();
      if (rowTextUpper2.includes("ĐÃ THANH TOÁN") || rowTextUpper2.includes("PAID")) {
        console.log("✅ Chính xác: Đơn hàng đã được chuyển sang Đã Thanh Toán!");
      } else {
        console.warn("⚠️ Cảnh báo: Đơn hàng chưa được chuyển sang Đã Thanh Toán!");
      }
    } else {
      console.log(`ℹ️ Đơn hàng ${orderCode} không còn hiển thị ở bảng hiện tại (có thể do bộ lọc trạng thái).`);
      const verifyOrder2 = await db('order_list').where({ id_order: orderCode }).first();
      console.log(`=> Trạng thái thực tế trong database của đơn ${orderCode}:`, verifyOrder2.status);
      const verifyStatusUpper2 = String(verifyOrder2?.status || "").toUpperCase();
      if (verifyStatusUpper2.includes("ĐÃ THANH TOÁN") || verifyStatusUpper2.includes("PAID")) {
        console.log("✅ Xác nhận qua Database: Đơn hàng đã Đã Thanh Toán!");
      } else {
        console.warn("⚠️ Cảnh báo: Đơn hàng vẫn Chưa Thanh Toán trong Database!");
      }
    }

    // Lưu screenshot trạng thái khớp thành công
    await page.screenshot({ path: "scratch/playwright_screenshot_paid.png" });
    console.log("Đã lưu screenshot trạng thái khớp thành công: scratch/playwright_screenshot_paid.png");

  } catch (err) {
    console.error("LỖI TRONG QUÁ TRÌNH CHẠY PLAYWRIGHT TEST:", err.message);
    console.error(err.stack);
    try {
      console.log("Current URL:", page.url());
      await page.screenshot({ path: "scratch/playwright_failure.png" });
      console.log("Saved failure screenshot to scratch/playwright_failure.png");
      const text = await page.innerText("body");
      console.log("Body innerText preview:", text.slice(0, 1000));
    } catch (screenshotErr) {
      console.error("Could not capture failure details:", screenshotErr.message);
    }
  } finally {
    await browser.close();
    if (webhookProcess) {
      console.log("Đang tắt Webhook server...");
      webhookProcess.kill();
    }
    try {
      await db.destroy();
      console.log("Đã đóng kết nối Database.");
    } catch (destroyErr) {
      console.error("Lỗi khi đóng kết nối Database:", destroyErr.message);
    }
    console.log("=== KẾT THÚC CHẠY PLAYWRIGHT E2E TEST ===");
  }
}

runTest();
