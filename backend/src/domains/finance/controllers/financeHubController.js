/**
 * financeHubController.js
 */

const financeHubService = require("../services/financeHubService");

// --- SUMMARY ---
async function getSummary(req, res, next) {
  try {
    const { month, startDate, endDate, period } = req.query;
    const summary = await financeHubService.getFinanceSummary(month, startDate, endDate, period);
    return res.json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
}

async function getUnallocatedReceipts(req, res, next) {
  try {
    const items = await financeHubService.getUnallocatedReceipts();
    return res.json({ success: true, items });
  } catch (error) {
    next(error);
  }
}

// --- FIXED COSTS ---
async function createFixedCost(req, res, next) {
  try {
    const created = await financeHubService.createFixedCost(req.body);
    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    next(error);
  }
}

async function updateFixedCost(req, res, next) {
  try {
    const id = Number(req.params.id);
    const updated = await financeHubService.updateFixedCost(id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, message: "Không tìm thấy chi phí cố định" });
    }
    return res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
}

async function deleteFixedCost(req, res, next) {
  try {
    const id = Number(req.params.id);
    await financeHubService.deleteFixedCost(id);
    return res.json({ success: true, message: "Đã xóa chi phí cố định" });
  } catch (error) {
    next(error);
  }
}

async function getFixedCosts(req, res, next) {
  try {
    const { month } = req.query;
    const items = await financeHubService.getFixedCosts(month);
    return res.json({ success: true, items });
  } catch (error) {
    next(error);
  }
}

async function payFixedCost(req, res, next) {
  try {
    const id = Number(req.params.id);
    const result = await financeHubService.payFixedCost(id, req.body);
    return res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

async function cancelFixedCostPayment(req, res, next) {
  try {
    const id = Number(req.params.id);
    const result = await financeHubService.cancelFixedCostPayment(id, req.body);
    return res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

// --- INSTALLMENTS ---
async function createInstallment(req, res, next) {
  try {
    const created = await financeHubService.createInstallment(req.body);
    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    next(error);
  }
}

async function updateInstallment(req, res, next) {
  try {
    const id = Number(req.params.id);
    const updated = await financeHubService.updateInstallment(id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, message: "Không tìm thấy khoản trả góp" });
    }
    return res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
}

async function deleteInstallment(req, res, next) {
  try {
    const id = Number(req.params.id);
    await financeHubService.deleteInstallment(id);
    return res.json({ success: true, message: "Đã xóa khoản trả góp" });
  } catch (error) {
    next(error);
  }
}

async function payInstallment(req, res, next) {
  try {
    const id = Number(req.params.id);
    const result = await financeHubService.payInstallment(id, req.body);
    return res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

// --- PERSONAL ASSETS ---
async function createPersonalAsset(req, res, next) {
  try {
    const created = await financeHubService.createPersonalAsset(req.body);
    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    next(error);
  }
}

async function updatePersonalAsset(req, res, next) {
  try {
    const id = Number(req.params.id);
    const updated = await financeHubService.updatePersonalAsset(id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, message: "Không tìm thấy tài sản cá nhân" });
    }
    return res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
}

async function deletePersonalAsset(req, res, next) {
  try {
    const id = Number(req.params.id);
    await financeHubService.deletePersonalAsset(id);
    return res.json({ success: true, message: "Đã xóa tài sản cá nhân" });
  } catch (error) {
    next(error);
  }
}

async function payPersonalAsset(req, res, next) {
  try {
    const id = Number(req.params.id);
    const result = await financeHubService.payPersonalAsset(id, req.body);
    return res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

async function borrowPersonalAsset(req, res, next) {
  try {
    const id = Number(req.params.id);
    const result = await financeHubService.borrowPersonalAsset(id, req.body);
    return res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

// --- PERSONAL BALANCE SNAPSHOTS & CIRCULAR STAT ---
async function getPersonalBalanceSnapshots(req, res, next) {
  try {
    const data = await financeHubService.getPersonalBalanceSnapshots();
    return res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function createPersonalBalanceSnapshot(req, res, next) {
  try {
    const created = await financeHubService.createPersonalBalanceSnapshot(req.body);
    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    next(error);
  }
}

async function updatePersonalBalanceSnapshot(req, res, next) {
  try {
    const id = Number(req.params.id);
    const updated = await financeHubService.updatePersonalBalanceSnapshot(id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, message: "Không tìm thấy bản ghi chốt số dư" });
    }
    return res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
}

async function deletePersonalBalanceSnapshot(req, res, next) {
  try {
    const id = Number(req.params.id);
    await financeHubService.deletePersonalBalanceSnapshot(id);
    return res.json({ success: true, message: "Đã xóa bản ghi chốt số dư" });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getSummary,
  getUnallocatedReceipts,
  createFixedCost,
  updateFixedCost,
  deleteFixedCost,
  getFixedCosts,
  payFixedCost,
  cancelFixedCostPayment,
  createInstallment,
  updateInstallment,
  deleteInstallment,
  payInstallment,
  createPersonalAsset,
  updatePersonalAsset,
  deletePersonalAsset,
  payPersonalAsset,
  borrowPersonalAsset,
  getPersonalBalanceSnapshots,
  createPersonalBalanceSnapshot,
  updatePersonalBalanceSnapshot,
  deletePersonalBalanceSnapshot,
};

