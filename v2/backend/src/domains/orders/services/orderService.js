const { db, TABLES, COLS, withTransaction } = require("@/db");
const { eventBus, EVENTS } = require("@/events");
const { getAvailableSuffix, applySuffixToPrice } = require("@/domains/payments/services/slotSuffixService");
const { ORDER_STATUS, getOrderStatusLabel } = require("@/constants/orderStatus");
const { isRenewalOrder, calculateNewExpiry } = require("./orderPaymentService");

const O_COLS = COLS.ORDER_LIST;
const getOrderTable = (trx) => (trx || db)(TABLES.ORDER_LIST);

const isCustomerMavryk = (c) => String(c || "").trim().toLowerCase() === "mavryk";

// In-memory cache for default shop bank account (1 minute TTL)
let cachedDefaultBank = null;
let cachedBankTimestamp = 0;
const BANK_CACHE_TTL_MS = 60 * 1000;

async function getDefaultShopBank(trx) {
  const now = Date.now();
  if (cachedDefaultBank && now - cachedBankTimestamp < BANK_CACHE_TTL_MS) {
    return cachedDefaultBank;
  }
  const queryDb = trx || db;
  let defaultBank = await queryDb(TABLES.SHOP_BANK_ACCOUNTS).where({ is_default: true, is_active: true }).first();
  if (!defaultBank) {
    defaultBank = await queryDb(TABLES.SHOP_BANK_ACCOUNTS).where({ is_active: true }).first();
  }
  if (!defaultBank) {
    defaultBank = await queryDb(TABLES.SHOP_BANK_ACCOUNTS).first();
  }
  if (defaultBank) {
    cachedDefaultBank = defaultBank;
    cachedBankTimestamp = now;
  }
  return defaultBank;
}

/**
 * Trích xuất mã đơn ngẫu nhiên kiểu MAV...
 */
function generateOrderCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let random = "";
  for (let i = 0; i < 6; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `MAV${random}`;
}

function applyCanceledFilter(builder) {
  builder.where(function(b) {
    b.whereIn("status", [ORDER_STATUS.REFUND_PENDING, ORDER_STATUS.REFUNDED])
     .orWhere(function(sub) {
       sub.where("status", ORDER_STATUS.CANCELED)
          .where("was_paid", true);
     });
  });
}

function applyExpiredFilter(builder) {
  builder.whereNot(applyCanceledFilter)
    .where("status", ORDER_STATUS.EXPIRED);
}

function applyImportFilter(builder) {
  builder.whereNot(applyCanceledFilter)
    .whereNot(applyExpiredFilter)
    .whereILike("id_order", "MAVN%");
}

function applyActiveFilter(builder) {
  builder.whereNot(applyCanceledFilter)
    .whereNot(applyExpiredFilter)
    .whereNot((b) => {
      b.whereILike("id_order", "MAVN%");
    });
}

/**
 * Lấy danh sách đơn hàng có phân trang, lọc theo tab & tìm kiếm (Tối ưu SQL Aggregation)
 */
