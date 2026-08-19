const axios = require("axios");
const logger = require("@/utils/logger");
const { getConfigByKey } = require("@/services/externalApiConfigService");

const YUNA_2FA_DEFAULTS = {
  baseUrl: "https://hub.yunagrp.com/2fa/",
  defaultToken: "d7c79d236dcb94c2ce0bfb3a10bf68d71ec02d08cfd07882beb4fe9152fb85cb",
};

async function getYunaConfig() {
  const row = await getConfigByKey("yuna_2fa");
  if (row) {
    return {
      baseUrl: row.base_url || YUNA_2FA_DEFAULTS.baseUrl,
      defaultToken: (row.auth_config && row.auth_config.defaultToken) || YUNA_2FA_DEFAULTS.defaultToken,
    };
  }
  return YUNA_2FA_DEFAULTS;
}

/**
 * Lấy động X-API-Token và Cookie từ trang 2fa.
 * Nếu thất bại sẽ trả về token mặc định và không có cookie.
 * @returns {Promise<{token: string, cookie: string|null}>}
 */
async function fetchApiTokenAndCookie() {
  const config = await getYunaConfig();
  const baseUrl = config.baseUrl;
  const fallbackToken = config.defaultToken;
  try {
    const response = await axios.get(baseUrl, {
      timeout: 10000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      },
    });
    const html = response.data;
    const match = html.match(/<meta\s+name=["']api-token["']\s+content=["']([^"']+)["']/i);
    let extractedToken = fallbackToken;
    if (match && match[1]) {
      extractedToken = match[1].trim();
      logger.info("[yuna-otp] Lấy động API Token thành công: %s", extractedToken.slice(0, 8) + "...");
    }

    const setCookie = response.headers["set-cookie"];
    let cookieStr = null;
    if (setCookie && setCookie.length > 0) {
      cookieStr = setCookie.map((c) => c.split(";")[0]).join("; ");
    }

    return { token: extractedToken, cookie: cookieStr };
  } catch (error) {
    logger.warn("[yuna-otp] Lấy động API Token từ %s thất bại: %s. Sẽ dùng token mặc định.", baseUrl, error.message);
  }
  return { token: fallbackToken, cookie: null };
}

/**
 * Tra cứu thông tin mã đơn hàng từ YunaGRP.
 * @param {string} orderCode Mã đơn hàng cần tra cứu.
 * @returns {Promise<{success: boolean, items?: Array, time_left?: number, error?: string}>}
 */
async function fetchYunaOrder(orderCode) {
  if (!orderCode || !String(orderCode).trim()) {
    return { success: false, error: "Mã đơn hàng không hợp lệ." };
  }

  const cleanOrderCode = String(orderCode).trim();
  const { token, cookie } = await fetchApiTokenAndCookie();

  try {
    const params = new URLSearchParams();
    params.append("action", "get_order");
    params.append("order_code", cleanOrderCode);

    const headers = {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-API-Token": token,
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    };
    if (cookie) {
      headers["Cookie"] = cookie;
    }

    const config = await getYunaConfig();
    const response = await axios.post(config.baseUrl, params, {
      timeout: 15000,
      headers,
    });

    const data = response.data;
    if (data && data.success === false) {
      return { success: false, error: data.message || "Không tìm thấy thông tin đơn hàng." };
    }

    return {
      success: true,
      items: data.items || [],
      time_left: data.time_left || 30,
    };
  } catch (error) {
    logger.error("[yuna-otp] Tra cứu mã đơn %s lỗi: %s", cleanOrderCode, error.message);
    return { success: false, error: "Lỗi kết nối tới YunaGRP: " + error.message };
  }
}

/**
 * Báo lỗi tài khoản lên YunaGRP.
 * @param {string} orderCode Mã đơn hàng.
 * @param {string} group Nhóm/sản phẩm (ví dụ: "Adobe Creative Cloud").
 * @param {string} name Email tài khoản báo lỗi.
 * @returns {Promise<{success: boolean, message?: string, error?: string}>}
 */
async function reportYunaError(orderCode, group, name) {
  if (!orderCode || !group || !name) {
    return { success: false, error: "Thiếu thông tin báo lỗi." };
  }

  const cleanOrderCode = String(orderCode).trim();
  const { token, cookie } = await fetchApiTokenAndCookie();

  try {
    const params = new URLSearchParams();
    params.append("action", "report_error");
    params.append("order_code", cleanOrderCode);
    params.append("group", group);
    params.append("name", name);

    const headers = {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-API-Token": token,
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    };
    if (cookie) {
      headers["Cookie"] = cookie;
    }

    const config = await getYunaConfig();
    const response = await axios.post(config.baseUrl, params, {
      timeout: 15000,
      headers,
    });

    const data = response.data;
    if (data && data.success) {
      return { success: true, message: data.message || "Báo cáo lỗi thành công." };
    }
    return { success: false, error: data.message || "Không thể gửi báo cáo lỗi." };
  } catch (error) {
    logger.error("[yuna-otp] Gửi báo lỗi mã đơn %s (%s) lỗi: %s", cleanOrderCode, name, error.message);
    return { success: false, error: "Lỗi kết nối tới YunaGRP khi báo lỗi: " + error.message };
  }
}

module.exports = {
  fetchYunaOrder,
  reportYunaError,
};
