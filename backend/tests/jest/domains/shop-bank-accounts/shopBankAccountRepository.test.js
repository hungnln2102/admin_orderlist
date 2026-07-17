const {
  SHOP_BANK_ACCOUNTS_DEF,
  columns,
  selectColumns,
  COLS,
} = require("@/domains/shop-bank-accounts/repositories/shopBankAccountRepository");

describe("shopBankAccountRepository column mapping", () => {
  test("getDefinition exposes camelCase columns with DB names", () => {
    expect(SHOP_BANK_ACCOUNTS_DEF).not.toBeNull();
    expect(columns.id).toBe("id");
    expect(columns.accountNumber).toBe("account_number");
    expect(columns.isDefault).toBe("is_default");
    expect(columns.totalWithdrawn).toBe("total_withdrawn");
  });

  test("selectColumns map aliases to real column names (not undefined)", () => {
    for (const [alias, dbCol] of Object.entries(selectColumns)) {
      expect(dbCol).toBeDefined();
      expect(String(dbCol)).not.toBe("undefined");
    }
    expect(selectColumns.accountNumber).toBe("account_number");
  });

  test("COLS export remains snake_case for use-cases payloads", () => {
    expect(COLS.ACCOUNT_NUMBER).toBe("account_number");
    expect(COLS.IS_DEFAULT).toBe("is_default");
    expect(COLS.TOTAL_WITHDRAWN).toBe("total_withdrawn");
  });
});
