/**
 * walletController.js (V2)
 * Express Controller xử lý các request cho Bank Accounts & USDT Wallets
 */
const walletService = require("../services/walletService");

async function getBankAccounts(_req, res) {
  try {
    const items = await walletService.listBankAccounts();
    return res.json({ items });
  } catch (err) {
    console.error("[wallets] getBankAccounts failed:", err);
    return res.status(500).json({ error: err.message || "Không thể tải danh sách tài khoản ngân hàng." });
  }
}

async function createBankAccount(req, res) {
  try {
    const result = await walletService.createBankAccount(req.body);
    return res.status(201).json(result);
  } catch (err) {
    console.error("[wallets] createBankAccount failed:", err);
    return res.status(400).json({ error: err.message || "Không thể tạo tài khoản ngân hàng." });
  }
}

async function updateBankAccount(req, res) {
  try {
    const result = await walletService.updateBankAccount(req.params.id, req.body);
    return res.json(result);
  } catch (err) {
    console.error("[wallets] updateBankAccount failed:", err);
    return res.status(400).json({ error: err.message || "Không thể cập nhật tài khoản ngân hàng." });
  }
}

async function setDefaultBankAccount(req, res) {
  try {
    const result = await walletService.setDefaultBankAccount(req.params.id);
    return res.json(result);
  } catch (err) {
    console.error("[wallets] setDefaultBankAccount failed:", err);
    return res.status(400).json({ error: err.message || "Không thể đặt tài khoản mặc định." });
  }
}

async function deleteBankAccount(req, res) {
  try {
    const result = await walletService.deleteBankAccount(req.params.id);
    return res.json(result);
  } catch (err) {
    console.error("[wallets] deleteBankAccount failed:", err);
    return res.status(400).json({ error: err.message || "Không thể xóa tài khoản." });
  }
}

async function recordBankWithdrawal(req, res) {
  try {
    const { amount, note } = req.body;
    const result = await walletService.recordBankWithdrawal(req.params.id, amount, note);
    return res.json(result);
  } catch (err) {
    console.error("[wallets] recordBankWithdrawal failed:", err);
    return res.status(400).json({ error: err.message || "Không thể thực hiện rút tiền." });
  }
}

// USDT Wallets Controllers

async function getUsdtWallets(_req, res) {
  try {
    const items = await walletService.listUsdtWallets();
    return res.json({ items });
  } catch (err) {
    console.error("[wallets] getUsdtWallets failed:", err);
    return res.status(500).json({ error: err.message || "Không thể tải danh sách ví USDT." });
  }
}

async function createUsdtWallet(req, res) {
  try {
    const result = await walletService.createUsdtWallet(req.body);
    return res.status(201).json(result);
  } catch (err) {
    console.error("[wallets] createUsdtWallet failed:", err);
    return res.status(400).json({ error: err.message || "Không thể tạo ví USDT." });
  }
}

async function updateUsdtWallet(req, res) {
  try {
    const result = await walletService.updateUsdtWallet(req.params.id, req.body);
    return res.json(result);
  } catch (err) {
    console.error("[wallets] updateUsdtWallet failed:", err);
    return res.status(400).json({ error: err.message || "Không thể cập nhật ví USDT." });
  }
}

async function setDefaultUsdtWallet(req, res) {
  try {
    const result = await walletService.setDefaultUsdtWallet(req.params.id);
    return res.json(result);
  } catch (err) {
    console.error("[wallets] setDefaultUsdtWallet failed:", err);
    return res.status(400).json({ error: err.message || "Không thể đặt ví USDT mặc định." });
  }
}

async function deleteUsdtWallet(req, res) {
  try {
    const result = await walletService.deleteUsdtWallet(req.params.id);
    return res.json(result);
  } catch (err) {
    console.error("[wallets] deleteUsdtWallet failed:", err);
    return res.status(400).json({ error: err.message || "Không thể xóa ví USDT." });
  }
}

async function recordUsdtWithdrawal(req, res) {
  try {
    const { amount, note } = req.body;
    const result = await walletService.recordUsdtWithdrawal(req.params.id, amount, note);
    return res.json(result);
  } catch (err) {
    console.error("[wallets] recordUsdtWithdrawal failed:", err);
    return res.status(400).json({ error: err.message || "Không thể ghi nhận rút USDT." });
  }
}

async function getUsdtExchangeRate(_req, res) {
  try {
    const result = await walletService.getUsdtExchangeRate();
    return res.json(result);
  } catch (err) {
    console.error("[wallets] getUsdtExchangeRate failed:", err);
    return res.status(500).json({ error: err.message || "Không thể lấy tỷ giá USDT." });
  }
}

module.exports = {
  getBankAccounts,
  createBankAccount,
  updateBankAccount,
  setDefaultBankAccount,
  deleteBankAccount,
  recordBankWithdrawal,
  getUsdtWallets,
  createUsdtWallet,
  updateUsdtWallet,
  setDefaultUsdtWallet,
  deleteUsdtWallet,
  recordUsdtWithdrawal,
  getUsdtExchangeRate,
};
