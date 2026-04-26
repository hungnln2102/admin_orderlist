const {
  monthsFromString,
  ORDER_PREFIXES,
  isMavnImportOrder,
} = require("../../helpers");
const { isMavrykShopSupplierName } = require("../../src/utils/orderHelpers");
const {
  pool,
  ORDER_TABLE,
  ORDER_COLS,
  PAYMENT_RECEIPT_TABLE,
  PAYMENT_RECEIPT_COLS,
  VARIANT_TABLE,
  VARIANT_COLS,
  SUPPLIER_TABLE,
  SUPPLIER_COLS,
} = require("./config");
const { FINANCE_SCHEMA, SCHEMA_FINANCE, tableName } = require("../../src/config/dbSchema");
const { STATUS: ORDER_STATUS } = require("../../src/controllers/Order/constants");
const {
  parseFlexibleDate,
  normalizeProductDuration,
  normalizeMoney,
  formatDateDMY,
  formatDateDB,
  addMonthsClamped,
  addDays,
} = require("./utils");
const { updatePaymentSupplyBalance } = require("./payments");
const logger = require("../../src/utils/logger");

const { calculateRenewalPricing, computeOrderCurrentPrice } = require("./renewalPricing");
const {
  fetchOrderState,
  isEligibleForRenewal,
  fetchRenewalCandidates,
} = require("./renewalEligibility");
const {
  pendingRenewalTasks,
  queueRenewalTask,
  processRenewalTask,
  runRenewalBatch,
} = require("./renewalQueue");

const { recomputeSummaryMonthTotalTax } = require("../../src/controllers/Order/finance/dashboardSummary");
const summaryTable = tableName(FINANCE_SCHEMA.DASHBOARD_MONTHLY_SUMMARY.TABLE, SCHEMA_FINANCE);
const summaryCols = FINANCE_SCHEMA.DASHBOARD_MONTHLY_SUMMARY.COLS;
const VARIANT_ID_COL = VARIANT_COLS.id || VARIANT_COLS.ID || "id";
const VARIANT_DISPLAY_NAME_COL =
  VARIANT_COLS.displayName || VARIANT_COLS.DISPLAY_NAME || "display_name";
const VARIANT_NAME_COL = VARIANT_COLS.variantName || VARIANT_COLS.VARIANT_NAME || "variant_name";
const PAYMENT_RECEIPT_BASE_TABLE = PAYMENT_RECEIPT_TABLE.split(".").pop();
const PAYMENT_RECEIPT_SCHEMA =
  process.env.DB_SCHEMA_RECEIPT || process.env.SCHEMA_RECEIPT || "receipt";
const PAYMENT_RECEIPT_TABLE_RESOLVED = `${PAYMENT_RECEIPT_SCHEMA}.${PAYMENT_RECEIPT_BASE_TABLE}`;
const PAYMENT_RECEIPT_FINANCIAL_STATE_TABLE = `${PAYMENT_RECEIPT_SCHEMA}.payment_receipt_financial_state`;

const formatDurationLabel = (raw) => {
  if (!raw) return "";
  const normalized = String(raw).trim().replace(/\s+/g, "");
  const match = normalized.match(/^(\d+)([mMyYdD])$/i);
  if (!match) return String(raw);
  const num = match[1];
  const unit = String(match[2]).toLowerCase();
  if (unit === "m") return `${num} tháng`;
  if (unit === "y") return `${Number(num) * 12} tháng`;
  if (unit === "d") return `${num} ngày`;
  return String(raw);
};

const extractDurationFromText = (text) => {
  if (!text) return "";
  const match = String(text).match(/--\s*([\d]+\s*[mMyYdD])/i);
  return match ? formatDurationLabel(match[1]) : "";
};

const stripDurationSuffix = (text) =>
  String(text || "")
    .replace(/--\s*[\d]+\s*[mMyYdD]\b/gi, "")
    .replace(/[_-]+$/g, "")
    .trim();

const buildReadableVariantLabel = ({ variantName, displayName, fallback }) => {
  const normalizedVariantName = String(variantName || "").trim();
  const normalizedDisplayName = String(displayName || "").trim();
  const duration =
    extractDurationFromText(normalizedDisplayName) ||
    extractDurationFromText(String(fallback || ""));
  const fallbackLabel = String(fallback || "").trim();
  const baseLabel = normalizedVariantName || normalizedDisplayName || fallbackLabel;
  const cleanedBaseLabel = stripDurationSuffix(baseLabel) || baseLabel;
  if (normalizedVariantName) {
    return `${cleanedBaseLabel}${duration ? ` (${duration})` : ""}`;
  }
  return `${cleanedBaseLabel}${duration ? ` (${duration})` : ""}`.trim();
};