async function getOrders({ page = 1, limit = 20, search = "", status = "", tab = "" } = {}) {
  const offset = (Number(page) - 1) * Number(limit);

  // 1. Tính toán tabCounts song song trên toàn bộ cơ sở dữ liệu (Tối ưu Promise.all)
  const [[canceledRes], [expiredRes], [importRes], [activeRes]] = await Promise.all([
    getOrderTable().where(applyCanceledFilter).count("id as count"),
    getOrderTable().where(applyExpiredFilter).count("id as count"),
    getOrderTable().where(applyImportFilter).count("id as count"),
    getOrderTable().where(applyActiveFilter).count("id as count"),
  ]);

  const tabCounts = {
    active: Number(activeRes?.count || 0),
    import: Number(importRes?.count || 0),
    expired: Number(expiredRes?.count || 0),
    canceled: Number(canceledRes?.count || 0),
  };

  // 2. Truy vấn danh sách đơn thuộc tab hiện tại
  let query = getOrderTable();

  if (tab === "canceled") {
    query = query.where(applyCanceledFilter);
  } else if (tab === "expired") {
    query = query.where(applyExpiredFilter);
  } else if (tab === "import") {
    query = query.where(applyImportFilter);
  } else if (tab === "active") {
    query = query.where(applyActiveFilter);
  }

  if (status && status !== "ALL") {
    query = query.where("status", status);
  }

  if (search) {
    query = query.where((builder) => {
      builder
        .whereILike("id_order", `%${search}%`)
        .orWhereILike("customer", `%${search}%`)
        .orWhereILike("contact", `%${search}%`)
        .orWhereILike("information_order", `%${search}%`);
    });
  }

  const [countResult] = await query.clone().count("id as total");
  const total = Number(countResult?.total || 0);

  // 3. SQL Aggregation trực tiếp trong PostgreSQL (Tối ưu tốc độ, không kéo all rows về Node RAM)
  const todayStr = new Date().toISOString().split("T")[0];

  const [summaryRow] = await query.clone().select(
    db.raw(`
      COALESCE(SUM(price), 0)::numeric as "totalRevenue",
      COALESCE(SUM(cost), 0)::numeric as "totalCost",
      COALESCE(SUM(
        CASE 
          WHEN status = '${ORDER_STATUS.REFUND_PENDING}' THEN price 
          ELSE 0 
        END
      ), 0)::numeric as "refundCustomerAmount",
      COALESCE(SUM(
        CASE 
          WHEN status IN ('${ORDER_STATUS.REFUNDED}', '${ORDER_STATUS.CANCELED}') THEN price 
          ELSE 0 
        END
      ), 0)::numeric as "refundedCustomerAmount",
      COALESCE(SUM(
        CASE 
          WHEN status IN ('${ORDER_STATUS.REFUND_PENDING}', '${ORDER_STATUS.REFUNDED}', '${ORDER_STATUS.CANCELED}') THEN cost 
          ELSE 0 
        END
      ), 0)::numeric as "refundSupplierAmount",
      COUNT(*) FILTER (
        WHERE status = '${ORDER_STATUS.PAID}'
      ) as "paidCount",
      COUNT(*) FILTER (
        WHERE status = '${ORDER_STATUS.RENEW_REQUIRED}'
      ) as "renewCount",
      COUNT(*) FILTER (
        WHERE status = '${ORDER_STATUS.UNPAID}'
      ) as "pendingCount",
      COUNT(*) FILTER (
        WHERE status = '${ORDER_STATUS.REFUND_PENDING}'
      ) as "pendingRefundCount",
      COUNT(*) FILTER (
        WHERE status = '${ORDER_STATUS.REFUNDED}'
      ) as "refundedCount",
      COUNT(*) FILTER (
        WHERE status = '${ORDER_STATUS.CANCELED}'
      ) as "canceledCount",
      COUNT(*) FILTER (
        WHERE order_date::text LIKE '${todayStr}%' OR created_at::text LIKE '${todayStr}%'
      ) as "todayCount"
    `)
  );

  // Tính toán remaining values dựa trên SQL
  const [remRow] = await query.clone().select(
    db.raw(`
      COALESCE(SUM(
        CASE 
          WHEN status NOT IN ('${ORDER_STATUS.CANCELED}', '${ORDER_STATUS.REFUNDED}', '${ORDER_STATUS.REFUND_PENDING}') AND expired_at > CURRENT_DATE
          THEN ROUND((price::numeric / GREATEST(COALESCE(NULLIF(days::numeric, 0), 365), 1)) * GREATEST((expired_at - CURRENT_DATE), 0))
          ELSE 0 
        END
      ), 0)::numeric as "totalRemainingValue",
      COALESCE(SUM(
        CASE 
          WHEN status NOT IN ('${ORDER_STATUS.CANCELED}', '${ORDER_STATUS.REFUNDED}', '${ORDER_STATUS.REFUND_PENDING}') AND expired_at > CURRENT_DATE
          THEN ROUND((cost::numeric / GREATEST(COALESCE(NULLIF(days::numeric, 0), 365), 1)) * GREATEST((expired_at - CURRENT_DATE), 0))
          ELSE 0 
        END
      ), 0)::numeric as "supplierRemainingValue"
    `)
  );

  const summary = {
    totalRevenue: Number(summaryRow?.totalRevenue || 0),
    totalCost: Number(summaryRow?.totalCost || 0),
    totalRemainingValue: Number(remRow?.totalRemainingValue || 0),
    supplierRemainingValue: Number(remRow?.supplierRemainingValue || 0),
    refundCustomerAmount: Number(summaryRow?.refundCustomerAmount || 0),
    refundedCustomerAmount: Number(summaryRow?.refundedCustomerAmount || 0),
    refundSupplierAmount: Number(summaryRow?.refundSupplierAmount || 0),
    paidCount: Number(summaryRow?.paidCount || 0),
    renewCount: Number(summaryRow?.renewCount || 0),
    processingCount: Number(summaryRow?.processingCount || 0),
    pendingCount: Number(summaryRow?.pendingCount || 0),
    pendingRefundCount: Number(summaryRow?.pendingRefundCount || 0),
    refundedCount: Number(summaryRow?.refundedCount || 0),
    canceledCount: Number(summaryRow?.canceledCount || 0),
    todayCount: Number(summaryRow?.todayCount || 0),
    totalOrders: total,
  };

  const orders = await query
    .select("*")
    .orderByRaw(`
      CASE
        WHEN status = '${ORDER_STATUS.UNPAID}' THEN 1
        WHEN status = '${ORDER_STATUS.RENEW_REQUIRED}' THEN 2
        ELSE 3
      END,
      id DESC
    `)
    .limit(limit)
    .offset(offset);

  const ordersWithSupplier = await Promise.all(orders.map((o) => attachSupplierInfo(o)));
  const ordersWithQr = await Promise.all(ordersWithSupplier.map((o) => attachVietQrToOrder(o)));

  return {
    data: ordersWithQr,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)) || 1,
    },
    tabCounts,
    summary,
  };
}

