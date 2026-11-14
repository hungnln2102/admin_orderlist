const { requestProviderApi } = require("./providerRequest");
const { readExternalResponse } = require("@/utils/safeExternalRequest");
const { extractOtpCode } = require("./otpProviderUtils");

function parseUtcToUtc7(rawStr) {
  if (!rawStr) return null;
  const raw = String(rawStr).trim();
  const cleanText = raw.replace(/<[^>]+>/g, '').trim();

  // Chuyển chuỗi định dạng "Sunday, October 25, 2026 4:12:17 AM (UTC+00:00) Monrovia, Reykjavik" sang UTC
  let cleaned = cleanText
    .replace(/^[A-Za-z]+,\s*/, '')
    .replace(/\s*\([^\)]*\).*$/, ' UTC')
    .trim();

  let ts = Date.parse(cleaned);
  if (Number.isNaN(ts)) {
    if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/.test(cleanText)) {
      const iso = cleanText.replace(' ', 'T').replace(/Z?$/, 'Z');
      ts = Date.parse(iso);
    }
  }
  if (Number.isNaN(ts)) {
    ts = Date.parse(cleanText);
  }
  if (Number.isNaN(ts)) return cleanText;

  const d = new Date(ts);
  const formatted = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(d);
  return `${formatted} (UTC+7)`;
}

