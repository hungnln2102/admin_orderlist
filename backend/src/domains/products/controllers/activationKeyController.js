const activationKeyService = require("../services/activationKeyService");

const getActivationKeys = async (req, res) => {
  try {
    const result = await activationKeyService.listActivationKeys(req.query);
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, message: "Lỗi tải danh sách mã kích hoạt" });
  }
};

const createActivationKeys = async (req, res) => {
  try {
    const items = await activationKeyService.createActivationKeys(req.body, req.user);
    return res.status(201).json({
      success: true,
      data: items,
      count: items.length,
      message: `Đã tạo thành công ${items.length} mã kích hoạt!`,
    });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message, message: err.message });
  }
};

const revokeActivationKey = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};
    const updated = await activationKeyService.revokeActivationKey(id, reason);
    return res.json({
      success: true,
      data: updated,
      message: `Đã thu hồi mã key #${id} thành công!`,
    });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message, message: err.message });
  }
};

const deleteActivationKey = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await activationKeyService.deleteActivationKey(id);
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message, message: err.message });
  }
};

const publicActivateKey = async (req, res) => {
  try {
    const keyCode = req.body?.key || req.body?.keyCode || req.body?.search || req.body?.code;
    const customerInfo = req.body?.customer || req.body?.email || req.body?.contact || "";
    const result = await activationKeyService.activateKeyWithTransaction({ keyCode, customerInfo });
    return res.json(result);
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: err.message,
      message: err.message || "Lỗi khi kích hoạt mã key.",
    });
  }
};

module.exports = {
  getActivationKeys,
  createActivationKeys,
  revokeActivationKey,
  deleteActivationKey,
  publicActivateKey,
};