async function resolveSupplyId(trx, supplyInput) {
  if (!supplyInput) return null;
  const num = Number(supplyInput);
  if (!isNaN(num) && num > 0) {
    const foundById = await trx(TABLES.SUPPLIER).where({ id: num }).first();
    if (foundById) return foundById.id;
  }
  const foundByName = await trx(TABLES.SUPPLIER)
    .whereILike(COLS.SUPPLIER.SUPPLIER_NAME, String(supplyInput).trim())
    .first();
  if (foundByName) return foundByName.id;
  return null;
}

async function attachSupplierInfo(order, trx) {
  if (!order) return order;
  try {
    const queryDb = trx || db;
    let supplyId = order.supply_id;
    if (!supplyId) {
      const log = await queryDb(TABLES.SUPPLIER_ORDER_COST_LOG)
        .where({ order_list_id: order.id })
        .first();
      if (log && log.supply_id) {
        supplyId = log.supply_id;
      }
    }

    let supplierName = "";
    if (supplyId) {
      const supplier = await queryDb(TABLES.SUPPLIER)
        .where({ id: Number(supplyId) })
        .first();
      if (supplier) {
        supplierName = supplier[COLS.SUPPLIER.SUPPLIER_NAME] || "";
      }
    }

    return {
      ...order,
      supply_id: supplyId || order.supply_id || null,
      supplier_name: supplierName,
    };
  } catch (err) {
    console.error("[attachSupplierInfo] Lỗi:", err.message);
    return order;
  }
}

/**
 * Tự động gắn ảnh VietQR (vietqr_url) & thông tin ngân hàng cho đơn hàng (Có cache bank)
 */
async function attachVietQrToOrder(order, trx) {
  if (!order) return order;
  try {
    const isImport = String(order.id_order || "").toUpperCase().startsWith("MAVN") || (Number(order.cost || 0) > 0 && String(order.status || "").toLowerCase().includes("nhập hàng"));

    let numSupplyId = Number(order.supply_id);
    if (isImport && !isNaN(numSupplyId) && numSupplyId > 0) {
      const queryDb = trx || db;
      const supplier = await queryDb(TABLES.SUPPLIER)
        .where({ id: numSupplyId })
        .first();

      if (supplier && (supplier.number_bank || supplier.numberBank)) {
        const bin = supplier.bin_bank || supplier.binBank || "970422";
        const accNum = supplier.number_bank || supplier.numberBank;
        const accName = supplier.account_holder || supplier.accountHolder || supplier.supplier_name || supplier.supplierName || "";
        const amount = Math.round(Number(order.cost || order.price || 0));
        return {
          ...order,
          vietqr_url: `https://img.vietqr.io/image/${bin}-${accNum}-compact2.png?amount=${amount}&accountName=${encodeURIComponent(accName)}`,
          bank_info: {
            bank_name: supplier.bin_bank || bin,
            account_number: accNum,
            account_holder: accName,
            type: "supplier",
          },
        };
      }
    }

    // Default shop bank account for sales orders (cached)
    const defaultBank = await getDefaultShopBank(trx);
    if (defaultBank) {
      const accNum = defaultBank.account_number || defaultBank.accountNumber;
      const bin = defaultBank.bank_bin || defaultBank.bankBin || defaultBank.bank_short_code || defaultBank.bankShortCode || "MB";
      const accName = defaultBank.account_holder || defaultBank.accountHolder || "";
      const amount = Math.round(Number(order.price || 0));
      if (accNum) {
        return {
          ...order,
          vietqr_url: `https://img.vietqr.io/image/${bin}-${accNum}-compact2.png?amount=${amount}&accountName=${encodeURIComponent(accName)}`,
          bank_info: {
            bank_name: defaultBank.bank_display_name || defaultBank.bankShortCode || bin,
            account_number: accNum,
            account_holder: accName,
            type: "shop",
          },
        };
      }
    }
  } catch (err) {
    console.error("[attachVietQrToOrder] Lỗi khi tạo VietQR:", err.message);
  }
  return order;
}

/**
 * Lấy chi tiết đơn hàng theo ID
 */
async function getOrderById(id) {
  const order = await getOrderTable().where({ id: Number(id) }).first();
  return order ? await attachVietQrToOrder(order) : null;
}

/**
 * Tạo đơn hàng mới + phát event ORDER_CREATED (Bọc Transaction)
 */