const toMonthKey = (value) => {
  const parsedDate = parseFlexibleDate(value);
  if (!parsedDate) return null;
  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

const hasPostedReceiptForOrder = async (client, orderCode, orderDateRaw) => {
  const normalizedCode = String(orderCode || "").trim();
  if (!normalizedCode) return false;
  const parsedOrderDate = parseFlexibleDate(orderDateRaw);
  const fromDate = parsedOrderDate
    ? parsedOrderDate.toISOString().slice(0, 10)
    : "1900-01-01";
  const res = await client.query(
    `
      SELECT 1
      FROM ${PAYMENT_RECEIPT_TABLE_RESOLVED} pr
      INNER JOIN ${PAYMENT_RECEIPT_FINANCIAL_STATE_TABLE} fs
        ON fs.payment_receipt_id = pr.${PAYMENT_RECEIPT_COLS.id}
      WHERE LOWER(COALESCE(pr.${PAYMENT_RECEIPT_COLS.orderCode}::text, '')) = LOWER($1)
        AND pr.${PAYMENT_RECEIPT_COLS.paidDate} >= $2::date
        AND fs.is_financial_posted = TRUE
      LIMIT 1
    `,
    [normalizedCode, fromDate]
  );
  return res.rows.length > 0;
};

const runRenewal = async (orderCode, { forceRenewal = false, source = "webhook" } = {}) => {
  if (!orderCode) {
    return { success: false, details: "Thiếu mã đơn hàng", processType: "error" };
  }

  const client = await pool.connect();
  try {
    const orderRes = await client.query(
      `SELECT
        ${ORDER_COLS.idProduct},
        ${ORDER_COLS.expiryDate},
        ${ORDER_COLS.idSupply},
        ${ORDER_COLS.cost},
        ${ORDER_COLS.price},
        ${ORDER_COLS.informationOrder},
        ${ORDER_COLS.slot},
        ${ORDER_COLS.orderDate},
        ${ORDER_COLS.status}
      FROM ${ORDER_TABLE}
      WHERE LOWER(${ORDER_COLS.idOrder}) = LOWER($1)
      LIMIT 1`,
      [orderCode]
    );

    if (!orderRes.rows.length) {
      return {
        success: false,
        details: `Không tìm thấy đơn ${orderCode}`,
        processType: "error",
      };
    }

    const order = orderRes.rows[0];
    const sanPham = order[ORDER_COLS.idProduct];
    const hetHan = parseFlexibleDate(order[ORDER_COLS.expiryDate]);
    const idSupplyRaw = order[ORDER_COLS.idSupply];
    const supplierId = idSupplyRaw != null && Number.isFinite(Number(idSupplyRaw))
      ? Number(idSupplyRaw) : null;
    const giaNhapCu = normalizeMoney(order[ORDER_COLS.cost]);
    const giaBanCu = normalizeMoney(order[ORDER_COLS.price]);
    const thongTin = order[ORDER_COLS.informationOrder];
    const slot = order[ORDER_COLS.slot];

    if (!hetHan) {
      return {
        success: false,
        details: `Ngày hết hạn không hợp lệ cho đơn${orderCode}`,
        processType: "error",
      };
    }

    const daysLeft = Math.floor((hetHan.getTime() - Date.now()) / 86_400_000);

    if (!forceRenewal && daysLeft > 4) {
      return {
        success: false,
        details: `Bỏ qua, còn ${daysLeft} ngay`,
        processType: "skipped",
      };
    }

    // Xác định nhãn sản phẩm để đọc thời hạn:
    // - Nếu id_product là số (ID variant), ưu tiên dùng variant.display_name (vd: NETFLIX_SLOT--1M).
    // - Nếu không, dùng trực tiếp giá trị id_product như trước đây.
    let productLabel = sanPham || "";
    let productDisplayLabel = String(sanPham || "").trim();
    const numericId = Number(sanPham);
    const isNumericId =
      Number.isFinite(numericId) &&
      String(numericId) === String(sanPham || "").trim();

    if (isNumericId) {
      try {
        const variantSql = `
          SELECT
            ${VARIANT_DISPLAY_NAME_COL} AS display_name,
            ${VARIANT_NAME_COL} AS variant_name
          FROM ${VARIANT_TABLE}
          WHERE ${VARIANT_ID_COL} = $1
          LIMIT 1
        `;
        const variantRes = await client.query(variantSql, [numericId]);
        const displayName = variantRes.rows[0]?.display_name;
        const variantName = variantRes.rows[0]?.variant_name;
        if (displayName) {
          productLabel = String(displayName);
        }
        productDisplayLabel = buildReadableVariantLabel({
          variantName,
          displayName,
          fallback: productLabel || sanPham,
        });
      } catch (lookupErr) {
        logger.warn("[Renewal] Không thể lấy display_name từ variant, fallback id_product", {
          orderCode,
          idProduct: sanPham,
          error: lookupErr.message,
        });
      }
    }
    productDisplayLabel = buildReadableVariantLabel({
      variantName: "",
      displayName: productDisplayLabel,
      fallback: sanPham,
    });

    const productNormalized = normalizeProductDuration(productLabel || "");
    const months = monthsFromString(productNormalized);
    if (!months) {
      return {
        success: false,
        details: "Không xác định được thời hạn sản phẩm",
        processType: "error",
      };
    }

    const fallbackSoNgay = months * 30;

    const {
      pricing,
      productId,
      variantId,
      pctCtv,
      pctKhach,
      giaNhapSource,
      maxPriceRow,
      normalizedNhap,
      normalizedPriceMax,
      effectivePriceMax,
    } = await calculateRenewalPricing(client, {
      sanPham,
      supplierId,
      orderCode,
      fallbackCost: giaNhapCu,
      fallbackPrice: giaBanCu,
      forceKhachLe:
        Boolean(ORDER_PREFIXES?.promo) &&
        orderCode.toUpperCase().startsWith(ORDER_PREFIXES.promo.toUpperCase()),
    });
    const pricingMeta = pricing.meta;
    const pctCtvNormalized = pricingMeta?.pctCtv ?? 0;

    const pctKhachNormalized = pricingMeta?.pctKhach ?? 0;

    // Gói khuyến mãi (MAVK) hết hạn → gia hạn theo giá khách lẻ
    const finalGiaNhap = pricing.cost;
    const finalGiaBan = pricing.price;

    const ngayHetHanCu = new Date(hetHan.getTime());
    ngayHetHanCu.setHours(0, 0, 0, 0);
    const ngayBatDauMoi = addDays(ngayHetHanCu, 1);
    const ngayHetHanTheoThang = addMonthsClamped(ngayBatDauMoi, months);
    const ngayHetHanMoi = addDays(ngayHetHanTheoThang, -1);
    const soNgayGiaHan = Math.max(
      1,
      Math.round((ngayHetHanMoi.getTime() - ngayBatDauMoi.getTime()) / 86_400_000) + 1
    );

    logger.info("[Renewal] Calculated span", {
      orderCode,
      months,
      fallbackSoNgay,
      soNgayGiaHan,
      start: formatDateDMY(ngayBatDauMoi),
      expired: formatDateDMY(ngayHetHanMoi),
      giaNhap: finalGiaNhap,
      giaBan: finalGiaBan,
      priceMax: effectivePriceMax,
      rawGiaNhap: giaNhapSource,
      rawPriceMax: maxPriceRow,
      normalizedGiaNhap: normalizedNhap,
      normalizedPriceMax,
      pctCtv,
      pctKhach,
      variantId,
      pctCtvNormalized,
      pctKhachNormalized,
      supplierId,
      productId: variantId || productId,
      variantId,
      status: order[ORDER_COLS.status],
    });

    let supplierNameForNcc = "";
    if (supplierId != null && Number.isFinite(Number(supplierId))) {
      try {
        const supRes = await client.query(
          `SELECT ${SUPPLIER_COLS.supplierName} FROM ${SUPPLIER_TABLE}
           WHERE ${SUPPLIER_COLS.id} = $1 LIMIT 1`,
          [supplierId]
        );
        supplierNameForNcc = String(
          supRes.rows[0]?.[SUPPLIER_COLS.supplierName] ?? ""
        ).trim();
      } catch (e) {
        logger.warn("[Renewal] Không đọc được tên NCC", { supplierId, error: e.message });
      }
    }
    const isMavn = isMavnImportOrder({ id_order: orderCode });
    // MAVN không dùng NCC Mavryk — luôn cộng NCC khi gia hạn. Đơn khác + NCC Mavryk/Shop: không cộng NCC.
    const skipNccLedger = !isMavn && isMavrykShopSupplierName(supplierNameForNcc);
    // Rule mới: gia hạn thành công chuyển Đã Thanh Toán cho tất cả mã đơn.
    const renewalNextStatus = ORDER_STATUS.PAID;

    const updateSql = `
      UPDATE ${ORDER_TABLE}
      SET
        ${ORDER_COLS.orderDate} = $1,
        ${ORDER_COLS.days} = $2,
        ${ORDER_COLS.expiryDate} = $3,
        ${ORDER_COLS.cost} = $4,
        ${ORDER_COLS.price} = $5,
        ${ORDER_COLS.status} = $6
      WHERE ${ORDER_COLS.idOrder} = $7
    `;

    await client.query(updateSql, [
      formatDateDB(ngayBatDauMoi),
      soNgayGiaHan,
      formatDateDB(ngayHetHanMoi),
      finalGiaNhap,
      finalGiaBan,
      renewalNextStatus,
      orderCode,
    ]);

    // Renewal: gia hạn thành công đều chuyển Đã Thanh Toán.
    if (order[ORDER_COLS.status] === ORDER_STATUS.RENEWAL && !isMavn) {
      const shouldSkipSummaryForManual = source === "manual" && (
        await hasPostedReceiptForOrder(client, orderCode, order[ORDER_COLS.orderDate])
      );
      if (shouldSkipSummaryForManual) {
        logger.info("[Renewal] Skip dashboard summary for manual renewal (receipt already posted)", {
          orderCode,
          source,
        });
      }
      const monthKey = toMonthKey(formatDateDB(ngayBatDauMoi));
      if (monthKey && !shouldSkipSummaryForManual) {
        const revenue = normalizeMoney(finalGiaBan);
        const cost = normalizeMoney(finalGiaNhap);
        // NCC Mavryk/Shop: không ghi nhận cost vào profit khi renewal.
        const profit = skipNccLedger ? revenue : (revenue - cost);
        await client.query(
          `
            INSERT INTO ${summaryTable} (
              ${summaryCols.MONTH_KEY},
              ${summaryCols.TOTAL_ORDERS},
              ${summaryCols.TOTAL_REVENUE},
              ${summaryCols.TOTAL_PROFIT},
              ${summaryCols.UPDATED_AT}
            )
            VALUES ($1, $2, $3, $4, NOW())
            ON CONFLICT (${summaryCols.MONTH_KEY})
            DO UPDATE SET
              ${summaryCols.TOTAL_ORDERS} = GREATEST(0, ${summaryTable}.${summaryCols.TOTAL_ORDERS} + EXCLUDED.${summaryCols.TOTAL_ORDERS}),
              ${summaryCols.TOTAL_REVENUE} = ${summaryTable}.${summaryCols.TOTAL_REVENUE} + EXCLUDED.${summaryCols.TOTAL_REVENUE},
              ${summaryCols.TOTAL_PROFIT} = ${summaryTable}.${summaryCols.TOTAL_PROFIT} + EXCLUDED.${summaryCols.TOTAL_PROFIT},
              ${summaryCols.UPDATED_AT} = NOW()
          `,
          [monthKey, 1, revenue, profit]
        );
        await recomputeSummaryMonthTotalTax(client, monthKey);
      }
    } else if (order[ORDER_COLS.status] === ORDER_STATUS.RENEWAL && isMavn) {
      logger.info("[Renewal] Bỏ cộng dashboard_monthly_summary (đơn MAVN nhập hàng)", {
        orderCode,
      });
    }
    if (supplierId && Number.isFinite(finalGiaNhap) && finalGiaNhap > 0 && !skipNccLedger) {
      try {
        await updatePaymentSupplyBalance(supplierId, finalGiaNhap, ngayBatDauMoi);
      } catch (balanceErr) {
        logger.error("Không thể cập nhật giá nhập cho Nhà Cung Cấp", { orderCode, error: balanceErr.message, stack: balanceErr.stack });
      }
    } else if (skipNccLedger && supplierId && finalGiaNhap > 0) {
      logger.info("[Renewal] Bỏ cộng công nợ NCC (NCC Mavryk/Shop)", {
        orderCode,
        supplierId,
        finalGiaNhap,
        isMavn,
      });
    }

    const details = {
      ID_DON_HANG: orderCode,
      SAN_PHAM: String(productDisplayLabel || productLabel || sanPham || "").trim(),
      THONG_TIN_DON: thongTin,
      SLOT: slot,
      NGAY_DANG_KY: formatDateDMY(ngayBatDauMoi),
      HET_HAN: formatDateDMY(ngayHetHanMoi),
      NGUON: supplierNameForNcc || (supplierId != null ? String(supplierId) : ""),
      GIA_NHAP: finalGiaNhap,
      GIA_BAN: finalGiaBan,
      TINH_TRANG: renewalNextStatus,
    };

    return { success: true, details, processType: "renewal" };
  } catch (err) {
    logger.error("Error renewing order", { orderCode, error: err.message, stack: err.stack });
    return { success: false, details: err.message || String(err), processType: "error" };
  } finally {
    client.release();
  }
};

module.exports = {
  runRenewal,
  fetchOrderState,
  isEligibleForRenewal,
  queueRenewalTask,
  processRenewalTask,
  fetchRenewalCandidates,
  runRenewalBatch,
  pendingRenewalTasks,
  computeOrderCurrentPrice,
};
