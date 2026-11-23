/**
 * webhook_financial_account_balance.test.js
 * Test tích hợp: Kiểm tra việc tự động cộng/trừ số dư tài khoản/ví khi nhận Webhook SePay.
 */
const path = require("path");
require("module-alias/register");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
const { db, TABLES } = require("@/db");
const { processPaymentWebhook } = require("@/domains/payments/services/webhookPaymentService");
const { TRANSFER_TYPE } = require("@/constants/receiptStatus");

let PASS = 0;
let FAIL = 0;
const createdReceiptIds = [];
const createdTransactionIds = [];
let createdBankAccountId = null;

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERT FAIL: ${message}`);
}

async function runTest(name, fn) {
  process.stdout.write(`  ⏳ ${name}... `);
  try {
    await fn();
    console.log("✅ PASS");
    PASS++;
  } catch (err) {
    console.log(`❌ FAIL: ${err.message}`);
    console.error(err);
    FAIL++;
  }
}

async function cleanup() {
  await db.transaction(async (trx) => {
    if (createdReceiptIds.length) {
      await trx(TABLES.PAYMENT_RECEIPT_ALLOCATIONS).whereIn("receipt_id", createdReceiptIds).del();
      await trx(TABLES.PAYMENT_RECEIPT).whereIn("id", createdReceiptIds).del();
    }

    if (createdBankAccountId) {
      await trx(TABLES.SHOP_BANK_ACCOUNT_LEDGER)
        .where("financial_account_id", createdBankAccountId)
        .del();
      await trx(TABLES.SHOP_BANK_ACCOUNTS).where("id", createdBankAccountId).del();
    }
  });
}

async function main() {
  console.log("=================================================");
  console.log("  TEST SUITE: Webhook Financial Account Balance  ");
  console.log("=================================================");

  try {
    // Tạo tài khoản ngân hàng riêng cho suite để tiền vào/ra không phụ thuộc dữ liệu nền.
    const [testAccount] = await db(TABLES.SHOP_BANK_ACCOUNTS)
      .insert({
        account_type: "bank",
        label: "Test MBBank",
        account_number: `TESTMB${Date.now()}`,
        account_holder: "TEST OWNER",
        bank_short_code: "MB",
        account_scope: "SHOP",
        is_default: false,
        is_active: true,
        is_deleted: false,
        balance: 1000000,
        total_received: 0,
        total_withdrawn: 0,
      })
      .returning("*");
    createdBankAccountId = testAccount.id;
    const testAccountId = testAccount.id;
    const testAccountNumber = testAccount.account_number;

    // [TC-01] Webhook SePay tiền vào -> Số dư tài khoản phải tăng đúng số tiền
    await runTest("TC-01: Webhook SePay tiền vào -> Tự động CỘNG số dư tài khoản & ghi sổ cái", async () => {
      const accBefore = await db(TABLES.SHOP_BANK_ACCOUNTS).where({ id: testAccountId }).first();
      const balanceBefore = Number(accBefore.balance || 0);
      const receivedBefore = Number(accBefore.total_received || 0);

      const amountIn = 250000;
      const txId = `TX-IN-${Date.now()}`;

      const result = await processPaymentWebhook({
        transaction_id: txId,
        transferAmount: amountIn,
        transferType: TRANSFER_TYPE.IN,
        content: `Test chuyen tien vao ${txId}`,
        gateway: "MBBANK",
        accountNumber: testAccountNumber,
        transactionDate: new Date().toISOString().split("T")[0],
      });

      createdReceiptIds.push(result.receiptId);
      createdTransactionIds.push(txId);
      assert(result.success === true, "Webhook phải trả về success: true");

      // Kiểm tra số dư tài khoản trong DB
      const accAfter = await db(TABLES.SHOP_BANK_ACCOUNTS).where({ id: testAccountId }).first();
      const balanceAfter = Number(accAfter.balance || 0);
      const receivedAfter = Number(accAfter.total_received || 0);

      assert(
        balanceAfter === balanceBefore + amountIn,
        `Số dư sau (${balanceAfter}) phải bằng trước (${balanceBefore}) + ${amountIn}`
      );
      assert(
        receivedAfter === receivedBefore + amountIn,
        `Tổng thu sau (${receivedAfter}) phải bằng trước (${receivedBefore}) + ${amountIn}`
      );

      // Kiểm tra sổ cái financial_account_ledger
      const ledgerEntry = await db(TABLES.SHOP_BANK_ACCOUNT_LEDGER)
        .where({
          reference_type: "payment_receipt",
          reference_id: txId,
        })
        .first();

      assert(Boolean(ledgerEntry), "Phải có bản ghi sổ cái tương ứng với receiptId");
      assert(ledgerEntry.entry_type === "receipt_in", `entry_type phải là receipt_in, nhận: ${ledgerEntry.entry_type}`);
      assert(Number(ledgerEntry.amount) === amountIn, `amount phải là +${amountIn}`);
      assert(Number(ledgerEntry.balance_after) === balanceAfter, `balance_after trong sổ cái phải khớp số dư thực`);
    });

    // [TC-02] Webhook SePay tiền ra -> Số dư tài khoản phải trừ đúng số tiền
    await runTest("TC-02: Webhook SePay tiền ra -> Tự động TRỪ số dư tài khoản & ghi sổ cái", async () => {
      const accBefore = await db(TABLES.SHOP_BANK_ACCOUNTS).where({ id: testAccountId }).first();
      const balanceBefore = Number(accBefore.balance || 0);
      const withdrawnBefore = Number(accBefore.total_withdrawn || 0);

      const amountOut = 100000;
      const txId = `TX-OUT-${Date.now() + 1}`;

      const result = await processPaymentWebhook({
        transaction_id: txId,
        transferAmount: amountOut,
        transferType: TRANSFER_TYPE.OUT,
        content: `Test chuyen tien ra nha cung cap ${txId}`,
        gateway: "MBBANK",
        accountNumber: testAccountNumber,
        transactionDate: new Date().toISOString().split("T")[0],
      });

      createdReceiptIds.push(result.receiptId);
      createdTransactionIds.push(txId);
      assert(result.success === true, "Webhook tiền ra phải trả về success: true");
      assert(result.transferType === TRANSFER_TYPE.OUT, "Loại giao dịch phải là OUT");

      // Kiểm tra số dư tài khoản trong DB
      const accAfter = await db(TABLES.SHOP_BANK_ACCOUNTS).where({ id: testAccountId }).first();
      const balanceAfter = Number(accAfter.balance || 0);
      const withdrawnAfter = Number(accAfter.total_withdrawn || 0);

      assert(
        balanceAfter === balanceBefore - amountOut,
        `Số dư sau (${balanceAfter}) phải bằng trước (${balanceBefore}) - ${amountOut}`
      );
      assert(
        withdrawnAfter === withdrawnBefore + amountOut,
        `Tổng rút sau (${withdrawnAfter}) phải bằng trước (${withdrawnBefore}) + ${amountOut}`
      );

      // Kiểm tra sổ cái
      const ledgerEntry = await db(TABLES.SHOP_BANK_ACCOUNT_LEDGER)
        .where({
          reference_type: "payment_receipt",
          reference_id: txId,
        })
        .first();

      assert(Boolean(ledgerEntry), "Phải có bản ghi sổ cái cho tiền ra");
      assert(ledgerEntry.entry_type === "receipt_out", `entry_type phải là receipt_out`);
      assert(Number(ledgerEntry.amount) === amountOut, `amount phải là ${amountOut}`);
    });

    // [TC-03] Webhook SePay gửi trùng lặp -> Không bị cộng/trừ 2 lần
    await runTest("TC-03: Webhook SePay trùng lặp (Idempotency) -> KHÔNG bị cộng/trừ 2 lần", async () => {
      const txId = `TX-DUP-${Date.now() + 2}`;
      const amount = 50000;

      // Lần 1
      const res1 = await processPaymentWebhook({
        transaction_id: txId,
        transferAmount: amount,
        transferType: TRANSFER_TYPE.IN,
        content: "Giao dich dau tien",
        gateway: "MBBANK",
        accountNumber: testAccountNumber,
      });
      createdReceiptIds.push(res1.receiptId);
      createdTransactionIds.push(txId);

      const accAfterFirst = await db(TABLES.SHOP_BANK_ACCOUNTS).where({ id: testAccountId }).first();
      const balanceAfterFirst = Number(accAfterFirst.balance || 0);

      // Lần 2 (trùng txId)
      const res2 = await processPaymentWebhook({
        transaction_id: txId,
        transferAmount: amount,
        transferType: TRANSFER_TYPE.IN,
        content: "Giao dich trung lap",
        gateway: "MBBANK",
        accountNumber: testAccountNumber,
      });

      assert(res2.duplicate === true, "Lần 2 phải nhận diện duplicate: true");

      const accAfterSecond = await db(TABLES.SHOP_BANK_ACCOUNTS).where({ id: testAccountId }).first();
      const balanceAfterSecond = Number(accAfterSecond.balance || 0);

      assert(
        balanceAfterSecond === balanceAfterFirst,
        `Số dư lần 2 (${balanceAfterSecond}) không được tăng thêm so với lần 1 (${balanceAfterFirst})`
      );
    });
    // [TC-04] SePay transaction_id remains the stable ledger identity.
    await runTest("TC-04: transaction_id is the fixed ledger identity", async () => {
      const txId = `TX-FIXED-${Date.now()}`;
      const amount = 61000;
      const first = await processPaymentWebhook({
        transaction_id: txId,
        id: `legacy-${txId}`,
        transferAmount: amount,
        transferType: TRANSFER_TYPE.IN,
        content: "Fixed transaction identity",
        gateway: "MBBANK",
        accountNumber: testAccountNumber,
      });
      createdReceiptIds.push(first.receiptId);
      createdTransactionIds.push(txId);

      const receipt = await db(TABLES.PAYMENT_RECEIPT).where({ id: first.receiptId }).first();
      const ledger = await db(TABLES.SHOP_BANK_ACCOUNT_LEDGER)
        .where({ reference_type: "payment_receipt", reference_id: txId })
        .first();

      assert(receipt.sepay_transaction_id === txId, "Receipt must store transaction_id");
      assert(Boolean(ledger), "Ledger must use transaction_id as reference_id");

      const second = await processPaymentWebhook({
        transaction_id: txId,
        id: `different-${txId}`,
        transferAmount: amount,
        transferType: TRANSFER_TYPE.IN,
        content: "Retry with same transaction identity",
        gateway: "MBBANK",
        accountNumber: testAccountNumber,
      });
      assert(second.duplicate === true, "Same transaction_id retry must be duplicate");
    });
    await runTest("TC-05: SePay OUT replay requires a verified mapping and debits once", async () => {
      const txId = `TX-OUT-REPLAY-${Date.now()}`;
      const accountNumber = `UNMAPPED${Date.now()}`;
      const amount = 91357;
      const payload = {
        transaction_id: txId,
        transferAmount: amount,
        transferType: TRANSFER_TYPE.OUT,
        content: "Outbound mapping replay",
        gateway: "MBBANK",
        accountNumber,
      };
      const ledgerQuery = () => db(TABLES.SHOP_BANK_ACCOUNT_LEDGER)
        .where({ reference_type: "payment_receipt", reference_id: txId });
      const accountQuery = () => db(TABLES.SHOP_BANK_ACCOUNTS).where({ id: testAccountId });
      const before = await accountQuery().first();
      const initial = await processPaymentWebhook(payload);
      createdReceiptIds.push(initial.receiptId);
      assert(initial.reason === "ACCOUNT_NOT_RESOLVED", "Missing mapping must leave the OUT receipt pending");
      assert((await processPaymentWebhook(payload)).duplicate, "Replay without a mapping must stay pending");
      assert((await ledgerQuery()).length === 0, "Pending receipt must not create a ledger entry");

      try {
        await accountQuery().update({ account_number: accountNumber });
        const mismatch = await processPaymentWebhook({ ...payload, transferAmount: amount + 1 });
        assert(mismatch.duplicate && (await ledgerQuery()).length === 0, "Changed payload must not debit");

        const retries = await Promise.all([processPaymentWebhook(payload), processPaymentWebhook(payload)]);
        assert(retries.every((result) => result.receiptId === initial.receiptId), "Retries must reuse the original receipt");
        assert(retries.filter((result) => result.replayed).length === 1, "Exactly one retry must process the receipt");
        assert(retries.filter((result) => result.duplicate).length === 1, "Concurrent retry must be a duplicate");

        const ledger = await ledgerQuery();
        const after = await accountQuery().first();
        assert(ledger.length === 1 && ledger[0].entry_type === "receipt_out", "One OUT ledger entry must be written");
        assert(Number(after.balance) === Number(before.balance) - amount, "Balance must be debited once");
      } finally {
        await accountQuery().update({ account_number: testAccountNumber });
      }
    });
  } finally {
    await cleanup();
    await db.destroy();
  }

  console.log("-------------------------------------------------");
  console.log(`KẾT QUẢ: ${PASS} PASS, ${FAIL} FAIL`);
  if (FAIL > 0) process.exit(1);
}

main().catch((err) => {
  console.error("LỖI TEST:", err);
  process.exit(1);
});