async function createOrder(payload) {
  return await withTransaction(async (trx) => {
    const id_order = payload.id_order || generateOrderCode();
    const rawPrice = Number(payload.price || 0);
    const status = payload.status || ORDER_STATUS.UNPAID;

    let finalPrice = rawPrice;
    if (status === ORDER_STATUS.UNPAID || status === ORDER_STATUS.RENEW_REQUIRED) {
      if (rawPrice > 0) {
        const suffix = await getAvailableSuffix();
        finalPrice = applySuffixToPrice(rawPrice, suffix);
      }
    }

    const customerVal = payload.customer || "Khách hàng";
    const isMavryk = isCustomerMavryk(customerVal);
    const rawCost = Number(payload.cost || 0);
    const finalCost = isMavryk ? 0 : rawCost;

    const isPaid = status === ORDER_STATUS.PAID || String(id_order).toUpperCase().startsWith("MAVN");
    const newOrderData = {
      id_order,
      customer: customerVal,
      contact: payload.contact || "",
      information_order: payload.information_order || "",
      slot: payload.slot || "",
      price: finalPrice,
      gross_selling_price: payload.gross_selling_price != null ? Number(payload.gross_selling_price) : finalPrice,
      cost: finalCost,
      status: status,
      was_paid: isPaid,
      payment_method: payload.payment_method || "bank",
      note: payload.note || "",
      days: payload.days ? Number(payload.days) : 365,
      order_date: payload.order_date || null,
      expired_at: payload.expired_at || null,
      supply_id: await resolveSupplyId(trx, payload.supply_id),
      created_at: db.fn.now(),
    };

    if (payload.id_product != null && payload.id_product !== "") {
      const numProdId = Number(payload.id_product);
      if (!isNaN(numProdId) && numProdId > 0) {
        newOrderData.id_product = numProdId;
      } else {
        const matched = await trx(TABLES.VARIANT)
          .whereILike("display_name", String(payload.id_product))
          .orWhereILike("variant_name", String(payload.id_product))
          .first();
        if (matched) {
          newOrderData.id_product = matched.id;
        }
      }
    }

    const [createdOrder] = await getOrderTable(trx)
      .insert(newOrderData)
      .returning("*");

    if (payload.save_to_warehouse !== false && String(id_order).toUpperCase().startsWith("MAVN")) {
      try {
        const accountUsername = payload.information_order 
          ? String(payload.information_order).trim().toLowerCase()
          : (payload.slot ? (payload.slot.split('|')[0] || payload.customer).trim().toLowerCase() : String(payload.customer || "mavryk").trim().toLowerCase());
        
        let productName = payload.information_order || "Dịch vụ";
        const prodIdToLookup = newOrderData.id_product || payload.id_product;
        if (prodIdToLookup) {
          try {
            const variantRow = await trx(TABLES.VARIANT)
              .leftJoin(TABLES.PRODUCT, `${TABLES.PRODUCT}.id`, `${TABLES.VARIANT}.product_id`)
              .select(
                `${TABLES.VARIANT}.display_name as variant_display`,
                `${TABLES.VARIANT}.variant_name as variant_name`,
                `${TABLES.PRODUCT}.package_name as parent_package_name`
              )
              .where(`${TABLES.VARIANT}.id`, Number(prodIdToLookup))
              .first();

            if (variantRow) {
              productName = variantRow.parent_package_name || variantRow.variant_name || variantRow.variant_display || productName;
            }
          } catch (e) {
            console.log("[OrderService] Không resolve được sản phẩm chính cho kho:", e.message);
          }
        }
        
        let pName = await trx(TABLES.PRODUCT_NAMES)
          .whereRaw("LOWER(name) = ?", [productName.toLowerCase().trim()])
          .first();

        let nameId = pName?.id;
        if (!nameId) {
          const [insertedP] = await trx(TABLES.PRODUCT_NAMES)
            .insert({ name: productName.trim() })
            .returning("id");
          nameId = insertedP.id || insertedP;
        }

        let stock = await trx(TABLES.PRODUCT_KEYS)
          .whereRaw("LOWER(account_username) = ?", [accountUsername])
          .first();

        let stockId = stock?.id;
        if (!stockId) {
          const [newStock] = await trx(TABLES.PRODUCT_KEYS)
            .insert({
              account_username: accountUsername,
              created_at: new Date(),
            })
            .returning("*");
          stockId = newStock.id;
        }

        const existingService = await trx(TABLES.STOCK_SERVICES)
          .where({
            stock_id: stockId,
            name_id: nameId,
          })
          .first();

        if (existingService) {
          await trx(TABLES.STOCK_SERVICES)
            .where({ id: existingService.id })
            .update({
              password_encrypted: payload.slot || existingService.password_encrypted,
              expires_at: payload.expired_at ? new Date(payload.expired_at) : existingService.expires_at,
              status: "AVAILABLE",
              note: payload.note || existingService.note,
              updated_at: new Date(),
            });
        } else {
          await trx(TABLES.STOCK_SERVICES).insert({
            stock_id: stockId,
            name_id: nameId,
            password_encrypted: payload.slot || null,
            backup_email: "",
            two_fa_encrypted: null,
            expires_at: payload.expired_at ? new Date(payload.expired_at) : null,
            status: "AVAILABLE",
            note: payload.note || null,
            created_at: new Date(),
            updated_at: new Date(),
          });
        }

        eventBus.emit(EVENTS.WAREHOUSE_STOCK_CREATED, {
          id: stockId,
          account: accountUsername,
          source: "order_mavn_import",
          orderId: createdOrder.id,
          orderCode: createdOrder.id_order,
        });
      } catch (err) {
        console.error("[OrderService] Lỗi tự động lưu kho cho đơn MAVN:", err);
      }
    }

    const formatMoney = (v) => new Intl.NumberFormat("vi-VN").format(v) + " ₫";
    const statusLabel = getOrderStatusLabel(createdOrder.status);
    const summary = `Tạo mới đơn hàng #${createdOrder.id_order} cho khách "${createdOrder.customer}" với tổng tiền ${formatMoney(createdOrder.price)} [Trạng thái: ${statusLabel}]`;

    // Phát event Domain: ORDER_CREATED
    eventBus.emit(EVENTS.ORDER_CREATED, {
      ...createdOrder,
      orderId: createdOrder.id,
      summary,
      action: "CREATE",
    });

    return await attachVietQrToOrder(createdOrder, trx);
  });
}

