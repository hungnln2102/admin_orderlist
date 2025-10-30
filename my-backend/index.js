// index.js (ĐÃ SỬA LỖI CẤU TRÚC API)

require("dotenv").config();
const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
const updateDatabaseTask = require("./scheduler");
const app = express();
const port = 3001;

// 1. Cấu hình CORS (Cho phép React gọi đến)
app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

// 2. Middleware để đọc JSON từ body
app.use(express.json());

// 3. Kết nối Database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// =======================================================
// 4-8. API Endpoints (Lấy, Xóa, Sửa Đơn Hàng)
// =======================================================

// 4. GET /api/orders
app.get("/api/orders", async (req, res) => {
  console.log("Đã nhận yêu cầu GET /api/orders");
  try {
    const result = await pool.query("SELECT * FROM mavryk.order_list");
    res.json(result.rows);
  } catch (err) {
    console.error("Lỗi truy vấn database (GET):", err);
    res.status(500).json({ error: "Lỗi server nội bộ khi lấy đơn hàng" });
  }
});

// 1. GET /api/supplies
app.get("/api/supplies", async (req, res) => {
  console.log("Đã nhận yêu cầu GET /api/supplies");
  try {
    const result = await pool.query(
      "SELECT id, source_name FROM mavryk.supply ORDER BY source_name"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Lỗi truy vấn database (GET /api/supplies):", err);
    res
      .status(500)
      .json({ error: "Lỗi server nội bộ khi lấy danh sách nguồn" });
  }
});

// 2. GET /api/supplies/:supplyId/products (Lấy Sản phẩm theo Nguồn)
app.get("/api/supplies/:supplyId/products", async (req, res) => {
  const { supplyId } = req.params;
  console.log(`Đã nhận yêu cầu GET /api/supplies/${supplyId}/products`);

  const queryText = `
        SELECT DISTINCT
            pp.id,
            pp.san_pham
        FROM mavryk.supply_price sp
        JOIN mavryk.product_price pp ON sp.product_id = pp.id
        WHERE sp.source_id = $1
        ORDER BY pp.san_pham;
    `;

  try {
    const result = await pool.query(queryText, [supplyId]);
    res.json(result.rows);
  } catch (err) {
    console.error(
      `Lỗi truy vấn database (GET /api/supplies/${supplyId}/products):`,
      err
    );
    res.status(500).json({
      error: "Lỗi server nội bộ khi lấy danh sách sản phẩm theo nguồn",
    });
  }
});

// 5. POST /api/webhook/payment
app.post("/api/webhook/payment", async (req, res) => {
  console.log("Đã nhận yêu cầu POST /api/webhook/payment");
  const { ma_don_hang } = req.body;

  if (!ma_don_hang) {
    console.warn("Webhook thiếu 'ma_don_hang' trong body");
    return res.status(400).json({ error: "Thiếu thông tin mã đơn hàng" });
  }

  try {
    const result = await pool.query(
      "UPDATE mavryk.order_list SET tinh_trang = $1 WHERE id_don_hang = $2",
      ["Đã Thanh Toán", ma_don_hang]
    );

    if (result.rowCount === 0) {
      console.warn(
        `Webhook: Không tìm thấy đơn hàng ${ma_don_hang} để cập nhật.`
      );
      return res
        .status(404)
        .json({ error: `Không tìm thấy đơn hàng ${ma_don_hang}` });
    }

    console.log(`Đã cập nhật đơn hàng ${ma_don_hang} thành 'Đã Thanh Toán'.`);
    res
      .status(200)
      .json({ success: true, message: `Đã cập nhật đơn hàng ${ma_don_hang}` });
  } catch (err) {
    console.error("Lỗi khi update database (POST webhook):", err);
    res.status(500).json({ error: "Lỗi server nội bộ khi cập nhật đơn hàng" });
  }
});

// 6. GET /api/orders/:id
app.get("/api/orders/:id", async (req, res) => {
  const { id } = req.params;
  console.log(`Đã nhận yêu cầu GET /api/orders/${id}`);
  try {
    const result = await pool.query(
      "SELECT * FROM mavryk.order_list WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Không tìm thấy đơn hàng" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(`Lỗi khi lấy chi tiết đơn hàng ${id}:`, err);
    res
      .status(500)
      .json({ error: "Lỗi server nội bộ khi lấy chi tiết đơn hàng" });
  }
});

// 7. PUT /api/orders/:id
app.put("/api/orders/:id", async (req, res) => {
  const { id } = req.params;
  const orderData = req.body;
  console.log(`Đã nhận yêu cầu PUT /api/orders/${id}`);

  const fields = Object.keys(orderData)
    .map((key, index) => `"${key}" = $${index + 1}`)
    .join(", ");
  const values = Object.values(orderData);

  if (fields.length === 0) {
    return res.status(400).json({ error: "Không có dữ liệu để cập nhật" });
  }

  try {
    const queryText = `UPDATE mavryk.order_list SET ${fields} WHERE id = $${
      values.length + 1
    } RETURNING *`;
    const queryValues = [...values, id];

    const result = await pool.query(queryText, queryValues);

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Không tìm thấy đơn hàng để cập nhật" });
    }

    console.log(`Đã cập nhật đơn hàng ID ${id}.`);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(`Lỗi khi cập nhật đơn hàng ${id}:`, err);
    res.status(500).json({ error: "Lỗi server nội bộ khi cập nhật đơn hàng" });
  }
});

// 8. DELETE /api/orders/:id
app.delete("/api/orders/:id", async (req, res) => {
  const { id } = req.params;
  console.log(`Đã nhận yêu cầu DELETE /api/orders/${id}`);
  try {
    const result = await pool.query(
      "DELETE FROM mavryk.order_list WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Không tìm thấy đơn hàng để xóa" });
    }

    console.log(`Đã xóa đơn hàng ID ${id}.`);
    res
      .status(200)
      .json({ success: true, message: `Đã xóa đơn hàng ID ${id}` });
  } catch (err) {
    console.error(`Lỗi khi xóa đơn hàng ${id}:`, err);
    res.status(500).json({ error: "Lỗi server nội bộ khi xóa đơn hàng" });
  }
});

