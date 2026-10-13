const eventBus = require("../eventBus");
const EVENTS = require("../eventTypes");
const { recordEvent } = require("../eventStoreService");
const { db, TABLES, COLS } = require("@/db");

async function syncWarehouseExpiryOnRenewal(data) {
  try {
    const orderCode = data.id_order || data.orderCode;
    if (!orderCode || !String(orderCode).toUpperCase().startsWith("MAVN")) return;

    const newExpiredAt = data.newExpiredAt || data.expired_at;
    if (!newExpiredAt) return;

    const order = await db(TABLES.ORDER_LIST).where({ id_order: orderCode }).first();
    if (!order) return;

    const accountUsername = order.information_order 
      ? String(order.information_order).trim().toLowerCase()
      : (order.slot ? (order.slot.split('|')[0] || order.customer).trim().toLowerCase() : String(order.customer || "").trim().toLowerCase());

    if (!accountUsername) return;

    let productName = order.information_order || "Dịch vụ";
    if (order.id_product) {
      try {
        const variantRow = await db(TABLES.VARIANT)
          .leftJoin(TABLES.PRODUCT, `${TABLES.PRODUCT}.id`, `${TABLES.VARIANT}.${COLS.VARIANT.PRODUCT_ID || 'product_id'}`)
          .select(
            `${TABLES.VARIANT}.display_name as variant_display`,
            `${TABLES.VARIANT}.variant_name as variant_name`,
            `${TABLES.PRODUCT}.package_name as parent_package_name`
          )
          .where(`${TABLES.VARIANT}.id`, Number(order.id_product))
          .first();

        if (variantRow) {
          productName = variantRow.parent_package_name || variantRow.variant_name || variantRow.variant_display || productName;
        }
      } catch (e) {
        console.log("[WarehouseSync] Không resolve được sản phẩm chính khi gia hạn:", e.message);
      }
    }

    // 1. Ensure product name exists in warehouse.product_names
    let pName = await db(TABLES.PRODUCT_NAMES)
      .whereRaw("LOWER(name) = ?", [productName.toLowerCase().trim()])
      .first();

    let nameId = pName?.id;
    if (!nameId) {
      const [insertedP] = await db(TABLES.PRODUCT_NAMES)
        .insert({ name: productName.trim() })
        .returning("id");
      nameId = insertedP.id || insertedP;
    }

    // 2. Ensure stock (product_keys) exists for this account
    let stock = await db(TABLES.PRODUCT_KEYS)
      .whereRaw("LOWER(account_username) = ?", [accountUsername])
      .first();

    let stockId = stock?.id;
    if (!stockId) {
      const [newStock] = await db(TABLES.PRODUCT_KEYS)
        .insert({
          account_username: accountUsername,
          created_at: new Date(),
        })
        .returning("*");
      stockId = newStock.id;
    }

    // 3. Check if stock_service exists for this account_id and name_id
    const existingService = await db(TABLES.STOCK_SERVICES)
      .where({
        account_id: stockId,
        name_id: nameId,
      })
      .first();

    if (existingService) {
      await db(TABLES.STOCK_SERVICES)
        .where({ id: existingService.id })
        .update({
          expires_at: new Date(newExpiredAt),
          status: "AVAILABLE",
          updated_at: new Date(),
        });
      console.log(`✅ [WarehouseSync] Đã cập nhật và tái liên kết hạn kho cho tài khoản "${accountUsername}" - dịch vụ "${productName}" thành ${newExpiredAt}`);
    } else {
      await db(TABLES.STOCK_SERVICES).insert({
        account_id: stockId,
        name_id: nameId,
        password_encrypted: order.slot || null,
        backup_email: "",
        two_fa_encrypted: null,
        expires_at: new Date(newExpiredAt),
        status: "AVAILABLE",
        note: order.note || null,
        created_at: new Date(),
        updated_at: new Date(),
      });
      console.log(`✅ [WarehouseSync] Đã tự động tạo mới dòng kho và liên kết cho tài khoản "${accountUsername}" - dịch vụ "${productName}" (Hạn: ${newExpiredAt})`);
    }
  } catch (err) {
    console.error("❌ [WarehouseSync] Lỗi đồng bộ kho khi gia hạn đơn MAVN:", err);
  }
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

  // Lắng nghe sự kiện Gia hạn hoàn tất (Webhook khớp gia hạn)
  eventBus.on(EVENTS.ORDER_RENEWED, async (data) => {
    console.log(`🔄 [EventSubscriber] Tiếp nhận event ORDER_RENEWED cho đơn #${data.orderId} (${data.id_order})`);
    await recordEvent({
      eventName: EVENTS.ORDER_RENEWED,
      aggregateType: "ORDER",
      aggregateId: data.orderId || data.id_order,
      payload: data,
      status: "PROCESSED",
    });
    await syncWarehouseExpiryOnRenewal(data);
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

  console.log("✅ [EventBus] Đăng ký thành công Order Event Subscribers (CREATED, UPDATED, DELETED, PAID, RENEWED, PENDING_REFUND, EXPIRED)");
}

module.exports = { registerOrderEventSubscribers };