/**
 * Cập nhật đơn hàng + phát event ORDER_UPDATED với chi tiết diff (Bọc Transaction)
 */
async function updateOrder(id, payload) {
  return await withTransaction(async (trx) => {
    const existingOrder = await getOrderTable(trx).where({ id: Number(id) }).first();
    if (!existingOrder) {
      throw new Error("Không tìm thấy đơn hàng cần sửa.");
    }

    const targetCustomer = payload.customer !== undefined ? payload.customer : existingOrder.customer;
    const isMavryk = isCustomerMavryk(targetCustomer);

    const updateFields = {};
    if (payload.customer !== undefined) updateFields.customer = payload.customer;
    if (payload.contact !== undefined) updateFields.contact = payload.contact;
    if (payload.information_order !== undefined) updateFields.information_order = payload.information_order;
    if (payload.slot !== undefined) updateFields.slot = payload.slot;
    if (payload.id_product !== undefined) {
      const numProdId = Number(payload.id_product);
      if (!isNaN(numProdId) && numProdId > 0) {
        updateFields.id_product = numProdId;
      } else if (payload.id_product) {
        const matched = await trx(TABLES.VARIANT)
          .whereILike("display_name", String(payload.id_product))
          .orWhereILike("variant_name", String(payload.id_product))
          .first();
        updateFields.id_product = matched ? matched.id : null;
      } else {
        updateFields.id_product = null;
      }
    }
    if (payload.price !== undefined) updateFields.price = Number(payload.price);
    if (payload.gross_selling_price !== undefined) updateFields.gross_selling_price = Number(payload.gross_selling_price);
    
    if (isMavryk) {
      updateFields.cost = 0;
    } else if (payload.cost !== undefined) {
      updateFields.cost = Number(payload.cost);
    }

    if (payload.status !== undefined) {
      const status = payload.status;
      updateFields.status = status;
      if (status === ORDER_STATUS.PAID) {
        updateFields.was_paid = true;
      }

      if (status === ORDER_STATUS.UNPAID || status === ORDER_STATUS.RENEW_REQUIRED) {
        const basePrice = payload.price != null ? Number(payload.price) : Number(existingOrder.price || 0);
        if (basePrice > 0) {
          const suffix = await getAvailableSuffix();
          const finalPrice = applySuffixToPrice(basePrice, suffix);
          updateFields.price = finalPrice;
          updateFields.gross_selling_price = finalPrice;
        }
      }
    }

    if (payload.payment_method !== undefined) updateFields.payment_method = payload.payment_method;
    if (payload.note !== undefined) updateFields.note = payload.note;
    if (payload.days !== undefined) updateFields.days = Number(payload.days);
    if (payload.order_date !== undefined) updateFields.order_date = payload.order_date || null;
    if (payload.expired_at !== undefined) updateFields.expired_at = payload.expired_at || null;
    if (payload.supply_id !== undefined) {
      updateFields.supply_id = await resolveSupplyId(trx, payload.supply_id);
    }

    const [updatedOrder] = await getOrderTable(trx)
      .where({ id: Number(id) })
      .update(updateFields)
      .returning("*");

    // Tính toán diff chi tiết (trường nào bị sửa, từ giá trị cũ sang mới)
    const changes = {};
    const changedFields = [];
    const formatMoney = (v) => new Intl.NumberFormat("vi-VN").format(v) + " ₫";
    const summaryParts = [];

    const labels = {
      customer: "Khách hàng",
      contact: "Liên hệ",
      information_order: "Sản phẩm / Thông tin gói",
      slot: "Slot / Tài khoản",
      id_product: "Mã sản phẩm",
      price: "Giá bán",
      gross_selling_price: "Giá bán gộp",
      cost: "Giá nhập",
      status: "Trạng thái",
      payment_method: "Phương thức thanh toán",
      note: "Ghi chú",
      days: "Thời hạn (ngày)",
      order_date: "Ngày đặt hàng",
      expired_at: "Ngày hết hạn",
      supply_id: "Nhà cung cấp",
    };

    const isMoneyField = (f) => ["price", "gross_selling_price", "cost"].includes(f);

    for (const [key, newVal] of Object.entries(updateFields)) {
      const oldVal = existingOrder[key];
      const oldCompare = oldVal == null ? "" : String(oldVal).trim();
      const newCompare = newVal == null ? "" : String(newVal).trim();

      if (oldCompare !== newCompare) {
        changedFields.push(key);
        changes[key] = { old: oldVal, new: newVal };
        const label = labels[key] || key;

        if (isMoneyField(key)) {
          summaryParts.push(`${label}: ${formatMoney(Number(oldVal || 0))} ➔ ${formatMoney(Number(newVal || 0))}`);
        } else if (key === "status") {
          summaryParts.push(`${label}: "${getOrderStatusLabel(oldVal)}" ➔ "${getOrderStatusLabel(newVal)}"`);
        } else {
          summaryParts.push(`${label}: "${oldVal ?? ""}" ➔ "${newVal ?? ""}"`);
        }
      }
    }

    const updatePayload = {
      orderId: updatedOrder.id,
      id_order: updatedOrder.id_order,
      customer: updatedOrder.customer,
      previousStatus: existingOrder.status,
      newStatus: updatedOrder.status,
      changed_fields: changedFields,
      changes,
      old_values: existingOrder,
      new_values: updatedOrder,
      summary: summaryParts.length > 0 ? summaryParts.join("; ") : `Cập nhật đơn hàng #${updatedOrder.id_order}`,
      action: "UPDATE",
    };

    // Phát event Domain: ORDER_UPDATED
    eventBus.emit(EVENTS.ORDER_UPDATED, updatePayload);

    return await attachVietQrToOrder(updatedOrder, trx);
  });
}

