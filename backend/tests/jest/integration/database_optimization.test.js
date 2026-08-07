jest.mock("@/services/telegramFinanceDeltaNotifier", () => ({
  notifyFinanceMonthlyDelta: jest.fn().mockResolvedValue(true),
}));

const { db } = require("@/db");
const { processWebhookTransactionAsync } = require("webhook-sepay/routes/webhook/postHandler");
const { parseWebhookTransaction } = require("webhook-sepay/routes/webhook/parsePhase");
const { STATUS } = require("@/utils/statuses");
const { classifyReceipt } = require("@/domains/payments/controller/handlers/classifyReceipt");

describe("Phase 5 - Database Optimization and Schema Unification Tests", () => {
  const TEST_PREFIX = "MAVCTST";
  let testOrderCode;
  let testOrderId;

  const cleanUpTestData = async () => {
    // Delete test keys
    await db("business.product_keys").whereILike("account_username", `${TEST_PREFIX}%`).del();
    await db("business.product_keys").whereILike("id_order", `${TEST_PREFIX}%`).del();

    // Delete test ledger entries
    const testAccounts = await db("finance.financial_accounts")
      .whereILike("label", `${TEST_PREFIX}%`)
      .orWhereILike("account_number", `${TEST_PREFIX}%`)
      .select("id");
    const accountIds = testAccounts.map((a) => a.id);
    if (accountIds.length > 0) {
      await db("finance.financial_account_ledger")
        .whereIn("financial_account_id", accountIds)
        .del();
      await db("finance.financial_accounts").whereIn("id", accountIds).del();
    }

    // Delete test orders and related receipts
    const testOrders = await db("order_list")
      .whereILike("id_order", `${TEST_PREFIX}%`)
      .select("id", "id_order");
    const orderIds = testOrders.map((o) => o.id);
    const orderCodes = testOrders.map((o) => o.id_order);

    if (orderIds.length > 0) {
      const receipts = await db("payment_receipt")
        .whereIn("id_order", orderCodes)
        .orWhereILike("note", `%${TEST_PREFIX}%`)
        .select("id");
      const receiptIds = receipts.map((r) => r.id);

      if (receiptIds.length > 0) {
        await db("refund_credit_notes").whereIn("payment_receipt_id", receiptIds).del();
        await db("payment_receipt").whereIn("id", receiptIds).del();
      }

      await db("order_list").whereIn("id", orderIds).del();
    }
  };

  let createdDefaultSystem = false;

  beforeAll(async () => {
    await cleanUpTestData();
    const hasDefault = await db("system_automation.systems").where("system_code", "DEFAULT").first();
    if (!hasDefault) {
      await db("system_automation.systems").insert({
        system_code: "DEFAULT",
        system_name: "Default System",
        created_at: new Date(),
      });
      createdDefaultSystem = true;
    }
  });

  afterAll(async () => {
    await cleanUpTestData();
    if (createdDefaultSystem) {
      await db("system_automation.systems").where("system_code", "DEFAULT").del();
    }
  });

  describe("Feature 1: Exact Webhook Match", () => {
    it("should match webhook payment of exact amount and mark order as PAID", async () => {
      testOrderCode = `${TEST_PREFIX}${Date.now()}`;

      // Create test order
      const [inserted] = await db("order_list")
        .insert({
          id_order: testOrderCode,
          price: 250000,
          cost: 150000,
          status: STATUS.UNPAID,
          customer: "Jest Tester",
          contact: "0999999999",
          order_date: new Date(),
        })
        .returning("id");

      testOrderId = Number(inserted.id ?? inserted);

      const payload = {
        id: Date.now(),
        gateway: "MBBank",
        transaction_date: new Date().toISOString().slice(0, 19).replace("T", " "),
        account_number: "0378304963",
        transfer_type: "in",
        transfer_amount: 250000,
        accumulated: 0,
        code: null,
        transaction_content: `MBCT NGO LE NGOC HUNG chuyen tien ${TEST_PREFIX}_${Date.now()}`,
        reference_number: `TXN${Date.now()}2`,
        description: "Exact match test case",
        note: `MBCT NGO LE NGOC HUNG chuyen tien ${TEST_PREFIX}_${Date.now()}`,
      };

      const parsed = parseWebhookTransaction(payload);
      await processWebhookTransactionAsync(payload, parsed);

      // Verify order status updated to PAID
      const updatedOrder = await db("order_list").where({ id: testOrderId }).first();
      expect(updatedOrder.status).toBe(STATUS.PAID);

      // Verify receipt was successfully posted financially
      const receipt = await db("payment_receipt")
        .where({ reference_code: payload.reference_number })
        .first();
      expect(receipt).toBeDefined();
      expect(receipt.id_order).toBe(testOrderCode);
      expect(receipt.is_financial_posted).toBe(true);
      expect(Number(receipt.posted_revenue)).toBe(250000);
    });
  });

  describe("Feature 2: Shortfall Webhook & Manual Classification", () => {
    it("should handle underpaid webhook, keep order UNPAID, and support manual classification to off-flow revenue", async () => {
      const orderCode = `${TEST_PREFIX}${Date.now()}_2`;

      // Create test order
      const [inserted] = await db("order_list")
        .insert({
          id_order: orderCode,
          price: 300000,
          cost: 180000,
          status: STATUS.UNPAID,
          customer: "Jest Tester 2",
          contact: "0888888888",
          order_date: new Date(),
        })
        .returning("id");

      const orderId = Number(inserted.id ?? inserted);

      const payload = {
        id: Date.now() + 5,
        gateway: "MBBank",
        transaction_date: new Date().toISOString().slice(0, 19).replace("T", " "),
        account_number: "0378304963",
        transfer_type: "in",
        transfer_amount: 200000, // Shortfall (200.000 / 300.000)
        accumulated: 0,
        code: null,
        transaction_content: `Chuyen khoan thanh toan don ${orderCode}`,
        reference_number: `TXN${Date.now()}3`,
        description: "Shortfall match test case",
        note: `Chuyen khoan thanh toan don ${orderCode}`,
      };

      const parsed = parseWebhookTransaction(payload);
      await processWebhookTransactionAsync(payload, parsed);

      // Order should remain UNPAID
      const orderAfter = await db("order_list").where({ id: orderId }).first();
      expect(orderAfter.status).toBe(STATUS.UNPAID);

      // Receipt should be created but not posted automatically
      const receipt = await db("payment_receipt")
        .where({ reference_code: payload.reference_number })
        .first();
      expect(receipt).toBeDefined();
      expect(receipt.is_financial_posted).toBe(false);

      // Manually classify receipt as "Doanh thu ngoài luồng"
      const flowType = await db("receipt_flow_types").where({ effect: "off_flow_revenue" }).first();
      expect(flowType).toBeDefined();

      const req = {
        params: { receiptId: String(receipt.id) },
        body: { flowTypeId: String(flowType.id) },
      };

      let jsonResponse = null;
      const res = {
        statusCode: 200,
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(data) {
          jsonResponse = data;
          return this;
        },
      };

      await classifyReceipt(req, res);
      expect(res.statusCode).toBe(200);
      expect(jsonResponse.success).toBe(true);

      // Verify receipt is now posted and off-flow revenue recorded
      const receiptAfter = await db("payment_receipt").where({ id: receipt.id }).first();
      expect(receiptAfter.is_financial_posted).toBe(true);
      expect(Number(receiptAfter.posted_off_flow_bank_receipt)).toBe(200000);

      // Verify credit note was created
      const creditNote = await db("refund_credit_notes").where({ payment_receipt_id: receipt.id }).first();
      expect(creditNote).toBeDefined();
      expect(creditNote.credit_code).toBe(`RFO-RCP-${receipt.id}`);
      expect(Number(creditNote.available_amount)).toBe(200000);
    });
  });

  describe("Feature 3: Unified Financial Accounts & Ledger", () => {
    it("should correctly handle financial_accounts of different types and post ledger entries", async () => {
      // 1. Insert a test bank account
      const [bankAccount] = await db("finance.financial_accounts")
        .insert({
          account_type: "bank",
          bank_display_name: "MBBank",
          account_number: `${TEST_PREFIX}_9999999999`,
          label: `${TEST_PREFIX} Bank Account`,
          account_holder: "Test Holder",
          balance: 1000000,
        })
        .returning("*");

      expect(bankAccount).toBeDefined();
      expect(bankAccount.account_type).toBe("bank");

      // 2. Insert a test USDT wallet
      const [usdtWallet] = await db("finance.financial_accounts")
        .insert({
          account_type: "usdt",
          bank_short_code: "Binance TRC20",
          account_number: `${TEST_PREFIX}_TTestAddressUSDTWallet12345`,
          label: `${TEST_PREFIX} USDT Wallet`,
          balance: 500,
        })
        .returning("*");

      expect(usdtWallet).toBeDefined();
      expect(usdtWallet.account_type).toBe("usdt");

      // 3. Insert ledger entries
      const [ledgerEntry] = await db("finance.financial_account_ledger")
        .insert({
          financial_account_id: bankAccount.id,
          entry_type: "receipt_in",
          amount: 500000,
          signed_amount: 500000,
          balance_after: 1500000,
          source_kind: "payment_receipt",
          source_id: "999",
          note: "Jest test ledger entry",
        })
        .returning("*");

      expect(ledgerEntry).toBeDefined();
      expect(Number(ledgerEntry.amount)).toBe(500000);
      expect(ledgerEntry.financial_account_id).toBe(bankAccount.id);
    });
  });

  describe("Feature 4: Product Key Lifecycle", () => {
    it("should manage key lifecycle states in business.product_keys", async () => {
      // 1. Create a key in 'available' status
      const [key] = await db("business.product_keys")
        .insert({
          account_username: `${TEST_PREFIX}_user_key`,
          key_hash: "mock_hash_value",
          key_hint: "mock_hint",
          system_code: "DEFAULT",
          status: "available",
        })
        .returning("*");

      expect(key).toBeDefined();
      expect(key.status).toBe("available");
      expect(key.order_list_id).toBeNull();

      // 2. Assign the key to an order (transition to 'sold')
      const updatedRows = await db("business.product_keys")
        .where({ id: key.id })
        .update({
          status: "sold",
          order_list_id: testOrderId,
          id_order: testOrderCode,
        })
        .returning("*");

      const updatedKey = updatedRows[0];
      expect(updatedKey.status).toBe("sold");
      expect(Number(updatedKey.order_list_id)).toBe(testOrderId);
      expect(updatedKey.id_order).toBe(testOrderCode);
    });
  });
});
