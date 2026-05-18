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
const { STATUS: ORDER_STATUS } = require("../../src/domains/orders/controller/constants");
const {
  parseFlexibleDate,
  normalizeProductDuration,
  normalizeMoney,
  normalizeImportValue,
  formatDateDMY,
  formatDateDB,
  addMonthsClamped,
  addDays,
} = require("./utils");
const {
  updatePaymentSupplyBalance,
  updateReceiptFinancialState,
  insertFinancialAuditLog,
} = require("./payments");
const {
  notifyFinanceMonthlyDelta,
} = require("../../src/services/telegramFinanceDeltaNotifier");
const logger = require("../../src/utils/logger");
const {
  storeProfitExpensesHasMavnColumns,
} = require("../../src/domains/orders/controller/finance/storeProfitExpensesHasMavnColumns");
const {
  WEBHOOK_RECEIPT_PRE_ORDER_DATE_GRACE_DAYS,
} = require("../../src/domains/orders/controller/queries/webhookReceiptOrderDateWindow");

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

const { recomputeSummaryMonthTotalTax } = require("../../src/domains/orders/controller/finance/dashboardSummary");
const summaryTable = tableName(FINANCE_SCHEMA.DASHBOARD_MONTHLY_SUMMARY.TABLE, SCHEMA_FINANCE);
const summaryCols = FINANCE_SCHEMA.DASHBOARD_MONTHLY_SUMMARY.COLS;
const storeExpenseTable = tableName(
  FINANCE_SCHEMA.STORE_PROFIT_EXPENSES.TABLE,
  SCHEMA_FINANCE
);
const storeExpenseCols = FINANCE_SCHEMA.STORE_PROFIT_EXPENSES.COLS;
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

const createAutoMavrykExternalImportLog = async ({
  client,
  orderCode,
  amount,
  supplierName,
  renewalStartDate,
  renewalEndDate,
  /** Khi true: chỉ ghi vào DB, KHÔNG gửi Telegram BIẾN ĐỘNG THÁNG.
   *  Caller (webhook) sẽ gửi 1 tin nhắn tổng hợp ở cuối. */
  suppressFinanceNotify = false,
}) => {
  const normalizedAmount = normalizeMoney(amount);
  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
    return { created: false, reason: "invalid_amount" };
  }

  const startYmd = String(renewalStartDate || "").trim();
  const endYmd = String(renewalEndDate || "").trim();
  const marker = `[AUTO_MAVRYK_RENEW:${orderCode}:${startYmd}]`;
  const reason = `${marker} Gia hạn NCC Mavryk/Shop (${supplierName || "Mavryk"}) ${startYmd || "?"} -> ${endYmd || "?"}`;

  const hasMetaCols = await storeProfitExpensesHasMavnColumns();
  const expenseType = "external_import";

  if (hasMetaCols) {
    const existsRes = await client.query(
      `
        SELECT 1
        FROM ${storeExpenseTable}
        WHERE ${storeExpenseCols.EXPENSE_TYPE} = $1
          AND ${storeExpenseCols.LINKED_ORDER_CODE} = $2
          AND COALESCE(${storeExpenseCols.EXPENSE_META}->>'flow', '') = 'mavryk_renewal_auto'
          AND COALESCE(${storeExpenseCols.EXPENSE_META}->>'renewal_start_date', '') = $3
        LIMIT 1
      `,
      [expenseType, orderCode, startYmd]
    );
    if (existsRes.rows.length > 0) {
      return { created: false, reason: "already_exists" };
    }
  } else {
    const existsRes = await client.query(
      `
        SELECT 1
        FROM ${storeExpenseTable}
        WHERE ${storeExpenseCols.EXPENSE_TYPE} = $1
          AND ${storeExpenseCols.REASON} = $2
        LIMIT 1
      `,
      [expenseType, reason]
    );
    if (existsRes.rows.length > 0) {
      return { created: false, reason: "already_exists" };
    }
  }

  if (hasMetaCols) {
    await client.query(
      `
        INSERT INTO ${storeExpenseTable}
          (${storeExpenseCols.AMOUNT}, ${storeExpenseCols.REASON}, ${storeExpenseCols.EXPENSE_TYPE}, ${storeExpenseCols.LINKED_ORDER_CODE}, ${storeExpenseCols.EXPENSE_META})
        VALUES ($1, $2, $3, $4, $5::jsonb)
      `,
      [
        normalizedAmount,
        reason,
        expenseType,
        orderCode,
        JSON.stringify({
          flow: "mavryk_renewal_auto",
          source: "renewal.runRenewal",
          renewal_start_date: startYmd || null,
          renewal_end_date: endYmd || null,
          supplier_name: supplierName || null,
        }),
      ]
    );
  } else {
    await client.query(
      `
        INSERT INTO ${storeExpenseTable}
          (${storeExpenseCols.AMOUNT}, ${storeExpenseCols.REASON}, ${storeExpenseCols.EXPENSE_TYPE})
        VALUES ($1, $2, $3)
      `,
      [normalizedAmount, reason, expenseType]
    );
  }

  const mkRes = await client.query(
    `SELECT TO_CHAR(DATE_TRUNC('month', NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh'), 'YYYY-MM') AS mk`
  );
  const monthKey = String(mkRes.rows?.[0]?.mk || "").trim();
  if (monthKey) {
    await client.query(
      `
        INSERT INTO ${summaryTable}
          (${summaryCols.MONTH_KEY}, ${summaryCols.TOTAL_PROFIT}, ${summaryCols.ESTIMATED_BANK_BALANCE}, ${summaryCols.UPDATED_AT})
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (${summaryCols.MONTH_KEY})
        DO UPDATE SET
          ${summaryCols.TOTAL_PROFIT} = ${summaryTable}.${summaryCols.TOTAL_PROFIT} + EXCLUDED.${summaryCols.TOTAL_PROFIT},
          ${summaryCols.ESTIMATED_BANK_BALANCE} = ${summaryTable}.${summaryCols.ESTIMATED_BANK_BALANCE} + EXCLUDED.${summaryCols.ESTIMATED_BANK_BALANCE},
          ${summaryCols.UPDATED_AT} = NOW()
      `,
      [monthKey, -normalizedAmount, -normalizedAmount]
    );

    if (!suppressFinanceNotify) {
      await notifyFinanceMonthlyDelta({
        monthKey,
        revenueDelta: 0,
        profitDelta: -normalizedAmount,
        importDelta: 0,
        refundDelta: 0,
        offFlowDelta: 0,
        bankBalanceDelta: -normalizedAmount,
        context: `renewal.mavryk.external_import:${orderCode}`,
        executor: client,
      });
    }
  }

  return { created: true, reason: "inserted" };
};

