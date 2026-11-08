/**
 * otpPortalDispatcher.js
 * Điều phối xử lý yêu cầu từ các ô input của Web OTP Portal dựa trên cấu hình OTP_PORTAL_SLOTS_CONFIG
 */

const systemConfigService = require("./systemConfigService");
const otpProviderService = require("./otpProviderService");
const totpService = require("./totpService");

const DEFAULT_SLOTS = [
  {
    slot_key: "adobe_otp",
    name: "Adobe: Lấy Mã OTP 6 Số",
    category: "adobe",
    assigned_services: ["fix_ades", "tinyhost"],
    cooldown_seconds: 30,
    btn_text: "Lấy Mã OTP Adobe",
    input_placeholder: "Nhập địa chỉ Email Adobe (VD: user@domain.com)...",
    enabled: true,
  },
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
    slot_key: "netflix_household",
    name: "Netflix: Link TV / Hộ Gia Đình",
    category: "netflix",
    assigned_services: ["vivarocky_household", "fix_ades", "tmail_webmail"],
    cooldown_seconds: 45,
    btn_text: "Lấy Link Cập Nhật TV",
    input_placeholder: "Nhập Email tài khoản Netflix...",
    enabled: true,
  },
  {
    slot_key: "netflix_six_digit",
    name: "Netflix: Mã Xác Minh 6 Số",
    category: "netflix",
    assigned_services: ["vivarocky_six_digit", "fix_ades", "tinyhost"],
    cooldown_seconds: 30,
    btn_text: "Lấy Mã 6 Số Netflix",
    input_placeholder: "Nhập Email tài khoản Netflix...",
    enabled: true,
  },
  {
    slot_key: "netflix_login_otp",
    name: "Netflix: OTP Đăng Nhập",
    category: "netflix",
    assigned_services: ["vivarocky_signin", "fix_ades", "tmail_webmail"],
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
    assigned_services: ["warehouse_2fa", "yuna_2fa"],
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
function getActiveSlots() {
  const raw = systemConfigService.get("OTP_PORTAL_SLOTS_CONFIG");
  let current = DEFAULT_SLOTS;
  if (raw) {
    try {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (Array.isArray(parsed) && parsed.length > 0) {
        current = parsed;
      }
    } catch {}
  }

  // Tự động merge slot mới trong DEFAULT_SLOTS nếu DB chưa có
  const existingKeys = new Set(current.map((s) => s.slot_key));
  const merged = [...current];
  for (const defSlot of DEFAULT_SLOTS) {
    if (!existingKeys.has(defSlot.slot_key)) {
      merged.push(defSlot);
    }
  }
  return merged;
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

  // 1. Đặc biệt: Slot 2FA TOTP (nếu truyền Base32 Secret Key)
  if (slotKey === "two_factor_totp") {
    try {
      const totpRes = totpService.generateTotp(cleanInput);
      return {
        success: true,
        slot_key: slotKey,
        slot_name: slot.name,
        otp: totpRes.code,
        remaining_seconds: totpRes.remainingSeconds,
        service_used: "totp_engine",
        message: `Đã sinh mã 2FA [${totpRes.code}] thành công (còn ${totpRes.remainingSeconds}s)!`,
      };
    } catch {
      // Nếu không phải secret Base32 chuẩn (vd: người dùng nhập mã đơn hàng Yuna), fallback sang API cổng chính
    }
  }

  // 2. Lấy danh sách các cổng API được gán cho ô này
  let serviceChain = [];
  if (Array.isArray(slot.assigned_services) && slot.assigned_services.length > 0) {
    serviceChain = [...slot.assigned_services];
  } else {
    if (slot.primary_service_key) serviceChain.push(slot.primary_service_key);
    if (slot.fallback_service_key && slot.fallback_service_key !== "none" && !serviceChain.includes(slot.fallback_service_key)) {
      serviceChain.push(slot.fallback_service_key);
    }
  }

  if (serviceChain.length === 0) {
    serviceChain = ["fix_ades"];
  }

  let probeResult = null;
  let serviceUsed = serviceChain[0];
  const attemptedServices = [];

  // Quét qua các cổng API được gán cho ô này để lấy mã OTP
  for (let i = 0; i < serviceChain.length; i++) {
    const currentService = serviceChain[i];
    attemptedServices.push(currentService);
    try {
      const probePayload = {
        email: cleanInput,
        serviceKey: currentService,
      };
      if (currentService === "vivarocky") {
        if (slotKey === "netflix_household") {
          probePayload.subType = "household";
        } else if (slotKey === "netflix_six_digit") {
          probePayload.subType = "six_digit";
        } else if (slotKey === "netflix_login_otp") {
          probePayload.subType = "signin_code";
        }
      }
      const res = await otpProviderService.probeOtpForEmail(probePayload);
      if (res && res.found && (res.otp || res.extra_fields?.length > 0)) {
        probeResult = res;
        serviceUsed = currentService;
        break; // Đã tìm thấy OTP từ cổng này, dừng quét
      }
      if (!probeResult || (!probeResult.found && res)) {
        probeResult = res;
        serviceUsed = currentService;
      }
    } catch (err) {
      console.warn(`[OTP Dispatcher] Lỗi cổng [${currentService}]:`, err.message);
    }
  }

  let accountData = null;
  if (slotKey.includes("account")) {
    const extraFields = probeResult?.extra_fields || [];
    const accEmail =
      extraFields.find((f) => f.key === "account_email" || f.key === "account_username")?.value ||
      (cleanInput.includes("@") ? cleanInput : "");
    const pass = extraFields.find((f) => f.key === "password" || f.key === "acc_pass")?.value || "";
    const plan =
      extraFields.find((f) => f.key === "product_plan" || f.key === "plan")?.value ||
      (slotKey.includes("gpt") ? "ChatGPT Plus" : "Adobe CC All Apps");
    const exp = extraFields.find((f) => f.key === "expires_at")?.value || "Theo gói";

    if (probeResult?.found || accEmail || pass) {
      accountData = {
        account: accEmail || cleanInput,
        password: pass,
        plan,
        expired_at: exp,
        status: "ĐANG HOẠT ĐỘNG",
      };
    }
  }

  return {
    success: true,
    slot_key: slotKey,
    slot_name: slot.name,
    service_used: serviceUsed,
    assigned_services: serviceChain,
    attempted_services: attemptedServices,
    input: cleanInput,
    data: accountData,
    otp: probeResult?.otp || null,
    found: Boolean(probeResult?.found),
    duration_ms: probeResult?.duration_ms || 0,
    extra_fields: probeResult?.extra_fields || [],
    message: probeResult?.message || "Không tìm thấy mã OTP trong hộp thư.",
  };
}

/**
 * Đăng ký / Đồng bộ tự động danh sách các ô input từ web otp_portal sang Backend & Admin.
 * Thuật toán Smart Merge:
 * - Bảo toàn 100% các cổng API (assigned_services) và trạng thái (enabled) Master đã cấu hình.
 * - Bổ sung ngay lập tức bất kỳ slot/form mới nào vừa xuất hiện trên otp_portal.
 */
async function registerSlotsFromPortal(incomingSlots = [], updatedBy = "PORTAL_SYNC") {
  if (!Array.isArray(incomingSlots) || incomingSlots.length === 0) {
    return getActiveSlots();
  }

  const currentSlots = getActiveSlots();
  const currentMap = new Map(currentSlots.map((s) => [s.slot_key, s]));
  let hasChanges = false;

  const merged = [...currentSlots];

  for (const slot of incomingSlots) {
    if (!slot || !slot.slot_key) continue;
    if (currentMap.has(slot.slot_key)) {
      // Slot đã có: Cập nhật nhãn và placeholder nếu có thay đổi từ phía UI, giữ nguyên cấu hình cổng API của Master
      const existing = currentMap.get(slot.slot_key);
      let updatedField = false;
      if (slot.name && existing.name !== slot.name) {
        existing.name = slot.name;
        updatedField = true;
      }
      if (slot.input_placeholder && existing.input_placeholder !== slot.input_placeholder) {
        existing.input_placeholder = slot.input_placeholder;
        updatedField = true;
      }
      if (slot.btn_text && existing.btn_text !== slot.btn_text) {
        existing.btn_text = slot.btn_text;
        updatedField = true;
      }
      if (slot.category && existing.category !== slot.category) {
        existing.category = slot.category;
        updatedField = true;
      }
      if (updatedField) hasChanges = true;
    } else {
      // Slot mới xuất hiện trên web otp_portal: Thêm mới vào danh sách!
      const newSlot = {
        slot_key: slot.slot_key,
        name: slot.name || `Ô Input [${slot.slot_key}]`,
        category: slot.category || "otp",
        assigned_services:
          Array.isArray(slot.assigned_services) && slot.assigned_services.length > 0
            ? slot.assigned_services
            : ["warehouse_2fa", "fix_ades"],
        primary_service_key: slot.assigned_services?.[0] || "warehouse_2fa",
        fallback_service_key: slot.assigned_services?.[1] || null,
        cooldown_seconds: Number(slot.cooldown_seconds) || 30,
        btn_text: slot.btn_text || "Lấy Mã Xác Nhận",
        input_placeholder: slot.input_placeholder || "Nhập thông tin cần tra cứu...",
        enabled: slot.enabled !== false,
      };
      merged.push(newSlot);
      currentMap.set(slot.slot_key, newSlot);
      hasChanges = true;
    }
  }

  if (hasChanges) {
    try {
      await systemConfigService.set(
        "OTP_PORTAL_SLOTS_CONFIG",
        JSON.stringify(merged),
        updatedBy
      );
    } catch (err) {
      console.warn("[OTP Dispatcher] Lỗi lưu cấu hình slots sau khi sync:", err.message);
    }
  }

  return merged;
}

module.exports = {
  DEFAULT_SLOTS,
  getActiveSlots,
  dispatchSlotRequest,
  registerSlotsFromPortal,
};

