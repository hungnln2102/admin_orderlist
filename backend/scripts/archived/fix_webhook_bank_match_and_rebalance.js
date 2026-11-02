/**
 * fix_webhook_bank_match_and_rebalance.js
 * Script chuẩn hóa và hoàn trả số dư giữa Tài khoản cá nhân (ID 1004) và MB Bank Shop (ID 2).
 *
 * Thực thi theo chuẩn ACID Transaction:
 *  1. Chuyển 14 bản ghi ledger từ ID 1004 (VPBank Cá nhân) về ID 2 (MB Bank Shop).
 *  2. Khôi phục số dư của ID 1004 về 0.
 *  3. Bù lại số dư chênh lệch (+237,254 ₫) và tổng thu/chi cho ID 2.
 */
const { db, withTransaction } = require('@/db');

async function fixWebhookAndRebalance() {
  console.log('=== TIẾN HÀNH HOÀN TRẢ SỐ DƯ & SỔ CÁI THEO ĐỐI CHIẾU NGÂN HÀNG ===\n');

  await withTransaction(async (trx) => {
    // 1. Lấy tất cả ledger entries thuộc ID 1004 có source_kind là payment_receipt
    const ledgerRows = (await trx.raw(`
      SELECT l.id, l.entry_type, l.amount, l.reference_id, pr.gateway, pr.sender
      FROM finance.financial_account_ledger l
      LEFT JOIN billing.payment_receipt pr ON l.reference_id = pr.id::text AND l.reference_type = 'payment_receipt'
      WHERE l.financial_account_id = 1004 AND l.reference_type = 'payment_receipt'
      ORDER BY l.id ASC;
    `)).rows;

    console.log(`- Phát hiện ${ledgerRows.length} bản ghi ledger tại TK 1004 cần chuyển về TK 2 (MB Bank).`);

    let sumIn = 0;
    let sumOut = 0;
    const ledgerIds = [];

    for (const r of ledgerRows) {
      ledgerIds.push(r.id);
      const amt = Number(r.amount);
      if (r.entry_type === 'receipt_in') {
        sumIn += amt;
      } else if (r.entry_type === 'receipt_out') {
        sumOut += amt;
      }
    }

    const netDiff = sumIn - sumOut;
    console.log(`- Tổng tiền vào (receipt_in): +${sumIn.toLocaleString('vi-VN')} ₫`);
    console.log(`- Tổng tiền ra (receipt_out): -${sumOut.toLocaleString('vi-VN')} ₫`);
    console.log(`- Số dư chênh lệch thực hoàn trả: +${netDiff.toLocaleString('vi-VN')} ₫\n`);

    if (ledgerIds.length > 0) {
      // 2. Chuyển financial_account_id của ledger từ 1004 -> 2
      const updateLedgerRes = await trx.raw(`
        UPDATE finance.financial_account_ledger
        SET financial_account_id = 2
        WHERE id = ANY(?::bigint[]);
      `, [ledgerIds]);
      console.log(`✅ Đã chuyển ${updateLedgerRes.rowCount} bản ghi ledger sang TK #2 (MB Bank Shop).`);
    }

    // 3. Đọc số dư hiện tại của cả 2 tài khoản
    const [acc1004] = (await trx.raw(`SELECT id, balance, total_received, total_withdrawn FROM finance.financial_accounts WHERE id = 1004;`)).rows;
    const [acc2] = (await trx.raw(`SELECT id, balance, total_received, total_withdrawn FROM finance.financial_accounts WHERE id = 2;`)).rows;

    console.log(`\nTrạng thái trước khi điều chỉnh:`);
    console.log(` - TK #1004 (Cá nhân): Số dư = ${Number(acc1004.balance).toLocaleString('vi-VN')} ₫ | Thu = ${Number(acc1004.total_received).toLocaleString('vi-VN')} ₫ | Rút = ${Number(acc1004.total_withdrawn).toLocaleString('vi-VN')} ₫`);
    console.log(` - TK #2 (MB Bank Shop): Số dư = ${Number(acc2.balance).toLocaleString('vi-VN')} ₫ | Thu = ${Number(acc2.total_received).toLocaleString('vi-VN')} ₫ | Rút = ${Number(acc2.total_withdrawn).toLocaleString('vi-VN')} ₫`);

    // 4. Khôi phục TK 1004 về số dư thực (0 ₫)
    const newBal1004 = Math.max(0, Number(acc1004.balance) - netDiff);
    const newRec1004 = Math.max(0, Number(acc1004.total_received) - sumIn);
    const newWth1004 = Math.max(0, Number(acc1004.total_withdrawn) - sumOut);

    await trx.raw(`
      UPDATE finance.financial_accounts
      SET balance = ?, total_received = ?, total_withdrawn = ?, updated_at = NOW()
      WHERE id = 1004;
    `, [newBal1004, newRec1004, newWth1004]);

    // 5. Cộng số dư và thu/rút cho TK 2 (MB Bank Shop)
    const newBal2 = Number(acc2.balance) + netDiff;
    const newRec2 = Number(acc2.total_received) + sumIn;
    const newWth2 = Number(acc2.total_withdrawn) + sumOut;

    await trx.raw(`
      UPDATE finance.financial_accounts
      SET balance = ?, total_received = ?, total_withdrawn = ?, updated_at = NOW()
      WHERE id = 2;
    `, [newBal2, newRec2, newWth2]);

    console.log(`\nTrạng thái sau khi hoàn trả (ACID):`);
    console.log(` - TK #1004 (Cá nhân): Số dư = ${newBal1004.toLocaleString('vi-VN')} ₫ | Thu = ${newRec1004.toLocaleString('vi-VN')} ₫ | Rút = ${newWth1004.toLocaleString('vi-VN')} ₫`);
    console.log(` - TK #2 (MB Bank Shop): Số dư = ${newBal2.toLocaleString('vi-VN')} ₫ | Thu = ${newRec2.toLocaleString('vi-VN')} ₫ | Rút = ${newWth2.toLocaleString('vi-VN')} ₫`);
  });

  console.log('\n>>> ĐÃ HOÀN TẤT TRANSACTION HOÀN TRẢ SỐ DƯ THÀNH CÔNG! <<<');
  process.exit(0);
}

fixWebhookAndRebalance().catch((err) => {
  console.error('LỖI GIAO DỊCH (ĐÃ ROLLBACK):', err);
  process.exit(1);
});

