const test = require("node:test");
const assert = require("node:assert/strict");
require("module-alias/register");

const { db, TABLES, COLS, withTransaction } = require("@/db");
const { ORDER_STATUS } = require("@/constants/orderStatus");
const { SUPPLIER_PAYMENT_STATUS } = require("@/constants/supplierStatus");
const { createOrder, updateOrder } = require("@/domains/orders/services/orderService");
const { getSupplierDetailById, paySupplierDebt } = require("@/domains/suppliers/services/supplierService");

test("Đổi NCC bắt buộc cho đơn ĐÃ THANH TOÁN: Tính hoàn tiền NCC cũ (log âm), tính chi phí NCC mới, và VietQR đảo chiều", async () => {
  let supplierA = null;
  let supplierB = null;
  let testVariant = null;
  let createdOrder = null;

  try {
    // 1. Tạo 2 NCC giả lập
    [supplierA] = await db(TABLES.SUPPLIER).insert({
      supplier_name: "NCC Test Cũ A",
      number_bank: "111222333",
      bin_bank: "970422",
      account_holder: "NCC TEST A",
      active_supply: true,
    }).returning("*");

    [supplierB] = await db(TABLES.SUPPLIER).insert({
      supplier_name: "NCC Test Mới B",
      number_bank: "444555666",
      bin_bank: "970436",
      account_holder: "NCC TEST B",
      active_supply: true,
    }).returning("*");

    // 2. Tạo 1 sản phẩm / variant test kèm giá vốn cho NCC B
    [testVariant] = await db(TABLES.VARIANT).insert({
      variant_name: "Test Package 1 Year",
      display_name: "Gói Test 1 Năm",
      base_price: 500000,
      is_active: true,
    }).returning("*");

    await db(TABLES.SUPPLIER_COST).insert({
      variant_id: testVariant.id,
      supplier_id: supplierB.id,
      price: 730000, // Giá gói 730k / 365 ngày = 2.000 đ/ngày
    });

    // 3. Tạo 1 đơn hàng ĐÃ THANH TOÁN với NCC A
    // Hạn dùng 365 ngày, expired_at sau hôm nay đúng 100 ngày
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const orderDate = new Date(today.getTime() - 265 * 24 * 60 * 60 * 1000);
    const expiredAt = new Date(today.getTime() + 100 * 24 * 60 * 60 * 1000);

    const pad = (n) => String(n).padStart(2, "0");
    const toYMD = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    createdOrder = await createOrder({
      order_prefix: "MAVC",
      customer: "Khách Test Đổi NCC",
      contact: "0900000000",
      information_order: "Gói Test 1 Năm",
      id_product: testVariant.id,
      price: 600000,
      cost: 365000, // 365k / 365 ngày = 1.000 đ/ngày
      supply_id: supplierA.id,
      days: 365,
      order_date: toYMD(orderDate),
      expired_at: toYMD(expiredAt),
    });

    // Cập nhật trạng thái đơn sang PAID và gắn log ban đầu cho NCC A
    await db(TABLES.ORDER_LIST).where({ id: createdOrder.id }).update({
      status: ORDER_STATUS.PAID,
      was_paid: true,
    });

    await db(TABLES.SUPPLIER_ORDER_COST_LOG).insert({
      order_list_id: createdOrder.id,
      supply_id: supplierA.id,
      id_order: createdOrder.id_order,
      import_cost: 365000,
      ncc_payment_status: SUPPLIER_PAYMENT_STATUS.PAID, // Giả sử đã thanh toán đợt đầu cho NCC A
      logged_at: orderDate,
    });

    // 4. THỰC HIỆN ĐỔI NCC TỪ A SANG B
    await updateOrder(createdOrder.id, {
      supply_id: supplierB.id,
    });

    // 5. KIỂM TRA LOG CỦA NCC CŨ A
    // Còn 100 ngày: tiền hoàn lại = round(365.000 / 365 * 100) = 100.000 đ
    const negativeLog = await db(TABLES.SUPPLIER_ORDER_COST_LOG)
      .where({ order_list_id: createdOrder.id, supply_id: supplierA.id })
      .where("import_cost", "<", 0)
      .first();

    assert.ok(negativeLog, "Phải có 1 log âm được tạo cho NCC cũ A");
    assert.equal(Number(negativeLog.import_cost), -100000, "Log âm phải bằng -100.000 đ");
    assert.equal(negativeLog.ncc_payment_status, SUPPLIER_PAYMENT_STATUS.UNPAID, "Log âm phải ở trạng thái Chưa Thanh Toán");

    // 6. KIỂM TRA LOG CỦA NCC MỚI B
    // NCC B có giá gói 730.000 đ / 365 ngày = 2.000 đ/ngày. Còn 100 ngày = 200.000 đ
    const positiveLogB = await db(TABLES.SUPPLIER_ORDER_COST_LOG)
      .where({ order_list_id: createdOrder.id, supply_id: supplierB.id })
      .first();

    assert.ok(positiveLogB, "Phải có 1 log chi phí mới được tạo cho NCC mới B");
    assert.equal(Number(positiveLogB.import_cost), 200000, "Log mới NCC B phải bằng +200.000 đ");
    assert.equal(positiveLogB.ncc_payment_status, SUPPLIER_PAYMENT_STATUS.UNPAID);

    // 7. KIỂM TRA ĐỐI SOÁT & VIETQR ĐẢO CHIỀU TẠI getSupplierDetailById
    // Với NCC A: Vì log ban đầu đã PAID, chỉ còn log âm -100.000 đ UNPAID
    // => remaining_debt = -100.000 đ (ÂM => NCC NỢ SHOP)
    const detailA = await getSupplierDetailById(supplierA.id);
    assert.equal(detailA.unpaid_cycle.amount_needed, -100000, "Dư nợ NCC A phải là âm -100.000 đ");
    assert.equal(detailA.unpaid_cycle.debt_direction, "SUPPLIER_OWES_SHOP", "Hướng công nợ phải là NCC nợ Shop");
    assert.equal(detailA.unpaid_cycle.qr_target_type, "SHOP", "QR phải chuyển sang STK mặc định của Shop");
    assert.ok(detailA.unpaid_cycle.vietqr_url, "Phải sinh VietQR");
    assert.ok(
      detailA.unpaid_cycle.vietqr_url.includes("amount=100000"),
      "VietQR của Shop phải mang số tiền dương 100.000 đ (đã bỏ dấu trừ)"
    );
    assert.ok(
      !detailA.unpaid_cycle.vietqr_url.includes("amount=-"),
      "VietQR tuyệt đối không được chứa dấu trừ âm"
    );

    // Với NCC B: NCC B có log UNPAID +200.000 đ => remaining_debt = 200.000 đ (DƯƠNG => SHOP NỢ NCC)
    const detailB = await getSupplierDetailById(supplierB.id);
    assert.equal(detailB.unpaid_cycle.amount_needed, 200000, "Dư nợ NCC B phải là dương 200.000 đ");
    assert.equal(detailB.unpaid_cycle.debt_direction, "SHOP_OWES_SUPPLIER", "Hướng công nợ phải là Shop nợ NCC");
    assert.equal(detailB.unpaid_cycle.qr_target_type, "SUPPLIER", "QR phải là STK của NCC B");
    assert.ok(
      detailB.unpaid_cycle.vietqr_url.includes("444555666"),
      "VietQR của NCC B phải chứa STK của NCC B"
    );

    // 8. KIỂM TRA TẤT TOÁN KHI NCC NỢ SHOP (Xác nhận đã nhận tiền hoàn từ NCC A)
    const settleResultA = await paySupplierDebt(supplierA.id);
    assert.ok(settleResultA.success, "Tất toán công nợ âm phải thành công");
    assert.equal(settleResultA.isRefund, true, "Phải xác nhận là thu hồi tiền hoàn");
    assert.equal(settleResultA.collectedAmount, 100000);

    const logAfterA = await db(TABLES.SUPPLIER_ORDER_COST_LOG)
      .where({ id: negativeLog.id })
      .first();
    assert.equal(logAfterA.ncc_payment_status, SUPPLIER_PAYMENT_STATUS.PAID, "Log âm phải được gạch nợ thành Đã Thanh Toán");

  } finally {
    // Dọn dẹp dữ liệu test
    if (createdOrder) {
      await db(TABLES.SUPPLIER_ORDER_COST_LOG).where({ order_list_id: createdOrder.id }).del();
      await db(TABLES.ORDER_LIST).where({ id: createdOrder.id }).del();
    }
    if (testVariant) {
      await db(TABLES.SUPPLIER_COST).where({ variant_id: testVariant.id }).del();
      await db(TABLES.VARIANT).where({ id: testVariant.id }).del();
    }
    if (supplierA) {
      await db(TABLES.SUPPLIER).where({ id: supplierA.id }).del();
    }
    if (supplierB) {
      await db(TABLES.SUPPLIER).where({ id: supplierB.id }).del();
    }
    await db.destroy();
  }
});

