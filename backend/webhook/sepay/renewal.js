const { monthsFromString, ORDER_PREFIXES } = require("../../helpers");
const {
  pool,
  ORDER_TABLE,
  ORDER_COLS,
  VARIANT_TABLE,
  VARIANT_COLS,
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,
  SEND_RENEWAL_TO_TOPIC,
} = require("./config");
const { FINANCE_SCHEMA, SCHEMA_FINANCE, tableName } = require("../../src/config/dbSchema");
const { STATUS: ORDER_STATUS } = require("../../src/controllers/Order/constants");
const {
  parseFlexibleDate,
  normalizeProductDuration,
  normalizeMoney,
  normalizeImportValue,
  formatDateDMY,
  formatDateDB,
  addMonthsClamped,
  addDays,
  fetchProductPricing,
  fetchSupplyPrice,
  fetchMaxSupplyPrice,
  daysUntil,
} = require("./utils");
const { updatePaymentSupplyBalance } = require("./payments");
const { sendRenewalNotification } = require("./notifications");
const logger = require("../../src/utils/logger");
const {
  calculateOrderPricingFromResolvedValues,
  resolveMoney,
} = require("../../src/services/pricing/core");

const pendingRenewalTasks = new Map(); // orderCode -> task state
const summaryTable = tableName(FINANCE_SCHEMA.DASHBOARD_MONTHLY_SUMMARY.TABLE, SCHEMA_FINANCE);
const summaryCols = FINANCE_SCHEMA.DASHBOARD_MONTHLY_SUMMARY.COLS;

