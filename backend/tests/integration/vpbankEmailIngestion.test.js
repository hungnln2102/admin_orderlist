const crypto = require("crypto");
const test = require("node:test");
const assert = require("node:assert/strict");

const testDatabaseUrl = String(process.env.TEST_DATABASE_URL || "");
const databaseName = testDatabaseUrl ? new URL(testDatabaseUrl).pathname : "";
if (!testDatabaseUrl || !/(^|[_-])test([_-]|$)/i.test(databaseName)) {
  test("VPBank ingestion integration requires TEST_DATABASE_URL with a test database name", { skip: true }, () => {});
} else {
  process.env.DATABASE_URL = testDatabaseUrl;
  require("module-alias/register");
  const { db, TABLES, COLS } = require("@/db");
  const { saveMailboxConfig } = require("@/domains/finance/services/vpbankMailboxConfigService");
  const { ingestEmailMessage } = require("@/domains/finance/services/vpbankEmailIngestionService");

  test("VPBank ingestion uses an isolated database and restores mailbox configuration", async () => {
    const originalKey = process.env.VPBANK_MAILBOX_ENCRYPTION_KEY;
    const configKey = "VPBANK_MAILBOX_CONFIG";
    const originalConfig = await db(TABLES.SYSTEM_CONFIGS).where(COLS.SYSTEM_CONFIGS.CONFIG_KEY, configKey).first();
    let accountId;
    let mappingId;
    try {
      process.env.VPBANK_MAILBOX_ENCRYPTION_KEY = crypto.randomBytes(32).toString("base64");
      await saveMailboxConfig({ email: "test.vpbank@gmail.com", appPassword: "abcd efgh ijkl mnop", isActive: false });
      const [account] = await db(TABLES.FINANCIAL_ACCOUNTS).insert({
        label: "VPBank Ingestion Test 0985", account_type: "bank", account_scope: "PERSONAL",
        account_number: "123445410985", bank_short_code: "VPBANK", balance: 10000000, is_active: true, is_deleted: false,
      }).returning("id");
      accountId = account.id || account;
      const [mapping] = await db(TABLES.BANK_INSTRUMENT_MAPPINGS).insert({
        provider: "VPBANK", instrument_kind: "DEBIT_CARD", masked_suffix: "0985", linked_financial_account_id: accountId, status: "ACTIVE",
      }).returning("id");
      mappingId = mapping.id || mapping;
      const email = {
        uid: 99901, uidValidity: "test-uid-validity", subject: "Thông báo biến động số dư tài khoản thanh toán",
        from: "customercare@care.vpb.com.vn", authenticationResults: "mx.google.com; dkim=pass header.d=care.vpb.com.vn;",
        text: "Tài khoản 4541xxxx0985\nSố tiền: - 1,500,000 VND\nThời gian: 02/11/2026 14:15:00\nMã giao dịch: FT99901",
      };
      const [first, second] = await Promise.all([
        ingestEmailMessage(email, { mailboxAlias: "test.vpbank@gmail.com", uidValidity: "test-uid-validity" }),
        ingestEmailMessage(email, { mailboxAlias: "test.vpbank@gmail.com", uidValidity: "test-uid-validity" }),
      ]);
      assert.equal([first.status, second.status].includes("APPLIED"), true);
      assert.equal(first.alreadyProcessed || second.alreadyProcessed, true);

      const manual = await ingestEmailMessage({
        ...email,
        uid: 99902,
        text: "Tài khoản 4541xxxx0001\nSố tiền: - 100,000 VND\nThời gian: 02/11/2026 14:15:00\nMã giao dịch: FT99902",
      }, { mailboxAlias: "test.vpbank@gmail.com", uidValidity: "test-uid-validity" });
      assert.equal(manual.status, "MANUAL_REVIEW");
      const checkpoint = await db(TABLES.EMAIL_SYNC_CHECKPOINTS).where("mailbox_alias", "test.vpbank@gmail.com").first();
      assert.equal(Number(checkpoint.last_terminal_uid), 99902);

      await ingestEmailMessage({ ...email, uid: 1, uidValidity: "test-uid-validity-2", from: "attacker@example.com" }, {
        mailboxAlias: "test.vpbank@gmail.com", uidValidity: "test-uid-validity-2",
      });
      const resetCheckpoint = await db(TABLES.EMAIL_SYNC_CHECKPOINTS).where("mailbox_alias", "test.vpbank@gmail.com").first();
      assert.equal(resetCheckpoint.uid_validity, "test-uid-validity-2");
      assert.equal(Number(resetCheckpoint.last_terminal_uid), 1);
    } finally {
      await db(TABLES.EMAIL_INGESTION_RECEIPTS).whereIn("email_uid", [99901, 99902, 1]).del();
      if (mappingId) await db(TABLES.BANK_INSTRUMENT_MAPPINGS).where("id", mappingId).del();
      if (accountId) {
        await db(TABLES.PERSONAL_DEBIT_TRANSACTION_LOGS).where("financial_account_id", accountId).del();
        await db(TABLES.FINANCIAL_ACCOUNT_LEDGER).where("financial_account_id", accountId).del();
        await db(TABLES.FINANCIAL_ACCOUNTS).where("id", accountId).del();
      }
      await db(TABLES.EMAIL_SYNC_CHECKPOINTS).where("mailbox_alias", "test.vpbank@gmail.com").del();
      if (originalConfig) await db(TABLES.SYSTEM_CONFIGS).where(COLS.SYSTEM_CONFIGS.CONFIG_KEY, configKey).update({ config_value: originalConfig.config_value, updated_at: db.fn.now() });
      else await db(TABLES.SYSTEM_CONFIGS).where(COLS.SYSTEM_CONFIGS.CONFIG_KEY, configKey).del();
      if (originalKey === undefined) delete process.env.VPBANK_MAILBOX_ENCRYPTION_KEY;
      else process.env.VPBANK_MAILBOX_ENCRYPTION_KEY = originalKey;
      await db.destroy();
    }
  });
}


