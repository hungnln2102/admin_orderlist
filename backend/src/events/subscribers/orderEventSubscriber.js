const eventBus = require("../eventBus");
const EVENTS = require("../eventTypes");
const { recordEvent } = require("../eventStoreService");
const { db, TABLES, COLS } = require("@/db");

const O = COLS.ORDER_LIST;
const A = COLS.ACCOUNTS;
const S = COLS.ACCOUNT_SLOTS;
const N = COLS.PRODUCT_NAMES;
const P = COLS.PRODUCT;
const V = COLS.VARIANT;

async function syncWarehouseExpiryOnRenewal(data, trx) {
  const orderCode = data.id_order || data.orderCode;
  if (!orderCode || !String(orderCode).toUpperCase().startsWith("MAVN")) return;

  const newExpiredAt = data.newExpiredAt || data.expired_at;
  if (!newExpiredAt) return;

  const order = await trx(TABLES.ORDER_LIST).where(O.ID_ORDER, orderCode).first();
  if (!order) return;

  const username = order[O.INFORMATION_ORDER] ||
    order[O.SLOT]?.split("|")[0] || order[O.CUSTOMER];
  const accountUsername = String(username || "").trim().toLowerCase();
  if (!accountUsername) return;

  let productName = order[O.INFORMATION_ORDER] || "Dịch vụ";
  const variantId = Number(order[O.ID_PRODUCT]);
  if (Number.isSafeInteger(variantId) && variantId > 0) {
    const variant = await trx(TABLES.VARIANT)
      .leftJoin(TABLES.PRODUCT, `${TABLES.PRODUCT}.${P.ID}`, `${TABLES.VARIANT}.${V.PRODUCT_ID}`)
      .select({
        variantDisplay: `${TABLES.VARIANT}.${V.DISPLAY_NAME}`,
        variantName: `${TABLES.VARIANT}.${V.VARIANT_NAME}`,
        packageName: `${TABLES.PRODUCT}.${P.PACKAGE_NAME}`,
      })
      .where(`${TABLES.VARIANT}.${V.ID}`, variantId)
      .first();

    productName = variant?.packageName || variant?.variantName || variant?.variantDisplay || productName;
  }
  productName = productName.trim();

  // Serialize lookups and inserts by normalized key, even when the row does not exist yet.
  const normalizedProductName = productName.toLowerCase();
  await trx.raw("SELECT pg_advisory_xact_lock(hashtext(?), hashtext(?))", [
    TABLES.PRODUCT_NAMES, normalizedProductName,
  ]);
  await trx.raw("SELECT pg_advisory_xact_lock(hashtext(?), hashtext(?))", [
    TABLES.PRODUCT_KEYS, accountUsername,
  ]);

  let product = await trx(TABLES.PRODUCT_NAMES)
    .whereRaw("LOWER(??) = ?", [N.NAME, normalizedProductName])
    .orderBy(N.ID)
    .first();
  if (!product) {
    [product] = await trx(TABLES.PRODUCT_NAMES)
      .insert({ [N.NAME]: productName })
      .returning(N.ID);
  }

  const now = new Date();
  let account = await trx(TABLES.PRODUCT_KEYS)
    .whereRaw("LOWER(??) = ?", [A.ACCOUNT_USERNAME, accountUsername])
    .orderBy(A.ID)
    .first();
  if (!account) {
    [account] = await trx(TABLES.PRODUCT_KEYS)
      .insert({ [A.ACCOUNT_USERNAME]: accountUsername, [A.CREATED_AT]: now })
      .returning(A.ID);
  }

  const serviceKey = { [S.ACCOUNT_ID]: account[A.ID], [S.NAME_ID]: product[N.ID] };
  const service = await trx(TABLES.STOCK_SERVICES)
    .where(serviceKey)
    .orderBy(S.ID)
    .forUpdate()
    .first();

  const expiry = new Date(newExpiredAt);
  if (!Number.isFinite(expiry.getTime())) throw new Error("Invalid renewal expiry");

  if (service) {
    const currentExpiry = new Date(service[S.EXPIRED_AT]).getTime();
    if (service[S.EXPIRED_AT] != null && (
      currentExpiry > expiry.getTime() ||
      (currentExpiry === expiry.getTime() && service[S.STATUS] === "AVAILABLE")
    )) return;

    await trx(TABLES.STOCK_SERVICES).where(S.ID, service[S.ID]).update({
      [S.EXPIRED_AT]: expiry,
      [S.STATUS]: "AVAILABLE",
      [S.UPDATED_AT]: now,
    });
    return;
  }

  await trx(TABLES.STOCK_SERVICES).insert({
    ...serviceKey,
    [S.PASSWORD]: order[O.SLOT] || null,
    [S.BACKUP_EMAIL]: "",
    [S.TWO_FA]: null,
    [S.EXPIRED_AT]: expiry,
    [S.STATUS]: "AVAILABLE",
    [S.SERVICE_NOTE]: order[O.NOTE] || null,
    [S.CREATED_AT]: now,
    [S.UPDATED_AT]: now,
  });
}