const toMonthKey = (value) => {
  const parsedDate = parseFlexibleDate(value);
  if (!parsedDate) return null;
  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

const calculateRenewalPricing = async (
  client,
  { sanPham, supplierId, orderCode, fallbackCost, fallbackPrice, forceKhachLe }
) => {
  const { productId, variantId, pctCtv, pctKhach, pctPromo, pctStu } =
    await fetchProductPricing(client, sanPham);
  const giaNhapSource = await fetchSupplyPrice(
    client,
    { variantId, productId },
    supplierId
  );
  const maxPriceRow = await fetchMaxSupplyPrice(client, { variantId, productId });

  const normalizedNhap = normalizeImportValue(giaNhapSource, fallbackCost || undefined);
  const latestGiaNhap = resolveMoney(
    normalizedNhap?.value,
    giaNhapSource,
    fallbackCost
  );

  const normalizedPriceMax = normalizeImportValue(
    maxPriceRow,
    latestGiaNhap || fallbackCost || undefined
  );
  const priceMax = resolveMoney(
    normalizedPriceMax?.value,
    maxPriceRow,
    fallbackPrice,
    latestGiaNhap
  );
  const effectivePriceMax = resolveMoney(priceMax, fallbackPrice, latestGiaNhap);

  const pricing = calculateOrderPricingFromResolvedValues({
    orderId: orderCode,
    pricingBase: effectivePriceMax,
    importPrice: latestGiaNhap,
    fallbackPrice,
    fallbackCost,
    pctCtv,
    pctKhach,
    pctPromo,
    pctStu,
    forceKhachLe,
    roundCostToThousands: false,
  });

  return {
    pricing,
    productId,
    variantId,
    pctCtv,
    pctKhach,
    pctPromo,
    pctStu,
    giaNhapSource,
    maxPriceRow,
    normalizedNhap,
    normalizedPriceMax,
    effectivePriceMax,
  };
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
        Boolean(ORDER_PREFIXES?.khuyen) &&
        orderCode.toUpperCase().startsWith(ORDER_PREFIXES.khuyen.toUpperCase()),
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

    // Renewal flow: khi đơn từ Cần Gia Hạn -> Đang Xử Lý, ghi nhận vòng gia hạn mới vào dashboard tháng.
    if (order[ORDER_COLS.status] === ORDER_STATUS.RENEWAL) {
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
    }

    if (supplierId && Number.isFinite(finalGiaNhap) && finalGiaNhap > 0) {
      try {
        await updatePaymentSupplyBalance(supplierId, finalGiaNhap, ngayBatDauMoi);
      } catch (balanceErr) {
        logger.error("Không thể cập nhật giá nhập cho Nhà Cung Cấp", { orderCode, error: balanceErr.message, stack: balanceErr.stack });
      }
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

const fetchOrderState = async (orderCode) => {
  const client = await pool.connect();
  try {
    const res = await client.query(
      `SELECT
        ${ORDER_COLS.status},
        ${ORDER_COLS.expiryDate}
      FROM ${ORDER_TABLE}
      WHERE LOWER(${ORDER_COLS.idOrder}) = LOWER($1)
      LIMIT 1`,
      [orderCode]
    );
    return res.rows[0] || null;
  } finally {
    client.release();
  }
};

const isEligibleForRenewal = (statusValue, expiryDate) => {
  const statusText = String(statusValue || "");
  const daysLeft = daysUntil(expiryDate);

  // Chỉ trạng thái Cần Gia Hạn (RENEWAL) mới được phép gia hạn tự động.
  // PROCESSING là trạng thái SAU KHI renewal, không phải điều kiện để renewal.
  // Hết Hạn (EXPIRED) không còn eligible trong rule mới.
  const readyForRenew = daysLeft <= 4 && statusText === ORDER_STATUS.RENEWAL;

  return {
    eligible: readyForRenew,
    forceRenewal: false,
    daysLeft,
    statusNorm: statusText,
  };
};

const queueRenewalTask = (orderCode, options = {}) => {
  if (!orderCode) return null;
  const key = orderCode.trim();
  if (!key) return null;
  const existing = pendingRenewalTasks.get(key) || {};
  const task = {
    orderCode: key,
    renewalDone: existing.renewalDone || false,
    telegramDone: existing.telegramDone || false,
    lastRenewalResult: existing.lastRenewalResult || null,
    renewalAttempts: existing.renewalAttempts || 0,
    telegramAttempts: existing.telegramAttempts || 0,
    lastError: existing.lastError || null,
    forceRenewal: existing.forceRenewal || options.forceRenewal || false,
  };
  pendingRenewalTasks.set(key, task);
  return task;
};

const processRenewalTask = async (orderCode) => {
  const task = pendingRenewalTasks.get(orderCode);
  if (!task) return null;

  const state = await fetchOrderState(orderCode);
  if (!state) {
    pendingRenewalTasks.delete(orderCode);
    return { orderCode, skipped: true, reason: "not found" };
  }

  const { eligible, forceRenewal } = isEligibleForRenewal(
    state[ORDER_COLS.status],
    state[ORDER_COLS.expiryDate]
  );

  if (!eligible) {
    pendingRenewalTasks.delete(orderCode);
    return { orderCode, skipped: true, reason: "not eligible" };
  }

  if (!task.renewalDone) {
    try {
      const renewalResult = await runRenewal(orderCode, {
        forceRenewal: task.forceRenewal || forceRenewal,
      });
      task.renewalAttempts += 1;
      task.lastRenewalResult = renewalResult;
      task.renewalDone = !!renewalResult?.success;
      task.lastError = task.renewalDone ? null : renewalResult?.details || "Renewal failed";
    } catch (err) {
      task.renewalAttempts += 1;
      task.lastError = err?.message || String(err);
      return {
        orderCode,
        success: false,
        error: task.lastError,
        renewalDone: false,
        telegramDone: task.telegramDone,
      };
    }
  }

  if (task.renewalDone && !task.telegramDone) {
    if (!isTelegramEnabled()) {
      task.telegramDone = true;
    } else {
      try {
        await sendRenewalNotification(orderCode, task.lastRenewalResult);
        task.telegramAttempts += 1;
        task.telegramDone = true;
        task.lastError = null;
      } catch (err) {
        task.telegramAttempts += 1;
        task.lastError = err?.message || String(err);
        return {
          orderCode,
          success: false,
          error: task.lastError,
          renewalDone: true,
          telegramDone: false,
        };
      }
    }
  }

  const success = task.renewalDone && task.telegramDone;
  if (success) {
    pendingRenewalTasks.delete(orderCode);
  } else {
    pendingRenewalTasks.set(orderCode, task);
  }

  return {
    orderCode,
    success,
    renewalDone: task.renewalDone,
    telegramDone: task.telegramDone,
    lastError: task.lastError,
  };
};

const fetchRenewalCandidates = async () => {
  const client = await pool.connect();
  try {
    const res = await client.query(
      `SELECT
        ${ORDER_COLS.idOrder} AS order_code,
        ${ORDER_COLS.status} AS status_value,
        ${ORDER_COLS.expiryDate} AS expiry_date_value
      FROM ${ORDER_TABLE}
      WHERE TRIM(${ORDER_COLS.idOrder}::text) <> ''`
    );

    const candidates = [];
    for (const row of res.rows) {
      const orderCode = (row.order_code || "").trim();
      if (!orderCode) continue;
      const eligibility = isEligibleForRenewal(
        row.status_value,
        row.expiry_date_value
      );

      if (eligibility.eligible) {
        candidates.push({
          orderCode,
          forceRenewal: eligibility.forceRenewal,
          daysLeft: eligibility.daysLeft,
          status: eligibility.statusNorm,
        });
      }
    }
    return candidates;
  } finally {
    client.release();
  }
};

const runRenewalBatch = async ({ orderCodes, forceRenewal = false } = {}) => {
  const targets =
    Array.isArray(orderCodes) && orderCodes.length
      ? orderCodes
          .map((code) => ({
            orderCode: String(code || "").trim(),
            forceRenewal,
          }))
          .filter((c) => c.orderCode)
      : await fetchRenewalCandidates();

  for (const target of targets) {
    queueRenewalTask(target.orderCode, {
      forceRenewal: target.forceRenewal,
    });
  }

  const results = [];
  for (const target of targets) {
    const code = target.orderCode;
    if (!code) continue;
    const outcome = await processRenewalTask(code);
    if (outcome) {
      results.push(outcome);
    }
  }

  const succeeded = results.filter((r) => r?.success).length;
  return {
    total: targets.length,
    succeeded,
    failed: results.length - succeeded,
    results,
  };
};

const isTelegramEnabled = () =>
  Boolean(TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID && SEND_RENEWAL_TO_TOPIC !== false);

/**
 * Tính lại giá bán và giá nhập theo giá hiện tại (product/supplier cost).
 * Dùng trước khi gửi thông báo Telegram "đơn cần gia hạn" để caption và QR dùng đúng giá mới.
 * Không ghi DB.
 * @param {object} client - pg client (từ pool.connect())
 * @param {object} orderRow - 1 row đơn hàng (có id_product, supply, cost, price)
 * @returns {{ price: number, cost: number }} - Giá bán và giá nhập đã tính (fallback về giá cũ nếu lỗi)
 */
const computeOrderCurrentPrice = async (client, orderRow) => {
  const fallbackPrice = normalizeMoney(orderRow?.[ORDER_COLS.price] ?? 0);
  const fallbackCost = normalizeMoney(orderRow?.[ORDER_COLS.cost] ?? 0);

  try {
    const sanPham = orderRow?.[ORDER_COLS.idProduct];
    const idSupplyRaw = orderRow?.[ORDER_COLS.idSupply];
    const supplierId = idSupplyRaw != null && Number.isFinite(Number(idSupplyRaw))
      ? Number(idSupplyRaw) : null;
    const giaNhapCu = normalizeMoney(orderRow?.[ORDER_COLS.cost]);
    const giaBanCu = normalizeMoney(orderRow?.[ORDER_COLS.price]);

    if (!sanPham) {
      return { price: fallbackPrice, cost: fallbackCost };
    }

    const { pricing } = await calculateRenewalPricing(client, {
      sanPham,
      supplierId,
      orderCode: String(orderRow?.[ORDER_COLS.idOrder] || ""),
      fallbackCost: giaNhapCu,
      fallbackPrice: giaBanCu,
      forceKhachLe:
        Boolean(ORDER_PREFIXES?.khuyen) &&
        String(orderRow?.[ORDER_COLS.idOrder] || "")
          .toUpperCase()
          .startsWith(ORDER_PREFIXES.khuyen.toUpperCase()),
    });
    return { price: pricing.price, cost: pricing.cost };
    /* legacy pricing path removed
    const maxPriceRow = await fetchMaxSupplyPrice(client, { variantId, productId });

    const normalizedNhap = normalizeImportValue(giaNhapSource, giaNhapCu || undefined);
    const latestGiaNhap = resolveMoney(normalizedNhap?.value, giaNhapSource, giaNhapCu);

    const normalizedPriceMax = normalizeImportValue(
      maxPriceRow,
      latestGiaNhap || giaNhapCu || undefined
    );
    const priceMax = resolveMoney(
      normalizedPriceMax?.value,
      maxPriceRow,
      giaBanCu,
      latestGiaNhap
    );
    const effectivePriceMax = resolveMoney(priceMax, giaBanCu, latestGiaNhap);

    // Gói khuyến mãi (MAVK) hết hạn → thông báo theo giá khách lẻ
    const idOrderForPrice = String(orderRow?.[ORDER_COLS.idOrder] || "");
    const isPromoOrderForPrice =
      Boolean(ORDER_PREFIXES?.khuyen) &&
      idOrderForPrice.toUpperCase().startsWith(ORDER_PREFIXES.khuyen.toUpperCase());
    const finalGiaBanRaw = calcGiaBan({
      orderId: idOrderForPrice,
      giaNhap: latestGiaNhap,
      priceMax: effectivePriceMax,
      pctCtv,
      pctKhach,
      giaBanFallback: giaBanCu,
      forceKhachLe: isPromoOrderForPrice,
    });

    const finalGiaNhap = resolveMoney(latestGiaNhap, giaNhapCu);
    const finalGiaBan = resolveMoney(
      roundToThousands(finalGiaBanRaw || 0),
      effectivePriceMax,
      giaBanCu,
      latestGiaNhap
    );

    */
  } catch (err) {
    logger.warn("[Renewal] computeOrderCurrentPrice failed, using stored price", {
      orderCode: orderRow?.[ORDER_COLS.idOrder],
      error: err?.message,
    });
    return { price: fallbackPrice, cost: fallbackCost };
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

