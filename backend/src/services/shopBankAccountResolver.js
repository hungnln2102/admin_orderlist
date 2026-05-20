/**
 * Lấy STK shop mặc định từ DB; fallback biến môi trường khi chưa migrate / chưa có dữ liệu.
 */

const {
  findDefaultActiveAccount,
} = require("../domains/shop-bank-accounts/repositories/shopBankAccountRepository");

const ENV_FALLBACK = {
  accountNumber: (process.env.ORDER_QR_ACCOUNT_NUMBER || process.env.VITE_ORDER_QR_ACCOUNT_NUMBER || "").trim(),
  accountHolder: (process.env.ORDER_QR_ACCOUNT_NAME || process.env.VITE_ORDER_QR_ACCOUNT_NAME || "").trim(),
  bankBin: (process.env.ORDER_QR_BANK_BIN || process.env.VITE_ORDER_QR_BANK_BIN || "").trim(),
  bankShortCode: (process.env.ORDER_QR_BANK_CODE || process.env.VITE_ORDER_QR_BANK_CODE || "VPB").trim(),
  bankDisplayName: (process.env.ORDER_QR_BANK_NAME || process.env.VITE_ORDER_QR_BANK_NAME || "VP Bank").trim(),
  qrNotePrefix: (process.env.ORDER_QR_NOTE_PREFIX || process.env.VITE_ORDER_QR_NOTE_PREFIX || "").trim(),
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

const mapEnvFallback = () => ({
  id: null,
  label: "ENV",
  accountNumber: ENV_FALLBACK.accountNumber,
  accountHolder: ENV_FALLBACK.accountHolder,
  bankBin: ENV_FALLBACK.bankBin,
  bankShortCode: ENV_FALLBACK.bankShortCode,
  bankDisplayName: ENV_FALLBACK.bankDisplayName,
  qrNotePrefix: ENV_FALLBACK.qrNotePrefix,
  isDefault: true,
  isActive: true,
  source: "env",
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
    // Bảng chưa có hoặc lỗi kết nối — dùng env
  }

  const env = mapEnvFallback();
  if (!env.accountNumber || !env.accountHolder) {
    return env;
  }
  if (!env.bankBin && env.bankShortCode.toUpperCase() === "VPB") {
    env.bankBin = "970432";
  }
  return env;
}

module.exports = {
  resolveDefaultShopBankAccount,
  mapRowToDto,
};