// =======================================================
// 9. POST /api/calculate-price (Tính toán Giá)
// =======================================================
app.post("/api/calculate-price", async (req, res) => {
  console.log("Đã nhận yêu cầu POST /api/calculate-price");

  const { supply_id, san_pham_name, id_don_hang } = req.body;

  if (!supply_id || !san_pham_name || !id_don_hang) {
    return res.status(400).json({
      error:
        "Thiếu thông tin cần thiết (supply_id, san_pham_name, id_don_hang).",
    });
  }

  try {
    // Truy vấn phức hợp để lấy giá cơ sở, phần trăm và tính toán số ngày
    const queryText = `
            SELECT
                sp.price AS gia_nhap_co_so,
                pp.pct_ctv,
                pp.pct_khach,
                -- Tính số ngày dựa trên chuỗi tên sản phẩm
                CASE
                    WHEN $2 ILIKE '%--24m%' THEN 730
                    WHEN $2 ILIKE '%--12m%' THEN 365
                    WHEN $2 ILIKE '%--6m%' THEN 180
                    WHEN $2 ILIKE '%--4m%' THEN 120
                    WHEN $2 ILIKE '%--3m%' THEN 90
                    WHEN $2 ILIKE '%--2m%' THEN 60
                    WHEN $2 ILIKE '%--1m%' THEN 30
                    ELSE 30 -- Mặc định 30 ngày nếu không tìm thấy
                END AS so_ngay_da_dang_ki_moi
            FROM mavryk.supply_price sp
            JOIN mavryk.product_price pp ON sp.product_id = pp.id
            WHERE sp.source_id = $1 AND pp.san_pham = $2;
        `;

    const result = await pool.query(queryText, [supply_id, san_pham_name]);

    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ error: "Không tìm thấy giá cho Nguồn và Sản phẩm này." });
    }

    const data = result.rows[0];
    const basePrice = Number(data.gia_nhap_co_so);
    const pctCtv = Number(data.pct_ctv) || 1.0;
    const pctKhach = Number(data.pct_khach) || 1.0;

    // Check MAVC (CTV) vs MAVL (Khách)
    const isMAVC = id_don_hang.toUpperCase().startsWith("MAVC");

    // --- LOGIC TÍNH GIÁ BÁN ---
    let finalPrice = basePrice;
    if (isMAVC) {
      finalPrice = basePrice * pctCtv;
    } else {
      // MAVL hoặc khác
      finalPrice = basePrice * pctKhach;
    }

    // Làm tròn giá cuối cùng
    finalPrice = Math.round(finalPrice);

    const responseData = {
      gia_nhap: basePrice,
      gia_ban: finalPrice,
      so_ngay_da_dang_ki: Number(data.so_ngay_da_dang_ki_moi),
      het_han: "", // Frontend sẽ tính
    };

    res.json(responseData);
  } catch (err) {
    console.error(
      `LỖI SERVER KHI TÍNH TOÁN GIÁ (${id_don_hang}):`,
      err.message || err
    );
    res.status(500).json({ error: "Lỗi server nội bộ khi tính toán giá." });
  }
});

// =======================================================
// 10. POST /api/orders (Tạo Đơn Hàng Mới) - ĐÃ TÁCH RA
// =======================================================
app.post("/api/orders", async (req, res) => {
  console.log("Đã nhận yêu cầu POST /api/orders (Tạo mới)");
  const newOrderData = req.body;

  // Loại bỏ trường ID nếu nó được gửi (DB sẽ tự sinh)
  delete newOrderData.id;

  const keys = Object.keys(newOrderData);
  const placeholders = keys.map((_, index) => `$${index + 1}`).join(", ");
  const columns = keys.map((key) => `"${key}"`).join(", ");
  const values = Object.values(newOrderData);

  try {
    const queryText = `
            INSERT INTO mavryk.order_list (${columns})
            VALUES (${placeholders})
            RETURNING *;
        `;

    const result = await pool.query(queryText, values);

    if (result.rows.length === 0) {
      return res
        .status(500)
        .json({ error: "Không thể tạo đơn hàng, không có dữ liệu trả về." });
    }

    console.log(`Đã tạo đơn hàng mới ID: ${result.rows[0].id_don_hang}.`);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Lỗi khi tạo đơn hàng mới (POST /api/orders):", err);
    res.status(500).json({ error: "Lỗi server nội bộ khi tạo đơn hàng" });
  }
});

// 11. API Test: Kích hoạt Tác vụ Lập lịch Thủ công
app.get("/api/run-scheduler", async (req, res) => {
  console.log("--- ĐÃ KÍCH HOẠT CHẠY CRON JOB THỦ CÔNG ---");
  try {
    await updateDatabaseTask();
    res.status(200).json({
      success: true,
      message: "Tác vụ lập lịch đã được kích hoạt thành công.",
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Lỗi server nội bộ khi chạy tác vụ lập lịch." });
  }
});

// 12. Khởi động server
app.listen(port, () => {
  console.log(`Backend server đang chạy tại http://localhost:${port}`);
  console.log(
    "⏰ Tác vụ lập lịch (cron job) đang chạy ở file scheduler.js riêng biệt."
  );
});
