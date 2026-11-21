const { db, TABLES, COLS, withTransaction } = require("@/db");
const { publishEventInTrx, EVENTS } = require("@/events");
const { getAvailableSuffix, applySuffixToPrice, extractSlotSuffix } = require("@/domains/payments/services/slotSuffixService");
const { ORDER_STATUS, getOrderStatusLabel } = require("@/constants/orderStatus");
const { SUPPLIER_PAYMENT_STATUS } = require("@/constants/supplierStatus");
const { isRenewalOrder, calculateNewExpiry } = require("./orderPaymentService");
const { isMavrykSupplier } = require("@/domains/suppliers/utils/supplierCheck");
const { resolveOrderCatalogPricing, getOrderPrefix, selectCatalogPrice } = require("@/domains/products/services/catalogPricingService");
const { generateOrderActivationKey } = require("@/domains/products/services/activationKeyService");
const { listImportWarehouseTags } = require("@/domains/warehouse/services/importWarehouseTagService");
const { ensureSupplierCostLog } = require("./supplierCostLogService");

const O_COLS = COLS.ORDER_LIST;
const getOrderTable = (trx) => (trx || db)(TABLES.ORDER_LIST);
async function emitOrderEvent(trx, eventName, payload) {
  const aggregateId = payload.orderId || payload.order_id || payload.id || payload.id_order || "";
  const aggregateType = eventName.startsWith("WAREHOUSE_")
    ? "WAREHOUSE"
    : eventName.startsWith("SUPPLIER_")
      ? "SUPPLIER"
      : "ORDER";

  return publishEventInTrx(trx, {
    eventName,
    aggregateType,
    aggregateId,
    action: payload.action || eventName,
    beforeState: payload.old_values || payload.beforeState || null,
    afterState: payload.new_values || payload.afterState || (eventName === EVENTS.ORDER_CREATED ? payload : null),
    changedFields: payload.changes || payload.changed_fields || {},
    source: "ORDER_SERVICE",
    payload,
  });
}

const isCustomerMavryk = (c) => String(c || "").trim().toLowerCase() === "mavryk";

// Các sub-services phân rã theo Giai Đoạn 4 (Master Refactoring Plan)
const {
  getOrders,
  getOrderById,
  getDefaultShopBank,
  attachBatchSupplierAndQrInfo,
  attachSupplierInfo,
  attachVietQrToOrder,
  applyCanceledFilter,
  applyExpiredFilter,
  applyImportFilter,
  applyActiveFilter,
} = require("./orderQueryService");

const {
  payOrderWithCredit,
  calculateOrderRemainingValue,
} = require("./orderCreditService");

const A = COLS.ACCOUNTS;
const AS = COLS.ACCOUNT_SLOTS;
const PN = COLS.PRODUCT_NAMES;
const PP = COLS.PACKAGE_PRODUCT;
const V = COLS.VARIANT;
const PRD = COLS.PRODUCT;

function normalizeWarehouseAccountUsername(order) {
  const value = order?.information_order || order?.slot || order?.customer || "";
  return String(value).trim().toLowerCase();
}

async function resolveWarehouseProductNameIdInTrx(trx, order) {
  const variantId = Number(order?.id_product);
  let productName = "";

  if (Number.isInteger(variantId) && variantId > 0) {
    const variant = await trx(TABLES.VARIANT + " as v")
      .leftJoin(TABLES.PRODUCT + " as p", "p." + PRD.ID, "v." + V.PRODUCT_ID)
      .where("v." + V.ID, variantId)
      .select(
        "v." + V.VARIANT_NAME + " as variant_name",
        "v." + V.DISPLAY_NAME + " as display_name",
        "p." + PRD.PACKAGE_NAME + " as package_name"
      )
      .first();
    productName = variant?.package_name || variant?.variant_name || variant?.display_name || "";
  }

  if (!productName) productName = String(order?.information_order || "").trim();
  if (!productName) return null;

  const productNameRow = await trx(TABLES.PRODUCT_NAMES)
    .whereRaw("LOWER(TRIM(??)) = ?", [PN.NAME, productName.toLowerCase()])
    .first();
  return productNameRow ? Number(productNameRow[PN.ID]) : null;
}

function hasWarehouseSyncFields(payload) {
  return [
    "information_order",
    "id_product",
    "slot",
    "note",
    "days",
    "expired_at",
    "cost",
    "package_slots",
    "warehouse_password",
    "warehouse_backup_email",
    "warehouse_two_fa",
    "warehouse_otp_type",
    "otp_type",
  ].some((field) => payload[field] !== undefined);
}

async function syncExistingImportOrderToWarehouseInTrx(trx, { existingOrder, updatedOrder, payload }) {
  if (!String(existingOrder.id_order || "").toUpperCase().startsWith("MAVN")) return null;
  if (!hasWarehouseSyncFields(payload)) return null;

  const oldAccountUsername = normalizeWarehouseAccountUsername(existingOrder);
  const oldProductNameId = await resolveWarehouseProductNameIdInTrx(trx, existingOrder);
  if (!oldAccountUsername || !oldProductNameId) return null;

  const account = await trx(TABLES.ACCOUNTS)
    .whereRaw("LOWER(TRIM(??)) = ?", [A.ACCOUNT_USERNAME, oldAccountUsername])
    .forUpdate()
    .first();
  if (!account) return null;

  let matchingSlots = await trx(TABLES.ACCOUNT_SLOTS)
    .where({ [AS.ACCOUNT_ID]: account[A.ID], [AS.NAME_ID]: oldProductNameId })
    .forUpdate();
  if (matchingSlots.length === 0) return null;
  if (matchingSlots.length > 1 && Number(existingOrder.id_product) > 0) {
    const tags = await listImportWarehouseTags(Number(existingOrder.id_product), trx);
    matchingSlots = matchingSlots.filter((slot) => tags.includes(slot[AS.VARIANT_TAG]));
  }
  if (matchingSlots.length === 0) return null;
  if (matchingSlots.length > 1) {
    throw new Error(`Không thể đồng bộ kho: tài khoản ${oldAccountUsername} có nhiều slot cùng dịch vụ.`);
  }

  const slot = matchingSlots[0];
  const slotUpdates = { [AS.UPDATED_AT]: trx.fn.now() };
  if (payload.warehouse_password !== undefined) slotUpdates[AS.PASSWORD] = payload.warehouse_password || null;
  else if (payload.slot !== undefined) slotUpdates[AS.PASSWORD] = payload.slot || null;
  if (payload.warehouse_backup_email !== undefined) slotUpdates[AS.BACKUP_EMAIL] = payload.warehouse_backup_email || null;
  if (payload.warehouse_two_fa !== undefined) slotUpdates[AS.TWO_FA] = payload.warehouse_two_fa || null;
  if (payload.warehouse_otp_type !== undefined) slotUpdates[AS.OTP_TYPE] = payload.warehouse_otp_type || null;
  else if (payload.otp_type !== undefined) slotUpdates[AS.OTP_TYPE] = payload.otp_type || null;
  if (payload.note !== undefined) slotUpdates[AS.SERVICE_NOTE] = payload.note || null;
  if (payload.days !== undefined) slotUpdates[AS.DAYS] = Number(updatedOrder.days || 0) || null;
  if (payload.expired_at !== undefined) slotUpdates[AS.EXPIRED_AT] = updatedOrder.expired_at || null;

  await trx(TABLES.ACCOUNT_SLOTS).where(AS.ID, slot[AS.ID]).update(slotUpdates);

  if (payload.information_order !== undefined) {
    const nextAccountUsername = normalizeWarehouseAccountUsername(updatedOrder);
    if (!nextAccountUsername) throw new Error("Không thể đồng bộ kho: tài khoản mới không được để trống.");
    await trx(TABLES.ACCOUNTS)
      .where(A.ID, account[A.ID])
      .update({ [A.ACCOUNT_USERNAME]: nextAccountUsername, [A.UPDATED_AT]: trx.fn.now() });
  }

  const packageUpdates = { [PP.UPDATED_AT]: trx.fn.now() };
  if (payload.cost !== undefined) packageUpdates[PP.COST] = Number(updatedOrder.cost || 0);
  if (payload.package_slots !== undefined) packageUpdates[PP.SLOT] = Number(payload.package_slots || 0) || null;
  const packageHasBusinessChanges = Object.keys(packageUpdates).length > 1;
  let packageProductId = null;
  if (packageHasBusinessChanges) {
    const matchingPackages = await trx(TABLES.PACKAGE_PRODUCT)
      .where({ [PP.ACCOUNT_ID]: account[A.ID], [PP.PRODUCT_NAME_ID]: oldProductNameId })
      .forUpdate();
    if (matchingPackages.length > 1) {
      throw new Error(`Không thể đồng bộ kho gói: tài khoản ${oldAccountUsername} có nhiều gói cùng dịch vụ.`);
    }
    if (matchingPackages.length === 1) {
      packageProductId = matchingPackages[0][PP.ID];
      await trx(TABLES.PACKAGE_PRODUCT).where(PP.ID, packageProductId).update(packageUpdates);
    }
  }

  return { accountId: account[A.ID], slotId: slot[AS.ID], packageProductId };
}
async function createRefundCreditNoteForCanceledOrder(trx, order, refundAmount, canceledAt) {
  if (!refundAmount || refundAmount <= 0) return;
  if (String(order.id_order || "").toUpperCase().startsWith("MAVN") || isCustomerMavryk(order.customer)) return;

  const creditCode = `RFC-${order.id_order || "ORDER"}-${order.id}`;
  await trx(TABLES.REFUND_CREDIT_NOTES)
    .insert({
      credit_code: creditCode,
      source_order_list_id: order.id,
      source_order_code: order.id_order,
      customer_name: order.customer || "Khách hàng",
      customer_contact: order.contact || "",
      refund_amount: refundAmount,
      available_amount: refundAmount,
      status: "OPEN",
      note: `Tự động tạo credit khi hủy đơn #${order.id_order} vào ngày ${canceledAt}`,
      source_kind: "ORDER_REFUND",
      created_at: trx.fn.now(),
      updated_at: trx.fn.now(),
    })
    .onConflict("credit_code")
    .ignore();
}

