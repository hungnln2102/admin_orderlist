const { chromium } = require("playwright");
const axios = require("axios");
const logger = require("@/utils/logger");
const { getPlaywrightProxyOptions } = require("@/services/renew-adobe/adobe-renew-v2/shared/proxyConfig");
const { getConfigByKey } = require("@/services/externalApiConfigService");

const YUNA_MAIL_DEFAULTS = {
  rulesUrl: "https://mail.yunagrp.com/admin.php?public=rules",
  mailApiUrl: "https://mail.yunagrp.com/api.php",
};

async function getYunaMailConfig() {
  const row = await getConfigByKey("yuna_mail");
  if (row && row.endpoints) {
    return {
      rulesUrl: row.endpoints.rules || YUNA_MAIL_DEFAULTS.rulesUrl,
      mailApiUrl: row.endpoints.mail_api || YUNA_MAIL_DEFAULTS.mailApiUrl,
    };
  }
  return YUNA_MAIL_DEFAULTS;
}

function isSlueOrKaine(email) {
  const domain = String(email || "").split("@")[1]?.toLowerCase();
  return domain === "sluemone.xyz" || domain === "kaineapp.top";
}

function isRilzz(email) {
  const domain = String(email || "").split("@")[1]?.toLowerCase();
  return domain === "rilzz.store";
}

function isHotmailOrOutlook(email) {
  const domain = String(email || "").split("@")[1]?.toLowerCase() || "";
  return /hotmail|outlook|live|msn|passport/i.test(domain);
}

let cachedRules = null;
let lastRulesFetch = 0;

async function getDomainRules() {
  const now = Date.now();
  if (cachedRules && (now - lastRulesFetch < 10 * 60 * 1000)) {
    return cachedRules;
  }
  try {
    const config = await getYunaMailConfig();
    const res = await axios.get(`${config.rulesUrl}&_=${now}`, { timeout: 5000 });
    if (res.data && res.data.success && Array.isArray(res.data.rules)) {
      cachedRules = res.data.rules.filter(r => r && r.enabled !== false);
      lastRulesFetch = now;
      return cachedRules;
    }
  } catch (err) {
    logger.warn(`[yuna-mail-scraper] Lỗi khi tải rules: ${err.message}`);
  }
  
  if (cachedRules) return cachedRules;
  
  // fallback rules
  return [
    { id: "adoobee-biz-id", domain: "adoobee.biz.id", action: "api_local" },
    { id: "graphhub-one", domain: "graphhub.one", action: "api_hdsd" },
    { id: "theristane-me", domain: "theristane.me", action: "api_hdsd" },
    { id: "mkdsz-art", domain: "mkdsz.art", action: "api_hdsd" },
    { id: "fotografia-one", domain: "fotografia.one", action: "api_hdsd" },
    { id: "kfadsmmj30-careers", domain: "kfadsmmj30.careers", action: "api_hdsd" },
    { id: "brightearth-me", domain: "brightearth.me", action: "api_hdsd" },
    { id: "imalydonacademy-tech", domain: "imalydonacademy.tech", action: "api_hdsd" },
    { id: "outlook-com", domain: "outlook.com", action: "redirect_fixed", target: "https://generator.email/adobeyunacode@fatub.org" },
    { id: "hotmail-com", domain: "hotmail.com", action: "redirect_fixed", target: "https://generator.email/adobeyunacode@fatub.org" },
    { id: "rilzz-store", domain: "rilzz.store", action: "redirect_email", target: "https://generator.email/{email_encoded}" },
    { id: "sluemone-xyz", domain: "sluemone.xyz", action: "redirect_email", target: "https://tmail.wibucrypto.pro/mailbox/{email_encoded}" }
  ];
}

async function isSupportedYunaDomain(email) {
  if (!email) return false;
  const cleanEmail = email.trim().toLowerCase();
  
  if (isSlueOrKaine(cleanEmail) || isRilzz(cleanEmail) || isHotmailOrOutlook(cleanEmail)) {
    return true;
  }
  
  const rules = await getDomainRules();
  const domain = cleanEmail.split("@")[1];
  return rules.some(r => r.domain === domain);
}

async function scrapeTmail(email) {
  logger.info(`[yuna-mail-scraper] Cào OTP từ tmail.wibucrypto.pro cho email ${email}`);
  const proxyOptions = getPlaywrightProxyOptions();
  const browser = await chromium.launch({
    headless: process.env.PLAYWRIGHT_HEADLESS !== "false",
    ...proxyOptions,
  });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`https://tmail.wibucrypto.pro/mailbox/${email}`, { waitUntil: "networkidle", timeout: 20000 });
    await page.waitForTimeout(3000);
    
    const messagesLocator = page.locator(".messages > div");
    const count = await messagesLocator.count();
    if (count > 0) {
      const newestMsg = messagesLocator.last();
      await newestMsg.click();
      await page.waitForTimeout(2000);
      
      const iframes = await page.locator("iframe").all();
      for (const iframe of iframes) {
        if (await iframe.isVisible()) {
          const frameElement = await iframe.elementHandle();
          const contentFrame = await frameElement.contentFrame();
          if (contentFrame) {
            const bodyText = await contentFrame.locator("body").innerText();
            const otpRegex = /(?:verification code|mã xác minh|mã xác nhận|code)(?:\s+|:\s*|is|là)+(\d{6})/i;
            const match = bodyText.match(otpRegex);
            if (match) {
              logger.info(`[yuna-mail-scraper] Tìm thấy OTP: ${match[1]}`);
              return match[1];
            }
          }
        }
      }
    }
  } catch (err) {
    logger.warn(`[yuna-mail-scraper] Lỗi khi cào tmail: ${err.message}`);
  } finally {
    await browser.close();
  }
  return null;
}