function registerOrderEventSubscribers() {
  // Lắng nghe sự kiện Tạo đơn hàng
  eventBus.on(EVENTS.ORDER_CREATED, async (data) => {
    console.log(`📌 [EventSubscriber] Tiếp nhận event ORDER_CREATED cho đơn #${data.orderId}`);
    await recordEvent({
      eventName: EVENTS.ORDER_CREATED,
      aggregateType: "ORDER",
      aggregateId: data.orderId || data.id_order,
      payload: data,
      status: "PROCESSED",
    });
  });

  // Lắng nghe sự kiện Sửa đơn hàng
  eventBus.on(EVENTS.ORDER_UPDATED, async (data) => {
    console.log(`📌 [EventSubscriber] Tiếp nhận event ORDER_UPDATED cho đơn #${data.orderId}`);
    await recordEvent({
      eventName: EVENTS.ORDER_UPDATED,
      aggregateType: "ORDER",
      aggregateId: data.orderId || data.id_order,
      payload: data,
      status: "PROCESSED",
    });
  });

  // Lắng nghe sự kiện Xóa đơn hàng (Hard Delete)
  eventBus.on(EVENTS.ORDER_DELETED, async (data) => {
    console.log(`📌 [EventSubscriber] Tiếp nhận event ORDER_DELETED cho đơn #${data.orderId}`);
    await recordEvent({
      eventName: EVENTS.ORDER_DELETED,
      aggregateType: "ORDER",
      aggregateId: data.orderId || data.id_order,
      payload: data,
      status: "PROCESSED",
    });
  });

  // Lắng nghe sự kiện Thanh toán đơn hàng thành công (Webhook khớp)
  eventBus.on(EVENTS.ORDER_PAID, async (data) => {
    console.log(`💰 [EventSubscriber] Tiếp nhận event ORDER_PAID cho đơn #${data.orderId} (${data.id_order})`);
    await recordEvent({
      eventName: EVENTS.ORDER_PAID,
      aggregateType: "ORDER",
      aggregateId: data.orderId || data.id_order,
      payload: data,
      status: "PROCESSED",
    });
  });

  // Lắng nghe sự kiện Thanh toán Đợt gộp đơn thành công
  eventBus.on(EVENTS.BATCH_PAYMENT_COMPLETED, async (data) => {
    console.log(`📦 [EventSubscriber] Tiếp nhận event BATCH_PAYMENT_COMPLETED cho đợt gộp #${data.batchCode} (${data.batchId})`);
    await recordEvent({
      eventName: EVENTS.BATCH_PAYMENT_COMPLETED,
      aggregateType: "BATCH_PAYMENT",
      aggregateId: data.batchCode || String(data.batchId),
      payload: data,
      status: "PROCESSED",
    });
  });

  // Lắng nghe sự kiện Gia hạn hoàn tất (Webhook khớp gia hạn)
  eventBus.on(EVENTS.ORDER_RENEWED, async (data, context) => {
    console.log(`🔄 [EventSubscriber] Tiếp nhận event ORDER_RENEWED cho đơn #${data.orderId} (${data.id_order})`);
    const syncAndRecord = async (trx) => {
      await syncWarehouseExpiryOnRenewal(data, trx);
      await recordEvent({
        eventName: EVENTS.ORDER_RENEWED,
        aggregateType: "ORDER",
        aggregateId: data.orderId || data.id_order,
        payload: data,
        status: "PROCESSED",
      }, trx);
    };
    if (context?.trx) await syncAndRecord(context.trx);
    else await db.transaction(syncAndRecord);
  });

  // Lắng nghe sự kiện Hủy đơn Đã Thanh Toán → Chờ Hoàn Tiền
  eventBus.on(EVENTS.ORDER_PENDING_REFUND, async (data) => {
    console.log(`⏳ [EventSubscriber] Tiếp nhận event ORDER_PENDING_REFUND cho đơn #${data.orderId} (${data.orderCode})`);
    await recordEvent({
      eventName: EVENTS.ORDER_PENDING_REFUND,
      aggregateType: "ORDER",
      aggregateId: data.orderId || data.orderCode,
      payload: data,
      status: "PROCESSED",
    });
  });

  // Lắng nghe sự kiện Ngừng gia hạn → Hết Hạn
  eventBus.on(EVENTS.ORDER_EXPIRED, async (data) => {
    console.log(`📅 [EventSubscriber] Tiếp nhận event ORDER_EXPIRED cho đơn #${data.orderId} (${data.orderCode})`);
    await recordEvent({
      eventName: EVENTS.ORDER_EXPIRED,
      aggregateType: "ORDER",
      aggregateId: data.orderId || data.orderCode,
      payload: data,
      status: "PROCESSED",
    });
  });

  // Lắng nghe sự kiện Tạo đơn nhập hàng
  eventBus.on(EVENTS.ORDER_IMPORT_CREATED, async (data) => {
    console.log(`📦 [EventSubscriber] Tiếp nhận event ORDER_IMPORT_CREATED cho đơn #${data.orderId} (${data.id_order})`);
    await recordEvent({
      eventName: EVENTS.ORDER_IMPORT_CREATED,
      aggregateType: "ORDER",
      aggregateId: data.orderId || data.id_order,
      payload: data,
      status: "PROCESSED",
    });
  });

  // Lắng nghe sự kiện Hủy/Xóa đơn nhập hàng
  eventBus.on(EVENTS.ORDER_IMPORT_CANCELED, async (data) => {
    console.log(`📦 [EventSubscriber] Tiếp nhận event ORDER_IMPORT_CANCELED cho đơn #${data.orderId} (${data.id_order})`);
    await recordEvent({
      eventName: EVENTS.ORDER_IMPORT_CANCELED,
      aggregateType: "ORDER",
      aggregateId: data.orderId || data.id_order,
      payload: data,
      status: "PROCESSED",
    });
  });

  console.log("✅ [EventBus] Đăng ký thành công Order Event Subscribers (CREATED, UPDATED, DELETED, PAID, RENEWED, PENDING_REFUND, EXPIRED, IMPORT_CREATED, IMPORT_CANCELED)");
}

module.exports = { registerOrderEventSubscribers };

