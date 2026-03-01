const { monthsFromString } = require("../../helpers");
const {
  pool,
  ORDER_TABLE,
  ORDER_COLS,
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,
  SEND_RENEWAL_TO_TOPIC,
} = require("./config");
const { STATUS: ORDER_STATUS } = require("../../src/controllers/Order/constants");
const {
  parseFlexibleDate,
  normalizeProductDuration,
  normalizeMoney,
  normalizeImportValue,
  roundToThousands,
  formatDateDMY,
  formatDateDB,
  addMonthsClamped,
  addDays,
  fetchProductPricing,
  fetchSupplyPrice,
  fetchMaxSupplyPrice,
  daysUntil,
  calcGiaBan,
} = require("./utils");
const { updatePaymentSupplyBalance } = require("./payments");
const { sendRenewalNotification } = require("./notifications");
const logger = require("../../src/utils/logger");

const pendingRenewalTasks = new Map(); // orderCode -> task state

const runRenewal = async (orderCode, { forceRenewal = false } = {}) => {
  if (!orderCode) {
    return { success: false, details: "Thiếu mã đơn hàng", processType: "error" };
  }

  const client = await pool.connect();
  try {
    const orderRes = await client.query(
      `SELECT
        ${ORDER_COLS.idProduct},
        ${ORDER_COLS.orderExpired},
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
    const hetHan = parseFlexibleDate(order[ORDER_COLS.orderExpired]);
    const idSupplyRaw = order[ORDER_COLS.idSupply];
    const supplierId = idSupplyRaw != null && Number.isFinite(Number(idSupplyRaw))
      ? Number(idSupplyRaw) : null;
    const giaNhapCu = normalizeMoney(order[ORDER_COLS.cost]);
    const giaBanCu = normalizeMoney(order[ORDER_COLS.price]);
    const thongTin = order[ORDER_COLS.informationOrder];
    const slot = order[ORDER_COLS.slot];

    const resolveMoney = (computedValue, ...fallbackValues) => {
      if (Number.isFinite(computedValue) && computedValue > 0) {
        return Math.round(computedValue);
      }
      for (const candidate of fallbackValues) {
        if (candidate === null || candidate === undefined) continue;
        const normalized = normalizeMoney(candidate);
        if (Number.isFinite(normalized) && normalized > 0) {
          return normalized;
        }
      }
      const lastDefined = fallbackValues.find(
        (candidate) => candidate !== null && candidate !== undefined
      );
      return lastDefined !== undefined ? normalizeMoney(lastDefined) : 0;
    };

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

    const productNormalized = normalizeProductDuration(sanPham || "");
    const months = monthsFromString(productNormalized);
    if (!months) {
      return {
        success: false,
        details: "Không xác định được thời hạn sản phẩm",
        processType: "error",
      };
    }

    const fallbackSoNgay = months * 30;

    const { productId, variantId, pctCtv, pctKhach } = await fetchProductPricing(client, sanPham);
    const giaNhapSource = await fetchSupplyPrice(client, { variantId, productId }, supplierId);
    const maxPriceRow = await fetchMaxSupplyPrice(client, { variantId, productId });

    const normalizedNhap = normalizeImportValue(giaNhapSource, giaNhapCu || undefined);
    const latestGiaNhap = resolveMoney(
      normalizedNhap?.value,
      giaNhapSource,
      giaNhapCu
    );

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

    const finalGiaBanRaw = calcGiaBan({
      orderId: orderCode,
      giaNhap: latestGiaNhap,
      priceMax: effectivePriceMax,
      pctCtv,
      pctKhach,
      giaBanFallback: giaBanCu,
    });

    const finalGiaNhap = resolveMoney(latestGiaNhap, giaNhapCu);
    const finalGiaBan = resolveMoney(
      roundToThousands(finalGiaBanRaw || 0),
      effectivePriceMax,
      giaBanCu,
      latestGiaNhap
    );

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
      pctCtvNormalized:
        Number.isFinite(Number(pctCtv)) && Number(pctCtv) > 10 ? Number(pctCtv) / 100 : Number(pctCtv) || 1,
      pctKhachNormalized:
        Number.isFinite(Number(pctKhach)) && Number(pctKhach) > 10
          ? Number(pctKhach) / 100
          : Number(pctKhach) || 1,
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
        ${ORDER_COLS.orderExpired} = $3,
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
        ${ORDER_COLS.orderExpired}
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

const isEligibleForRenewal = (statusValue, orderExpired) => {
  const statusText = String(statusValue || "");
  const daysLeft = daysUntil(orderExpired);

  // Chỉ RENEWAL và EXPIRED mới eligible cho renewal
  // PROCESSING là trạng thái SAU KHI renewal, không phải điều kiện để renewal
  const readyForRenew =
    daysLeft <= 4 &&
    (statusText === ORDER_STATUS.RENEWAL ||
      statusText === ORDER_STATUS.EXPIRED);

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
    state[ORDER_COLS.orderExpired]
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
        ${ORDER_COLS.orderExpired} AS order_expired_value
      FROM ${ORDER_TABLE}
      WHERE TRIM(${ORDER_COLS.idOrder}::text) <> ''`
    );

    const candidates = [];
    for (const row of res.rows) {
      const orderCode = (row.order_code || "").trim();
      if (!orderCode) continue;
      const eligibility = isEligibleForRenewal(
        row.status_value,
        row.order_expired_value
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

  const resolveMoney = (computedValue, ...fallbackValues) => {
    if (Number.isFinite(computedValue) && computedValue > 0) return Math.round(computedValue);
    for (const candidate of fallbackValues) {
      if (candidate === null || candidate === undefined) continue;
      const normalized = normalizeMoney(candidate);
      if (Number.isFinite(normalized) && normalized > 0) return normalized;
    }
    const lastDefined = fallbackValues.find((c) => c !== null && c !== undefined);
    return lastDefined !== undefined ? normalizeMoney(lastDefined) : 0;
  };

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

    const { productId, variantId, pctCtv, pctKhach } = await fetchProductPricing(client, sanPham);
    const giaNhapSource = await fetchSupplyPrice(client, { variantId, productId }, supplierId);
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

    const finalGiaBanRaw = calcGiaBan({
      orderId: orderRow?.[ORDER_COLS.idOrder] || "",
      giaNhap: latestGiaNhap,
      priceMax: effectivePriceMax,
      pctCtv,
      pctKhach,
      giaBanFallback: giaBanCu,
    });

    const finalGiaNhap = resolveMoney(latestGiaNhap, giaNhapCu);
    const finalGiaBan = resolveMoney(
      roundToThousands(finalGiaBanRaw || 0),
      effectivePriceMax,
      giaBanCu,
      latestGiaNhap
    );

    return { price: finalGiaBan, cost: finalGiaNhap };
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

