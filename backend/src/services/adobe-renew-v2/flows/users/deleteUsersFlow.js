const { deleteUsersWithExistingPage } = require("../../userDeleteActions");

async function runDeleteUsersFlow(page, userEmails = [], options = {}) {
  const list = Array.isArray(userEmails)
    ? userEmails.map((e) => String(e || "").trim()).filter(Boolean)
    : [];

  const result = await deleteUsersWithExistingPage(page, list);
  const stoppedByPolicy =
    options.stopOnError === true && Array.isArray(result.failed) && result.failed.length > 0;

  return {
    success: !stoppedByPolicy,
    done: result.deleted || [],
    failed: (result.failed || []).map((email) => ({ email, reason: "delete_failed" })),
    stoppedByPolicy,
  };
}

module.exports = {
  runDeleteUsersFlow,
};
