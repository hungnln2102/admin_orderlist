const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
require("module-alias/register");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

const { db, TABLES } = require("@/db");
const financeHubService = require("@/domains/finance/services/financeHubService");

test("Card Reconciliation & Direct Bill Borrowing - Đối chiếu 4 số cuối thẻ & Quẹt thẻ thanh toán hóa đơn không qua ngân hàng", async () => {
  const suffix = Date.now();
  const cardDigits = String(suffix).slice(-4);
  const cardName = `Thẻ Tín Dụng Test ${suffix}`;
  const bank = "VPBank";

  // 1. Tạo khoản nợ thẻ tín dụng có 4 số cuối và tên ngân hàng
  const cardDebt = await financeHubService.createPersonalAsset({
    name: cardName,
    type: "DEBT_PAYABLE",
    amount: 1000000, // 1 triệu nợ ban đầu
    note: "Thẻ tín dụng test đối chiếu",
    cardLastDigits: cardDigits,
    bankName: bank,
    debtInterestEnabled: false,
    debtDueDay: 15,
    debtEndDate: null,
  });

  assert.ok(cardDebt.id, "Tạo thẻ tín dụng thành công");
  assert.equal(cardDebt.cardLastDigits, cardDigits);
  assert.equal(cardDebt.bankName, bank);

  // Tạo 1 tài khoản ngân hàng giả lập để kiểm tra số dư KHÔNG bị thay đổi
  const [testBankAcc] = await db(TABLES.FINANCIAL_ACCOUNTS)
    .insert({
      bank_display_name: "VPBank Test",
      bank_short_code: "VPB",
      account_number: `ACC_${suffix}`,
      account_holder: "Master Tester",
      account_type: "bank",
      account_scope: "PERSONAL",
      balance: 5000000, // 5 triệu
      is_active: true,
      is_deleted: false,
    })
    .returning("*");

  const bankAccId = Number(testBankAcc.id);
  const initialBankBalance = Number(testBankAcc.balance);

  try {
    // 2. Kịch bản 1: Quẹt thẻ thanh toán hóa đơn 61.900 ₫ (DIRECT_EXPENSE)
    // Master quẹt thẻ trả hóa đơn tại Shopee -> không đi qua tài khoản ngân hàng nào!
    const borrowRes1 = await financeHubService.borrowPersonalAsset(cardDebt.id, {
      amount: 61900,
      merchantName: "SHOPEE VIETNAM",
      referenceCode: `FT_TEST_${suffix}`,
      directExpense: true,
      note: "Quẹt thẻ thanh toán đơn hàng Shopee",
    });

    assert.equal(borrowRes1.success, true);
    assert.equal(Number(borrowRes1.newAmount), 1061900, "Dư nợ thẻ phải tăng đúng 61.900 ₫ (thành 1.061.900 ₫)");

    // Kiểm tra số dư tài khoản ngân hàng: TUYỆT ĐỐI KHÔNG BỊ CỘNG/TRỪ
    const recheckedBank = await db(TABLES.FINANCIAL_ACCOUNTS).where({ id: bankAccId }).first();
    assert.equal(Number(recheckedBank.balance), initialBankBalance, "Số dư tài khoản ngân hàng phải giữ nguyên 5.000.000 ₫, không được tăng ảo!");

    // Kiểm tra DEBT_PAYMENT_LOGS: Phải có merchant_name, reference_code và financial_account_id = null
    const log1 = await db(TABLES.DEBT_PAYMENT_LOGS)
      .where({ target_type: "PERSONAL_DEBT_BORROW", target_id: cardDebt.id })
      .first();

    assert.ok(log1, "Phải có log trong debt_payment_logs");
    assert.equal(Number(log1.amount), 61900);
    assert.equal(log1.financial_account_id, null, "financial_account_id phải là NULL");
    assert.equal(log1.merchant_name, "SHOPEE VIETNAM");
    assert.equal(log1.reference_code, `FT_TEST_${suffix}`);

    // 3. Kịch bản 2: Tự động đối chiếu thông báo ngân hàng / Email qua autoMatchCardTransaction
    // App đọc SMS: "The *0963 tai VPBank vua thanh toan 150,000 VND tai TIKTOK SHOP..."
    const autoMatchRes = await financeHubService.autoMatchCardTransaction({
      cardLastDigits: cardDigits,
      bankName: "VPBank",
      amount: 150000,
      merchantName: "TIKTOK SHOP",
      referenceCode: `AUTO_SMS_${suffix}`,
      note: "Quẹt thẻ tự động bóc tách từ thông báo",
    });

    assert.equal(autoMatchRes.success, true);
    assert.equal(autoMatchRes.matchedAsset.id, cardDebt.id, "Phải tự động khớp đúng thẻ của Master");
    assert.equal(Number(autoMatchRes.newAmount), 1211900, "Dư nợ thẻ tiếp tục tăng thành 1.211.900 ₫");

    // Kiểm tra log thứ 2
    const log2 = await db(TABLES.DEBT_PAYMENT_LOGS)
      .where({ target_type: "PERSONAL_DEBT_BORROW", target_id: cardDebt.id, reference_code: `AUTO_SMS_${suffix}` })
      .first();

    assert.ok(log2, "Log thứ 2 từ autoMatch phải tồn tại");
    assert.equal(Number(log2.amount), 150000);
    assert.equal(log2.financial_account_id, null);
    assert.equal(log2.merchant_name, "TIKTOK SHOP");

    // 4. Kịch bản 3: Idempotency Gatekeeper - Gửi trùng request SMS / Webhook cùng reference_code
    // Hệ thống phải nhận diện đã xử lý, không được tăng dư nợ lần 2!
    const duplicateRes = await financeHubService.autoMatchCardTransaction({
      cardLastDigits: cardDigits,
      bankName: "VPBank",
      amount: 150000,
      merchantName: "TIKTOK SHOP",
      referenceCode: `AUTO_SMS_${suffix}`,
      note: "Gửi trùng tin SMS lần 2",
    });

    assert.equal(duplicateRes.success, true);
    assert.equal(duplicateRes.alreadyProcessed, true, "Phải nhận diện đã xử lý (idempotent)");
    assert.equal(Number(duplicateRes.newAmount), 1211900, "Dư nợ thẻ không được tăng thêm lần nữa!");

    // 5. Kịch bản 4: Chặn nhầm thẻ khi có 2 thẻ trùng 4 số cuối
    const secondCardDebt = await financeHubService.createPersonalAsset({
      name: `Thẻ Techcombank Test ${suffix}`,
      type: "DEBT_PAYABLE",
      amount: 500000,
      note: "Thẻ thứ 2 trùng 4 số cuối",
      cardLastDigits: cardDigits,
      bankName: "Techcombank",
      debtInterestEnabled: false,
      debtDueDay: 20,
      debtEndDate: null,
    });

    try {
      // Gọi autoMatch không chỉ định rõ ngân hàng -> Phải bị từ chối
      let caughtErr = null;
      try {
        await financeHubService.autoMatchCardTransaction({
          cardLastDigits: cardDigits,
          amount: 50000,
          merchantName: "CỬA HÀNG TIỆN LỢI",
        });
      } catch (err) {
        caughtErr = err;
      }
      assert.ok(caughtErr, "Phải văng lỗi khi có nhiều hơn 1 thẻ trùng 4 số cuối");
      assert.match(caughtErr.message, /Phát hiện 2 thẻ ngân hàng có cùng 4 số cuối/);
    } finally {
      await financeHubService.deletePersonalAsset(secondCardDebt.id);
    }

  } finally {
    // Dọn dẹp dữ liệu test
    await db(TABLES.DEBT_PAYMENT_LOGS).where({ target_type: "PERSONAL_DEBT_BORROW", target_id: cardDebt.id }).del();
    await financeHubService.deletePersonalAsset(cardDebt.id);
    await db(TABLES.FINANCIAL_ACCOUNTS).where({ id: bankAccId }).del();
  }
});

test.after(async () => {
  await db.destroy();
});
