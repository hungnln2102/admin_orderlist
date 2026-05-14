const { logger, assignUserToAvailableAccount, fixUsersAllRoundsTightest, fixUserExpectableErrorMessage } = require("./shared");

const fixSingleUser = async (req, res) => {
  const userEmail = (req.body?.email || "").toString().trim().toLowerCase();
  if (!userEmail) {
    return res.status(400).json({ error: "Thiếu email." });
  }

  try {
    const assigned = await assignUserToAvailableAccount(userEmail);

    if (assigned.alreadyOnAdobe) {
      return res.json({
        success: true,
        already_on_adobe: true,
        message: `User đã có trên admin ${assigned.accountEmail} (đã làm mới tracking).`,
        accountId: assigned.accountId,
        accountEmail: assigned.accountEmail,
        profile: assigned.profileName ?? "—",
      });
    }

    return res.json({
      success: true,
      message: `Đã gán ${userEmail} vào ${assigned.accountEmail}.`,
      accountId: assigned.accountId,
      accountEmail: assigned.accountEmail,
      profile: assigned.profileName ?? "—",
    });
  } catch (err) {
    const msg = err?.message || String(err);
    const expectable = fixUserExpectableErrorMessage(msg);
    (expectable ? logger.warn : logger.error)("[renew-adobe] fixSingleUser failed", {
      email: userEmail,
      error: msg,
    });
    return res.status(expectable ? 409 : 500).json({
      success: false,
      error: msg,
    });
  }
};

const fixUsersRound = async (req, res) => {
  const emailsRaw = req.body?.emails;
  if (!Array.isArray(emailsRaw)) {
    return res.status(400).json({
      success: false,
      error: "Thiếu emails (mảng).",
      remaining_emails: [],
    });
  }

  try {
    const result = await fixUsersAllRoundsTightest(emailsRaw);
    return res.json(result);
  } catch (err) {
    logger.error("[renew-adobe] fixUsersRound failed", { error: err.message });
    return res.status(500).json({
      success: false,
      error: err.message,
      added_count: 0,
      total_added: 0,
      remaining_emails: emailsRaw,
      rounds: [],
    });
  }
};

const adobeQueueStatus = (_req, res) => {
  return res.json({
    running: 0,
    queued: 0,
    maxConcurrent: 10,
    maxQueueSize: 100,
  });
};

module.exports = {
  fixSingleUser,
  fixUsersRound,
  adobeQueueStatus,
};
