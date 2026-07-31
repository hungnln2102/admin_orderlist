const { chromium } = require("playwright");
const logger = require("@/utils/logger");
const { getPlaywrightProxyOptions } = require("@/services/renew-adobe/adobe-renew-v2/shared/proxyConfig");

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
  const cleanEmail = email.trim();
  
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
  isSlueOrKaine,
  isRilzz,
  isHotmailOrOutlook,
};