const VALID_ORDER_PREFIXES = ["MAVC", "MAVL", "MAVN", "MAVK", "MAVS", "MAVT"];

/**
 * Trích xuất mã đơn ngẫu nhiên chuẩn tiền tố (MAVN, MAVC, MAVL...)
 */
function generateOrderCode(prefix = "MAVC") {
  const normalizedPrefix = VALID_ORDER_PREFIXES.includes(String(prefix || "").toUpperCase())
    ? String(prefix).toUpperCase()
    : "MAVC";
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let random = "";
  for (let i = 0; i < 5; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${normalizedPrefix}${random}`;
}

async function resolveSupplyId(trx, supplyInput) {
  if (!supplyInput) return null;
  const num = Number(supplyInput);
  if (!isNaN(num) && num > 0) {
    const foundById = await trx(TABLES.SUPPLIER).where({ id: num }).first();
    if (foundById) return Number(foundById.id);
  }
  const foundByName = await trx(TABLES.SUPPLIER)
    .whereILike(COLS.SUPPLIER.SUPPLIER_NAME, String(supplyInput).trim())
    .first();
  if (foundByName) return Number(foundByName.id);
  return null;
}

/**
 * Tạo đơn hàng mới + phát event ORDER_CREATED (Bọc Transaction)
 */

async function incrementVariantOrderCount(trx, variantId) {
  if (!variantId) return;
  const numId = Number(variantId);
  if (isNaN(numId) || numId <= 0) return;
  try {
    await trx(TABLES.VARIANT)
      .where({ [COLS.VARIANT.ID]: numId })
      .increment(COLS.VARIANT.COUNT, 1);
  } catch (err) {
    console.error(`[incrementVariantOrderCount] Lỗi tăng số đơn cho variant ${numId}:`, err.message);
  }
}

async function createOrder(payload) {
  return await withTransaction(async (trx) => {
    const rawPrefix = String(payload.order_prefix || "").trim().toUpperCase();
    const requestedOrderCode = String(payload.id_order || "").trim().toUpperCase();
    const isMavn = rawPrefix === "MAVN" || requestedOrderCode.startsWith("MAVN");
    const effectivePrefix = isMavn ? "MAVN" : (VALID_ORDER_PREFIXES.includes(rawPrefix) ? rawPrefix : "MAVC");
    const id_order = requestedOrderCode || generateOrderCode(effectivePrefix);

    const existingOrder = await getOrderTable(trx)
      .whereRaw("UPPER(BTRIM(??)) = ?", [O_COLS.ID_ORDER, id_order])
      .first(O_COLS.ID);
    if (existingOrder) {
      throw new Error("M\u00e3 \u0111\u01a1n h\u00e0ng " + id_order + " \u0111\u00e3 t\u1ed3n t\u1ea1i.");
    }
    const rawPrice = Number(payload.price || 0);
    const basePrice = payload.gross_selling_price != null ? Number(payload.gross_selling_price) : rawPrice;
    const status = payload.status || (isMavn ? ORDER_STATUS.PAID : ORDER_STATUS.UNPAID);

    let finalPrice = basePrice;
    if (status === ORDER_STATUS.UNPAID || status === ORDER_STATUS.RENEW_REQUIRED) {
      if (basePrice > 0) {
        const suffix = await getAvailableSuffix(trx);
        finalPrice = applySuffixToPrice(basePrice, suffix);
      }
    }

    const customerVal = payload.customer || (isMavn ? "Mavryk" : "Khách hàng");
    const isMavryk = isCustomerMavryk(customerVal);
    const rawCost = Number(payload.cost || 0);

    let finalCost = 0;
    if (isMavn) {
      finalCost = Number(payload.cost || payload.price || 0);
      finalPrice = 0;
    } else {
      finalCost = isMavryk ? 0 : rawCost;
    }

    const isPaid = status === ORDER_STATUS.PAID || isMavn || String(id_order).toUpperCase().startsWith("MAVN");
    const newOrderData = {
      id_order,
      customer: customerVal,
      contact: payload.contact || "",
      information_order: payload.information_order || "",
      slot: payload.slot || "",
      price: finalPrice,
      gross_selling_price: isMavn ? 0 : basePrice,
      cost: finalCost,
      status: isMavn ? ORDER_STATUS.PAID : status,
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

    const warehouseTag = typeof payload.warehouse_variant_tag === "string"
      ? payload.warehouse_variant_tag.trim() : "";
    if (isMavn && (payload.save_to_warehouse === true || payload.save_to_package === true)) {
      if (!warehouseTag) throw new Error("Vui lòng chọn tag sản phẩm khi lưu kho.");
      const tags = await listImportWarehouseTags(Number(newOrderData.id_product), trx);
      if (!tags.includes(warehouseTag)) throw new Error("Tag không thuộc sản phẩm đã chọn.");
    }

    let createdOrder;
    try {
      [createdOrder] = await getOrderTable(trx)
        .insert(newOrderData)
        .returning("*");
    } catch (error) {
      if (error?.code === "23505" && error?.constraint === "uq_order_list_id_order_upper_trim") {
        throw new Error("Mã đơn hàng " + id_order + " đã tồn tại.");
      }
      throw error;
    }

    // Tự động kiểm tra hoặc tạo bản ghi Activation Key trong warehouse.activation_keys (nếu đơn hàng bán có tạo mã key hoặc khớp rule)
    if (!isMavn) {
      let matchedRule = null;
      try {
        let finalKeyCode = null;
        let targetProductNameId = null;
        let sysProductId = null;

        // 1. Kiểm tra quy tắc khớp trong TABLES.ACTIVATION_KEY_RULES theo Variant + NCC
        if (newOrderData.id_product && newOrderData.supply_id) {
          matchedRule = await trx(TABLES.ACTIVATION_KEY_RULES)
            .join(`${TABLES.VARIANT} as v`, "v.id", `${TABLES.ACTIVATION_KEY_RULES}.variant_id`)
            .leftJoin(`${TABLES.PRODUCT} as p`, "p.id", "v.product_id")
            .select(
              `${TABLES.ACTIVATION_KEY_RULES}.*`,
              "v.variant_name",
              "v.display_name as variant_display_name",
              "p.id as parent_product_id",
              "p.package_name as product_name"
            )
            .where(`${TABLES.ACTIVATION_KEY_RULES}.variant_id`, Number(newOrderData.id_product))
            .where(`${TABLES.ACTIVATION_KEY_RULES}.supplier_id`, Number(newOrderData.supply_id))
            .where(`${TABLES.ACTIVATION_KEY_RULES}.is_active`, true)
            .whereNotNull(`${TABLES.ACTIVATION_KEY_RULES}.${COLS.ACTIVATION_KEY_RULES.TARGET_VARIANT_TAG}`)
            .first();
        }

        if (payload.require_activation_key_rule === true && !matchedRule) {
          throw new Error("Quy tắc cấp key đã thay đổi. Vui lòng chọn lại sản phẩm và NCC.");
        }

        if (matchedRule) {
          targetProductNameId = matchedRule.product_name_id;
          sysProductId = matchedRule.parent_product_id || null;

          // Ưu tiên lấy key từ information_order (do frontend tự động điền)
          const currentInfo = String(createdOrder.information_order || "").trim();
          if (currentInfo) {
            finalKeyCode = currentInfo.toUpperCase();
          } else {
            // Nếu information_order đang rỗng -> Tự động sinh key và lưu vào information_order
            finalKeyCode = generateOrderActivationKey();
            await getOrderTable(trx).where("id", createdOrder.id).update({ information_order: finalKeyCode });
            createdOrder.information_order = finalKeyCode;
          }
        } else if (payload.activation_key) {
          finalKeyCode = String(payload.activation_key).trim().toUpperCase();
        }

        if (finalKeyCode) {
          if (!targetProductNameId) {
            const prodIdToLookup = newOrderData.id_product || payload.id_product;
            if (prodIdToLookup) {
              const numProdId = Number(prodIdToLookup);
              const variantRow = await trx(TABLES.VARIANT)
                .leftJoin(TABLES.PRODUCT, `${TABLES.PRODUCT}.id`, `${TABLES.VARIANT}.product_id`)
                .select(
                  `${TABLES.VARIANT}.id as variant_id`,
                  `${TABLES.VARIANT}.display_name as variant_display`,
                  `${TABLES.VARIANT}.variant_name as variant_name`,
                  `${TABLES.PRODUCT}.id as parent_product_id`,
                  `${TABLES.PRODUCT}.package_name as parent_package_name`
                )
                .where(function() {
                  if (!isNaN(numProdId) && numProdId > 0) {
                    this.where(`${TABLES.VARIANT}.id`, numProdId);
                  } else {
                    this.whereILike(`${TABLES.VARIANT}.display_name`, String(prodIdToLookup))
                        .orWhereILike(`${TABLES.VARIANT}.variant_name`, String(prodIdToLookup));
                  }
                })
                .first();

              if (variantRow) {
                sysProductId = variantRow.parent_product_id || null;
                const targetName = (variantRow.parent_package_name || variantRow.variant_name || variantRow.variant_display || "").trim().toLowerCase();
                const pNameRow = await trx(TABLES.PRODUCT_NAMES)
                  .whereRaw("LOWER(name) = ?", [targetName])
                  .first();
                targetProductNameId = pNameRow?.id || null;
              }
            }
          }

          if (!targetProductNameId) {
            const defaultPn = await trx(TABLES.PRODUCT_NAMES).first();
            targetProductNameId = defaultPn?.id || null;
          }

          if (targetProductNameId) {
            const insertKey = trx(TABLES.ACTIVATION_KEYS)
              .insert({
                key_code: finalKeyCode,
                product_name_id: targetProductNameId,
                [COLS.ACTIVATION_KEYS.TARGET_VARIANT_TAG]:
                  matchedRule?.[COLS.ACTIVATION_KEY_RULES.TARGET_VARIANT_TAG] || null,
                product_id: sysProductId,
                id_order: createdOrder.id_order,
                status: "AVAILABLE",
                customer_info: `${createdOrder.customer || ""}${createdOrder.contact ? " (" + createdOrder.contact + ")" : ""}`.trim() || null,
                note: payload.note || (matchedRule ? `Tự động cấp theo quy tắc Variant #${matchedRule.variant_id} + NCC #${matchedRule.supplier_id}` : `Tự động sinh từ đơn hàng #${createdOrder.id_order}`),
                created_by: matchedRule ? "AutoRule" : "Admin",
                created_at: db.fn.now(),
                updated_at: db.fn.now(),
              });
            if (matchedRule) {
              await insertKey;
            } else {
              await insertKey.onConflict("key_code").merge();
            }
            console.log(`🔑 [ActivationKey] Đã lưu mã key ${finalKeyCode} vào kho (product_name_id: ${targetProductNameId}) cho đơn #${createdOrder.id_order}`);
          }
        }
      } catch (keyErr) {
        if (matchedRule || payload.require_activation_key_rule === true) throw keyErr;
        console.error("[OrderService] Lỗi tạo Activation Key liên kết:", keyErr.message);
      }
    }

    const isMavnOrder = isMavn || String(id_order).toUpperCase().startsWith("MAVN");
    const shouldSyncWarehouseOrPackage = isMavnOrder && (payload.save_to_package === true || payload.save_to_warehouse === true);
    if (shouldSyncWarehouseOrPackage) {
      try {
        await trx.savepoint(async (subTrx) => {
          const isSaveToWarehouse = payload.save_to_warehouse === true || payload.save_to_package === true;
          const isSaveToPackage = payload.save_to_package === true;
          const accountUsername = payload.information_order
            ? String(payload.information_order).trim().toLowerCase()
            : (payload.slot ? (payload.slot.split('|')[0] || payload.customer).trim().toLowerCase() : String(payload.customer || "mavryk").trim().toLowerCase());

          let productName = payload.information_order || "Dịch vụ";
          const prodIdToLookup = newOrderData.id_product || payload.id_product;
          if (prodIdToLookup) {
            try {
              const numProdId = Number(prodIdToLookup);
              const variantQuery = subTrx(TABLES.VARIANT)
                .leftJoin(TABLES.PRODUCT, `${TABLES.PRODUCT}.id`, `${TABLES.VARIANT}.product_id`)
                .select(
                  `${TABLES.VARIANT}.display_name as variant_display`,
                  `${TABLES.VARIANT}.variant_name as variant_name`,
                  `${TABLES.PRODUCT}.package_name as parent_package_name`
                );
              if (!isNaN(numProdId) && numProdId > 0) {
                variantQuery.where(`${TABLES.VARIANT}.id`, numProdId);
              } else {
                variantQuery.where(function() {
                  this.whereILike(`${TABLES.VARIANT}.display_name`, String(prodIdToLookup))
                      .orWhereILike(`${TABLES.VARIANT}.variant_name`, String(prodIdToLookup));
                });
              }
              const variantRow = await variantQuery.first();
              if (variantRow) {
                productName = variantRow.parent_package_name || variantRow.variant_name || variantRow.variant_display || productName;
              }
            } catch (e) {
              console.log("[OrderService] Không resolve được sản phẩm chính cho kho:", e.message);
            }
          }

          let pName = await subTrx(TABLES.PRODUCT_NAMES)
            .whereRaw("LOWER(name) = ?", [productName.toLowerCase().trim()])
            .first();

          let nameId = pName?.id;
          if (!nameId && (isSaveToWarehouse || isSaveToPackage)) {
            const [insertedP] = await subTrx(TABLES.PRODUCT_NAMES)
              .insert({ name: productName.trim() })
              .returning("id");
            nameId = insertedP.id || insertedP;
          }

          let stockId = null;
          if (accountUsername) {
            let stock = await subTrx(TABLES.PRODUCT_KEYS)
              .whereRaw("LOWER(account_username) = ?", [accountUsername])
              .first();

            stockId = stock?.id;
            if (!stockId && (isSaveToWarehouse || isSaveToPackage)) {
              const [newStock] = await subTrx(TABLES.PRODUCT_KEYS)
                .insert({
                  account_username: accountUsername,
                  created_at: new Date(),
                })
                .returning("*");
              stockId = newStock.id;
            }
          }

          let warehouseSlotId;
          if (stockId && nameId && isSaveToWarehouse) {
            const existingService = await subTrx(TABLES.STOCK_SERVICES)
              .where({
                account_id: stockId,
                name_id: nameId,
              })
              .where(AS.VARIANT_TAG, warehouseTag)
              .forUpdate().first();

            if (existingService) {
              warehouseSlotId = existingService.id;
              // Đã có trong kho -> Luôn đồng bộ dữ liệu mới (kể cả khi không lưu kho)
              const updateData = {
                password: payload.warehouse_password || payload.slot || existingService.password,
                [AS.VARIANT_TAG]: warehouseTag,
                expired_at: payload.expired_at ? new Date(payload.expired_at) : existingService.expired_at,
                service_note: payload.note || existingService.service_note,
                updated_at: new Date(),
              };
              if (payload.warehouse_backup_email !== undefined && payload.warehouse_backup_email !== "") {
                updateData.backup_email = payload.warehouse_backup_email;
              }
              if (payload.warehouse_two_fa !== undefined && payload.warehouse_two_fa !== "") {
                updateData.two_fa = payload.warehouse_two_fa;
              }
              if (payload.warehouse_otp_type !== undefined && payload.warehouse_otp_type !== "") {
                updateData.otp_type = payload.warehouse_otp_type;
              } else if (payload.otp_type !== undefined && payload.otp_type !== "") {
                updateData.otp_type = payload.otp_type;
              }
              await subTrx(TABLES.STOCK_SERVICES)
                .where({ id: existingService.id })
                .update(updateData);
              console.log(`✅ [WarehouseSync] Đã đồng bộ dữ liệu mới cho tài khoản "${accountUsername}" từ đơn ${id_order}`);
            } else {
              // Chưa có trong kho nhưng bật lưu kho -> tạo mới
              const [warehouseSlot] = await subTrx(TABLES.STOCK_SERVICES).insert({
                account_id: stockId,
                name_id: nameId,
                slot_index: 1,
                password: payload.warehouse_password || payload.slot || null,
                [AS.VARIANT_TAG]: warehouseTag,
                backup_email: payload.warehouse_backup_email || "",
                two_fa: payload.warehouse_two_fa || null,
                otp_type: payload.warehouse_otp_type || payload.otp_type || null,
                expired_at: payload.expired_at ? new Date(payload.expired_at) : null,
                status: "AVAILABLE",
                service_note: payload.note || null,
                created_at: new Date(),
                updated_at: new Date(),
              }).returning(AS.ID);
              warehouseSlotId = warehouseSlot[AS.ID];
            }
          }

          if (stockId) {
            await emitOrderEvent(subTrx, EVENTS.WAREHOUSE_STOCK_CREATED, {
              id: stockId,
              account: accountUsername,
              source: "order_sync",
              orderId: createdOrder.id,
              orderCode: createdOrder.id_order,
            });
          }

          // 4. Check & Sync Package Product (warehouse.package_products)
          if (isSaveToPackage && stockId && nameId) {
            if (!warehouseSlotId) throw new Error("Chưa lưu được dịch vụ vào Kho Hàng.");
            const existingPackage = await subTrx(TABLES.PACKAGE_PRODUCT)
              .where({
                product_name_id: nameId,
                account_id: stockId,
                [PP.ACCOUNT_SLOT_ID]: warehouseSlotId,
              })
              .first();

            if (!existingPackage) {
              let storageAccountId = null;
              if (payload.storage_account_username && String(payload.storage_account_username).trim()) {
                const storageAccUser = String(payload.storage_account_username).trim().toLowerCase();
                let storageStock = await subTrx(TABLES.PRODUCT_KEYS)
                  .whereRaw("LOWER(account_username) = ?", [storageAccUser])
                  .first();
                if (storageStock) {
                  storageAccountId = storageStock.id;
                } else {
                  const [newStorageStock] = await subTrx(TABLES.PRODUCT_KEYS)
                    .insert({
                      account_username: storageAccUser,
                      created_at: new Date(),
                    })
                    .returning("*");
                  storageAccountId = newStorageStock.id;
                }
              }

              let supplierName = payload.supply_id || "Mavryk";
              if (typeof supplierName === "number" || !isNaN(Number(supplierName))) {
                const sup = await subTrx(TABLES.SUPPLIER).where("id", Number(supplierName)).first();
                if (sup) supplierName = sup.supplier_name || sup.ncc_name || supplierName;
              }

              await subTrx(TABLES.PACKAGE_PRODUCT).insert({
                [PP.ACCOUNT_SLOT_ID]: warehouseSlotId,
                product_name_id: nameId,
                account_id: stockId,
                package_name: productName.trim(),
                supplier: supplierName,
                cost: Number(payload.cost || 0),
                slot: Number(payload.package_slots || 2),
                match_rule: payload.package_match_rule || "information",
                package_note: payload.note || null,
                storage_account_id: storageAccountId,
                storage_total: payload.storage_total || null,
                created_at: new Date(),
                updated_at: new Date(),
              });
              console.log(`📦 [PackageSync] Đã tự động tạo mới Gói sản phẩm cho tài khoản "${accountUsername}" - dịch vụ ID ${nameId}`);
            } else {
              console.log(`📦 [PackageSync] Gói sản phẩm cho tài khoản "${accountUsername}" đã tồn tại, bỏ qua.`);
            }
          }
        });
      } catch (err) {
        if (payload.save_to_warehouse === true || payload.save_to_package === true) throw err;
        console.error("[OrderService] Lỗi tự động lưu/đồng bộ kho/gói:", err.message);
      }
    }


    // 5. Tự động ghi nhận log chi phí NCC cho đơn nhập hàng (MAVN)
    const importCost = Number(createdOrder.cost || 0);
    const isSupplierMavryk = await isMavrykSupplier(trx, createdOrder);
    if (isMavn && !isSupplierMavryk && importCost > 0) {
      let supplyId = createdOrder.supply_id ? Number(createdOrder.supply_id) : null;
      if (!supplyId) {
        const defaultSupplier = await trx(TABLES.SUPPLIER).orderBy("id", "asc").first();
        supplyId = defaultSupplier ? defaultSupplier.id : 1;
      }

      if (!isSupplierMavryk) {
        const existingLog = await trx(TABLES.SUPPLIER_ORDER_COST_LOG)
          .where({ order_list_id: createdOrder.id })
          .first();

        if (!existingLog) {
          await trx(TABLES.SUPPLIER_ORDER_COST_LOG).insert({
            order_list_id: createdOrder.id,
            supply_id: supplyId,
            id_order: createdOrder.id_order,
            import_cost: importCost,
            ncc_payment_status: 'Chưa Thanh Toán',
            logged_at: db.fn.now(),
          });

          await emitOrderEvent(trx, EVENTS.SUPPLIER_COST_ADDED, {
            cost: importCost,
            supplier_id: supplyId,
            order_id: createdOrder.id,
            id_order: createdOrder.id_order,
            summary: `Thêm chi phí nhập hàng cho đơn #${createdOrder.id_order}: ${importCost} ₫`,
          });
        }
      }
    }

    const formatMoney = (v) => new Intl.NumberFormat("vi-VN").format(v) + " ₫";
    const statusLabel = getOrderStatusLabel(createdOrder.status);
    const summary = `Tạo mới đơn hàng #${createdOrder.id_order} cho khách "${createdOrder.customer}" với tổng tiền ${formatMoney(createdOrder.price)} [Trạng thái: ${statusLabel}]`;

    // Phát event Domain: ORDER_CREATED
    await emitOrderEvent(trx, EVENTS.ORDER_CREATED, {
      ...createdOrder,
      orderId: createdOrder.id,
      summary,
      action: "CREATE",
    });

    if (!isSupplierMavryk && isMavn && Number(createdOrder.cost) > 0) {
      await emitOrderEvent(trx, EVENTS.ORDER_IMPORT_CREATED, {
        orderId: createdOrder.id,
        id_order: createdOrder.id_order,
        orderCode: createdOrder.id_order,
        cost: Number(createdOrder.cost),
        order_date: createdOrder.order_date,
        created_at: createdOrder.created_at,
        customer: createdOrder.customer,
        isSupplierMavryk,
      });
    }

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
    const isMavn = Boolean(
      (existingOrder.id_order && String(existingOrder.id_order).startsWith("MAVN")) ||
      (targetCustomer && isCustomerMavryk(targetCustomer))
    );

    const nextStatus = payload.status !== undefined ? payload.status : existingOrder.status;
    const isPendingPayment = nextStatus === ORDER_STATUS.UNPAID || nextStatus === ORDER_STATUS.RENEW_REQUIRED;

    if (isMavn) {
      if (payload.cost !== undefined) {
        updateFields.cost = Number(payload.cost);
      } else if (payload.price !== undefined && (!existingOrder.cost || Number(existingOrder.cost) === 0)) {
        updateFields.cost = Number(payload.price);
      }
      updateFields.price = 0;
      updateFields.gross_selling_price = 0;
    } else if (isPendingPayment) {
      // Đơn bán hàng ở trạng thái chờ thanh toán / cần gia hạn:
      // BẮT BUỘC CỐ ĐỊNH SLOT SUFFIX của đơn này (1..100)
      const existingSuffix = extractSlotSuffix(existingOrder);

      // Xác định đúng giá gốc sản phẩm (KHÔNG LÀM TRÒN!)
      let basePrice = null;
      if (payload.gross_selling_price !== undefined && Number(payload.gross_selling_price) > 0) {
        basePrice = Number(payload.gross_selling_price);
      } else if (payload.price !== undefined && Number(payload.price) > 0) {
        // Nếu payload.price gửi lên trùng khớp với price cũ của đơn (không đổi sản phẩm):
        if (existingSuffix && Math.round(Number(payload.price)) === Math.round(Number(existingOrder.price || 0))) {
          basePrice = existingOrder.gross_selling_price != null
            ? Number(existingOrder.gross_selling_price)
            : (Number(payload.price) - existingSuffix);
        } else {
          basePrice = Number(payload.price);
        }
      } else {
        basePrice = Number(existingOrder.gross_selling_price != null ? existingOrder.gross_selling_price : existingOrder.price || 0);
      }

      // Giữ nguyên đúng giá sản phẩm không làm tròn
      if (basePrice > 0) {
        // Cố định slot suffix: Nếu đơn đã có suffix thì giữ nguyên, chỉ cấp mới nếu đơn chưa hề có suffix
        const suffixToUse = existingSuffix || (await getAvailableSuffix(trx, existingOrder.id));
        updateFields.gross_selling_price = basePrice;
        updateFields.price = applySuffixToPrice(basePrice, suffixToUse);
      } else {
        updateFields.gross_selling_price = 0;
        updateFields.price = 0;
      }

      if (payload.cost !== undefined) updateFields.cost = Number(payload.cost);
    } else {
      // Trạng thái đã thanh toán hoặc hủy (PAID, REFUNDED, CANCELED):
      if (payload.price !== undefined) updateFields.price = Number(payload.price);
      if (payload.gross_selling_price !== undefined) updateFields.gross_selling_price = Number(payload.gross_selling_price);
      if (payload.cost !== undefined) updateFields.cost = Number(payload.cost);
    }

    if (payload.status !== undefined) {
      updateFields.status = payload.status;
      if (payload.status === ORDER_STATUS.PAID) {
        updateFields.was_paid = true;
      }
    }

    if (payload.payment_method !== undefined) updateFields.payment_method = payload.payment_method;
    if (payload.note !== undefined) updateFields.note = payload.note;
    if (payload.days !== undefined) updateFields.days = Number(payload.days);
    if (payload.order_date !== undefined) updateFields.order_date = payload.order_date || null;
    if (payload.expired_at !== undefined) updateFields.expired_at = payload.expired_at || null;
    const oldSupplyId = existingOrder.supply_id ? Number(existingOrder.supply_id) : null;
    let resolvedNewSupplyId = oldSupplyId;
    if (payload.supply_id !== undefined) {
      resolvedNewSupplyId = await resolveSupplyId(trx, payload.supply_id);
      if (resolvedNewSupplyId !== oldSupplyId) {
        updateFields.supply_id = resolvedNewSupplyId;
      }
    }

    const isSupplierChanged = resolvedNewSupplyId !== oldSupplyId;
    const isOrderPaid = existingOrder.status === ORDER_STATUS.PAID || Boolean(existingOrder.was_paid);

    if (isOrderPaid && isSupplierChanged) {
      // 1. Tính số ngày còn lại của gói dịch vụ
      const totalDays = Math.max(Number(existingOrder.days || 365), 1);
      let remainingDays = 0;
      const targetExpiryStr = updateFields.expired_at !== undefined ? updateFields.expired_at : existingOrder.expired_at;
      if (targetExpiryStr) {
        const expiry = new Date(targetExpiryStr);
        if (!isNaN(expiry.getTime())) {
          expiry.setHours(0, 0, 0, 0);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const diffTime = expiry.getTime() - today.getTime();
          remainingDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
        }
      }

      // 2. Với NCC cũ (oldSupplyId): nếu là NCC ngoài (khác Mavryk/ID 1)
      const isOldMavryk = !oldSupplyId || oldSupplyId === 1;
      let refundOldAmount = 0;
      if (!isOldMavryk) {
        const oldPositiveLog = await trx(TABLES.SUPPLIER_ORDER_COST_LOG)
          .where({ order_list_id: existingOrder.id, supply_id: oldSupplyId })
          .where("import_cost", ">", 0)
          .orderBy("id", "desc")
          .first();
        const baseOldCost = oldPositiveLog ? Number(oldPositiveLog.import_cost || 0) : Number(existingOrder.cost || 0);
        refundOldAmount = remainingDays > 0 ? Math.round((baseOldCost / totalDays) * remainingDays) : 0;

        if (refundOldAmount > 0) {
          await trx(TABLES.SUPPLIER_ORDER_COST_LOG).insert({
            order_list_id: existingOrder.id,
            supply_id: oldSupplyId,
            id_order: existingOrder.id_order,
            import_cost: -refundOldAmount,
            ncc_payment_status: SUPPLIER_PAYMENT_STATUS.UNPAID,
            logged_at: trx.fn.now(),
          });
        }
      }

      // 3. Với NCC mới (resolvedNewSupplyId): nếu là NCC ngoài
      const isNewMavryk = !resolvedNewSupplyId || resolvedNewSupplyId === 1;
      let newProratedCost = 0;
      if (!isNewMavryk) {
        let newPackagePrice = null;
        const targetProductId = updateFields.id_product !== undefined ? updateFields.id_product : existingOrder.id_product;
        if (targetProductId) {
          const sc = await trx(TABLES.SUPPLIER_COST)
            .where({ variant_id: Number(targetProductId), supplier_id: resolvedNewSupplyId })
            .first();
          if (sc && Number(sc.price) > 0) {
            newPackagePrice = Number(sc.price);
          }
        }
        if (newPackagePrice == null) {
          if (payload.cost !== undefined && Number(payload.cost) > 0) {
            newPackagePrice = Number(payload.cost);
          } else {
            newPackagePrice = Number(existingOrder.cost || 0);
          }
        }

        newProratedCost = remainingDays > 0 ? Math.round((newPackagePrice / totalDays) * remainingDays) : 0;
        if (newProratedCost > 0) {
          await trx(TABLES.SUPPLIER_ORDER_COST_LOG).insert({
            order_list_id: existingOrder.id,
            supply_id: resolvedNewSupplyId,
            id_order: existingOrder.id_order,
            import_cost: newProratedCost,
            ncc_payment_status: SUPPLIER_PAYMENT_STATUS.UNPAID,
            logged_at: trx.fn.now(),
          });
        }
        updateFields.cost = newProratedCost;
      } else {
        updateFields.cost = 0;
      }
    } else if (!isOrderPaid && isSupplierChanged && resolvedNewSupplyId) {
      await trx(TABLES.SUPPLIER_ORDER_COST_LOG)
        .where({ order_list_id: existingOrder.id, ncc_payment_status: SUPPLIER_PAYMENT_STATUS.UNPAID })
        .update({
          supply_id: resolvedNewSupplyId,
          ...(updateFields.cost !== undefined ? { import_cost: updateFields.cost } : {}),
        });
    }

    const [updatedOrder] = await getOrderTable(trx)
      .where({ id: Number(id) })
      .update(updateFields)
      .returning("*");

    const warehouseSync = await syncExistingImportOrderToWarehouseInTrx(trx, {
      existingOrder,
      updatedOrder,
      payload,
    });
    if (warehouseSync) {
      await emitOrderEvent(trx, EVENTS.WAREHOUSE_STOCK_UPDATED, {
        id: warehouseSync.slotId,
        orderId: updatedOrder.id,
        orderCode: updatedOrder.id_order,
        accountId: warehouseSync.accountId,
        packageProductId: warehouseSync.packageProductId,
        action: "SYNC_IMPORT_ORDER_UPDATE",
      });
    }

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
    await emitOrderEvent(trx, EVENTS.ORDER_UPDATED, updatePayload);

    if (isMavn && updateFields.status === ORDER_STATUS.CANCELED && existingOrder.status !== ORDER_STATUS.CANCELED) {
      await trx(TABLES.SUPPLIER_ORDER_COST_LOG)
        .where({ order_list_id: existingOrder.id })
        .update({ ncc_payment_status: 'Đã Hủy' });

      const remainingAmount = calculateOrderRemainingValue(existingOrder);
      if (remainingAmount > 0) {
        await emitOrderEvent(trx, EVENTS.ORDER_IMPORT_CANCELED, {
          orderId: existingOrder.id,
          id_order: existingOrder.id_order,
          orderCode: existingOrder.id_order,
          remainingAmount,
          cost: Number(existingOrder.cost || existingOrder.price || 0),
          customer: existingOrder.customer,
        });
      }
    }

    return await attachVietQrToOrder(updatedOrder, trx);
  });
}