/**
 * Gia hạn đơn hàng: Chuyển trạng thái sang ORDER_STATUS.RENEW_REQUIRED, cấp phát Slot Suffix và tính lại tổng tiền
 */
async function renewOrder(id, payload = {}) {
  return await withTransaction(async (trx) => {
    const existingOrder = await getOrderTable(trx).where({ id: Number(id) }).first();
    if (!existingOrder) {
      throw new Error("Không tìm thấy đơn hàng cần gia hạn.");
    }

    const rawBasePrice = payload.price != null ? Number(payload.price) : Number(existingOrder.price || 0);
    const basePrice = Math.floor(rawBasePrice / 1000) * 1000 || rawBasePrice;

    // Cấp phát Slot Suffix (1..100) khả dụng không bị trùng cho số tiền này
    const suffix = await getAvailableSuffix();
    const finalPrice = applySuffixToPrice(basePrice, suffix);

    const days = payload.days ? Number(payload.days) : Number(existingOrder.days || 365);

    const updateFields = {
      status: ORDER_STATUS.RENEW_REQUIRED,
      price: finalPrice,
      gross_selling_price: finalPrice,
      days,
    };

    if (payload.note !== undefined) updateFields.note = payload.note;
    if (payload.supply_id !== undefined) updateFields.supply_id = payload.supply_id ? Number(payload.supply_id) : null;

    const [updatedOrder] = await getOrderTable(trx)
      .where({ id: Number(id) })
      .update(updateFields)
      .returning("*");

    const formatMoney = (v) => new Intl.NumberFormat("vi-VN").format(v) + " ₫";
    const summary = `Yêu cầu gia hạn đơn hàng #${updatedOrder.id_order} thành công. Trạng thái: "${getOrderStatusLabel(ORDER_STATUS.RENEW_REQUIRED)}", Tổng tiền thanh toán: ${formatMoney(updatedOrder.price)} (Slot Suffix: ${suffix})`;

    // Phát event Domain: ORDER_UPDATED với action RENEWAL_REQUESTED
    eventBus.emit(EVENTS.ORDER_UPDATED, {
      orderId: updatedOrder.id,
      id_order: updatedOrder.id_order,
      customer: updatedOrder.customer,
      previousStatus: existingOrder.status,
      newStatus: updatedOrder.status,
      price: updatedOrder.price,
      days: updatedOrder.days,
      summary,
      action: "RENEWAL_REQUESTED",
    });

    return updatedOrder;
  });
}

/**
 * Xóa đơn hàng (Hard Delete) hoặc Hủy & Chuyển Trạng Thái (Soft Delete) + phát event
 */
