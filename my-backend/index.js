// index.js — Backend (UTF-8, tiếng Việt chuẩn)
// Logic: Tính Giá Nhập (cao nhất) và Giá Bán theo hệ số pct_ctv/pct_khach.

require("dotenv").config();
const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
const updateDatabaseTask = require("./scheduler");

const app = express();
const port = 3001;

// 1) CORS
app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

// 2) Parse JSON body
app.use(express.json());

// 3) Kết nối Postgres
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// =============== Helpers ===============
// Lấy số tháng từ chuỗi có chứa mẫu "--{x}m"
function monthsFromString(text) {
  if (!text || typeof text !== "string") return 0;
  const m = text.match(/--(\d+)m/i);
  return m ? Number(m[1] || 0) : 0;
}

// Quy đổi tháng ra ngày: 1m=30, 2m=60, 12m=365, 24m=730 (nếu cần)
function daysFromMonths(months) {
  if (!Number.isFinite(months) || months <= 0) return 0;
  if (months === 12) return 365;
  if (months === 24) return 730;
  return months * 30;
}

// =============== API Endpoints ===============

// GET /api/orders
app.get("/api/orders", async (_req, res) => {
  console.log("[GET] /api/orders");
  try {
    const result = await pool.query("SELECT * FROM mavryk.order_list");
    res.json(result.rows);
  } catch (err) {
    console.error("Lỗi truy vấn (GET /api/orders):", err);
    res.status(500).json({ error: "Lỗi server nội bộ khi lấy đơn hàng" });
  }
});

