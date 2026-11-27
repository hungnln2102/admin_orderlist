const express = require("express");

const activationKeyController = require("@/domains/products/controllers/activationKeyController");
const otpPortalDispatcher = require("@/domains/system/services/otpPortalDispatcher");
const { activateKeyWithTransaction } = require("@/domains/products/services/activationKeyService");
const { resolveAdobeRecoveryOrder } = require("../services/adobeOrderSourceService");
const { providerConfig } = require("../providers/providerConfig");
const { fetchYunaAccountOrder, parseYunaReportReason, reportYunaAccountOrder } = require("../providers/yuna2faProvider");
const { classifyFixAdesStatus, fetchFixAdesStatus } = require("../providers/fixAdesStatusProvider");
const { getPortalUrlConfig } = require("../services/portalUrlConfigService");
const { getPublicPriceList } = require("@/domains/products/services/publicPricingService");

const router = express.Router();
const supportMessage = "Vui lòng liên hệ admin.";

router.get("/price-list", async (req, res) => {
  try {
    const data = await getPublicPriceList();
    res.set("Cache-Control", "public, max-age=60");
    return res.json({ success: true, ...data });
  } catch (err) {
    console.error("[Public Price List API] Error:", err.message);
    return res.status(500).json({
      success: false,
      error: "Không thể tải bảng giá sản phẩm.",
      message: "Không thể tải bảng giá sản phẩm.",
    });
  }
});

router.get("/portal-urls", (req, res) => {
  res.set("Cache-Control", "no-store");
  return res.json({ success: true, config: getPortalUrlConfig() });
});

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
    keyCode: proof.code, orderContact: proof.contact, recovery, validateReplacement: validateAdobeSlot,
  });
  return { source: "ades", providerKey: allocation.statusProviderKey, ...allocation };
}

async function checkAdobeAccount(email, providerKey) {
  if (providerKey !== "fix_ades_status" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || "")) return { status_type: "unknown" };
  const result = await fetchFixAdesStatus(email, { config: providerConfig(providerKey) });
  const data = result.rawData;
  const state = classifyFixAdesStatus(data);
  if (state !== "active" && state !== "inactive") return { status_type: state };
  return {
    status: state === "active" ? "ĐANG HOẠT ĐỘNG" : "CẦN CHUYỂN TEAM",
    status_type: state,
    organization: typeof data?.organization?.name === "string" ? data.organization.name : undefined,
  };
}

function validateAdobeSlot({ account, statusProviderKey }) {
  return checkAdobeAccount(account, statusProviderKey).catch(() => ({ status_type: "unknown" }));
}

function isRejectedAdobeStatus(details) {
  return details.status_type === "not_found" || details.status_type === "expired";
}

router.post(["/otp/adobe/recovery/check", "/otp/adobe/recovery/claim"], async (req, res) => {
  res.set("Cache-Control", "no-store");
  const recovery = req.path.endsWith("/claim") ? "claim" : "check";
  const statusOnly = recovery === "check" && req.body?.statusOnly === true;
  try {
    let result = statusOnly
      ? await resolveAdobeRecoveryOrder({ code: req.body?.code, contact: req.body?.contact })
      : await resolveAdobeAccount(req.body, recovery);
    if (statusOnly && result?.source !== "yuna") {
      return res.status(400).json({ success: false, error: supportMessage });
    }
    if (result.contactRequired) return res.json({ success: true, contactRequired: true });
    if (result.replacementRequired || result.outOfStock) {
      return res.json({ success: true, source: result.source, replacementRequired: result.replacementRequired, outOfStock: result.outOfStock });
    }
    if (result.source === "yuna") {
      const response = await fetchYunaAccountOrder(result.providerInput, {
        config: providerConfig(result.providerKey),
        includePassword: !statusOnly,
      });
      const items = response.raw_data?.items;
      const item = items?.[0];
      const account = item?.account_user;
      if (response.error || items?.length !== 1 ||
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account || "")) {
        return res.status(400).json({ success: false, error: supportMessage });
      }
      if (statusOnly) {
        return res.json({ success: true, source: "yuna", data: { report_status: item.report_status } });
      }
      return res.json({
        success: true,
        source: "yuna",
        data: {
          account,
          password: response.account_password,
          plan: typeof item.group === "string" ? item.group : undefined,
          expired_at: typeof item.expires_at_str === "string" ? item.expires_at_str : undefined,
          report_status: item.report_status,
        },
      });
    }
    let account = result.account || result.providerInput;
    let details = result.validatedStatus || await validateAdobeSlot({ account, statusProviderKey: result.providerKey });
    if (isRejectedAdobeStatus(details) && result.packageBacked && result.slotId) {
      const replacement = await activateKeyWithTransaction({
        keyCode: req.body?.code,
        orderContact: req.body?.contact,
        recovery: "replace",
        rejectedSlot: { id: result.slotId, account, reason: details.status_type },
        validateReplacement: validateAdobeSlot,
      });
      if (replacement.outOfStock || replacement.replacementRequired) {
        return res.json({
          success: true, source: "ades",
          replacementRequired: replacement.replacementRequired, outOfStock: replacement.outOfStock,
        });
      }
      result = replacement;
      account = result.account;
      details = result.validatedStatus || await validateAdobeSlot({ account, statusProviderKey: result.statusProviderKey });
    }
    if (isRejectedAdobeStatus(details)) {
      if (result.packageBacked && result.slotId) {
        return res.json({ success: true, source: "ades", replacementRequired: true });
      }
      return res.json({ success: true, source: "ades", data: {
        account, status_type: "unknown",
        status: details.status_type === "expired" ? "ĐÃ HẾT HẠN" : "KHÔNG TÌM THẤY ĐĂNG KÝ",
      } });
    }
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

router.post("/otp/adobe/recovery/report", async (req, res) => {
  res.set("Cache-Control", "no-store");
  const reason = parseYunaReportReason(req.body?.reason, req.body?.details);
  if (!reason) {
    return res.status(400).json({ success: false, error: "Vui lòng chọn lý do báo lỗi hợp lệ." });
  }
  try {
    const result = await resolveAdobeRecoveryOrder({ code: req.body?.code, contact: req.body?.contact });
    if (result?.source !== "yuna" || !result.providerInput) {
      return res.status(400).json({ success: false, error: supportMessage });
    }
    const report_status = await reportYunaAccountOrder(result.providerInput, {
      config: providerConfig(result.providerKey),
      reason,
    });
    return res.json({ success: true, report_status });
  } catch {
    console.warn("[Adobe Recovery] Không xác nhận được yêu cầu báo lỗi Yuna.");
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
    const status = String(result.status || "").trim().toLowerCase();
    if (status !== "success" && status !== "completed" && status !== "done") {
      return res.json({ success: true, ...result });
    }

    const accountStatus = await checkAdobeAccount(email, "fix_ades_status").catch((error) => {
      console.warn("[Adobe Switch Team] Không xác minh được kết quả.", { reason: error.message });
      return null;
    });
    const expectedOrg = String(result.newOrgName || "").trim();
    const actualOrg = String(accountStatus?.organization || "").trim();
    const verified = status === "done"
      ? ["active", "inactive"].includes(accountStatus?.status_type)
      : accountStatus?.status_type === "active" &&
        (!expectedOrg || actualOrg.toLowerCase() === expectedOrg.toLowerCase());
    return res.json({
      ...result,
      success: true,
      status: verified ? "completed" : "verifying",
      ...(verified && { accountResult: { account: email, ...accountStatus } }),
    });
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
