/**
 * otpPortalDispatcher.js
 * Điều phối xử lý yêu cầu từ các ô input của Web OTP Portal dựa trên cấu hình OTP_PORTAL_SLOTS_CONFIG
 */

const systemConfigService = require("./systemConfigService");
const otpProviderService = require("./otpProviderService");

const DEFAULT_SLOTS = [
  {
    slot_key: "adobe_account",
    name: "Adobe: Tra Cứu Tài Khoản",
    category: "adobe",
    assigned_services: ["yuna_2fa"],
    cooldown_seconds: 15,
    btn_text: "Tra Cứu Thông Tin",
    input_placeholder: "Nhập Email hoặc Mã Đơn Hàng...",
    enabled: true,
  },
  {
    slot_key: "adobe_check",
    name: "Adobe: Kiểm Tra Tài Khoản",
    category: "adobe",
    assigned_services: ["fix_ades_status", "ades", "tinyhost"],
    cooldown_seconds: 15,
    btn_text: "Kiểm Tra Bản Quyền",
    input_placeholder: "Nhập Email tài khoản Adobe cần kiểm tra...",
    enabled: true,
  },
  {
    slot_key: "adobe_otp",
    name: "Adobe: Lấy Mã OTP 6 Số",
    category: "adobe",
    assigned_services: ["ades", "tinyhost"],
    cooldown_seconds: 30,
    btn_text: "Lấy Mã OTP Adobe",
    input_placeholder: "Nhập địa chỉ Email Adobe (VD: user@domain.com)...",
    enabled: true,
  },
  {
    slot_key: "netflix_household",
    name: "Netflix: Link TV / Hộ Gia Đình",
    category: "netflix",
    assigned_services: ["vivarocky_household", "ades", "imap"],
    cooldown_seconds: 45,
    btn_text: "Lấy Link Cập Nhật TV",
    input_placeholder: "Nhập Email tài khoản Netflix...",
    enabled: true,
  },
  {
    slot_key: "netflix_six_digit",
    name: "Netflix: Mã Xác Minh 6 Số",
    category: "netflix",
    assigned_services: ["vivarocky_six_digit", "ades", "tinyhost"],
    cooldown_seconds: 30,
    btn_text: "Lấy Mã 6 Số Netflix",
    input_placeholder: "Nhập Email tài khoản Netflix...",
    enabled: true,
  },
  {
    slot_key: "netflix_login_otp",
    name: "Netflix: OTP Đăng Nhập",
    category: "netflix",
    assigned_services: ["vivarocky_signin", "ades", "imap"],
    cooldown_seconds: 30,
    btn_text: "Lấy OTP Đăng Nhập",
    input_placeholder: "Nhập Email tài khoản Netflix...",
    enabled: true,
  },
  {
    slot_key: "gpt_otp",
    name: "ChatGPT: Mã Xác Minh OpenAI",
    category: "gpt",
    assigned_services: ["warehouse_2fa", "tinyhost"],
    cooldown_seconds: 30,
    btn_text: "Lấy OTP ChatGPT",
    input_placeholder: "Nhập Email tài khoản OpenAI / ChatGPT...",
    enabled: true,
  },
  {
    slot_key: "gpt_account",
    name: "ChatGPT: Tra Cứu Tài Khoản",
    category: "gpt",
    assigned_services: ["package_warehouse", "warehouse_2fa", "yuna_2fa"],
    cooldown_seconds: 15,
    btn_text: "Tra Cứu Tài Khoản",
    input_placeholder: "Nhập Email mua hàng hoặc Mã đơn hàng...",
    enabled: true,
  },
  {
    slot_key: "two_factor_totp",
    name: "2FA: Sinh Mã TOTP",
    category: "2fa",
    assigned_services: ["totp", "yuna_2fa"],
    cooldown_seconds: 10,
    btn_text: "Lấy Mã 2FA (6 Số)",
    input_placeholder: "Nhập Secret Key 2FA (VD: JBSWY3DPEHPK3PXP)...",
    enabled: true,
  },
];

/**
 * Lấy danh sách slots hiện tại từ memory cache / DB và tự động bù đắp slots mới
 */