// GET /api/supplies
app.get("/api/supplies", async (_req, res) => {
  console.log("[GET] /api/supplies");
  try {
    const result = await pool.query(
      "SELECT id, source_name FROM mavryk.supply ORDER BY source_name"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Lỗi truy vấn (GET /api/supplies):", err);
    res.status(500).json({ error: "Lỗi server nội bộ khi lấy danh sách nguồn" });
  }
});

// GET /api/supplies/:supplyId/products
app.get("/api/supplies/:supplyId/products", async (req, res) => {
  const { supplyId } = req.params;
  console.log(`[GET] /api/supplies/${supplyId}/products`);
  const q = `
    SELECT DISTINCT pp.id, pp.san_pham
    FROM mavryk.supply_price sp
    JOIN mavryk.product_price pp ON sp.product_id = pp.id
    WHERE sp.source_id = $1
    ORDER BY pp.san_pham;
  `;
  try {
    const result = await pool.query(q, [supplyId]);
    res.json(result.rows);
  } catch (err) {
    console.error("Lỗi truy vấn (GET supplies/:id/products):", err);
    res.status(500).json({ error: "Lỗi server nội bộ khi lấy sản phẩm theo nguồn" });
  }
});

// GET /api/products (chỉ sản phẩm active)
app.get("/api/products", async (_req, res) => {
  console.log("[GET] /api/products");
  const q = `
    SELECT id, san_pham
    FROM mavryk.product_price
    WHERE is_active = TRUE
    ORDER BY san_pham;
  `;
  try {
    const result = await pool.query(q);
    res.json(result.rows);
  } catch (err) {
    console.error("Lỗi truy vấn (GET /api/products):", err);
    res.status(500).json({ error: "Lỗi server nội bộ khi lấy danh sách sản phẩm" });
  }
});

// GET /api/products/supplies-by-name/:productName
app.get("/api/products/supplies-by-name/:productName", async (req, res) => {
  const { productName } = req.params;
  console.log(`[GET] /api/products/supplies-by-name/${productName}`);
  const q = `
    SELECT s.id, s.source_name
    FROM mavryk.supply s
    JOIN mavryk.supply_price sp ON s.id = sp.source_id
    JOIN mavryk.product_price pp ON sp.product_id = pp.id
    WHERE pp.san_pham = $1 AND pp.is_active = TRUE
    ORDER BY s.source_name;
  `;
  try {
    const result = await pool.query(q, [productName]);
    res.json(result.rows);
  } catch (err) {
    console.error("Lỗi truy vấn (GET supplies-by-name):", err);
    res.status(500).json({ error: "Lỗi server nội bộ khi lấy nguồn theo tên sản phẩm" });
  }
});

// POST /api/calculate-price — tính giá nhập (max) + giá bán theo hệ số
app.post("/api/calculate-price", async (req, res) => {
  console.log("[POST] /api/calculate-price");
  const { san_pham_name, id_don_hang, customer_type } = req.body || {};

  if (!san_pham_name || !id_don_hang) {
    return res.status(400).json({
      error: "Thiếu thông tin cần thiết (san_pham_name, id_don_hang).",
    });
  }

  try {
    // Lấy giá nhập cơ sở (cao nhất) và hệ số sản phẩm
    const q = `
      SELECT
        (SELECT MAX(sp_max.price)
         FROM mavryk.supply_price sp_max
         JOIN mavryk.product_price pp_max ON sp_max.product_id = pp_max.id
         WHERE pp_max.san_pham = $1) AS gia_nhap_co_so,
        pp.pct_ctv,
        pp.pct_khach
      FROM mavryk.product_price pp
      WHERE pp.san_pham = $1
      LIMIT 1;
    `;
    const db = await pool.query(q, [san_pham_name]);
    if (db.rowCount === 0 || db.rows[0].gia_nhap_co_so === null) {
      return res.status(404).json({ error: "Không tìm thấy giá cho sản phẩm này." });
    }

    const basePrice = Number(db.rows[0].gia_nhap_co_so);
    const pctCtv = Number(db.rows[0].pct_ctv) || 1.0;
    const pctKhach = Number(db.rows[0].pct_khach) || 1.0;

    // Xác định loại khách
    const prefixIsMAVC = (id_don_hang || "").toUpperCase().startsWith("MAVC");
    const explicitIsMAVC = (customer_type || "").toUpperCase() === "MAVC";
    const isMAVC = explicitIsMAVC || prefixIsMAVC;

    // Giá bán
    let finalPrice = basePrice;
    finalPrice = Math.round(isMAVC ? basePrice * pctCtv : basePrice * pctKhach);

    // Số ngày theo mẫu --xm
    const months = monthsFromString(san_pham_name);
    const days = daysFromMonths(months) || 30;

    res.json({
      gia_nhap: basePrice,
      gia_ban: finalPrice,
      so_ngay_da_dang_ki: Number(days),
      het_han: "", // FE tự tính từ ngày đăng ký + (days - 1)
    });
  } catch (err) {
    console.error(`[ERROR] Tính giá (${id_don_hang}):`, err.message || err);
    res.status(500).json({ error: "Lỗi server nội bộ khi tính toán giá." });
  }
});

// POST /api/orders — tạo mới
app.post("/api/orders", async (req, res) => {
  console.log("[POST] /api/orders (Tạo mới)");
  const newOrderData = { ...req.body };
  delete newOrderData.id; // DB tự sinh id

  const keys = Object.keys(newOrderData);
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
  const columns = keys.map((k) => `"${k}"`).join(", ");
  const values = Object.values(newOrderData);

  try {
    const q = `INSERT INTO mavryk.order_list (${columns}) VALUES (${placeholders}) RETURNING *;`;
    const result = await pool.query(q, values);
    if (result.rows.length === 0) {
      return res.status(500).json({ error: "Không thể tạo đơn hàng (không có dữ liệu trả về)." });
    }
    console.log(`Đã tạo đơn hàng ID: ${result.rows[0].id_don_hang}`);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Lỗi khi tạo đơn hàng (POST /api/orders):", err);
    res.status(500).json({ error: "Lỗi server nội bộ khi tạo đơn hàng" });
  }
});

// GET /api/products/all-prices-by-name/:productName — lấy tất cả giá theo nguồn cho 1 sản phẩm
app.get("/api/products/all-prices-by-name/:productName", async (req, res) => {
  const { productName } = req.params;
  const q = `
    SELECT sp.source_id, sp.price
    FROM mavryk.supply_price sp
    JOIN mavryk.product_price pp ON sp.product_id = pp.id
    WHERE pp.san_pham = $1;
  `;
  try {
    const result = await pool.query(q, [productName]);
    res.json(result.rows);
  } catch (err) {
    console.error("Lỗi khi lấy tất cả giá theo nguồn:", err);
    res.status(500).json({ error: "Lỗi server nội bộ." });
  }
});

// GET /api/run-scheduler — chạy thử cron job
app.get("/api/run-scheduler", async (_req, res) => {
  console.log("--- KÍCH HOẠT CHẠY CRON JOB THỬ CÔNG ---");
  try {
    await updateDatabaseTask();
    res.status(200).json({ success: true, message: "Đã chạy cron job thành công." });
  } catch (err) {
    res.status(500).json({ error: "Lỗi server nội bộ khi chạy cron job." });
  }
});

// 12) Khởi động server
app.listen(port, () => {
  console.log(`Backend server đang chạy tại http://localhost:${port}`);
});

