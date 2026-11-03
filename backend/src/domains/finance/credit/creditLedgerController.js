const creditLedgerService = require("./creditLedgerService");

const asId = (value, name) => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new Error(`${name} không hợp lệ`);
  return id;
};

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
  createAccount: respond((req) => creditLedgerService.createCreditAccount(req.body), 201),
  getAccount: respond((req) => creditLedgerService.getCreditAccountDetail(asId(req.params.id, "accountId"))),
  createRuleVersion: respond((req) => creditLedgerService.addRuleVersion(asId(req.params.id, "accountId"), req.body), 201),
  recordPrincipal: respond(async (req) => {
    const { withTransaction } = require("@/db");
    return withTransaction((trx) => creditLedgerService.recordPrincipalInTrx(trx, asId(req.params.id, "accountId"), req.body));
  }, 201),
  importCardStatement: respond((req) => creditLedgerService.importCreditCardStatement(asId(req.params.id, "accountId"), req.body), 201),
  evaluateCardDueStatements: respond((req) => creditLedgerService.evaluateCreditCardDueStatements(req.body.asOf)),
  recordPayment: respond(async (req) => {
    const { withTransaction } = require("@/db");
    return withTransaction((trx) => creditLedgerService.recordPaymentInTrx(trx, asId(req.params.id, "accountId"), req.body));
  }, 201),
  accrueOverdraft: respond((req) => creditLedgerService.accrueOverdraftInterestForDate(req.body.businessDate)),
  recordOverdraftInterestCollection: respond((req) => creditLedgerService.recordOverdraftInterestCollection(asId(req.params.id, "statementId"), req.body), 201),
  closeOverdraft: respond((req) => creditLedgerService.closeOverdraftStatements(req.body.cycleCloseDate)),
};