function getActiveSlots({ allowMissing = false } = {}) {
  const raw = systemConfigService.get("OTP_PORTAL_SLOTS_CONFIG");
  if (raw === null || raw === undefined || raw === "") {
    return allowMissing ? [] : DEFAULT_SLOTS.map((slot) => ({ ...slot, assigned_services: [...slot.assigned_services] }));
  }

  let parsed;
  try {
    parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch (error) {
    throw new Error("OTP_PORTAL_SLOTS_CONFIG_INVALID");
  }

  if (!Array.isArray(parsed)) {
    throw new Error("OTP_PORTAL_SLOTS_CONFIG_INVALID");
  }

  return parsed.map(({ default_service_key: _removedDefault, ...slot }) => slot);
}

/**
 * Xử lý request từ 1 ô input bất kỳ theo slot_key
 */
async function dispatchSlotRequest({ slotKey, input }) {
  if (!slotKey) {
    throw new Error("Thiếu slot_key chức năng.");
  }
  const cleanInput = String(input || "").trim();
  if (!cleanInput) {
    throw new Error("Vui lòng nhập thông tin vào ô kiểm tra.");
  }

  const slots = getActiveSlots();
  const slot = slots.find((s) => s.slot_key === slotKey);
  if (!slot) {
    throw new Error(`Không tìm thấy cấu hình cho ô [${slotKey}].`);
  }

  if (slot.enabled === false) {
    return {
      success: false,
      slot_key: slotKey,
      slot_name: slot.name,
      error: `Chức năng "${slot.name}" hiện đang tạm tắt trên hệ thống.`,
    };
  }

  const rawServices = Array.isArray(slot.assigned_services)
    ? slot.assigned_services
    : [slot.primary_service_key, slot.fallback_service_key];

  const assignedServices = Array.from(
    new Set(
      rawServices
        .filter((service) => typeof service === "string")
        .map((service) => service.trim())
        .filter((service) => service && service !== "none")
    )
  );

  const isTotp = slotKey === "two_factor_totp";
  let matchedRoutingRule = null;
  if (!isTotp) {
    try {
      const productApiService = require("./productApiService");
      matchedRoutingRule = await productApiService.findRoutingProviderForInput({
        slotKey,
        input: cleanInput,
      });
    } catch (err) {
      console.warn(`[OTP Dispatcher] Lỗi kiểm tra quy tắc định tuyến cho [${slotKey}]:`, err.message);
      throw new Error("Không thể xác minh cấu hình tài khoản.");
    }
  }

  if (matchedRoutingRule?.disabled) throw new Error("Chức năng đang tắt cho tài khoản này.");

  const serviceUsed = isTotp && assignedServices.includes("totp")
    ? "totp"
    : String(matchedRoutingRule?.provider_key || "").trim();
  if (!serviceUsed) {
    throw new Error(`Không xác định được provider khớp cấu hình cho ô '${slotKey}'.`);
  }

  // Xác định email thực tế để probe: nếu input là mã đơn hàng, ưu tiên lấy resolved_email từ đơn hàng
  const targetEmail = serviceUsed === "package_warehouse"
    ? cleanInput : matchedRoutingRule?.resolved_email || cleanInput;

  const probeResult = await otpProviderService.probeOtpForEmail({
    email: targetEmail,
    serviceKey: serviceUsed,
    ...(isTotp ? { requiredExecutionMode: "INTERNAL_TOTP" } : {}),
  }).catch((error) => {
    if (isTotp) throw new Error("Không thể sinh mã TOTP bằng cấu hình hiện tại.");
    console.warn(`[OTP Dispatcher] Lỗi cổng [${serviceUsed}]:`, error.message);
    return null;
  });

  let accountData = null;
  if (slotKey.includes("account") || slotKey.includes("check")) {
    const extraFields = probeResult?.extra_fields || [];
    const accEmail =
      extraFields.find((f) => f.key === "account_email" || f.key === "account_username" || f.key === "email")?.value ||
      (targetEmail.includes("@") ? targetEmail : "");
    const pass = extraFields.find((f) => f.key === "password" || f.key === "acc_pass")?.value || "";

    // Phân loại chính xác 3 trạng thái: active | inactive | not_found
    const rawOrgStatus =
      probeResult?.raw_data?.organizationStatus?.status ||
      probeResult?.raw_data?.organization_status ||
      extraFields.find((f) => f.key === "organization_status")?.value;
    const rawStatus =
      probeResult?.raw_data?.status ||
      probeResult?.raw_data?.state ||
      extraFields.find((f) => f.key === "status" || f.key === "account_status")?.value;

    let statusType = "active";
    let statusText = "ĐANG HOẠT ĐỘNG";

    if (!probeResult || probeResult.found === false) {
      statusType = "not_found";
      statusText = "KHÔNG TỒN TẠI";
    } else if (String(rawOrgStatus || "").toLowerCase() === "inactive") {
      statusType = "inactive";
      statusText = "CẦN CHUYỂN TEAM";
    } else if (String(rawOrgStatus || "").toLowerCase() === "active") {
      statusType = "active";
      statusText = "ĐANG HOẠT ĐỘNG";
    } else if (String(rawStatus || "").toLowerCase() === "inactive") {
      statusType = "inactive";
      statusText = "CẦN CHUYỂN TEAM";
    } else if (slotKey === "adobe_check" && String(rawStatus || "").toLowerCase() !== "active") {
      statusType = "unknown";
      statusText = "CHƯA XÁC MINH ĐƯỢC";
    } else {
      statusType = "active";
      statusText = rawStatus ? String(rawStatus).toUpperCase() : "ĐANG HOẠT ĐỘNG";
    }

    const orgName =
      probeResult?.raw_data?.organization?.name ||
      extraFields.find((f) => f.key === "organization_name")?.value ||
      null;
    const orgId =
      probeResult?.raw_data?.organization?.id ||
      extraFields.find((f) => f.key === "organization_id")?.value ||
      null;
    const teamChange =
      probeResult?.raw_data?.teamChange ||
      (extraFields.some((f) => f.key.startsWith("team_change"))
        ? {
            previousName: extraFields.find((f) => f.key === "team_change_previous_name")?.value || null,
            currentName: extraFields.find((f) => f.key === "team_change_current_name")?.value || null,
            changedAt: extraFields.find((f) => f.key === "team_change_changed_at")?.value || null,
          }
        : null);

    const plan =
      probeResult?.raw_data?.plan ||
      probeResult?.raw_data?.subscription ||
      extraFields.find((f) => f.key === "product_plan" || f.key === "plan")?.value ||
      (slotKey.includes("gpt") ? "ChatGPT Plus" : "Adobe CC All Apps");
    const exp =
      probeResult?.raw_data?.expires_at ||
      probeResult?.raw_data?.expired_at ||
      extraFields.find((f) => f.key === "expires_at")?.value ||
      (statusType === "not_found" ? "" : "Theo gói");

    accountData = {
      account: accEmail || cleanInput,
      password: pass,
      plan,
      expired_at: exp,
      status: statusText,
      status_type: statusType,
      organization: orgName,
      organization_id: orgId,
      team_change: teamChange,
    };
  }

  const netflixLink = probeResult?.netflix_link || probeResult?.extra_fields?.find((f) => f.key === "netflix_link")?.value || null;
  const sentTime = probeResult?.sent_time || probeResult?.extra_fields?.find((f) => f.key === "sent_time")?.value || null;

  return {
    success: true,
    slot_key: slotKey,
    slot_name: slot.name,
    service_used: serviceUsed,
    assigned_services: [...new Set([...assignedServices, serviceUsed])],
    default_assigned_services: assignedServices,
    routing_rule: matchedRoutingRule || null,
    attempted_services: [serviceUsed],
    input: isTotp ? null : cleanInput,
    data: accountData,
    otp: probeResult?.otp || null,
    link: netflixLink,
    sent_time: sentTime,
    found: Boolean(probeResult?.found),
    duration_ms: probeResult?.duration_ms || 0,
    extra_fields: probeResult?.extra_fields || [],
    message: probeResult?.message || "Không tìm thấy mã OTP trong hộp thư.",
  };
}

/**
 * Kích hoạt đổi team cho tài khoản Ades (POST /api/credits-pool/public/org-switch)
 */
async function requestAdobeSwitchTeam(email) {
  const cleanEmail = String(email || "").trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes("@")) {
    throw new Error("Vui lòng cung cấp email tài khoản Adobe hợp lệ.");
  }
  const { providerConfig } = require("../providers/providerConfig");
  const { switchOrgAdes } = require("../providers/fixAdesStatusProvider");
  const config = providerConfig("fix_ades_status");
  if (!config) throw new Error("Cấu hình Fix-Ades không tồn tại trên hệ thống.");
  return await switchOrgAdes(cleanEmail, { config });
}

/**
 * Theo dõi tiến trình đổi team Ades (POST /api/credits-pool/public/org-switch/status)
 */
async function getAdobeSwitchTeamStatus(email) {
  const cleanEmail = String(email || "").trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes("@")) {
    throw new Error("Vui lòng cung cấp email tài khoản Adobe hợp lệ.");
  }
  const { providerConfig } = require("../providers/providerConfig");
  const { getSwitchOrgStatusAdes } = require("../providers/fixAdesStatusProvider");
  const config = providerConfig("fix_ades_status");
  if (!config) throw new Error("Cấu hình Fix-Ades không tồn tại trên hệ thống.");
  return await getSwitchOrgStatusAdes(cleanEmail, { config });
}

module.exports = {
  DEFAULT_SLOTS,
  getActiveSlots,
  dispatchSlotRequest,
  requestAdobeSwitchTeam,
  getAdobeSwitchTeamStatus,
};

