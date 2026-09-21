const { db } = require("@/db");
const { eventBus, EVENTS } = require("@/events");
const { getAvailableSuffix, applySuffixToPrice } = require("@/domains/payments/services/slotSuffixService");

const SCHEMA_ORDERS = process.env.DB_SCHEMA_ORDERS || process.env.SCHEMA_ORDERS || "orders";
const getOrderTable = () => db.withSchema(SCHEMA_ORDERS).from("order_list");

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
  builder.where((b) => b.whereILike("status", "%Hoàn%").orWhereILike("status", "%Hủy%"));
}

function applyExpiredFilter(builder) {
  builder.whereNot((b) => b.whereILike("status", "%Hoàn%").orWhereILike("status", "%Hủy%"))
    .where((b) => {
      b.whereILike("status", "%Hết Hạn%");
    });
}

function applyImportFilter(builder) {
  builder.whereNot((b) => b.whereILike("status", "%Hoàn%").orWhereILike("status", "%Hủy%"))
    .whereNot(applyExpiredFilter)
    .where((b) => {
      b.whereILike("id_order", "MAVN%")
       .orWhere((b2) => b2.where("cost", ">", 0).whereILike("status", "%Nhập Hàng%"));
    });
}

function applyActiveFilter(builder) {
  builder.whereNot((b) => b.whereILike("status", "%Hoàn%").orWhereILike("status", "%Hủy%"))
    .whereNot(applyExpiredFilter)
    .whereNot((b) => {
      b.whereILike("id_order", "MAVN%")
       .orWhere((b2) => b2.where("cost", ">", 0).whereILike("status", "%Nhập Hàng%"));
    });
}

/**
 * Lấy danh sách đơn hàng có phân trang, lọc theo tab & tìm kiếm
 */
async function getOrders({ page = 1, limit = 20, search = "", status = "", tab = "" } = {}) {
  const offset = (Number(page) - 1) * Number(limit);

  // 1. Tính toán tabCounts trên toàn bộ cơ sở dữ liệu
  const [canceledRes] = await getOrderTable().where(applyCanceledFilter).count("id as count");
  const [expiredRes] = await getOrderTable().where(applyExpiredFilter).count("id as count");
  const [importRes] = await getOrderTable().where(applyImportFilter).count("id as count");
  const [activeRes] = await getOrderTable().where(applyActiveFilter).count("id as count");

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

  const orders = await query
    .select("*")
    .orderByRaw(`
      CASE
        WHEN status ILike '%Cần gia hạn%' THEN 1
        WHEN status ILike '%Chưa Thanh Toán%' THEN 2
        ELSE 3
      END,
      id DESC
    `)
    .limit(limit)
    .offset(offset);

  return {
    data: orders,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)) || 1,
    },
    tabCounts,
  };
}

/**
 * Lấy chi tiết đơn hàng theo ID
 */
async function getOrderById(id) {
  const order = await getOrderTable().where({ id: Number(id) }).first();
  return order || null;
}

/**
 * Tạo đơn hàng mới + phát event ORDER_CREATED
 */
async function createOrder(payload) {
  const id_order = payload.id_order || generateOrderCode();
  const rawPrice = Number(payload.price || 0);
  const statusStr = String(payload.status || "Chưa Thanh Toán").toLowerCase();

  let finalPrice = rawPrice;
  if (statusStr.includes("chưa thanh toán") || statusStr.includes("chờ") || statusStr.includes("gia hạn")) {
    if (rawPrice > 0) {
      const suffix = await getAvailableSuffix();
      finalPrice = applySuffixToPrice(rawPrice, suffix);
    }
  }

  const newOrderData = {
    id_order,
    customer: payload.customer || "Khách hàng",
    contact: payload.contact || "",
    information_order: payload.information_order || "",
    slot: payload.slot || "",
    price: finalPrice,
    gross_selling_price: payload.gross_selling_price != null ? Number(payload.gross_selling_price) : finalPrice,
    cost: payload.cost != null ? Number(payload.cost) : 0,
    status: payload.status || "Chưa Thanh Toán",
    payment_method: payload.payment_method || "bank",
    note: payload.note || "",
    days: payload.days ? Number(payload.days) : 365,
    order_date: payload.order_date || null,
    expired_at: payload.expired_at || null,
    supply_id: payload.supply_id ? Number(payload.supply_id) : null,
    created_at: db.fn.now(),
  };

  if (payload.id_product != null) {
    newOrderData.id_product = payload.id_product;
  }

  const [createdOrder] = await getOrderTable()
    .insert(newOrderData)
    .returning("*");

  const formatMoney = (v) => new Intl.NumberFormat("vi-VN").format(v) + " ₫";
  const summary = `Tạo mới đơn hàng #${createdOrder.id_order} cho khách "${createdOrder.customer}" với tổng tiền ${formatMoney(createdOrder.price)} [Trạng thái: ${createdOrder.status}]`;

  // Phát event Domain: ORDER_CREATED
  eventBus.emit(EVENTS.ORDER_CREATED, {
    orderId: createdOrder.id,
    id_order: createdOrder.id_order,
    customer: createdOrder.customer,
    contact: createdOrder.contact,
    price: createdOrder.price,
    status: createdOrder.status,
    summary,
    created_at: createdOrder.created_at,
    action: "CREATE",
  });

  return createdOrder;
}

