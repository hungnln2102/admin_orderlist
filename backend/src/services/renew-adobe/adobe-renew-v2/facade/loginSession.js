const { chromium } = require("playwright");
const logger = require("../../../../utils/logger");
const { getPlaywrightProxyOptions } = require("../shared/proxyConfig");
const {
  launchSessionFromProfile,
  hasExistingProfileForEmail,
} = require("../shared/profileSession");
const { recordProfileUsage } = require("../shared/profileUsageMetrics");

const buildLaunchOptions = () => {
  const headless = process.env.PLAYWRIGHT_HEADLESS !== "false";
  const proxyOptions = getPlaywrightProxyOptions();
  const launchOptions = {
    headless,
    slowMo: headless ? 0 : 80,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
  };
  if (proxyOptions) launchOptions.proxy = proxyOptions;
  return { headless, proxyOptions, launchOptions };
};

async function openCheckAccountSession(email) {
  const { headless, proxyOptions, launchOptions } = buildLaunchOptions();
  let context = null;
  let page = null;

  if (hasExistingProfileForEmail(email)) {
    try {
      const profileSession = await launchSessionFromProfile({
        adminEmail: email,
        headless,
        proxyOptions,
      });
      context = profileSession.context;
      page = profileSession.page;
      recordProfileUsage({ flow: "check", mode: "profile_hit" });
      logger.info("[adobe-v2] facade.checkAccount: dùng persistent profile");
    } catch (profileErr) {
      recordProfileUsage({ flow: "check", mode: "profile_launch_fail" });
      logger.warn(
        "[adobe-v2] facade.checkAccount: launch profile fail, fallback ephemeral: %s",
        profileErr.message
      );
    }
  } else {
    recordProfileUsage({ flow: "check", mode: "profile_missing" });
    logger.info("[adobe-v2] facade.checkAccount: chưa có profile local, dùng luồng thường");
  }

  if (!context || !page) {
    const browser = await chromium.launch(launchOptions);
    logger.info("[adobe-v2] facade.checkAccount: browser launched OK (ephemeral)");
    context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 720 },
    });
    page = await context.newPage();
    context.__adobeEphemeralBrowser = browser;
    recordProfileUsage({ flow: "check", mode: "ephemeral_fallback" });
  }

  return { context, page };
}

async function closeCheckAccountSession(context) {
  if (!context) return;
  const ephemeralBrowser = context.__adobeEphemeralBrowser || null;
  await context.close().catch(() => {});
  if (ephemeralBrowser) {
    await ephemeralBrowser.close().catch(() => {});
  }
}

module.exports = {
  openCheckAccountSession,
  closeCheckAccountSession,
};
