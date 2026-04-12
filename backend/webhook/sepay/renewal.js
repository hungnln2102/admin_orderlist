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
  VARIANT_TABLE,
  VARIANT_COLS,
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

const summaryTable = tableName(FINANCE_SCHEMA.DASHBOARD_MONTHLY_SUMMARY.TABLE, SCHEMA_FINANCE);
const summaryCols = FINANCE_SCHEMA.DASHBOARD_MONTHLY_SUMMARY.COLS;

const toMonthKey = (value) => {
  const parsedDate = parseFlexibleDate(value);
  if (!parsedDate) return null;
  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

const runRenewal = async (orderCode, { forceRenewal = false } = {}) => {
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
    const numericId = Number(sanPham);
    const isNumericId =
      Number.isFinite(numericId) &&
      String(numericId) === String(sanPham || "").trim();

    if (isNumericId) {
      try {
        const variantSql = `
          SELECT ${VARIANT_COLS.displayName} AS display_name
          FROM ${VARIANT_TABLE}
          WHERE ${VARIANT_COLS.id} = $1
          LIMIT 1
        `;
        const variantRes = await client.query(variantSql, [numericId]);
        const displayName = variantRes.rows[0]?.display_name;
        if (displayName) {
          productLabel = String(displayName);
        }
      } catch (lookupErr) {
        logger.warn("[Renewal] Không thể lấy display_name từ variant, fallback id_product", {
          orderCode,
          idProduct: sanPham,
          error: lookupErr.message,
        });
      }
    }

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
      ORDER_STATUS.PROCESSING,
      orderCode,
    ]);

    const isMavn = isMavnImportOrder({ id_order: orderCode });

    let supplierNameForNcc = "";
    if (supplierId != null && Number.isFinite(Number(supplierId))) {
      try {
        const supRes = await client.query(
          `SELECT supplier_name FROM supplier WHERE id = $1 LIMIT 1`,
          [supplierId]
        );
        supplierNameForNcc = String(supRes.rows[0]?.supplier_name ?? "").trim();
      } catch (e) {
        logger.warn("[Renewal] Không đọc được tên NCC", { supplierId, error: e.message });
      }
    }
    const skipNccLedger = isMavrykShopSupplierName(supplierNameForNcc);

    // Renewal flow: Cần Gia Hạn → Đang Xử Lý — ghi nhận vòng gia hạn vào dashboard tháng (trừ đơn MAVN nhập hàng).
    if (order[ORDER_COLS.status] === ORDER_STATUS.RENEWAL && !isMavn) {
      const monthKey = toMonthKey(formatDateDB(ngayBatDauMoi));
      if (monthKey) {
        const revenue = normalizeMoney(finalGiaBan);
        const cost = normalizeMoney(finalGiaNhap);
        const profit = revenue - cost;
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
      SAN_PHAM: sanPham,
      THONG_TIN_DON: thongTin,
      SLOT: slot,
      NGAY_DANG_KY: formatDateDMY(ngayBatDauMoi),
      HET_HAN: formatDateDMY(ngayHetHanMoi),
      NGUON: supplierId != null ? String(supplierId) : "",
      GIA_NHAP: finalGiaNhap,
      GIA_BAN: finalGiaBan,
      TINH_TRANG: ORDER_STATUS.PROCESSING,
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