async function deleteOrder(id) {
  return await withTransaction(async (trx) => {
    const existingOrder = await trx(TABLES.ORDER_LIST).where({ id: Number(id) }).first();
    if (!existingOrder) {
      throw new Error("Không tìm thấy đơn hàng cần xóa.");
    }

    const status = existingOrder.status;
    const formatMoney = (v) => new Intl.NumberFormat("vi-VN").format(v) + " ₫";
    const todayYMD = new Date(new Date().getTime() + 7 * 60 * 60 * 1000).toISOString().split("T")[0];

    // Chỉ đơn Đã Thanh Toán (PAID) khi xóa mới chuyển sang Đã Hủy (CANCELED) để nằm trong tab Hoàn Tiền.
    // Các đơn chưa thanh toán hoặc trạng thái khác khi xóa sẽ XÓA VĨNH VIỄN (Hard Delete).
    const isPaidOrder = status === ORDER_STATUS.PAID;

    if (!isPaidOrder) {
      await trx(TABLES.ORDER_LIST).where({ id: Number(id) }).del();
      const summary = `Đã xóa vĩnh viễn đơn hàng #${existingOrder.id_order} của khách "${existingOrder.customer}" (${formatMoney(existingOrder.price)})`;
      eventBus.emit(EVENTS.ORDER_DELETED, {
        orderId: existingOrder.id,
        id_order: existingOrder.id_order,
        customer: existingOrder.customer,
        price: existingOrder.price,
        deletedOrder: existingOrder,
        summary,
        action: "HARD_DELETE",
      });
      return { success: true, action: "deleted", message: `Đã xóa vĩnh viễn đơn hàng #${existingOrder.id_order}` };
    }

    // Đơn Đã Thanh Toán khi xóa -> Chuyển thành Đã Hủy (CANCELED) để nằm trong tab Hoàn Tiền
    await trx(TABLES.ORDER_LIST).where({ id: Number(id) }).update({
      status: ORDER_STATUS.CANCELED,
      canceled_at: existingOrder.canceled_at || todayYMD,
    });

    const summary = `Đã hủy đơn hàng đã thanh toán #${existingOrder.id_order} của khách "${existingOrder.customer}" (${formatMoney(existingOrder.price)})`;

    eventBus.emit(EVENTS.ORDER_CANCELED_REFUNDED, {
      orderId: existingOrder.id,
      orderCode: existingOrder.id_order,
      order: existingOrder,
      refundAmount: Number(existingOrder.price || 0),
      canceledAt: todayYMD,
      summary,
      action: "ORDER_CANCELED",
    });

    return { success: true, action: "canceled", message: summary };
  });
}

async function processOrderToProcessing(id) {
  return await withTransaction(async (trx) => {
    const existingOrder = await getOrderTable(trx).where({ id: Number(id) }).first();
    if (!existingOrder) {
      throw new Error("Không tìm thấy đơn hàng.");
    }

    const isRenewal = isRenewalOrder(existingOrder.status);
    const daysToAdd = Number(existingOrder.days || 365);

    const updateFields = {
      status: ORDER_STATUS.PROCESSING,
    };

    let newExpiredAt = null;
    if (isRenewal) {
      newExpiredAt = calculateNewExpiry(existingOrder.expired_at, daysToAdd);
      updateFields.expired_at = newExpiredAt;
    }

    const [updatedOrder] = await getOrderTable(trx)
      .where({ id: Number(id) })
      .update(updateFields)
      .returning("*");

    const existingLog = await trx(TABLES.SUPPLIER_ORDER_COST_LOG)
      .where({ order_list_id: updatedOrder.id })
      .first();

    const importCost = Number(updatedOrder.cost || 0);
    if (!existingLog && importCost > 0) {
      let supplyId = updatedOrder.supply_id ? Number(updatedOrder.supply_id) : null;
      if (!supplyId) {
        const defaultSupplier = await trx(TABLES.SUPPLIER).orderBy("id", "asc").first();
        supplyId = defaultSupplier ? defaultSupplier.id : 1;
      }
      await trx(TABLES.SUPPLIER_ORDER_COST_LOG).insert({
        order_list_id: updatedOrder.id,
        supply_id: supplyId,
        id_order: updatedOrder.id_order,
        import_cost: importCost,
        ncc_payment_status: 'Chưa Thanh Toán',
        logged_at: db.fn.now(),
      });

      eventBus.emit(EVENTS.SUPPLIER_COST_ADDED, {
        cost: importCost,
        supplier_id: updatedOrder.supply_id,
        summary: `Thêm chi phí nhập hàng cho đơn #${updatedOrder.id_order}: ${importCost} ₫`,
      });
    }

    const summary = `Đơn hàng #${updatedOrder.id_order} đã chuyển sang Đang Xử Lý. Đã ghi nhận chi phí nhập hàng.`;
    eventBus.emit(EVENTS.ORDER_UPDATED, {
      orderId: updatedOrder.id,
      id_order: updatedOrder.id_order,
      customer: updatedOrder.customer,
      previousStatus: existingOrder.status,
      newStatus: updatedOrder.status,
      summary,
      action: "SET_PROCESSING",
    });

    return updatedOrder;
  });
}