/**
 * Gia hạn đơn hàng: Chuyển trạng thái sang ORDER_STATUS.RENEW_REQUIRED, cấp phát Slot Suffix và tính lại tổng tiền
 */
async function renewOrder(id, payload = {}) {
  return await withTransaction(async (trx) => {
    const existingOrder = await getOrderTable(trx).where({ id: Number(id) }).forUpdate().first();
    if (!existingOrder) {
      throw new Error("Không tìm thấy đơn hàng cần gia hạn.");
    }

    const isMavn = Boolean(
      (existingOrder.id_order && String(existingOrder.id_order).toUpperCase().startsWith("MAVN")) ||
      (existingOrder.customer && isCustomerMavryk(existingOrder.customer))
    );

    const formatMoney = (v) => new Intl.NumberFormat("vi-VN").format(v) + " ₫";
    const daysToAdd = payload.days ? Number(payload.days) : Number(existingOrder.days || 365);

    // ─────────────────────────────────────────────────────────────
    // 1. XỬ LÝ RIÊNG CHO ĐƠN NHẬP HÀNG (MAVN... / Mavryk)
    // ─────────────────────────────────────────────────────────────
    if (isMavn) {
      const renewal = await calculateNewExpiry(existingOrder, { trx, days: payload.days });
      const renewCost = payload.cost != null ? Number(payload.cost) : Number(existingOrder.cost || 0);

      const updateFields = {
        status: ORDER_STATUS.PAID,
        was_paid: true,
        order_date: renewal.newOrderDate,
        expired_at: renewal.newExpiredAt,
        days: renewal.days,
      };

      if (payload.cost !== undefined) updateFields.cost = renewCost;
      if (payload.note !== undefined) updateFields.note = payload.note;
      if (payload.supply_id !== undefined) {
        updateFields.supply_id = payload.supply_id ? Number(payload.supply_id) : existingOrder.supply_id;
      }

      const [updatedOrder] = await getOrderTable(trx)
        .where({ id: Number(id) })
        .update(updateFields)
        .returning("*");

      // B. Quản lý công nợ NCC: Đối với Mavryk (chủ shop) thì KHÔNG TẠO LOG trong NCC
      const supplyId = updatedOrder.supply_id ? Number(updatedOrder.supply_id) : null;
      const isSupplierMavryk = await isMavrykSupplier(trx, updatedOrder);

      if (!isSupplierMavryk && supplyId && renewCost > 0) {
        await trx(TABLES.SUPPLIER_ORDER_COST_LOG).insert({
          order_list_id: updatedOrder.id,
          supply_id: supplyId,
          id_order: updatedOrder.id_order,
          import_cost: renewCost,
          ncc_payment_status: "Chưa Thanh Toán",
          logged_at: trx.fn.now(),
        });

        await emitOrderEvent(trx, EVENTS.SUPPLIER_COST_ADDED, {
          cost: renewCost,
          supplier_id: supplyId,
          order_id: updatedOrder.id,
          id_order: updatedOrder.id_order,
          summary: `Thêm chi phí gia hạn nhập hàng cho đơn #${updatedOrder.id_order}: ${formatMoney(renewCost)}`,
        });
      }

      // C. Phát event cập nhật và gia hạn
      await emitOrderEvent(trx, EVENTS.ORDER_PAID, {
        orderId: updatedOrder.id,
        id_order: updatedOrder.id_order,
        customer: updatedOrder.customer,
        amount: 0,
        cost: isSupplierMavryk ? 0 : renewCost,
        isSupplierMavryk,
        supply_id: supplyId,
        status: updatedOrder.status,
        isRenewal: true,
        action: "RENEW_IMPORT",
      });

      await emitOrderEvent(trx, EVENTS.ORDER_RENEWED, {
        orderId: updatedOrder.id,
        id_order: updatedOrder.id_order,
        customer: updatedOrder.customer,
        newOrderDate: updatedOrder.order_date,
        newExpiredAt: updatedOrder.expired_at,
        daysAdded: renewal.days,
        monthsAdded: renewal.monthsAdded,
        action: "RENEW_IMPORT",
      });

      await emitOrderEvent(trx, EVENTS.ORDER_UPDATED, {
        orderId: updatedOrder.id,
        id_order: updatedOrder.id_order,
        customer: updatedOrder.customer,
        previousStatus: existingOrder.status,
        newStatus: updatedOrder.status,
        price: updatedOrder.price,
        cost: updatedOrder.cost,
        days: updatedOrder.days,
        summary: `Gia hạn thành công đơn nhập hàng #${updatedOrder.id_order} (Đã Thanh Toán, chu kỳ mới: ${updatedOrder.order_date} đến ${updatedOrder.expired_at})`,
        action: "RENEW_IMPORT",
      });

      // D. Đồng bộ ngày hết hạn và liên kết sang Kho Gói Sản Phẩm (warehouse.package_products & warehouse.account_slots)
      const warehouseSync = await syncExistingImportOrderToWarehouseInTrx(trx, {
        existingOrder,
        updatedOrder,
        payload: { expired_at: renewal.newExpiredAt, days: renewal.days },
      });
      if (warehouseSync) {
        await emitOrderEvent(trx, EVENTS.WAREHOUSE_STOCK_UPDATED, {
          id: warehouseSync.slotId,
          orderId: updatedOrder.id,
          orderCode: updatedOrder.id_order,
        });
      }

      // E. Kích hoạt tính lại chi phí slot trong ngày sau khi commit
      if (typeof trx.afterCommit === "function") {
        trx.afterCommit(async () => {
          try {
            const slotCostService = require("@/domains/warehouse/services/slotCostService");
            await slotCostService.calculateDailySlotCosts();
          } catch (calcErr) {
            console.warn("[OrderService] Tự động tính lại chi phí slot sau gia hạn gặp lỗi:", calcErr.message);
          }
        });
      }

      return updatedOrder;
    }

    // ─────────────────────────────────────────────────────────────
    // 2. XỬ LÝ CHO ĐƠN BÁN CỦA KHÁCH HÀNG (GIỮ NGUYÊN NHƯ CŨ)
    // ─────────────────────────────────────────────────────────────
    // Lấy đúng giá sản phẩm gia hạn theo Catalog hiện tại (KHÔNG LÀM TRÒN!)
    let basePrice = 0;
    let catalogCost = null;
    if (payload.price != null && Number(payload.price) > 0) {
      basePrice = Number(payload.price);
    } else {
      const { catalogBasePrice, catalogCostPrice } = await resolveOrderCatalogPricing(trx, existingOrder);
      basePrice = catalogBasePrice > 0
        ? catalogBasePrice
        : Number(existingOrder.gross_selling_price != null ? existingOrder.gross_selling_price : existingOrder.price || 0);
      if (catalogCostPrice != null && Number.isFinite(catalogCostPrice) && catalogCostPrice > 0) {
        catalogCost = catalogCostPrice;
      }
    }

    // Cấp phát 1 Slot Suffix (1..100) khả dụng không bị trùng cho số tiền này
    const suffix = await getAvailableSuffix(trx, existingOrder.id);
    const finalPrice = applySuffixToPrice(basePrice, suffix);

    const renewal = await calculateNewExpiry(existingOrder, { trx, days: payload.days });
    const days = renewal.days;

    const updateFields = {
      status: ORDER_STATUS.RENEW_REQUIRED,
      price: finalPrice,
      gross_selling_price: basePrice,
      days,
    };

    if (payload.cost != null && Number.isFinite(Number(payload.cost))) {
      updateFields.cost = Number(payload.cost);
    } else if (catalogCost != null) {
      updateFields.cost = catalogCost;
    }

    if (payload.note !== undefined) updateFields.note = payload.note;
    if (payload.supply_id !== undefined) updateFields.supply_id = payload.supply_id ? Number(payload.supply_id) : null;

    const [updatedOrder] = await getOrderTable(trx)
      .where({ id: Number(id) })
      .update(updateFields)
      .returning("*");

    const warehouseSync = await syncExistingImportOrderToWarehouseInTrx(trx, {
      existingOrder,
      updatedOrder,
      payload,
    });
    if (warehouseSync) {
      await emitOrderEvent(trx, EVENTS.WAREHOUSE_STOCK_UPDATED, {
        id: warehouseSync.slotId,
        orderId: updatedOrder.id,
        orderCode: updatedOrder.id_order,
        accountId: warehouseSync.accountId,
        packageProductId: warehouseSync.packageProductId,
        action: "SYNC_IMPORT_ORDER_UPDATE",
      });
    }

    const summary = `Yêu cầu gia hạn đơn hàng #${updatedOrder.id_order} thành công. Trạng thái: "${getOrderStatusLabel(ORDER_STATUS.RENEW_REQUIRED)}", Tổng tiền thanh toán: ${formatMoney(updatedOrder.price)} (Slot Suffix: ${suffix})`;

    // Phát event Domain: ORDER_UPDATED với action RENEWAL_REQUESTED
    await emitOrderEvent(trx, EVENTS.ORDER_UPDATED, {
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
    const existingOrder = await trx(TABLES.ORDER_LIST).where({ id: Number(id) }).forUpdate().first();
    if (!existingOrder) {
      throw new Error("Không tìm thấy đơn hàng cần xóa.");
    }

    const status = existingOrder.status;
    if (status === ORDER_STATUS.CANCELED || status === "Đã Hủy") {
      throw new Error("Đơn hàng đã hủy không thể bị xóa vĩnh viễn.");
    }
    const formatMoney = (v) => new Intl.NumberFormat("vi-VN").format(v) + " ₫";
    const todayYMD = new Date(new Date().getTime() + 7 * 60 * 60 * 1000).toISOString().split("T")[0];

    const isMavn = Boolean(
      (existingOrder.id_order && String(existingOrder.id_order).startsWith("MAVN")) ||
      (existingOrder.customer && isCustomerMavryk(existingOrder.customer))
    );

    const { excludeOrderFromPendingBatches } = require("@/domains/invoices/services/batchPaymentService");

    // Xử lý riêng cho Đơn Nhập Hàng (MAVN... / Mavryk)
    if (isMavn) {
      const remainingAmount = calculateOrderRemainingValue(existingOrder);
      await trx(TABLES.SUPPLIER_ORDER_COST_LOG).where({ order_list_id: Number(id) }).del();
      await trx(TABLES.ORDER_LIST).where({ id: Number(id) }).del();

      const summary = `Đã xóa đơn nhập hàng #${existingOrder.id_order} (${formatMoney(existingOrder.cost || existingOrder.price || 0)}), hoàn trả lợi nhuận: ${formatMoney(remainingAmount)}`;

      await emitOrderEvent(trx, EVENTS.ORDER_DELETED, {
        orderId: existingOrder.id,
        id_order: existingOrder.id_order,
        customer: existingOrder.customer,
        price: 0,
        cost: existingOrder.cost,
        deletedOrder: existingOrder,
        summary,
        action: "HARD_DELETE_IMPORT",
      });

      if (remainingAmount > 0) {
        await emitOrderEvent(trx, EVENTS.ORDER_IMPORT_CANCELED, {
          orderId: existingOrder.id,
          id_order: existingOrder.id_order,
          orderCode: existingOrder.id_order,
          remainingAmount,
          cost: Number(existingOrder.cost || existingOrder.price || 0),
          customer: existingOrder.customer,
        });
      }

      return { success: true, action: "deleted", message: summary };
    }

    // 1. Đơn Cần Gia Hạn (RENEW_REQUIRED) -> Chuyển sang Tab "Hết Hạn" (EXPIRED)
    // Bảo lưu an toàn 100% dữ liệu tài khoản, mật khẩu, email của khách hàng
    if (status === ORDER_STATUS.RENEW_REQUIRED || status === "Cần Gia Hạn") {
      await trx(TABLES.ORDER_LIST).where({ id: Number(id) }).update({
        status: ORDER_STATUS.EXPIRED,
        updated_at: trx.fn ? trx.fn.now() : new Date(),
      });

      // Tự động loại trừ khỏi các đợt gộp pending nếu có
      await excludeOrderFromPendingBatches(trx, existingOrder.id_order, "Đơn cần gia hạn chuyển sang Hết Hạn");

      const summary = `Đã chuyển đơn hàng #${existingOrder.id_order} của khách "${existingOrder.customer}" sang danh sách Hết Hạn`;

      await emitOrderEvent(trx, EVENTS.ORDER_EXPIRED, {
        orderId: existingOrder.id,
        id_order: existingOrder.id_order,
        orderCode: existingOrder.id_order,
        customer: existingOrder.customer,
        price: existingOrder.price,
        order: { ...existingOrder, status: ORDER_STATUS.EXPIRED },
        summary,
        action: "ORDER_EXPIRED",
      });

      return { success: true, action: "expired", message: summary };
    }

    // 2. Đơn Đã Thanh Toán (PAID) -> Chuyển thành "Đã Hủy" (CANCELED)
    if (status === ORDER_STATUS.PAID || status === "Đã Thanh Toán") {
      await trx(TABLES.ORDER_LIST).where({ id: Number(id) }).update({
        status: ORDER_STATUS.CANCELED,
        canceled_at: existingOrder.canceled_at || todayYMD,
        updated_at: trx.fn ? trx.fn.now() : new Date(),
      });

      // Tự động loại trừ khỏi các đợt gộp pending nếu có
      await excludeOrderFromPendingBatches(trx, existingOrder.id_order, "Đơn đã thanh toán bị hủy");

      const refundAmount = calculateOrderRemainingValue(existingOrder, Number(existingOrder.price || 0));
      await createRefundCreditNoteForCanceledOrder(trx, existingOrder, refundAmount, todayYMD);

      const summary = `Đã hủy đơn hàng đã thanh toán #${existingOrder.id_order} của khách "${existingOrder.customer}" (${formatMoney(existingOrder.price)}), hoàn credit theo ngày còn lại: ${formatMoney(refundAmount)}`;

      await emitOrderEvent(trx, EVENTS.ORDER_CANCELED_REFUNDED, {
        orderId: existingOrder.id,
        orderCode: existingOrder.id_order,
        order: existingOrder,
        refundAmount,
        canceledAt: todayYMD,
        summary,
        action: "ORDER_CANCELED",
      });

      return { success: true, action: "canceled", message: summary };
    }

    // 3. Đơn Chưa Thanh Toán (UNPAID) hoặc đơn nháp khác -> Xóa vĩnh viễn (Hard Delete)
    await excludeOrderFromPendingBatches(trx, existingOrder.id_order, "Đơn chưa thanh toán bị xóa");

    await trx(TABLES.ORDER_LIST).where({ id: Number(id) }).del();
    const summary = `Đã xóa vĩnh viễn đơn hàng #${existingOrder.id_order} của khách "${existingOrder.customer}" (${formatMoney(existingOrder.price)})`;

    await emitOrderEvent(trx, EVENTS.ORDER_DELETED, {
      orderId: existingOrder.id,
      id_order: existingOrder.id_order,
      customer: existingOrder.customer,
      price: existingOrder.price,
      deletedOrder: existingOrder,
      summary,
      action: "HARD_DELETE",
    });

    return { success: true, action: "deleted", message: `Đã xóa vĩnh viễn đơn hàng #${existingOrder.id_order}` };
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
    let newOrderDate = null;
    let renewalDays = null;
    if (isRenewal) {
      const renewal = await calculateNewExpiry(existingOrder, { trx });
      newOrderDate = renewal.newOrderDate;
      newExpiredAt = renewal.newExpiredAt;
      renewalDays = renewal.days;
      updateFields.order_date = newOrderDate;
      updateFields.expired_at = newExpiredAt;
      updateFields.days = renewalDays;
    }

    const [updatedOrder] = await getOrderTable(trx)
      .where({ id: Number(id) })
      .update(updateFields)
      .returning("*");

    const warehouseSync = await syncExistingImportOrderToWarehouseInTrx(trx, {
      existingOrder,
      updatedOrder,
      payload,
    });
    if (warehouseSync) {
      await emitOrderEvent(trx, EVENTS.WAREHOUSE_STOCK_UPDATED, {
        id: warehouseSync.slotId,
        orderId: updatedOrder.id,
        orderCode: updatedOrder.id_order,
        accountId: warehouseSync.accountId,
        packageProductId: warehouseSync.packageProductId,
        action: "SYNC_IMPORT_ORDER_UPDATE",
      });
    }

    const isSupplierMavryk = await isMavrykSupplier(trx, updatedOrder);
    const existingLog = await trx(TABLES.SUPPLIER_ORDER_COST_LOG)
      .where({ order_list_id: updatedOrder.id })
      .first();

    const importCost = Number(updatedOrder.cost || 0);
    if (!isSupplierMavryk && !existingLog && importCost > 0) {
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

      await emitOrderEvent(trx, EVENTS.SUPPLIER_COST_ADDED, {
        cost: importCost,
        supplier_id: updatedOrder.supply_id,
        summary: `Thêm chi phí nhập hàng cho đơn #${updatedOrder.id_order}: ${importCost} ₫`,
      });
    }

    const summary = `Đơn hàng #${updatedOrder.id_order} đã chuyển sang Đang Xử Lý. Đã ghi nhận chi phí nhập hàng.`;
    await emitOrderEvent(trx, EVENTS.ORDER_UPDATED, {
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
    let newOrderDate = null;
    let renewalDays = null;
    let monthsAdded = 1;
    if (isRenewal) {
      const renewal = await calculateNewExpiry(order, { trx });
      newOrderDate = renewal.newOrderDate;
      newExpiredAt = renewal.newExpiredAt;
      renewalDays = renewal.days;
      monthsAdded = renewal.monthsAdded;
      updateFields.order_date = newOrderDate;
      updateFields.expired_at = newExpiredAt;
      updateFields.days = renewalDays;

      // Tra cứu và đồng bộ giá nhập mới nhất của NCC từ Catalog
      const { catalogCostPrice } = await resolveOrderCatalogPricing(trx, order);
      if (catalogCostPrice != null && Number.isFinite(catalogCostPrice) && catalogCostPrice > 0) {
        updateFields.cost = catalogCostPrice;
      }
    }

    const [updatedOrder] = await getOrderTable(trx)
      .where({ id: order.id })
      .update(updateFields)
      .returning("*");

    const payAmount = amount != null ? Number(amount) : Number(updatedOrder.price || 0);
    const isSupplierMavryk = await isMavrykSupplier(trx, updatedOrder);
    const effectiveCost = isSupplierMavryk ? 0 : Number(updatedOrder.cost || 0);
    const supplyId = updatedOrder.supply_id ? Number(updatedOrder.supply_id) : null;

    // Quản lý công nợ NCC khi gia hạn thành công (chu kỳ mới, chỉ áp dụng cho NCC ngoài)
    const supplierCostLog = await ensureSupplierCostLog({
      trx,
      order: updatedOrder,
      isRenewal,
    });
    if (supplierCostLog.inserted) {
      const formatCostMoney = (v) => new Intl.NumberFormat("vi-VN").format(v) + " ₫";
      await emitOrderEvent(trx, EVENTS.SUPPLIER_COST_ADDED, {
        cost: supplierCostLog.importCost,
        supplier_id: supplierCostLog.supplierId,
        order_id: updatedOrder.id,
        id_order: updatedOrder.id_order,
        summary: `Thêm chi phí ${isRenewal ? "gia hạn " : ""}nhập hàng cho đơn #${updatedOrder.id_order}: ${formatCostMoney(supplierCostLog.importCost)}`,
      });
    }

    await emitOrderEvent(trx, EVENTS.ORDER_PAID, {
      orderId: updatedOrder.id,
      id_order: updatedOrder.id_order,
      customer: updatedOrder.customer,
      amount: payAmount,
      price: Number(updatedOrder.price || 0),
      cost: effectiveCost,
      isSupplierMavryk,
      supply_id: updatedOrder.supply_id,
      order_date: updatedOrder.order_date,
      transactionDate: options.transactionDate,
      status: updatedOrder.status,
      isRenewal,
      action: options.action || "COMPLETED",
      skipFinanceNotification: Boolean(options.skipFinanceNotification),
      isBatch: Boolean(options.isBatch),
    });

    if (isRenewal) {
      await emitOrderEvent(trx, EVENTS.ORDER_RENEWED, {
        orderId: updatedOrder.id,
        id_order: updatedOrder.id_order,
        id_product: updatedOrder.id_product,
        price: payAmount,
        customer: updatedOrder.customer,
        newOrderDate: updatedOrder.order_date,
        newExpiredAt: updatedOrder.expired_at,
        daysAdded: renewalDays,
        monthsAdded,
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
  calculateOrderRemainingValue,
  getDefaultShopBank,
};
