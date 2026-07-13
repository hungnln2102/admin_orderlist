const logger = require("../../../../utils/logger");
const { runCheckFlow } = require("../runCheckFlow");
const { parseCcpProductIdsFromAlertConfig } = require("../shared/accessChecks");
const { normalizeSavedCookiesFromDb } = require("./cookies");
const {
  openCheckAccountSession,
  closeCheckAccountSession,
} = require("./loginSession");
const { buildCheckAccountResponse } = require("./postCheck");

async function checkAccount(email, password, options = {}) {
  const savedCookiesFromDb = normalizeSavedCookiesFromDb(options.savedCookiesFromDb);
  const cookiesToUse = savedCookiesFromDb?.cookies || [];
  const mailBackupId = options.mailBackupId || null;
  const otpSource = options.otpSource || "imap";
  const existingOrgName =
    options.existingOrgName && String(options.existingOrgName).trim()
      ? String(options.existingOrgName).trim()
      : null;
  const existingUrlAccess =
    options.existingUrlAccess && String(options.existingUrlAccess).trim()
      ? String(options.existingUrlAccess).trim()
      : null;
  const cachedContractActiveLicenseCount =
    Number.isFinite(Number(options.cachedContractActiveLicenseCount))
      ? Number(options.cachedContractActiveLicenseCount)
      : null;
  const forceProductCheck = options.forceProductCheck === true;
  const pinnedFromDb = parseCcpProductIdsFromAlertConfig(options.savedCookiesFromDb);

  let context = null;
  try {
    const session = await openCheckAccountSession(email);
    context = session.context;
    const sharedSession = { context: session.context, page: session.page };

    logger.info("[adobe-v2] facade.checkAccount: chạy runCheckFlow (B1-B13)...");
    const result = await runCheckFlow(email, password, {
      savedCookies: cookiesToUse,
      mailBackupId,
      otpSource,
      sharedSession,
      existingOrgName,
      cachedContractActiveLicenseCount,
      forceProductCheck,
      pinnedCcpProductIds: pinnedFromDb,
    });

    if (!result.success) {
      return { success: false, scrapedData: null, savedCookies: null, error: result.error };
    }

    return buildCheckAccountResponse({
      result,
      sharedSession,
      email,
      password,
      options,
      pinnedFromDb,
      existingUrlAccess,
      forceProductCheck,
      mailBackupId,
      otpSource,
    });
  } catch (error) {
    logger.error("[adobe-v2] facade.checkAccount error: %s\nSTACK: %s", error.message, error.stack);
    return {
      success: false,
      scrapedData: null,
      savedCookies: null,
      error: error.message || "Check thất bại",
      _stack: error.stack,
    };
  } finally {
    await closeCheckAccountSession(context);
  }
}

module.exports = { checkAccount };
