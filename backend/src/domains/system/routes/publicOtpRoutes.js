const express = require("express");

const activationKeyController = require("@/domains/products/controllers/activationKeyController");
const activationKeyService = require("@/domains/products/services/activationKeyService");
const otpPortalDispatcher = require("@/domains/system/services/otpPortalDispatcher");

const router = express.Router();

router.get("/otp-portal-slots", async (req, res) => {
  try {
    const slots = otpPortalDispatcher.getActiveSlots();
    return res.json({ success: true, slots });
  } catch (err) {
    console.error("[Public OTP Slots API] Error:", err.message);
    return res.status(503).json({ success: false, error: err.message, message: "OTP portal configuration is unavailable." });
  }
});

router.post(["/otp-portal-slots/register", "/otp-portal-slots/sync"], async (req, res) => {
  try {
    const incomingSlots = req.body?.slots || req.body;
    const updatedBy = req.session?.user?.username || "PORTAL_SYNC";
    const mergedSlots = await otpPortalDispatcher.registerSlotsFromPortal(incomingSlots, updatedBy);
    return res.json({
      success: true,
      message: `Đã đồng bộ ${mergedSlots.length} ô input từ Web OTP Portal thành công!`,
      slots: mergedSlots,
    });
  } catch (err) {
    console.error("[Public OTP Slots Sync API] Error:", err.message);
    return res.status(400).json({ success: false, error: err.message, message: err.message });
  }
});

async function dispatchSlot(res, slotKey, input) {
  try {
    return res.json(await otpPortalDispatcher.dispatchSlotRequest({ slotKey, input }));
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
}

router.post("/otp/probe-slot", async (req, res) => {
  try {
    const slotKey = req.body?.slot_key || req.body?.slotKey;
    const input = req.body?.input || req.body?.email || req.body?.secret || req.body?.order_code;
    return res.json(await otpPortalDispatcher.dispatchSlotRequest({ slotKey, input }));
  } catch (err) {
    console.error("[Public OTP Probe API] Error:", err.message);
    return res.status(400).json({ success: false, error: err.message, message: err.message });
  }
});

router.post("/otp/adobe/code", (req, res) => dispatchSlot(res, "adobe_otp", req.body?.email || req.body?.input));
router.post("/otp/adobe/account", (req, res) => dispatchSlot(res, "adobe_account", req.body?.email || req.body?.order_code || req.body?.search || req.body?.input));
router.post(["/otp/adobe/check", "/otp/adobe/status"], (req, res) => dispatchSlot(res, "adobe_check", req.body?.email || req.body?.account || req.body?.search || req.body?.input));

const switchTeamPendingLocks = new Set();

router.post("/otp/adobe/switch-team", async (req, res) => {
  const email = String(req.body?.email || req.body?.input || "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return res.status(400).json({ success: false, error: "Vui lòng cung cấp email hợp lệ.", message: "Vui lòng cung cấp email hợp lệ." });
  }
  if (switchTeamPendingLocks.has(email)) {
    return res.status(429).json({
      success: false,
      error: "Yêu cầu chuyển team cho email này đang được xử lý.",
      message: "Yêu cầu chuyển team cho email này đang được xử lý.",
    });
  }
  switchTeamPendingLocks.add(email);
  try {
    const result = await otpPortalDispatcher.requestAdobeSwitchTeam(email);
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message, message: err.message });
  } finally {
    switchTeamPendingLocks.delete(email);
  }
});

router.post("/otp/adobe/switch-team/status", async (req, res) => {
  try {
    const email = req.body?.email || req.body?.input;
    const result = await otpPortalDispatcher.getAdobeSwitchTeamStatus(email);
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message, message: err.message });
  }
});

router.post("/otp/activate-key", activationKeyController.publicActivateKey);

router.post("/otp/gpt/account", async (req, res) => {
  try {
    const input = req.body?.email || req.body?.order_code || req.body?.search || req.body?.input;
    if (input && String(input).includes("-")) {
      try {
        const keyResult = await activationKeyService.activateKeyWithTransaction({
          keyCode: input,
          customerInfo: req.body?.email || req.body?.customer || "",
        });
        if (keyResult?.account) {
          return res.json({
            success: true,
            data: {
              account: keyResult.account,
              password: keyResult.password,
              plan: "ChatGPT Plus",
              status: "ĐANG HOẠT ĐỘNG",
              note: keyResult.message,
            },
            message: keyResult.message,
          });
        }
      } catch (keyErr) {
        if (!keyErr.message.includes("không tồn tại")) {
          return res.status(400).json({ success: false, error: keyErr.message });
        }
      }
    }
    return dispatchSlot(res, "gpt_account", input);
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

router.post("/otp/netflix/household", (req, res) => dispatchSlot(res, "netflix_household", req.body?.email || req.body?.input));
router.post("/otp/netflix/six-digit", (req, res) => dispatchSlot(res, "netflix_six_digit", req.body?.email || req.body?.input));
router.post("/otp/netflix/login-otp", (req, res) => dispatchSlot(res, "netflix_login_otp", req.body?.email || req.body?.input));
router.post("/otp/gpt/code", (req, res) => dispatchSlot(res, "gpt_otp", req.body?.email || req.body?.input));
router.post("/otp/2fa/generate", (req, res) => dispatchSlot(res, "two_factor_totp", req.body?.secret || req.body?.email || req.body?.input));

module.exports = router;