const { TABLES, withTransaction } = require("@/db");
const { EVENTS } = require("@/events");
const { getAvailableSuffix, applySuffixToPrice } = require("@/domains/payments/services/slotSuffixService");
const { ORDER_STATUS, getOrderStatusLabel } = require("@/constants/orderStatus");
const { calculateNewExpiry } = require("./orderPaymentService");
const { isMavrykSupplier } = require("@/domains/suppliers/utils/supplierCheck");
const { resolveOrderCatalogPricing } = require("@/domains/products/services/catalogPricingService");
const { emitOrderEvent, isCustomerMavryk } = require("./orderMutationEvents");
const { syncExistingImportOrderToWarehouseInTrx } = require("./orderWarehouseSyncService");

async function renewOrder(id, payload = {}) {
  return await withTransaction(async (trx) => {
    const existingOrder = await trx(TABLES.ORDER_LIST).where({ id: Number(id) }).forUpdate().first();
    if (!existingOrder) {
      throw new Error("Không tìm thấy đơn hàng cần gia hạn.");
    }

    const isMavn = Boolean(
      (existingOrder.id_order && String(existingOrder.id_order).toUpperCase().startsWith("MAVN")) ||
      (existingOrder.customer && isCustomerMavryk(existingOrder.customer))
    );

    const formatMoney = (v) => new Intl.NumberFormat("vi-VN").format(v) + " ₫";

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

      const [updatedOrder] = await trx(TABLES.ORDER_LIST)
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

    const [updatedOrder] = await trx(TABLES.ORDER_LIST)
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

module.exports = { renewOrder };