async function processCompleteOrder(trxContext, order, amount, options = {}) {
  const runWithTrx = async (trx) => {
    const isRenewal = isRenewalOrder(order.status);
    const daysToAdd = Number(order.days || 365);

    const updateFields = {
      status: ORDER_STATUS.PAID,
      was_paid: true,
    };

    let newExpiredAt = null;
    if (isRenewal) {
      newExpiredAt = calculateNewExpiry(order.expired_at, daysToAdd);
      updateFields.expired_at = newExpiredAt;
    }

    const [updatedOrder] = await getOrderTable(trx)
      .where({ id: order.id })
      .update(updateFields)
      .returning("*");

    const payAmount = amount != null ? Number(amount) : Number(updatedOrder.price || 0);

    eventBus.emit(EVENTS.ORDER_PAID, {
      orderId: updatedOrder.id,
      id_order: updatedOrder.id_order,
      customer: updatedOrder.customer,
      amount: payAmount,
      price: Number(updatedOrder.price || 0),
      cost: Number(updatedOrder.cost || 0),
      order_date: updatedOrder.order_date,
      status: updatedOrder.status,
      isRenewal,
      action: options.action || "COMPLETED",
    });

    if (isRenewal) {
      eventBus.emit(EVENTS.ORDER_RENEWED, {
        orderId: updatedOrder.id,
        id_order: updatedOrder.id_order,
        customer: updatedOrder.customer,
        daysAdded: daysToAdd,
        newExpiredAt: updatedOrder.expired_at,
        action: options.action || "COMPLETED",
      });
    }

    return { updatedOrder, isRenewal };
  };

  if (trxContext) {
    return await runWithTrx(trxContext);
  } else {
    return await withTransaction(async (trx) => {
      return await runWithTrx(trx);
    });
  }
}

async function payOrderWithCredit(id, creditNoteId) {
  return await withTransaction(async (trx) => {
    const order = await getOrderTable(trx).where({ id: Number(id) }).first();
    if (!order) throw new Error("Không tìm thấy đơn hàng.");

    const creditNote = await trx(TABLES.REFUND_CREDIT_NOTES).where({ id: Number(creditNoteId) }).first();
    if (!creditNote) throw new Error("Không tìm thấy mã credit.");

    const orderPrice = Number(order.price || 0);
    const availableAmount = Number(creditNote.available_amount || 0);

    if (availableAmount < orderPrice) {
      throw new Error(`Số dư credit (${availableAmount.toLocaleString()} ₫) không đủ thanh toán đơn hàng (${orderPrice.toLocaleString()} ₫).`);
    }

    await trx(TABLES.REFUND_CREDIT_APPLICATIONS).insert({
      credit_note_id: creditNote.id,
      target_order_list_id: order.id,
      target_order_code: order.id_order,
      applied_amount: orderPrice,
      note: `Thanh toán đơn #${order.id_order} bằng credit ${creditNote.credit_code}`,
      applied_by: 'ADMIN',
    });

    const newAvailable = availableAmount - orderPrice;
    const newStatus = newAvailable <= 0 ? 'FULLY_APPLIED' : 'PARTIALLY_APPLIED';
    await trx(TABLES.REFUND_CREDIT_NOTES)
      .where({ id: creditNote.id })
      .update({
        available_amount: newAvailable,
        status: newStatus,
        updated_at: db.fn.now(),
      });

    const isRenewal = isRenewalOrder(order.status);
    const daysToAdd = Number(order.days || 365);
    const updateFields = {
      status: ORDER_STATUS.PROCESSING,
      payment_method: 'credit',
    };

    if (isRenewal) {
      updateFields.expired_at = calculateNewExpiry(order.expired_at, daysToAdd);
    }

    const [updatedOrder] = await getOrderTable(trx)
      .where({ id: order.id })
      .update(updateFields)
      .returning("*");

    const existingLog = await trx(TABLES.SUPPLIER_ORDER_COST_LOG)
      .where({ order_list_id: updatedOrder.id })
      .first();
    const importCost = Number(updatedOrder.cost || 0);
    if (!existingLog && importCost > 0) {
      let supplyId = updatedOrder.supply_id ? Number(updatedOrder.supply_id) : null;
      if (!supplyId) {
        const defaultSupplier = await trx(TABLES.SUPPLIER).orderBy("id", "asc").first();
        supplyId = defaultSupplier ? defaultSupplier.id : 1;
      }
      await trx(TABLES.SUPPLIER_ORDER_COST_LOG).insert({
        order_list_id: updatedOrder.id,
        supply_id: supplyId,
        id_order: updatedOrder.id_order,
        import_cost: importCost,
        ncc_payment_status: 'Chưa Thanh Toán',
        logged_at: db.fn.now(),
      });

      eventBus.emit(EVENTS.SUPPLIER_COST_ADDED, {
        cost: importCost,
        supplier_id: updatedOrder.supply_id,
        summary: `Thêm chi phí nhập hàng cho đơn #${updatedOrder.id_order} thanh toán bằng credit: ${importCost} ₫`,
      });
    }

    return updatedOrder;
  });
}

module.exports = {
  getOrders,
  getOrderById,
  createOrder,
  updateOrder,
  renewOrder,
  deleteOrder,
  processOrderToProcessing,
  processCompleteOrder,
  payOrderWithCredit,
};
