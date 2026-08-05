/**
 * Script kiểm thử logic khớp webhook theo số tiền chính xác và tạo credit ngoài luồng khi không khớp.
 */
require('module-alias/register');
const { db } = require('@/db');
const { processWebhookTransactionAsync } = require('../webhook/sepay/routes/webhook/postHandler');
const { parseWebhookTransaction } = require('../webhook/sepay/routes/webhook/parsePhase');
const { STATUS } = require('@/utils/statuses');

async function test() {
  try {
    console.log("=== BẮT ĐẦU KIỂM THỬ WEBHOOK MATCH EXACT AMOUNT ===");

    // Dọn dẹp các đơn test cũ để tránh trùng lặp số tiền
    await db('order_list').whereILike('id_order', 'MAVTST%').del();

    console.log("Tạo đơn hàng test mới...");
    const [insertedId] = await db('order_list')
      .insert({
        id_order: `MAVTST${Date.now()}`,
        price: 250000,
        cost: 150000,
        status: STATUS.UNPAID,
        customer: "Test Customer",
        contact: "0999999999",
        order_date: new Date(),
      })
      .returning('id');
    
    let order = await db('order_list').where({ id: Number(insertedId?.id ?? insertedId) }).first();

    const orderCode = order.id_order;
    const price = Math.round(Number(order.price));

    console.log(`\nĐơn hàng test: ${orderCode}`);
    console.log(`Giá đơn: ${price} VND`);
    console.log(`Trạng thái ban đầu: ${order.status}`);

    // --- TEST CASE 1: Chuyển khoản sai số tiền (thiếu) có ghi mã đơn ---
    // Khách chuyển 150.000đ cho đơn 250.000đ. Phải tạo credit và KHÔNG được match đơn.
    console.log("\n--- TEST CASE 1: Chuyển khoản thiếu tiền (150.000 / 250.000) có ghi mã đơn ---");
    const payload1 = {
      id: Date.now() + 1,
      gateway: "MBBank",
      transaction_date: new Date().toISOString().slice(0, 19).replace("T", " "),
      account_number: "0378304963",
      transfer_type: "in",
      transfer_amount: 150000,
      accumulated: 0,
      code: null,
      transaction_content: `Chuyen khoan thanh toan don ${orderCode}`,
      reference_number: `TXN${Date.now()}1`,
      description: `Testing shortfall with order code`,
      note: `Chuyen khoan thanh toan don ${orderCode}`,
    };

    const parsed1 = parseWebhookTransaction(payload1);
    await processWebhookTransactionAsync(payload1, parsed1);

    // Kiểm tra trạng thái đơn hàng (vẫn phải là UNPAID)
    const orderAfter1 = await db('order_list').where({ id_order: orderCode }).first();
    console.log(`Trạng thái đơn sau Test Case 1: ${orderAfter1.status} (Kỳ vọng: ${STATUS.UNPAID})`);

    // Kiểm xem có tạo credit note trị giá 150.000đ cho biên nhận đó không
    const receipt1 = await db('payment_receipt').where({ note: payload1.transaction_content }).orderBy('id', 'desc').first();
    if (receipt1) {
      const creditNote1 = await db('refund_credit_notes').where({ payment_receipt_id: receipt1.id }).first();
      console.log(`Có tạo credit note cho biên lai #${receipt1.id}? ${creditNote1 ? 'CÓ' : 'KHÔNG'} (Kỳ vọng: CÓ)`);
      if (creditNote1) {
        console.log(`  - Mã credit: ${creditNote1.credit_code}`);
        console.log(`  - Trạng thái credit: ${creditNote1.status}`);
        console.log(`  - Số dư credit: ${creditNote1.available_amount} VND (Kỳ vọng: 150000)`);
      }
    } else {
      console.error("Không tìm thấy biên lai được tạo cho Test Case 1!");
    }

    // --- TEST CASE 2: Chuyển khoản đúng số tiền KHÔNG ghi mã đơn ---
    // Khách chuyển đúng 250.000đ (hoặc số tiền còn lại sau credit, ở đây do đơn vẫn unpaid nên là 250.000đ).
    // Hệ thống phải tự tìm ra duy nhất đơn hàng test này để match.
    console.log("\n--- TEST CASE 2: Chuyển khoản ĐÚNG số tiền (250.000) KHÔNG ghi mã đơn ---");
    const payload2 = {
      id: Date.now() + 2,
      gateway: "MBBank",
      transaction_date: new Date().toISOString().slice(0, 19).replace("T", " "),
      account_number: "0378304963",
      transfer_type: "in",
      transfer_amount: price,
      accumulated: 0,
      code: null,
      transaction_content: `MBCT NGO LE NGOC HUNG chuyen tien ${Date.now()}`, // Không có mã đơn
      reference_number: `TXN${Date.now()}2`,
      description: `Testing exact amount without order code`,
      note: `MBCT NGO LE NGOC HUNG chuyen tien ${Date.now()}`,
    };

    const parsed2 = parseWebhookTransaction(payload2);
    await processWebhookTransactionAsync(payload2, parsed2);

    // Kiểm tra trạng thái đơn hàng (phải là PAID)
    const orderAfter2 = await db('order_list').where({ id_order: orderCode }).first();
    console.log(`Trạng thái đơn sau Test Case 2: ${orderAfter2.status} (Kỳ vọng: ${STATUS.PAID})`);

    // Kiểm tra xem biên lai có được gắn mã đơn và ghi nhận tài chính không
    const receipt2 = await db('payment_receipt').where({ note: payload2.transaction_content }).orderBy('id', 'desc').first();
    if (receipt2) {
      console.log(`Biên lai #${receipt2.id} có được gắn mã đơn? ${receipt2.id_order || 'KHÔNG'} (Kỳ vọng: ${orderCode})`);
      const state2 = await db('payment_receipt_financial_state').where({ payment_receipt_id: receipt2.id }).first();
      console.log(`  - is_financial_posted: ${state2?.is_financial_posted} (Kỳ vọng: true)`);
      console.log(`  - posted_revenue: ${Number(state2?.posted_revenue)} VND (Kỳ vọng: ${price})`);
    } else {
      console.error("Không tìm thấy biên lai được tạo cho Test Case 2!");
    }

    console.log("\n=== HOÀN THÀNH KIỂM THỬ ===");
  } catch (err) {
    console.error("LỖI KHI CHẠY TEST:", err.message);
    console.error(err.stack);
  } finally {
    process.exit(0);
  }
}

test();
