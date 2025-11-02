// index.js — Backend (UTF-8, tiếng Việt chuẩn)
// Logic: Tính Giá Nhập (cao nhất) và Giá Bán theo hệ số pct_ctv/pct_khach.

require("dotenv").config();
const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
const updateDatabaseTask = require("./scheduler");
const Helpers = require("./helpers");

const app = express();
const port = 3001;

// 1) CORS
const allowedOrigins = (process.env.FRONTEND_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((s) => s.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // allow non-browser or same-origin
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS: " + origin));
    },
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

/**
 * FIX LỖI DB DATE: Chuyển đổi định dạng ngày từ DD/MM/YYYY (từ Frontend) sang YYYY-MM-DD (cho DB DATE type).
 * @param {string} dmyString - Ngày ở định dạng DD/MM/YYYY
 * @returns {string} Ngày ở định dạng YYYY-MM-DD
 */
function convertDMYToYMD(dmyString) {
  if (
    !dmyString ||
    typeof dmyString !== "string" ||
    dmyString.length < 10 ||
    dmyString.indexOf("/") === -1
  ) {
    return dmyString;
  }
  const parts = dmyString.split("/");
  // parts[0]=DD, parts[1]=MM, parts[2]=YYYY
  if (parts.length === 3) {
    // Return YYYY-MM-DD
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dmyString;
}

// =============== Helpers cho Dashboard Stats ===============

/**
 * Tính toán ngày bắt đầu và kết thúc cho chu kỳ hiện tại và chu kỳ trước.
 * @returns {object} { currentStart, currentEnd, previousStart, previousEnd } (dạng 'YYYY-MM-DD')
 */
function calculatePeriods() {
  const now = new Date();
  // Lấy ngày giả định MOCK_DATE nếu đang ở chế độ test
  if (process.env.MOCK_DATE) {
    const mockDate = new Date(process.env.MOCK_DATE);
    if (!isNaN(mockDate)) {
      now.setTime(mockDate.getTime());
    }
  }

  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const currentDay = now.getDate();

  // Chu kỳ Hiện tại: 1/Tháng hiện tại đến Ngày hiện tại
  const currentStart = new Date(currentYear, currentMonth, 1);
  const currentEnd = new Date(currentYear, currentMonth, currentDay); // Ngày hôm nay

  // Chu kỳ Trước: 1/Tháng trước đến Ngày tương ứng của tháng trước
  const previousStart = new Date(currentYear, currentMonth - 1, 1);
  const previousEnd = new Date(currentYear, currentMonth - 1, currentDay);

  // Format sang 'YYYY-MM-DD' để SQL dễ xử lý
  const formatDate = (d) => d.toISOString().split("T")[0];

  return {
    currentStart: formatDate(currentStart),
    currentEnd: formatDate(currentEnd),
    previousStart: formatDate(previousStart),
    previousEnd: formatDate(previousEnd),
  };
}

// =============== API Endpoints ===============

// GET /api/dashboard/stats — Lấy 4 mục thống kê chính
app.get("/api/dashboard/stats", async (_req, res) => {
  console.log("[GET] /api/dashboard/stats");
  const periods = Helpers.calculatePeriods();

  // FIX: Loại bỏ TO_DATE vì các cột ngày đã là DATE type
  const q = `
    -- CTE: Lọc dữ liệu cho cả 2 chu kỳ (ngay_dang_ki đã là DATE)
    WITH period_data AS (
      SELECT
          id_don_hang,
          ngay_dang_ki AS registration_date, -- Dùng trực tiếp
          gia_nhap,
          gia_ban,
          (het_han - CURRENT_DATE) AS days_left -- Dùng trực tiếp
      FROM mavryk.order_list
      WHERE 
          -- Lọc cho cả hai chu kỳ tính toán
          ngay_dang_ki BETWEEN $1::date AND $2::date  -- Dùng trực tiếp
          OR ngay_dang_ki BETWEEN $3::date AND $4::date -- Dùng trực tiếp
    )
    SELECT
      -- 1. TỔNG ĐƠN HÀNG
      COALESCE(SUM(CASE 
        WHEN registration_date BETWEEN $3::date AND $4::date THEN 1 
        ELSE 0 
      END), 0) AS total_orders_current,
      COALESCE(SUM(CASE 
        WHEN registration_date BETWEEN $1::date AND $2::date THEN 1 
        ELSE 0 
      END), 0) AS total_orders_previous,
      
      -- 2. TỔNG NHẬP HÀNG (Tổng giá nhập)
      COALESCE(SUM(CASE 
        WHEN registration_date BETWEEN $3::date AND $4::date THEN gia_nhap 
        ELSE 0 
      END), 0) AS total_imports_current,
      COALESCE(SUM(CASE 
        WHEN registration_date BETWEEN $1::date AND $2::date THEN gia_nhap 
        ELSE 0 
      END), 0) AS total_imports_previous,

      -- 3. TỔNG LỢI NHUẬN (Tổng giá bán - Tổng giá nhập)
      COALESCE(SUM(CASE 
        WHEN registration_date BETWEEN $3::date AND $4::date THEN (gia_ban - gia_nhap)
        ELSE 0 
      END), 0) AS total_profit_current,
      COALESCE(SUM(CASE 
        WHEN registration_date BETWEEN $1::date AND $2::date THEN (gia_ban - gia_nhap) 
        ELSE 0 
      END), 0) AS total_profit_previous,
      
      -- 4. ĐƠN ĐẾN HẠN (Số đơn còn 1-4 ngày, tính theo ngày hiện tại)
      (
        SELECT COUNT(id_don_hang)
        FROM mavryk.order_list
        WHERE (het_han - CURRENT_DATE) BETWEEN 1 AND 4 -- Dùng trực tiếp
      ) AS overdue_orders_count
    FROM period_data;
  `;

  try {
    const result = await pool.query(q, [
      periods.previousStart,
      periods.previousEnd,
      periods.currentStart,
      periods.currentEnd,
    ]);

    // Format dữ liệu trả về theo cấu trúc Dashboard mong muốn
    const data = result.rows[0];

    res.json({
      totalOrders: {
        current: Number(data.total_orders_current),
        previous: Number(data.total_orders_previous),
      },
      totalImports: {
        current: Number(data.total_imports_current),
        previous: Number(data.total_imports_previous),
      },
      totalProfit: {
        current: Number(data.total_profit_current),
        previous: Number(data.total_profit_previous),
      },
      overdueOrders: {
        count: Number(data.overdue_orders_count),
      },
      periods: periods,
    });
  } catch (err) {
    console.error("Lỗi truy vấn (GET /api/dashboard/stats):", err);
    res
      .status(500)
      .json({ error: "Lỗi server nội bộ khi lấy dữ liệu thống kê" });
  }
});

// GET /api/orders
app.get("/api/orders", async (_req, res) => {
  console.log("[GET] /api/orders");
  try {
    // FIX: Loại bỏ TO_DATE và tính cột so_ngay_con_lai
    const result = await pool.query(`
      SELECT 
        *, 
        -- Tính số ngày còn lại: (Ngày Hết Hạn - Ngày Hiện Tại)
        (het_han - CURRENT_DATE) AS so_ngay_con_lai 
      FROM mavryk.order_list
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Lỗi truy vấn (GET /api/orders):", err);
    res.status(500).json({ error: "Lỗi server nội bộ khi lấy đơn hàng" });
  }
});

// GET /api/supplies
app.get("/api/supplies", async (_req, res) => {
  // ... (endpoint này giữ nguyên)
  console.log("[GET] /api/supplies");
  try {
    const result = await pool.query(
      "SELECT id, source_name FROM mavryk.supply ORDER BY source_name"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Lỗi truy vấn (GET /api/supplies):", err);
    res
      .status(500)
      .json({ error: "Lỗi server nội bộ khi lấy danh sách nguồn" });
  }
});

// GET /api/supplies/:supplyId/products
app.get("/api/supplies/:supplyId/products", async (req, res) => {
  // ... (endpoint này giữ nguyên)
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
    res
      .status(500)
      .json({ error: "Lỗi server nội bộ khi lấy sản phẩm theo nguồn" });
  }
});

// GET /api/products
app.get("/api/products", async (_req, res) => {
  // ... (endpoint này giữ nguyên)
  console.log("[GET] /api/products");
  const q = `
    SELECT id, san_pham
    FROM mavryk.product_price
    ORDER BY san_pham;
  `;
  try {
    const result = await pool.query(q);
    res.json(result.rows);
  } catch (err) {
    console.error("Lỗi truy vấn (GET /api/products):", err);
    res
      .status(500)
      .json({ error: "Lỗi server nội bộ khi lấy danh sách sản phẩm" });
  }
});

// GET /api/products/supplies-by-name/:productName
app.get("/api/products/supplies-by-name/:productName", async (req, res) => {
  // ... (endpoint này giữ nguyên)
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
    res
      .status(500)
      .json({ error: "Lỗi server nội bộ khi lấy nguồn theo tên sản phẩm" });
  }
});

// POST /api/calculate-price — tính giá nhập (max) + giá bán theo hệ số
app.post("/api/calculate-price", async (req, res) => {
  // ... (endpoint này giữ nguyên)
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
      return res
        .status(404)
        .json({ error: "Không tìm thấy giá cho sản phẩm này." });
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
    const months = Helpers.monthsFromString(san_pham_name);
    const days = Helpers.daysFromMonths(months) || 30;

    res.json({
      gia_nhap: basePrice,
      gia_ban: finalPrice,
      so_ngay_da_dang_ki: Number(days),
      het_han: "",
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
  delete newOrderData.id;

  // FIX LỖI DB DATE: Chuyển đổi định dạng ngày trước khi insert
  if (newOrderData.ngay_dang_ki) {
    newOrderData.ngay_dang_ki = Helpers.convertDMYToYMD(newOrderData.ngay_dang_ki);
  }
  if (newOrderData.het_han) {
    newOrderData.het_han = Helpers.convertDMYToYMD(newOrderData.het_han);
  }

  const keys = Object.keys(newOrderData);
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
  const columns = keys.map((k) => `"${k}"`).join(", ");
  const values = Object.values(newOrderData);

  try {
    const q = `INSERT INTO mavryk.order_list (${columns}) VALUES (${placeholders}) RETURNING *;`;
    const result = await pool.query(q, values);
    if (result.rows.length === 0) {
      return res
        .status(500)
        .json({ error: "Không thể tạo đơn hàng (không có dữ liệu trả về)." });
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
  // ... (endpoint này giữ nguyên)
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
  // ... (endpoint này giữ nguyên)
  console.log("--- KÍCH HOẠT CHẠY CRON JOB THỬ CÔNG ---");
  try {
    await updateDatabaseTask();
    res
      .status(200)
      .json({ success: true, message: "Đã chạy cron job thành công." });
  } catch (err) {
    res.status(500).json({ error: "Lỗi server nội bộ khi chạy cron job." });
  }
});

// 12) Khởi động server
app.listen(port, () => {
  console.log(`Backend server đang chạy tại http://localhost:${port}`);
});
