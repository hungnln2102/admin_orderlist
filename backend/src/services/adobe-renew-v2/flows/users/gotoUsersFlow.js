const { gotoUsersPageWithCurrentSession } = require("../../userDeleteActions");

async function runGotoUsersFlow(page) {
  await gotoUsersPageWithCurrentSession(page);
  return { success: true };
}

module.exports = {
  runGotoUsersFlow,
};