const fetchMonthlySummarySnapshot = async (client, monthKey) => {
  if (!monthKey) return null;
  const { rows } = await client.query(
    `
      SELECT
        COALESCE(${summaryCols.TOTAL_REVENUE}::numeric, 0) AS total_revenue,
        COALESCE(${summaryCols.TOTAL_PROFIT}::numeric, 0) AS total_profit,
        COALESCE(${summaryCols.TOTAL_IMPORT}::numeric, 0) AS total_import,
        COALESCE(${summaryCols.TOTAL_REFUND}::numeric, 0) AS total_refund,
        COALESCE(${summaryCols.TOTAL_OFF_FLOW_BANK_RECEIPT}::numeric, 0) AS total_off_flow_bank_receipt,
        COALESCE(${summaryCols.ESTIMATED_BANK_BALANCE}::numeric, 0) AS estimated_bank_balance
      FROM ${summaryTable}
      WHERE ${summaryCols.MONTH_KEY} = $1
      LIMIT 1
    `,
    [monthKey]
  );
  return rows[0] || null;
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
        AND (
          pr.${PAYMENT_RECEIPT_COLS.paidDate}::date >= $2::date
          OR (
            pr.${PAYMENT_RECEIPT_COLS.paidDate}::date < $2::date
            AND pr.${PAYMENT_RECEIPT_COLS.paidDate}::date >= (
              $2::date - INTERVAL '${WEBHOOK_RECEIPT_PRE_ORDER_DATE_GRACE_DAYS} days'
            )
          )
        )
        AND fs.is_financial_posted = TRUE
      LIMIT 1
    `,
    [normalizedCode, fromDate]
  );
  return res.rows.length > 0;
};

const runRenewal = async (
  orderCode,
  {
    forceRenewal = false,
    source = "webhook",
    paymentAmount = 0,
    paymentMonthKey = null,
    paymentReceiptId = null,
    /** Khi true: KHÔNG gửi Telegram BIẾN ĐỘNG THÁNG bên trong runRenewal —
     *  để caller (webhook handler) gửi 1 tin nhắn tổng hợp bao trùm cả webhook
     *  posting + renewal. Tránh 2 tin nhắn rời rạc cho cùng 1 sự kiện thanh toán. */
    suppressFinanceNotify = false,
  } = {}
) => {
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
    const liveImportNormalized = normalizeImportValue(
      giaNhapSource,
      giaNhapCu || undefined
    );
    const hasLiveSupplierImport =
      normalizeMoney(liveImportNormalized?.value) > 0;
    const pricingMeta = pricing.meta;
    const pctCtvNormalized = pricingMeta?.pctCtv ?? 0;

    const pctKhachNormalized = pricingMeta?.pctKhach ?? 0;

    // Gói khuyến mãi (MAVK) hết hạn → gia hạn theo giá khách lẻ
    let finalGiaNhap = pricing.cost;
    const finalGiaBan = pricing.price;
    let internalSupplierAccountingImport = 0;

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
    const isInternalSupplier = isMavrykShopSupplierName(supplierNameForNcc);
    // MAVN gia hạn:
    // - NCC Mavryk/Shop: cost = 0 (giá nhập hiển thị luôn 0).
    // - NCC khác: giữ cost theo giá bán để khớp rule MAVN gia hạn.
    if (isMavn) {
      finalGiaNhap = isInternalSupplier ? 0 : finalGiaBan;
    }
    // NCC nội bộ Mavryk/Shop: không ghi nhận công nợ NCC.
    const skipNccLedger = isInternalSupplier;
    if (!isMavn && skipNccLedger) {
      // Yêu cầu nghiệp vụ: renew xong luôn reset cost trên đơn về 0 cho NCC Mavryk/Shop.
      // Nếu có giá nhập sống từ supplier_cost, giữ lại ở biến accounting để ghi external_import.
      const accountingCandidate = normalizeMoney(finalGiaNhap);
      internalSupplierAccountingImport = accountingCandidate > 0 ? accountingCandidate : 0;
      finalGiaNhap = 0;
    }
    // Nếu NCC nội bộ đã bỏ giá nhập hiện hành khỏi supplier_cost, không được
    // kéo lại giá nhập cũ từ fallback đơn (tránh trừ bank/profit sai khi renewal webhook).
    if (!isMavn && skipNccLedger && !hasLiveSupplierImport) {
      finalGiaNhap = 0;
      internalSupplierAccountingImport = 0;
    }
    // Đơn bán: renewal thủ công → Đang xử lý rồi dùng webhook/giả lập CK; MAVN nhập hàng → thẳng Đã TT (không bank).
    const isManualRenewal = source === "manual";
    const renewalNextStatus =
      isManualRenewal && !isMavn ? ORDER_STATUS.PROCESSING : ORDER_STATUS.PAID;

    // order_date = đầu kỳ mới (ngày sau hết hạn cũ); paid_date webhook có thể trước mốc này — tổng receipt / đối soát dùng cửa sổ đệm (xem webhookReceiptOrderDateWindow).
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

    let mavnStockSync = null;
    if (isMavn) {
      try {
        const {
          syncMavnStockExpiryAfterOrderRenewal,
        } = require("../../src/services/mavnRenewalStockExpirySync");
        mavnStockSync = await syncMavnStockExpiryAfterOrderRenewal(client, {
          orderCode,
          newExpiryDate: ngayHetHanMoi,
        });
        if (
          mavnStockSync &&
          !mavnStockSync.skipped &&
          Number(mavnStockSync.updated || 0) === 0
        ) {
          logger.warn("[Renewal] MAVN gia hạn OK nhưng không cập nhật được expires_at kho", {
            orderCode,
            reason: mavnStockSync.reason,
            packageId: mavnStockSync.packageId,
          });
        }
      } catch (stockSyncErr) {
        logger.warn("[Renewal] MAVN đồng bộ expires_at kho thất bại (không chặn gia hạn)", {
          orderCode,
          error: stockSyncErr.message,
        });
        mavnStockSync = { updated: 0, error: stockSyncErr.message };
      }
    }

    if (isMavn && renewalNextStatus === ORDER_STATUS.PAID) {
      const {
        syncMavnFinanceAfterRenewalOrderPaid,
      } = require("../../src/domains/orders/controller/finance/mavnRenewalPaidSync");
      await syncMavnFinanceAfterRenewalOrderPaid({
        orderCode,
        beforeRenewalRow: {
          status: order[ORDER_COLS.status],
          cost: order[ORDER_COLS.cost],
        },
      });
    }

    // Renewal: gia hạn thành công đều chuyển Đã Thanh Toán.
    if (order[ORDER_COLS.status] === ORDER_STATUS.RENEWAL && !isMavn) {
      const shouldSkipSummaryForManual = isManualRenewal || (
        source === "manual" &&
        await hasPostedReceiptForOrder(client, orderCode, order[ORDER_COLS.orderDate])
      );
      if (shouldSkipSummaryForManual) {
        logger.info("[Renewal] Skip dashboard summary for manual renewal (receipt already posted)", {
          orderCode,
          source,
        });
      }
      const monthKey = toMonthKey(formatDateDB(ngayBatDauMoi));
      const effectiveMonthKey = paymentMonthKey || monthKey;
      if (effectiveMonthKey && !shouldSkipSummaryForManual && normalizeMoney(paymentAmount) > 0) {
        const summaryBefore = await fetchMonthlySummarySnapshot(client, effectiveMonthKey);
        const revenue = normalizeMoney(paymentAmount);
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
          [effectiveMonthKey, 1, revenue, profit]
        );
        await recomputeSummaryMonthTotalTax(client, effectiveMonthKey);

        const summaryAfter = await fetchMonthlySummarySnapshot(
          client,
          effectiveMonthKey
        );
        const beforeRevenue = normalizeMoney(summaryBefore?.total_revenue);
        const beforeProfit = normalizeMoney(summaryBefore?.total_profit);
        const beforeImport = normalizeMoney(summaryBefore?.total_import);
        const afterRevenue = normalizeMoney(summaryAfter?.total_revenue);
        const afterProfit = normalizeMoney(summaryAfter?.total_profit);
        const afterImport = normalizeMoney(summaryAfter?.total_import);
        const revenueDelta = normalizeMoney(afterRevenue - beforeRevenue);
        const profitDelta = normalizeMoney(afterProfit - beforeProfit);
        const importDelta = normalizeMoney(afterImport - beforeImport);

        if (!suppressFinanceNotify && (revenueDelta || profitDelta || importDelta)) {
          await notifyFinanceMonthlyDelta({
            monthKey: effectiveMonthKey,
            revenueDelta,
            profitDelta,
            importDelta,
            refundDelta: 0,
            offFlowDelta: 0,
            bankBalanceDelta: 0,
            context: `renewal.runRenewal:${orderCode}`,
            executor: client,
          });
        }

        if (paymentReceiptId) {
          await updateReceiptFinancialState(client, paymentReceiptId, {
            is_financial_posted: true,
            posted_revenue: revenue,
            posted_profit: profit,
          });
          await insertFinancialAuditLog(client, {
            payment_receipt_id: paymentReceiptId,
            order_code: orderCode,
            rule_branch: "RENEWAL_WEBHOOK_POST",
            delta: {
              posted_revenue: revenue,
              posted_profit: profit,
              month_key: effectiveMonthKey,
            },
            source: "webhook",
          });
        }
      }
    } else if (order[ORDER_COLS.status] === ORDER_STATUS.RENEWAL && isMavn) {
      logger.info("[Renewal] Bỏ cộng dashboard_monthly_summary (đơn MAVN nhập hàng)", {
        orderCode,
      });
    }
    if (
      !isManualRenewal &&
      supplierId &&
      Number.isFinite(finalGiaNhap) &&
      finalGiaNhap > 0 &&
      !skipNccLedger
    ) {
      try {
        await updatePaymentSupplyBalance(supplierId, finalGiaNhap, ngayBatDauMoi);
      } catch (balanceErr) {
        logger.error("Không thể cập nhật giá nhập cho Nhà Cung Cấp", { orderCode, error: balanceErr.message, stack: balanceErr.stack });
      }
    } else if (skipNccLedger && supplierId && internalSupplierAccountingImport > 0) {
      logger.info("[Renewal] Bỏ cộng công nợ NCC (NCC Mavryk/Shop)", {
        orderCode,
        supplierId,
        finalGiaNhap: internalSupplierAccountingImport,
        isMavn,
      });
    }

    // Theo nghiệp vụ: renew đơn NCC Mavryk/Shop → cost = 0 và KHÔNG tạo
    // external_import log (log này trước đây trừ -amount vào bank/profit, làm
    // bank không nhận đủ tiền webhook).
    const mavrykExternalImportLog = null;
    if (!isMavn && skipNccLedger && internalSupplierAccountingImport > 0) {
      logger.info("[Renewal] Bỏ tạo external_import log (NCC Mavryk/Shop)", {
        orderCode,
        supplierId,
        amountSkipped: internalSupplierAccountingImport,
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

    if (mavnStockSync != null) {
      details.MAVN_STOCK_SYNC = {
        updated: mavnStockSync.updated ?? 0,
        reason: mavnStockSync.reason ?? null,
        stock_ids: mavnStockSync.stockIds ?? null,
        expires_at: mavnStockSync.expiresAt ?? null,
        error: mavnStockSync.error ?? null,
      };
    }
    if (mavrykExternalImportLog) {
      details.MAVRYK_EXTERNAL_IMPORT_LOG = mavrykExternalImportLog;
    }

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
  fetchMonthlySummarySnapshot,
};
