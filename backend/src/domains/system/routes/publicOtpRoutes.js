const express = require("express");

const activationKeyController = require("@/domains/products/controllers/activationKeyController");
const otpPortalDispatcher = require("@/domains/system/services/otpPortalDispatcher");
const { activateKeyWithTransaction } = require("@/domains/products/services/activationKeyService");
const { resolveAdobeRecoveryOrder } = require("../services/adobeOrderSourceService");
const { providerConfig } = require("../providers/providerConfig");
const { fetchYunaAccountOrder } = require("../providers/yuna2faProvider");
const { fetchFixAdesStatus } = require("../providers/fixAdesStatusProvider");

const router = express.Router();
const supportMessage = "Vui lòng liên hệ admin.";

router.get("/otp-portal-slots", async (req, res) => {
  try {
    const slots = otpPortalDispatcher.getActiveSlots()
      .filter((slot) => slot.slot_key !== "adobe_account")
      .map((slot) => slot.slot_key === "adobe_check" ? {
        ...slot,
        name: "Adobe — Lấy và kiểm tra tài khoản",
        btn_text: "Lấy và kiểm tra tài khoản",
        input_placeholder: "Nhập mã đơn hoặc mã kích hoạt...",
      } : slot);
    return res.json({ success: true, slots });
  } catch (err) {
    console.error("[Public OTP Slots API] Error:", err.message);
    return res.status(503).json({ success: false, error: err.message, message: "OTP portal configuration is unavailable." });
  }
});

async function dispatchSlot(res, slotKey, input) {
  if (slotKey === "adobe_account") {
    return res.status(400).json({ success: false, error: supportMessage, message: supportMessage });
  }
  try {
    const result = await otpPortalDispatcher.dispatchSlotRequest({ slotKey, input });
    if (result.success === false || result.found === false) {
      console.warn("[Public OTP] Provider không trả kết quả.", {
        slot: slotKey,
        provider: result.service_used,
      });
      return res.json({ success: false, error: supportMessage, message: supportMessage });
    }
    return res.json(result);
  } catch (err) {
    console.warn("[Public OTP] Yêu cầu thất bại.", { slot: slotKey, reason: err.message });
    return res.status(400).json({ success: false, error: supportMessage, message: supportMessage });
  }
}

router.post("/otp/probe-slot", (req, res) => {
  const slotKey = req.body?.slot_key || req.body?.slotKey;
  const input = req.body?.input || req.body?.email || req.body?.secret || req.body?.order_code;
  return dispatchSlot(res, slotKey, input);
});

router.post("/otp/adobe/code", (req, res) => dispatchSlot(res, "adobe_otp", req.body?.email || req.body?.input));
router.post("/otp/adobe/account", (req, res) => dispatchSlot(res, "adobe_account", req.body?.email || req.body?.order_code || req.body?.search || req.body?.input));
router.post(["/otp/adobe/check", "/otp/adobe/status"], (req, res) => dispatchSlot(res, "adobe_check", req.body?.email || req.body?.account || req.body?.search || req.body?.input));

async function resolveAdobeAccount(body, recovery) {
  const proof = { code: body?.code, contact: body?.contact };
  const direct = await resolveAdobeRecoveryOrder(proof);
  if (direct) return direct;
  const allocation = await activateKeyWithTransaction({
    keyCode: proof.code, orderContact: proof.contact, recovery,
  });
  return { source: "ades", providerKey: allocation.statusProviderKey, ...allocation };
}

async function checkAdobeAccount(email, providerKey) {
  if (providerKey !== "fix_ades_status" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || "")) return { status_type: "unknown" };
  const result = await fetchFixAdesStatus(email, { config: providerConfig(providerKey) });
  const data = result.rawData;
  const state = String(data?.organizationStatus?.status || data?.organization_status || data?.status || "").toLowerCase();
  if (result.error || !["active", "inactive"].includes(state)) return { status_type: "unknown" };
  return {
    status: state === "active" ? "ĐANG HOẠT ĐỘNG" : "CẦN CHUYỂN TEAM",
    status_type: state,
    organization: typeof data?.organization?.name === "string" ? data.organization.name : undefined,
  };
}