async function scrapeGeneratorEmail(email, targetSubjectEmail = null) {
  logger.info(`[yuna-mail-scraper] Cào OTP từ generator.email cho email ${email}`);
  const proxyOptions = getPlaywrightProxyOptions();
  const browser = await chromium.launch({
    headless: process.env.PLAYWRIGHT_HEADLESS !== "false",
    ...proxyOptions,
  });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`https://generator.email/${email}`, { waitUntil: "networkidle", timeout: 20000 });
    await page.waitForTimeout(3000);
    
    const otpRegex = /(?:verification code|mã xác minh|mã xác nhận|code)(?:\s+|:\s*|is|là)+(\d{6})/i;
    
    if (targetSubjectEmail) {
      const rows = await page.locator("div#email-table > div").all();
      for (const row of rows) {
        const text = await row.innerText();
        if (text.toLowerCase().includes(targetSubjectEmail.toLowerCase())) {
          await row.click();
          await page.waitForTimeout(2000);
          
          const bodyText = await page.locator("div.mess_bodiyy").innerText().catch(() => "");
          const match = bodyText.match(otpRegex);
          if (match) {
            logger.info(`[yuna-mail-scraper] Tìm thấy OTP cho ${targetSubjectEmail}: ${match[1]}`);
            return match[1];
          }
        }
      }
    } else {
      const emailBody = await page.locator("div.mess_bodiyy").innerText().catch(() => "");
      let match = emailBody.match(otpRegex);
      if (match) {
        logger.info(`[yuna-mail-scraper] Tìm thấy OTP từ email mặc định: ${match[1]}`);
        return match[1];
      }
      
      const firstRow = await page.locator("div#email-table > div").first();
      if (await firstRow.count() > 0) {
        await firstRow.click();
        await page.waitForTimeout(2000);
        const clickedBody = await page.locator("div.mess_bodiyy").innerText().catch(() => "");
        match = clickedBody.match(otpRegex);
        if (match) {
          logger.info(`[yuna-mail-scraper] Tìm thấy OTP từ click hàng đầu tiên: ${match[1]}`);
          return match[1];
        }
      }
    }
  } catch (err) {
    logger.warn(`[yuna-mail-scraper] Lỗi khi cào generator.email: ${err.message}`);
  } finally {
    await browser.close();
  }
  return null;
}

async function scrapeYunaOtp(email) {
  if (!email) return null;
  const cleanEmail = email.trim().toLowerCase();
  const domain = cleanEmail.split("@")[1];
  
  try {
    const rules = await getDomainRules();
    const rule = rules.find(r => r.domain === domain);
    
    if (rule) {
      if (rule.action === "api_local") {
        logger.info(`[yuna-mail-scraper] Đang gọi api_local để lấy OTP cho email ${cleanEmail}`);
        const config = await getYunaMailConfig();
        const res = await axios.get(`${config.mailApiUrl}?email=${encodeURIComponent(cleanEmail)}&_=${Date.now()}`, { timeout: 10000 });
        if (res.data && res.data.status && res.data.data?.latest?.extracted_code) {
          const otp = res.data.data.latest.extracted_code;
          logger.info(`[yuna-mail-scraper] Tìm thấy OTP từ api_local cho ${cleanEmail}: ${otp}`);
          return otp;
        }
        return null;
      } else if (rule.action === "api_hdsd") {
        logger.info(`[yuna-mail-scraper] Đang gọi api_hdsd để lấy OTP cho email ${cleanEmail}`);
        const res = await axios.post("https://otp.hdsd.net/get_otp_api", { email: cleanEmail }, {
          headers: { "Content-Type": "application/json" },
          timeout: 10000
        });
        if (res.data && res.data.status === "success" && Array.isArray(res.data.data) && res.data.data.length > 0) {
          const otp = res.data.data[0].value;
          if (otp) {
            logger.info(`[yuna-mail-scraper] Tìm thấy OTP từ api_hdsd cho ${cleanEmail}: ${otp}`);
            return otp;
          }
        }
        return null;
      } else if (rule.action === "redirect_email" || rule.action === "redirect_fixed") {
        const targetUrl = rule.target || "";
        if (targetUrl.includes("tmail.wibucrypto.pro") || domain === "sluemone.xyz" || domain === "kaineapp.top") {
          return scrapeTmail(cleanEmail);
        }
        if (targetUrl.includes("generator.email")) {
          if (rule.action === "redirect_fixed") {
            const match = targetUrl.match(/generator\.email\/([^?/]+)/);
            const targetMail = match ? match[1] : "adobeyunacode@fatub.org";
            return scrapeGeneratorEmail(targetMail, cleanEmail);
          } else {
            return scrapeGeneratorEmail(cleanEmail);
          }
        }
        return null;
      }
    }
  } catch (err) {
    logger.warn(`[yuna-mail-scraper] Lỗi khi xử lý rules động cho ${cleanEmail}: ${err.message}`);
  }

  // Fallback cho 3 trường hợp gốc
  if (isSlueOrKaine(cleanEmail)) {
    return scrapeTmail(cleanEmail);
  }
  
  if (isRilzz(cleanEmail)) {
    return scrapeGeneratorEmail(cleanEmail);
  }
  
  if (isHotmailOrOutlook(cleanEmail)) {
    return scrapeGeneratorEmail("adobeyunacode@fatub.org", cleanEmail);
  }
  
  logger.info(`[yuna-mail-scraper] Email ${cleanEmail} không thuộc tên miền được hỗ trợ cào tự động.`);
  return null;
}

module.exports = {
  scrapeYunaOtp,
  isSupportedYunaDomain,
  isSlueOrKaine,
  isRilzz,
  isHotmailOrOutlook,
};
