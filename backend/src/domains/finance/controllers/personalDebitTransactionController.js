const personalDebitTransactionService = require("../services/personalDebitTransactionService");

function respond(handler, status = 200) {
  return async (req, res, next) => {
    try {
      const result = await handler(req);
      return res.status(status).json({ success: true, data: result });
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = {
  getWorkspace: respond((req) => personalDebitTransactionService.getPersonalDebitWorkspace(req.query)),
  createTransaction: respond((req) => personalDebitTransactionService.createPersonalDebitTransaction(req.body), 201),
  updateTransactionCategory: respond((req) => personalDebitTransactionService.updateTransactionCategory(req.params.id, req.body.categoryId)),
  createCategory: respond((req) => personalDebitTransactionService.createCategory(req.body), 201),
  updateCategory: respond((req) => personalDebitTransactionService.updateCategory(req.params.id, req.body)),
  archiveCategory: respond((req) => personalDebitTransactionService.archiveCategory(req.params.id)),
};
