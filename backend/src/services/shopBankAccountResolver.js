/**
 * Lấy STK shop mặc định từ DB (shop_bank_accounts).
 */

const {
  findDefaultActiveAccount,
} = require("@/domains/shop-bank-accounts/repositories/shopBankAccountRepository");

const EMPTY_BANK = {
  id: null,
  label: null,
  accountNumber: "",
  accountHolder: "",
  bankBin: "",
  bankShortCode: "",
  bankDisplayName: "",
  qrNotePrefix: "",
  isDefault: false,
  isActive: false,
  source: "none",
};

const mapRowToDto = (row) => ({
  id: row?.id ?? null,
  label: row?.label ?? null,
  accountNumber: String(row?.accountNumber || "").trim(),
  accountHolder: String(row?.accountHolder || "").trim(),
  bankBin: String(row?.bankBin || "").trim(),
  bankShortCode: String(row?.bankShortCode || "").trim(),
  bankDisplayName: String(row?.bankDisplayName || "").trim(),
  qrNotePrefix: String(row?.qrNotePrefix || "").trim(),
  isDefault: !!row?.isDefault,
  isActive: row?.isActive !== false,
  source: "database",
});

/**
 * @returns {Promise<ReturnType<typeof mapRowToDto>>}
 */
async function resolveDefaultShopBankAccount() {
  try {
    const row = await findDefaultActiveAccount();
    if (row?.accountNumber && row?.accountHolder && row?.bankBin) {
      return mapRowToDto(row);
    }
  } catch {
    // Bảng chưa có hoặc lỗi kết nối — trả empty.
  }

  return { ...EMPTY_BANK };
}

module.exports = {
  resolveDefaultShopBankAccount,
  mapRowToDto,
  EMPTY_BANK,
};