async function fetchOtpFromVivaRocky(queryInput, { config: configuredConfig, serviceKey = 'vivarocky_household', type = 'household', accessCode = '', includeDetails = false } = {}) {
  if (!queryInput) return { otp: null, extra_fields: [] };

  let email = String(queryInput).trim();
  let code = accessCode;
  if (email.includes('|')) {
    const parts = email.split('|');
    email = parts[0].trim();
    if (!code) code = parts[1].trim();
  } else if (email.includes(':') && !email.startsWith('http')) {
    const parts = email.split(':');
    email = parts[0].trim();
    if (!code) code = parts[1].trim();
  }

  const config = configuredConfig; if (!config) throw new Error("VivaRocky provider configuration is missing.");
  const resolvedType = config.auth_config?.operation || type;
  const timeoutMs = Number(config.auth_config?.timeoutMs) || 15_000;

  let endpoint = '';
  // Nếu base_url chưa chứa .php thì mới cộng thêm endpoint
  if (!config.base_url.includes('.php')) {
    if (resolvedType === 'six_digit') endpoint = config.endpoints?.six_digit || '/six_digit_login.php';
    else if (resolvedType === 'signin_code') endpoint = config.endpoints?.signin || '/signin_code.php';
    else endpoint = config.endpoints?.household || '/household.php';
  }

  const finalAccessCode = code || config.auth_config?.access_code || config.auth_config?.token || 'mvrk56';
  const params = new URLSearchParams();
  if (resolvedType === 'household') params.append('email', email);
  params.append('user_email', email);
  if (resolvedType === 'signin_code' && finalAccessCode) {
    params.append('access_code', finalAccessCode);
  }

  try {
    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    };

    const response = await requestProviderApi(config, {
      method: 'POST',
      endpoint,
      body: params.toString(),
      headers,
      timeoutMs
    });

    if (!response.ok) {
      throw new Error('Viva Rocky returned HTTP ' + response.status);
    }

    const html = await readExternalResponse(response);

    const errorMatch = html.match(/<div[^>]*class=["'][^"']*error-box[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
    let errorMessage = null;
    if (errorMatch) {
      errorMessage = errorMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    }

    const nftokenMatch = html.match(/href=["']([^"']*[?&](?:nftoken|messageGuid)=[^"']+)["']/i);
    const buttonTextMatch = html.match(/<a[^>]+href=["']([^"']+)["'][^>]*>[\s\S]{0,400}?(?:Get\s+Code|Lấy\s+mã|Lay\s+ma|Nhận\s+mã|Nhan\s+ma)[\s\S]{0,200}?<\/a>/i);
    const travelVerifyMatch = html.match(/href=["'](https?:\/\/[^"']*\/(?:account\/travel\/verify|travel\/verify)[^"']*)["']/i);
    const linkMatch =
      nftokenMatch ||
      buttonTextMatch ||
      travelVerifyMatch ||
      html.match(/href=["'](https?:\/\/[^"']*household[^"']*)["']/i) ||
      html.match(/href=["'](https?:\/\/[^"']*netflix[^"']*)["']/i) ||
      html.match(/window\.location\.href\s*=\s*["'](https?:\/\/[^"']+)["']/i);
    const netflixLink = resolvedType === 'household' && linkMatch?.[1]
      ? linkMatch[1].replace(/&amp;/gi, '&').replace(/&#38;/g, '&').replace(/&#x26;/gi, '&').trim()
      : null;

    let sentTime = null;
    if (resolvedType === 'household') {
      const sentMatch = html.match(/(?:<b>\s*)?Sent:\s*(?:<\/b>\s*)?([^\r\n<]+)/i) || html.match(/Sent:\s*([^\r\n<]+)/i);
      if (sentMatch?.[1]) {
        sentTime = parseUtcToUtc7(sentMatch[1].trim());
      } else {
        const dateMatch = html.match(/<p><strong>Date:<\/strong>\s*([^\r\n<]+)<\/p>/i) || html.match(/Date:\s*([^\r\n<]+)/i);
        if (dateMatch?.[1]) {
          sentTime = parseUtcToUtc7(dateMatch[1].trim());
        }
      }
    }

    let foundOtp = null;
    if (resolvedType !== 'household') {
      const successMatch = html.match(/<div[^>]*class=["'][^"']*(?:success-box|result-box|code-box)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
      if (successMatch) {
        foundOtp = extractOtpCode(successMatch[1]);
      }
      if (!foundOtp) {
        const contextualMatch = html.match(/(?:netflix|mã|code|otp|login\s*code)[^0-9]{1,50}(\d{6})/i);
        if (contextualMatch?.[1]) {
          foundOtp = contextualMatch[1];
        }
      }
      if (!foundOtp && resolvedType === 'signin_code') {
        const textContent = html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ');
        const signInCodeMatch = textContent.match(/enter\s+this\s+code\s+to\s+sign\s+in[\s\S]{0,120}?\b(\d{4,8})\b/i);
        if (signInCodeMatch?.[1]) {
          foundOtp = signInCodeMatch[1];
        }
      }
      if (!foundOtp && resolvedType === 'six_digit') {
        const allCodes = html.match(/\b\d{6}\b/g) || [];
        foundOtp = allCodes.find(c => !html.includes('style.css?v=' + c)) || null;
      }
    }

    const extraFields = [];
    if (netflixLink) {
      extraFields.push({
        key: 'netflix_link',
        label: 'Link Cập Nhật Netflix',
        value: netflixLink,
        path: 'netflix_link'
      });
    }
    if (sentTime) {
      extraFields.push({
        key: 'sent_time',
        label: 'Thời gian gửi',
        value: sentTime,
        path: 'sent_time'
      });
    }
    if (foundOtp) {
      extraFields.push({
        key: 'otp',
        label: 'Mã OTP / 6 Số',
        value: String(foundOtp),
        path: 'otp'
      });
    }
    if (errorMessage && !netflixLink && !foundOtp) {
      extraFields.push({
        key: 'server_message',
        label: 'Thông Báo Máy Chủ',
        value: errorMessage,
        path: 'error_box'
      });
    }

    const result = {
      otp: foundOtp,
      netflix_link: netflixLink,
      sent_time: sentTime,
      extra_fields: extraFields,
      error_message: errorMessage,
      raw_data: { html_snippet: html.slice(0, 1000), netflix_link: netflixLink, sent_time: sentTime }
    };

    if (includeDetails) return result;
    return result;
  } catch (err) {
    return {
      otp: null,
      extra_fields: [],
      error: err.message
    };
  }
}

module.exports = { fetchOtpFromVivaRocky, parseUtcToUtc7 };