router.post(["/otp/adobe/recovery/check", "/otp/adobe/recovery/claim"], async (req, res) => {
  res.set("Cache-Control", "no-store");
  const recovery = req.path.endsWith("/claim") ? "claim" : "check";
  try {
    const result = await resolveAdobeAccount(req.body, recovery);
    if (result.contactRequired) return res.json({ success: true, contactRequired: true });
    if (result.replacementRequired || result.outOfStock) {
      return res.json({ success: true, source: result.source, replacementRequired: result.replacementRequired, outOfStock: result.outOfStock });
    }
    if (result.source === "yuna") {
      const response = await fetchYunaAccountOrder(result.providerInput, {
        config: providerConfig(result.providerKey), orderOnly: true,
      });
      const fields = response.extra_fields || [];
      const account = fields.find((field) => field.key === "account_email")?.value;
      if (response.error || response.raw_data?.items?.length !== 1 ||
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account || "")) {
        return res.status(400).json({ success: false, error: supportMessage });
      }
      return res.json({ success: true, source: "yuna", data: { account } });
    }
    const account = result.account || result.providerInput;
    const details = await checkAdobeAccount(account, result.providerKey).catch(() => ({ status_type: "unknown" }));
    return res.json({
      success: true,
      source: "ades",
      replaced: Boolean(result.replaced),
      data: {
        account,
        password: result.password,
        ...details,
        status: details.status || "CHƯA XÁC MINH ĐƯỢC",
      },
    });
  } catch {
    console.warn("[Adobe Recovery] Không lấy được tài khoản.");
    return res.status(400).json({ success: false, error: supportMessage });
  }
});

const switchTeamPendingLocks = new Set();

async function resolveSwitchTeamEmail(body) {
  const result = await resolveAdobeAccount(body, "lookup");
  const email = String(result.account || result.providerInput || "").trim().toLowerCase();
  const requestedEmail = String(body?.email || "").trim().toLowerCase();
  if (result.source !== "ades" || result.providerKey !== "fix_ades_status" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      (requestedEmail && requestedEmail !== email)) {
    throw new Error("Không xác minh được tài khoản.");
  }
  return email;
}

router.post("/otp/adobe/switch-team", async (req, res) => {
  res.set("Cache-Control", "no-store");
  const email = await resolveSwitchTeamEmail(req.body).catch(() => null);
  if (!email) {
    return res.status(400).json({ success: false, error: supportMessage, message: supportMessage });
  }
  if (switchTeamPendingLocks.has(email)) {
    return res.status(429).json({
      success: false,
      error: supportMessage,
      message: supportMessage,
    });
  }
  switchTeamPendingLocks.add(email);
  try {
    const result = await otpPortalDispatcher.requestAdobeSwitchTeam(email);
    return res.json({ success: true, ...result });
  } catch {
    console.warn("[Adobe Switch Team] Yêu cầu thất bại.");
    return res.status(400).json({ success: false, error: supportMessage, message: supportMessage });
  } finally {
    switchTeamPendingLocks.delete(email);
  }
});

router.post("/otp/adobe/switch-team/status", async (req, res) => {
  res.set("Cache-Control", "no-store");
  try {
    const email = await resolveSwitchTeamEmail(req.body);
    const result = await otpPortalDispatcher.getAdobeSwitchTeamStatus(email);
    return res.json({ success: true, ...result });
  } catch {
    console.warn("[Adobe Switch Team] Không đọc được trạng thái.");
    return res.status(400).json({ success: false, error: supportMessage, message: supportMessage });
  }
});

router.post("/otp/activate-key", activationKeyController.publicActivateKey);

router.post("/otp/gpt/account", (req, res) => dispatchSlot(res, "gpt_account", req.body?.email || req.body?.order_code || req.body?.search || req.body?.input));

router.post("/otp/netflix/household", (req, res) => dispatchSlot(res, "netflix_household", req.body?.email || req.body?.input));
router.post("/otp/netflix/six-digit", (req, res) => dispatchSlot(res, "netflix_six_digit", req.body?.email || req.body?.input));
router.post("/otp/netflix/login-otp", (req, res) => dispatchSlot(res, "netflix_login_otp", req.body?.email || req.body?.input));
router.post("/otp/gpt/code", (req, res) => dispatchSlot(res, "gpt_otp", req.body?.email || req.body?.input));
router.post("/otp/2fa/generate", (req, res) => dispatchSlot(res, "two_factor_totp", req.body?.secret || req.body?.email || req.body?.input));

module.exports = router;
