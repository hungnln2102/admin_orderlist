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

const getActivationKeyRules = async (_req, res) => {
  try {
    const rules = await activationKeyService.listActivationKeyRules();
    return res.json({ success: true, data: rules });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, message: "Lỗi tải danh sách cấu hình cấp key" });
  }
};

const saveActivationKeyRule = async (req, res) => {
  try {
    const rule = await activationKeyService.saveActivationKeyRule(req.body, req.params.id);
    return res.status(201).json({ success: true, data: rule, message: "Đã lưu cấu hình cấp key thành công!" });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message, message: err.message });
  }
};

const toggleActivationKeyRule = async (req, res) => {
  try {
    const { id } = req.params;
    const rule = await activationKeyService.toggleActivationKeyRule(id);
    return res.json({ success: true, data: rule, message: "Đã đổi trạng thái cấu hình!" });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message, message: err.message });
  }
};

const deleteActivationKeyRule = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await activationKeyService.deleteActivationKeyRule(id);
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message, message: err.message });
  }
};

const checkMatchingKeyRule = async (req, res) => {
  try {
    const { variantId, supplierId } = req.query;
    const rule = await activationKeyService.findMatchingKeyRule({ variantId, supplierId });
    const previewKey = rule ? activationKeyService.generateOrderActivationKey() : null;
    return res.set("Cache-Control", "no-store").json({
      success: true, matched: Boolean(rule), rule, previewKey,
    });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
};

module.exports = {
  getActivationKeys,
  createActivationKeys,
  revokeActivationKey,
  deleteActivationKey,
  publicActivateKey,
  getActivationKeyRules,
  saveActivationKeyRule,
  toggleActivationKeyRule,
  deleteActivationKeyRule,
  checkMatchingKeyRule,
};

