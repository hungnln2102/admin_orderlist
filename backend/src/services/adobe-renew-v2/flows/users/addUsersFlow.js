const { addUsersToOrgViaUI } = require("../../userAddActions");

async function runAddUsersFlow(page, userEmails = [], options = {}) {
  const list = Array.isArray(userEmails)
    ? userEmails.map((e) => String(e || "").trim().toLowerCase()).filter(Boolean)
    : [];
  const result = await addUsersToOrgViaUI(page, list);

  const failed = (result.failed || []).map((email) => ({
    email,
    reason: "add_failed",
  }));

  const stoppedByPolicy =
    options.stopOnError === true && failed.length > 0;

  return {
    success: !!result.success && !stoppedByPolicy,
    done: result.added || [],
    failed,
    stoppedByPolicy,
  };
}

module.exports = {
  runAddUsersFlow,
};
