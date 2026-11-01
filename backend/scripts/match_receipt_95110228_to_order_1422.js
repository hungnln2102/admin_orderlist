const { db, TABLES, withTransaction } = require("./src/db");
const { RECEIPT_STATUS, ALLOCATION_TYPE, ALLOCATION_CREATOR } = require("./src/constants/receiptStatus");
const { processCompleteOrder } = require("./src/domains/orders/services/orderService");

async function main() {
  console.log("=== BẮT ĐẦU KHỚP BIÊN LAI 95110228 VÀO ĐƠN HÀNG MAVLR5LOB ===");

  await withTransaction(async (trx) => {
    // 1. Kiểm tra đơn hàng 1422
    const order = await trx(TABLES.ORDER_LIST).where({ id: 1422 }).first();
    if (!order) {
      throw new Error("Không tìm thấy đơn hàng ID 1422");
    }
    console.log("Tìm thấy đơn hàng:", {
      id: order.id,
      id_order: order.id_order,
      customer: order.customer,
      current_price: order.price,
      current_gross: order.gross_selling_price,
      current_status: order.status,
    });

    // 2. Kiểm tra biên lai 43 (SePay ID: 95110228)
    const receipt = await trx(TABLES.PAYMENT_RECEIPT).where({ id: 43 }).first();
    if (!receipt) {
      throw new Error("Không tìm thấy biên lai ID 43");
    }
    console.log("Tìm thấy biên lai:", {
      id: receipt.id,
      sepay_transaction_id: receipt.sepay_transaction_id,
      amount: receipt.amount,
      status: receipt.status,
      unallocated_amount: receipt.unallocated_amount,
    });

    // 3. Khôi phục đúng giá sản phẩm và slot suffix cho đơn hàng
    // Giá gốc YouTube: 80.000 ₫, Slot suffix: 4 ➔ Giá bán: 80.004 ₫
    await trx(TABLES.ORDER_LIST)
      .where({ id: 1422 })
      .update({
        price: 80004.0,
        gross_selling_price: 80000.0,
      });
    console.log("✓ Đã cập nhật đơn hàng về giá chuẩn: gross_selling_price = 80.000 ₫, price = 80.004 ₫ (slot 4)");

    // 4. Cập nhật biên lai sang FULLY_ALLOCATED
    await trx(TABLES.PAYMENT_RECEIPT)
      .where({ id: 43 })
      .update({
        status: RECEIPT_STATUS.FULLY_ALLOCATED,
        unallocated_amount: 0,
      });
    console.log("✓ Đã cập nhật biên lai 43 sang FULLY_ALLOCATED, unallocated_amount = 0");

    // 5. Thêm bản ghi phân bổ biên lai (Allocation)
    await trx(TABLES.PAYMENT_RECEIPT_ALLOCATIONS).insert({
      receipt_id: 43,
      allocation_type: ALLOCATION_TYPE.ORDER,
      target_code: order.id_order,
      amount: 80004.0,
      remaining_balance: 0,
      note: `Khớp thanh toán biên lai SePay #${receipt.sepay_transaction_id} cho đơn #${order.id_order}`,
      created_by: ALLOCATION_CREATOR.SYSTEM_WEBHOOK,
      created_at: trx.fn.now(),
    });
    console.log("✓ Đã tạo bản ghi phân bổ trong payment_receipt_allocations");

    // 6. Hoàn tất đơn hàng sang PAID qua processCompleteOrder
    const updatedOrderRef = await trx(TABLES.ORDER_LIST).where({ id: 1422 }).first();
    const { updatedOrder } = await processCompleteOrder(trx, updatedOrderRef, 80004.0, {
      receiptId: 43,
      action: "WEBHOOK_PAYMENT_MATCH",
    });

    console.log("✓ Hoàn tất đơn hàng sang trạng thái PAID:", {
      id: updatedOrder.id,
      id_order: updatedOrder.id_order,
      status: updatedOrder.status,
      was_paid: updatedOrder.was_paid,
      price: updatedOrder.price,
      gross_selling_price: updatedOrder.gross_selling_price,
    });
  });

  console.log("=== HOÀN TẤT THÀNH CÔNG ===");
}

main()
  .catch((err) => {
    console.error("LỖI THỰC HIỆN:", err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