/**
 * Cập nhật đơn hàng + phát event ORDER_UPDATED với chi tiết diff
 */
async function updateOrder(id, payload) {
  const existingOrder = await getOrderTable().where({ id: Number(id) }).first();
  if (!existingOrder) {
    throw new Error("Không tìm thấy đơn hàng cần sửa.");
  }

  const updateFields = {};
  if (payload.customer !== undefined) updateFields.customer = payload.customer;
  if (payload.contact !== undefined) updateFields.contact = payload.contact;
  if (payload.information_order !== undefined) updateFields.information_order = payload.information_order;
  if (payload.slot !== undefined) updateFields.slot = payload.slot;
  if (payload.id_product !== undefined) updateFields.id_product = payload.id_product || null;
  if (payload.price !== undefined) updateFields.price = Number(payload.price);
  if (payload.gross_selling_price !== undefined) updateFields.gross_selling_price = Number(payload.gross_selling_price);
  if (payload.cost !== undefined) updateFields.cost = Number(payload.cost);

  if (payload.status !== undefined) {
    updateFields.status = payload.status;
    const nextStatus = String(payload.status).toLowerCase();
    if (nextStatus.includes("gia hạn") || nextStatus.includes("chưa thanh toán")) {
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
  if (payload.supply_id !== undefined) updateFields.supply_id = payload.supply_id ? Number(payload.supply_id) : null;

  const [updatedOrder] = await getOrderTable()
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

  return updatedOrder;
}

/**
 * Gia hạn đơn hàng: Chuyển trạng thái sang "Cần gia hạn", cấp phát Slot Suffix (1..100) và tính lại tổng tiền
 */
async function renewOrder(id, payload = {}) {
  const existingOrder = await getOrderTable().where({ id: Number(id) }).first();
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
    status: "Cần gia hạn",
    price: finalPrice,
    gross_selling_price: finalPrice,
    days,
  };

  if (payload.note !== undefined) updateFields.note = payload.note;
  if (payload.supply_id !== undefined) updateFields.supply_id = payload.supply_id ? Number(payload.supply_id) : null;

  const [updatedOrder] = await getOrderTable()
    .where({ id: Number(id) })
    .update(updateFields)
    .returning("*");

  const formatMoney = (v) => new Intl.NumberFormat("vi-VN").format(v) + " ₫";
  const summary = `Yêu cầu gia hạn đơn hàng #${updatedOrder.id_order} thành công. Trạng thái: "Cần gia hạn", Tổng tiền thanh toán: ${formatMoney(updatedOrder.price)} (Slot Suffix: ${suffix})`;

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
}

/**
 * Tính toán số tiền hoàn lại theo số ngày còn lại của gói
 */
function calcRemainingRefund(order) {
  if (!order || !order.price || order.price <= 0) return 0;
  const now = new Date();
  const expiredAt = order.expired_at ? new Date(order.expired_at) : null;
  if (!expiredAt || expiredAt <= now) return 0;
  
  const orderDate = order.order_date ? new Date(order.order_date) : (order.created_at ? new Date(order.created_at) : null);
  if (!orderDate) return 0;

  const totalDays = Math.max(1, Math.ceil((expiredAt.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24)));
  const remainingDays = Math.max(0, Math.ceil((expiredAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  if (remainingDays <= 0) return 0;
  const price = Number(order.price) || 0;
  const refund = Math.round((price * remainingDays) / totalDays);
  return Math.max(0, refund);
}

/**
 * Xóa đơn hàng (Hard Delete) hoặc Hủy & Chuyển Trạng Thái (Soft Delete) + phát event
 */
async function deleteOrder(id) {
  const { withTransaction } = require("@/db");
  
  return await withTransaction(async (trx) => {
    const existingOrder = await trx(SCHEMA_ORDERS + ".order_list").where({ id: Number(id) }).first();
    if (!existingOrder) {
      throw new Error("Không tìm thấy đơn hàng cần xóa.");
    }

    const currentStatusLower = String(existingOrder.status || "").trim().toLowerCase();
    
    // Hard Delete: Chưa Thanh Toán / Đang Xử Lý / Hết Hạn
    const isHardDelete = ["chưa thanh toán", "đang xử lý", "hết hạn"].includes(currentStatusLower);
    
    // Soft Delete (Chờ Hoàn): Đã Thanh Toán
    const isSoftDeletePendingRefund = currentStatusLower === "đã thanh toán";
    
    // Soft Delete (Ngừng Gia Hạn): Cần Gia Hạn
    const isSoftDeleteExpired = currentStatusLower === "cần gia hạn";
    
    // Blocked: Đã Hoàn, Chưa Hoàn, Chờ Hoàn, Hủy, Đã Hủy
    const isBlocked = ["đã hoàn", "chưa hoàn", "chờ hoàn", "hủy", "đã hủy"].some(s => currentStatusLower.includes(s));

    if (isBlocked) {
      throw new Error(`Đơn hàng đang ở trạng thái "${existingOrder.status}" không thể xóa hoặc hủy thêm lần nữa.`);
    }

    const formatMoney = (v) => new Intl.NumberFormat("vi-VN").format(v) + " ₫";
    const todayYMD = new Date(new Date().getTime() + 7 * 60 * 60 * 1000).toISOString().split("T")[0];

    if (isHardDelete) {
      // 1. Luồng Xóa Vĩnh Viễn
      await trx(SCHEMA_ORDERS + ".order_list").where({ id: Number(id) }).del();
      
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
    else if (isSoftDeletePendingRefund) {
      // 2. Luồng Hủy và Chờ Hoàn Tiền
      await trx(SCHEMA_ORDERS + ".order_list").where({ id: Number(id) }).update({
        status: "Chưa Hoàn",
        canceled_at: existingOrder.canceled_at || todayYMD,
      });

      const summary = `Đã hủy đơn hàng #${existingOrder.id_order} và chuyển vào danh sách Chưa Hoàn.`;
      
      eventBus.emit(EVENTS.ORDER_PENDING_REFUND, {
        orderId: existingOrder.id,
        orderCode: existingOrder.id_order,
        order: existingOrder,
        canceledAt: todayYMD,
        summary,
        action: "SOFT_DELETE_PENDING_REFUND",
      });

      return { success: true, action: "pending_refund", message: summary };
    }
    else if (isSoftDeleteExpired) {
      // 3. Luồng Ngừng Gia Hạn
      await trx(SCHEMA_ORDERS + ".order_list").where({ id: Number(id) }).update({
        status: "Hết Hạn",
      });

      const summary = `Đã chuyển đơn hàng #${existingOrder.id_order} sang danh sách Hết Hạn do ngừng gia hạn.`;
      
      eventBus.emit(EVENTS.ORDER_EXPIRED, {
        orderId: existingOrder.id,
        orderCode: existingOrder.id_order,
        order: existingOrder,
        summary,
        action: "SOFT_DELETE_EXPIRED",
      });

      return { success: true, action: "expired", message: summary };
    }
    else {
      throw new Error(`Trạng thái "${existingOrder.status}" không hỗ trợ thao tác xóa.`);
    }
  });
}

module.exports = {
  getOrders,
  getOrderById,
  createOrder,
  updateOrder,
  renewOrder,
  deleteOrder,
};

