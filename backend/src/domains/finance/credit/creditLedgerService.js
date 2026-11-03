const { TABLES, COLS, withTransaction } = require("@/db");

const PRODUCT_KINDS = new Set(["CREDIT_CARD", "OVERDRAFT"]);
const PAYMENT_BUCKETS = ["FEE", "POSTED_INTEREST", "REVOLVING_PRINCIPAL", "GRACE_PRINCIPAL"];

const asNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const asMoney = (value, roundingPolicy) => {
  const number = asNumber(value);
  if (roundingPolicy === "DOWN") return Math.floor(number);
  return Math.round(number);
};

const asDateString = (value, name) => {
  const date = String(value || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`${name} phải có dạng YYYY-MM-DD`);
  return date;
};

const asEffectiveAt = (value, name = "effectiveAt") => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`${name} không hợp lệ`);
  return date;
};

function normalizeRule(productKind, config) {
  const rule = config && typeof config === "object" ? { ...config } : {};
  const closeDay = Number(rule.statementCloseDay);
  if (!Number.isInteger(closeDay) || closeDay < 1 || closeDay > 31) throw new Error("statementCloseDay phải từ 1 đến 31");
  if (!rule.timezone) throw new Error("timezone là bắt buộc");
  if (!rule.roundingPolicy || !["HALF_UP", "DOWN", "BANK_STATEMENT"].includes(rule.roundingPolicy)) {
    throw new Error("roundingPolicy không hợp lệ");
  }

  if (productKind === "OVERDRAFT") {
    const annualRatePercent = asNumber(rule.annualRatePercent);
    const dayCountBasis = Number(rule.dayCountBasis);
    if (!/^\d{2}:\d{2}$/.test(String(rule.dailyCutoffTime || ""))) throw new Error("dailyCutoffTime phải có dạng HH:mm");
    if (!Number.isInteger(rule.interestCollectionDay) || rule.interestCollectionDay < 1 || rule.interestCollectionDay > 31) {
      throw new Error("interestCollectionDay phải từ 1 đến 31");
    }
    if (annualRatePercent <= 0 || ![365, 366].includes(dayCountBasis)) {
      throw new Error("Thấu chi cần annualRatePercent và dayCountBasis hợp lệ");
    }
  }

  return rule;
}

function getCycleStart(businessDate, statementCloseDay) {
  const [year, month, day] = businessDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (day > statementCloseDay) date.setUTCDate(statementCloseDay);
  else date.setUTCMonth(date.getUTCMonth() - 1, statementCloseDay);
  return date.toISOString().slice(0, 10);
}

function getCollectionDate(cycleCloseDate, collectionDay) {
  const [year, month] = cycleCloseDate.split("-").map(Number);
  const daysInCollectionMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const collection = new Date(Date.UTC(year, month, Math.min(collectionDay, daysInCollectionMonth)));
  return collection.toISOString().slice(0, 10);
}

function buildBangkokCutoff(businessDate, cutoffTime) {
  return new Date(`${businessDate}T${cutoffTime}:00+07:00`);
}

async function getAccountInTrx(trx, accountId, lock = false) {
  let query = trx(TABLES.CREDIT_ACCOUNTS).where(COLS.CREDIT_ACCOUNTS.ID, accountId);
  if (lock) query = query.forUpdate();
  const account = await query.first();
  if (!account) throw new Error("Không tìm thấy credit account");
  return account;
}

async function getCurrentRuleInTrx(trx, account, lock = false) {
  let query = trx(TABLES.CREDIT_ACCOUNT_RULE_VERSIONS)
    .where(COLS.CREDIT_ACCOUNT_RULE_VERSIONS.ACCOUNT_ID, account.id)
    .where(COLS.CREDIT_ACCOUNT_RULE_VERSIONS.VERSION, account.current_rule_version);
  if (lock) query = query.forUpdate();
  const rule = await query.first();
  if (!rule) throw new Error("Thiếu rule version hiện hành của credit account");
  return rule;
}

async function getAccountForPersonalAssetInTrx(trx, personalAssetId, lock = false) {
  let query = trx(TABLES.CREDIT_ACCOUNTS).where(COLS.CREDIT_ACCOUNTS.PERSONAL_ASSET_ID, personalAssetId);
  if (lock) query = query.forUpdate();
  return query.first();
}

async function getBalancesInTrx(trx, accountId, effectiveAt = null) {
  const query = trx(TABLES.CREDIT_ACCOUNT_LEDGER).where(COLS.CREDIT_ACCOUNT_LEDGER.ACCOUNT_ID, accountId);
  if (effectiveAt) query.where(COLS.CREDIT_ACCOUNT_LEDGER.EFFECTIVE_AT, "<=", effectiveAt);
  const result = await query
    .sum({ principal: COLS.CREDIT_ACCOUNT_LEDGER.PRINCIPAL_DELTA, interest: COLS.CREDIT_ACCOUNT_LEDGER.INTEREST_DELTA, fee: COLS.CREDIT_ACCOUNT_LEDGER.FEE_DELTA })
    .first();
  const principal = asNumber(result?.principal);
  const interest = asNumber(result?.interest);
  const fee = asNumber(result?.fee);
  return { principal, interest, fee, total: principal + interest + fee };
}

async function insertLedgerInTrx(trx, input) {
  const existing = await trx(TABLES.CREDIT_ACCOUNT_LEDGER)
    .where(COLS.CREDIT_ACCOUNT_LEDGER.ACCOUNT_ID, input.accountId)
    .where(COLS.CREDIT_ACCOUNT_LEDGER.IDEMPOTENCY_KEY, input.idempotencyKey)
    .first();
  if (existing) return { ledger: existing, alreadyProcessed: true };

  const [ledger] = await trx(TABLES.CREDIT_ACCOUNT_LEDGER).insert({
    [COLS.CREDIT_ACCOUNT_LEDGER.ACCOUNT_ID]: input.accountId,
    [COLS.CREDIT_ACCOUNT_LEDGER.STATEMENT_ID]: input.statementId || null,
    [COLS.CREDIT_ACCOUNT_LEDGER.EVENT_TYPE]: input.eventType,
    [COLS.CREDIT_ACCOUNT_LEDGER.BUCKET]: input.bucket,
    [COLS.CREDIT_ACCOUNT_LEDGER.PRINCIPAL_DELTA]: input.principalDelta || 0,
    [COLS.CREDIT_ACCOUNT_LEDGER.INTEREST_DELTA]: input.interestDelta || 0,
    [COLS.CREDIT_ACCOUNT_LEDGER.FEE_DELTA]: input.feeDelta || 0,
    [COLS.CREDIT_ACCOUNT_LEDGER.EFFECTIVE_AT]: input.effectiveAt,
    [COLS.CREDIT_ACCOUNT_LEDGER.SOURCE_REFERENCE]: input.sourceReference || null,
    [COLS.CREDIT_ACCOUNT_LEDGER.IDEMPOTENCY_KEY]: input.idempotencyKey,
    [COLS.CREDIT_ACCOUNT_LEDGER.METADATA]: input.metadata || {},
  }).returning("*");
  return { ledger, alreadyProcessed: false };
}

async function createCreditAccount(payload) {
  const productKind = String(payload.productKind || "");
  if (!PRODUCT_KINDS.has(productKind)) throw new Error("productKind không hợp lệ");
  const rule = normalizeRule(productKind, payload.rule);
  const displayName = String(payload.displayName || "").trim();
  if (!displayName) throw new Error("displayName là bắt buộc");

  return withTransaction(async (trx) => {
    const personalAssetId = payload.personalAssetId ? Number(payload.personalAssetId) : null;
    if (personalAssetId) {
      const asset = await trx(TABLES.PERSONAL_ASSETS).where(COLS.PERSONAL_ASSETS.ID, personalAssetId).forUpdate().first();
      if (!asset || asset.type !== "DEBT_PAYABLE") throw new Error("personalAssetId phải là một khoản DEBT_PAYABLE tồn tại");
    }

    const [account] = await trx(TABLES.CREDIT_ACCOUNTS).insert({
      [COLS.CREDIT_ACCOUNTS.PERSONAL_ASSET_ID]: personalAssetId,
      [COLS.CREDIT_ACCOUNTS.PRODUCT_KIND]: productKind,
      [COLS.CREDIT_ACCOUNTS.BANK_NAME]: payload.bankName ? String(payload.bankName).trim() : null,
      [COLS.CREDIT_ACCOUNTS.DISPLAY_NAME]: displayName,
      [COLS.CREDIT_ACCOUNTS.TIMEZONE]: rule.timezone,
      [COLS.CREDIT_ACCOUNTS.STATUS]: "ACTIVE",
      [COLS.CREDIT_ACCOUNTS.CURRENT_RULE_VERSION]: 1,
    }).returning("*");

    await trx(TABLES.CREDIT_ACCOUNT_RULE_VERSIONS).insert({
      [COLS.CREDIT_ACCOUNT_RULE_VERSIONS.ACCOUNT_ID]: account.id,
      [COLS.CREDIT_ACCOUNT_RULE_VERSIONS.VERSION]: 1,
      [COLS.CREDIT_ACCOUNT_RULE_VERSIONS.EFFECTIVE_AT]: payload.effectiveAt ? asEffectiveAt(payload.effectiveAt) : new Date(),
      [COLS.CREDIT_ACCOUNT_RULE_VERSIONS.CONFIG]: rule,
      [COLS.CREDIT_ACCOUNT_RULE_VERSIONS.EVIDENCE_REFERENCE]: payload.evidenceReference || null,
    });

    if (asNumber(payload.openingPrincipal) > 0) {
      await insertLedgerInTrx(trx, {
        accountId: account.id,
        eventType: "OPENING_BALANCE",
        bucket: productKind === "OVERDRAFT" ? "REVOLVING_PRINCIPAL" : "GRACE_PRINCIPAL",
        principalDelta: asNumber(payload.openingPrincipal),
        effectiveAt: payload.effectiveAt ? asEffectiveAt(payload.effectiveAt) : new Date(),
        idempotencyKey: `opening:${account.id}`,
        sourceReference: payload.evidenceReference,
        metadata: { unverifiedOpeningBalance: true },
      });
    }

    return account;
  });
}

async function addRuleVersion(accountId, payload) {
  return withTransaction(async (trx) => {
    const account = await getAccountInTrx(trx, accountId, true);
    const rule = normalizeRule(account.product_kind, payload.rule);
    const version = Number(account.current_rule_version) + 1;
    const [created] = await trx(TABLES.CREDIT_ACCOUNT_RULE_VERSIONS).insert({
      [COLS.CREDIT_ACCOUNT_RULE_VERSIONS.ACCOUNT_ID]: account.id,
      [COLS.CREDIT_ACCOUNT_RULE_VERSIONS.VERSION]: version,
      [COLS.CREDIT_ACCOUNT_RULE_VERSIONS.EFFECTIVE_AT]: asEffectiveAt(payload.effectiveAt || new Date()),
      [COLS.CREDIT_ACCOUNT_RULE_VERSIONS.CONFIG]: rule,
      [COLS.CREDIT_ACCOUNT_RULE_VERSIONS.EVIDENCE_REFERENCE]: payload.evidenceReference || null,
    }).returning("*");
    await trx(TABLES.CREDIT_ACCOUNTS).where(COLS.CREDIT_ACCOUNTS.ID, account.id).update({
      [COLS.CREDIT_ACCOUNTS.CURRENT_RULE_VERSION]: version,
      [COLS.CREDIT_ACCOUNTS.UPDATED_AT]: trx.fn.now(),
    });
    return created;
  });
}

async function recordPrincipalInTrx(trx, accountId, payload) {
  const account = await getAccountInTrx(trx, accountId, true);
  const amount = asNumber(payload.amount);
  if (amount <= 0) throw new Error("amount phải lớn hơn 0");
  const eventType = String(payload.eventType || "");
  const allowed = account.product_kind === "OVERDRAFT" ? new Set(["OVERDRAFT_DRAW"]) : new Set(["CARD_SPEND"]);
  if (!allowed.has(eventType)) throw new Error("eventType không phù hợp với productKind");
  if (!payload.idempotencyKey) throw new Error("idempotencyKey là bắt buộc");

  const { ledger, alreadyProcessed } = await insertLedgerInTrx(trx, {
    accountId: account.id,
    eventType,
    bucket: account.product_kind === "OVERDRAFT" ? "REVOLVING_PRINCIPAL" : "GRACE_PRINCIPAL",
    principalDelta: amount,
    effectiveAt: asEffectiveAt(payload.effectiveAt),
    sourceReference: payload.sourceReference,
    idempotencyKey: String(payload.idempotencyKey),
    metadata: payload.metadata || {},
  });
  const balances = await getBalancesInTrx(trx, account.id);
  return { ledger, alreadyProcessed, balances };
}

async function listAllocatableLinesInTrx(trx, accountId) {
  const rows = await trx(TABLES.CREDIT_ACCOUNT_LEDGER)
    .where(COLS.CREDIT_ACCOUNT_LEDGER.ACCOUNT_ID, accountId)
    .whereIn(COLS.CREDIT_ACCOUNT_LEDGER.BUCKET, PAYMENT_BUCKETS)
    .orderBy(COLS.CREDIT_ACCOUNT_LEDGER.EFFECTIVE_AT, "asc")
    .orderBy(COLS.CREDIT_ACCOUNT_LEDGER.ID, "asc");
  const allocations = await trx(TABLES.CREDIT_PAYMENT_ALLOCATIONS)
    .join(TABLES.CREDIT_ACCOUNT_LEDGER, `${TABLES.CREDIT_PAYMENT_ALLOCATIONS}.${COLS.CREDIT_PAYMENT_ALLOCATIONS.TARGET_LEDGER_ID}`, `${TABLES.CREDIT_ACCOUNT_LEDGER}.${COLS.CREDIT_ACCOUNT_LEDGER.ID}`)
    .where(`${TABLES.CREDIT_ACCOUNT_LEDGER}.${COLS.CREDIT_ACCOUNT_LEDGER.ACCOUNT_ID}`, accountId)
    .select(`${TABLES.CREDIT_PAYMENT_ALLOCATIONS}.${COLS.CREDIT_PAYMENT_ALLOCATIONS.TARGET_LEDGER_ID} as target_ledger_id`)
    .sum({ allocated: `${TABLES.CREDIT_PAYMENT_ALLOCATIONS}.${COLS.CREDIT_PAYMENT_ALLOCATIONS.AMOUNT}` })
    .groupBy(`${TABLES.CREDIT_PAYMENT_ALLOCATIONS}.${COLS.CREDIT_PAYMENT_ALLOCATIONS.TARGET_LEDGER_ID}`);
  const allocatedByLine = new Map(allocations.map((item) => [Number(item.target_ledger_id), asNumber(item.allocated)]));

  return rows.map((row) => {
    const original = row.metadata?.allocationBasis === undefined ? (row.bucket === "FEE" ? asNumber(row.fee_delta) : row.bucket === "POSTED_INTEREST" ? asNumber(row.interest_delta) : asNumber(row.principal_delta)) : asNumber(row.metadata.allocationBasis);
    return { ...row, outstanding: Math.max(0, original - (allocatedByLine.get(Number(row.id)) || 0)) };
  }).filter((row) => row.outstanding > 0);
}

async function recordPaymentInTrx(trx, accountId, payload) {
  const account = await getAccountInTrx(trx, accountId, true);
  const amount = asNumber(payload.amount);
  if (amount <= 0) throw new Error("amount phải lớn hơn 0");
  if (!payload.idempotencyKey) throw new Error("idempotencyKey là bắt buộc");
  const effectiveAt = asEffectiveAt(payload.effectiveAt);
  const existing = await trx(TABLES.CREDIT_ACCOUNT_LEDGER)
    .where(COLS.CREDIT_ACCOUNT_LEDGER.ACCOUNT_ID, account.id)
    .where(COLS.CREDIT_ACCOUNT_LEDGER.IDEMPOTENCY_KEY, String(payload.idempotencyKey))
    .first();
  if (existing) return { ledger: existing, alreadyProcessed: true, balances: await getBalancesInTrx(trx, account.id) };

  let remaining = amount;
  let principalPaid = 0;
  let interestPaid = 0;
  let feePaid = 0;
  const lines = await listAllocatableLinesInTrx(trx, account.id);
  const allocations = [];
  for (const bucket of PAYMENT_BUCKETS) {
    for (const line of lines.filter((item) => item.bucket === bucket)) {
      if (remaining <= 0) break;
      const allocated = Math.min(remaining, line.outstanding);
      remaining -= allocated;
      if (bucket === "FEE") feePaid += allocated;
      else if (bucket === "POSTED_INTEREST") interestPaid += allocated;
      else principalPaid += allocated;
      allocations.push({ targetLedgerId: line.id, statementId: line.statement_id, bucket, amount: allocated });
    }
  }

  const { ledger } = await insertLedgerInTrx(trx, {
    accountId: account.id,
    eventType: "PAYMENT",
    bucket: remaining > 0 ? "PAYMENT_UNALLOCATED" : "PAYMENT_UNALLOCATED",
    principalDelta: -principalPaid,
    interestDelta: -interestPaid,
    feeDelta: -feePaid,
    effectiveAt,
    sourceReference: payload.sourceReference,
    idempotencyKey: String(payload.idempotencyKey),
    metadata: { note: payload.note || null, unallocatedAmount: remaining },
  });

  if (allocations.length) {
    await trx(TABLES.CREDIT_PAYMENT_ALLOCATIONS).insert(allocations.map((allocation) => ({
      [COLS.CREDIT_PAYMENT_ALLOCATIONS.PAYMENT_LEDGER_ID]: ledger.id,
      [COLS.CREDIT_PAYMENT_ALLOCATIONS.TARGET_LEDGER_ID]: allocation.targetLedgerId,
      [COLS.CREDIT_PAYMENT_ALLOCATIONS.STATEMENT_ID]: allocation.statementId || null,
      [COLS.CREDIT_PAYMENT_ALLOCATIONS.BUCKET]: allocation.bucket,
      [COLS.CREDIT_PAYMENT_ALLOCATIONS.AMOUNT]: allocation.amount,
    })));
  }

  const balances = await getBalancesInTrx(trx, account.id);
  return { ledger, alreadyProcessed: false, allocations, unallocatedAmount: remaining, balances };
}

async function accrueOverdraftInterestForDate(businessDate) {
  const date = asDateString(businessDate, "businessDate");
  return withTransaction(async (trx) => {
    const accounts = await trx(TABLES.CREDIT_ACCOUNTS).where(COLS.CREDIT_ACCOUNTS.PRODUCT_KIND, "OVERDRAFT").where(COLS.CREDIT_ACCOUNTS.STATUS, "ACTIVE").forUpdate();
    const results = [];
    for (const account of accounts) {
      const ruleVersion = await getCurrentRuleInTrx(trx, account, true);
      const rule = normalizeRule(account.product_kind, ruleVersion.config);
      const cutoff = buildBangkokCutoff(date, rule.dailyCutoffTime);
      const balances = await getBalancesInTrx(trx, account.id, cutoff);
      if (balances.principal <= 0) {
        results.push({ accountId: Number(account.id), skipped: "ZERO_PRINCIPAL" });
        continue;
      }
      const existing = await trx(TABLES.CREDIT_INTEREST_ACCRUALS)
        .where(COLS.CREDIT_INTEREST_ACCRUALS.ACCOUNT_ID, account.id)
        .where(COLS.CREDIT_INTEREST_ACCRUALS.BUSINESS_DATE, date)
        .where(COLS.CREDIT_INTEREST_ACCRUALS.RULE_VERSION, ruleVersion.version)
        .first();
      if (existing) {
        results.push({ accountId: Number(account.id), accrualId: Number(existing.id), alreadyProcessed: true });
        continue;
      }
      const interestAmount = asMoney((balances.principal * asNumber(rule.annualRatePercent)) / 100 / Number(rule.dayCountBasis), rule.roundingPolicy);
      const { ledger } = await insertLedgerInTrx(trx, {
        accountId: account.id,
        eventType: "INTEREST_ACCRUAL",
        bucket: "ACCRUED_INTEREST",
        interestDelta: interestAmount,
        effectiveAt: cutoff,
        idempotencyKey: `overdraft-accrual:${account.id}:${date}:${ruleVersion.version}`,
        metadata: { businessDate: date, basisAmount: balances.principal, ruleVersion: ruleVersion.version },
      });
      const [accrual] = await trx(TABLES.CREDIT_INTEREST_ACCRUALS).insert({
        [COLS.CREDIT_INTEREST_ACCRUALS.ACCOUNT_ID]: account.id,
        [COLS.CREDIT_INTEREST_ACCRUALS.BUSINESS_DATE]: date,
        [COLS.CREDIT_INTEREST_ACCRUALS.RULE_VERSION]: ruleVersion.version,
        [COLS.CREDIT_INTEREST_ACCRUALS.BASIS_AMOUNT]: balances.principal,
        [COLS.CREDIT_INTEREST_ACCRUALS.RATE_SNAPSHOT]: { annualRatePercent: rule.annualRatePercent, dayCountBasis: rule.dayCountBasis, roundingPolicy: rule.roundingPolicy },
        [COLS.CREDIT_INTEREST_ACCRUALS.INTEREST_AMOUNT]: interestAmount,
        [COLS.CREDIT_INTEREST_ACCRUALS.LEDGER_ID]: ledger.id,
      }).returning("*");
      results.push({ accountId: Number(account.id), accrualId: Number(accrual.id), interestAmount });
    }
    return results;
  });
}

async function closeOverdraftStatements(cycleCloseDate) {
  const date = asDateString(cycleCloseDate, "cycleCloseDate");
  return withTransaction(async (trx) => {
    const accounts = await trx(TABLES.CREDIT_ACCOUNTS).where(COLS.CREDIT_ACCOUNTS.PRODUCT_KIND, "OVERDRAFT").where(COLS.CREDIT_ACCOUNTS.STATUS, "ACTIVE").forUpdate();
    const results = [];
    for (const account of accounts) {
      const ruleVersion = await getCurrentRuleInTrx(trx, account, true);
      const rule = normalizeRule(account.product_kind, ruleVersion.config);
      if (Number(date.slice(-2)) !== Number(rule.statementCloseDay)) {
        results.push({ accountId: Number(account.id), skipped: "NOT_STATEMENT_CLOSE_DAY" });
        continue;
      }
      const cycleStartDate = getCycleStart(date, Number(rule.statementCloseDay));
      const closeAt = buildBangkokCutoff(date, "00:00");
      const existing = await trx(TABLES.CREDIT_STATEMENTS).where(COLS.CREDIT_STATEMENTS.ACCOUNT_ID, account.id).where(COLS.CREDIT_STATEMENTS.CYCLE_CLOSE_AT, closeAt).first();
      if (existing) {
        results.push({ accountId: Number(account.id), statementId: Number(existing.id), alreadyProcessed: true });
        continue;
      }
      const accrualSummary = await trx(TABLES.CREDIT_INTEREST_ACCRUALS)
        .where(COLS.CREDIT_INTEREST_ACCRUALS.ACCOUNT_ID, account.id)
        .where(COLS.CREDIT_INTEREST_ACCRUALS.BUSINESS_DATE, ">=", cycleStartDate)
        .where(COLS.CREDIT_INTEREST_ACCRUALS.BUSINESS_DATE, "<", date)
        .sum({ interestDue: COLS.CREDIT_INTEREST_ACCRUALS.INTEREST_AMOUNT })
        .first();
      const interestDue = asNumber(accrualSummary?.interestDue);
      const openingBalances = await getBalancesInTrx(trx, account.id, buildBangkokCutoff(cycleStartDate, "00:00"));
      const closingBalances = await getBalancesInTrx(trx, account.id, closeAt);
      const expectedCollectionAt = buildBangkokCutoff(getCollectionDate(date, Number(rule.interestCollectionDay)), rule.interestCollectionTime || "00:00");
      const [statement] = await trx(TABLES.CREDIT_STATEMENTS).insert({
        [COLS.CREDIT_STATEMENTS.ACCOUNT_ID]: account.id,
        [COLS.CREDIT_STATEMENTS.CYCLE_START_AT]: buildBangkokCutoff(cycleStartDate, "00:00"),
        [COLS.CREDIT_STATEMENTS.CYCLE_CLOSE_AT]: closeAt,
        [COLS.CREDIT_STATEMENTS.OPENING_PRINCIPAL]: openingBalances.principal,
        [COLS.CREDIT_STATEMENTS.CLOSING_PRINCIPAL]: closingBalances.principal,
        [COLS.CREDIT_STATEMENTS.INTEREST_DUE]: interestDue,
        [COLS.CREDIT_STATEMENTS.TOTAL_DUE]: interestDue,
        [COLS.CREDIT_STATEMENTS.STATUS]: "INTEREST_PENDING_COLLECTION",
        [COLS.CREDIT_STATEMENTS.RULE_SNAPSHOT]: rule,
        [COLS.CREDIT_STATEMENTS.EXPECTED_INTEREST_COLLECTION_AT]: expectedCollectionAt,
      }).returning("*");
      if (interestDue > 0) {
        await insertLedgerInTrx(trx, {
          accountId: account.id,
          statementId: statement.id,
          eventType: "INTEREST_ACCRUAL_POSTED",
          bucket: "ACCRUED_INTEREST",
          interestDelta: -interestDue,
          effectiveAt: closeAt,
          idempotencyKey: `overdraft-accrual-posted:${statement.id}`,
        });
        await insertLedgerInTrx(trx, {
          accountId: account.id,
          statementId: statement.id,
          eventType: "INTEREST_POSTED",
          bucket: "POSTED_INTEREST",
          interestDelta: interestDue,
          effectiveAt: closeAt,
          idempotencyKey: `overdraft-interest-posted:${statement.id}`,
        });
      }
      results.push({ accountId: Number(account.id), statementId: Number(statement.id), interestDue });
    }
    return results;
  });
}

async function getCreditAccountDetail(accountId) {
  const { db } = require("@/db");
  const account = await db(TABLES.CREDIT_ACCOUNTS).where(COLS.CREDIT_ACCOUNTS.ID, accountId).first();
  if (!account) throw new Error("Không tìm thấy credit account");
  const [rule, balances, statements, ledger] = await Promise.all([
    db(TABLES.CREDIT_ACCOUNT_RULE_VERSIONS).where(COLS.CREDIT_ACCOUNT_RULE_VERSIONS.ACCOUNT_ID, account.id).where(COLS.CREDIT_ACCOUNT_RULE_VERSIONS.VERSION, account.current_rule_version).first(),
    getBalancesInTrx(db, account.id),
    db(TABLES.CREDIT_STATEMENTS).where(COLS.CREDIT_STATEMENTS.ACCOUNT_ID, account.id).orderBy(COLS.CREDIT_STATEMENTS.CYCLE_CLOSE_AT, "desc").limit(24),
    db(TABLES.CREDIT_ACCOUNT_LEDGER).where(COLS.CREDIT_ACCOUNT_LEDGER.ACCOUNT_ID, account.id).orderBy(COLS.CREDIT_ACCOUNT_LEDGER.EFFECTIVE_AT, "desc").orderBy(COLS.CREDIT_ACCOUNT_LEDGER.ID, "desc").limit(200),
  ]);
  return { account, rule, balances, statements, ledger };
}

async function importCreditCardStatement(accountId, payload) {
  return withTransaction(async (trx) => {
    const account = await getAccountInTrx(trx, accountId, true);
    if (account.product_kind !== "CREDIT_CARD") throw new Error("Chỉ credit card mới import statement thẻ");
    const ruleVersion = await getCurrentRuleInTrx(trx, account, true);
    const cycleStartAt = asEffectiveAt(payload.cycleStartAt, "cycleStartAt");
    const cycleCloseAt = asEffectiveAt(payload.cycleCloseAt, "cycleCloseAt");
    if (cycleCloseAt <= cycleStartAt) throw new Error("cycleCloseAt phải sau cycleStartAt");
    const existing = await trx(TABLES.CREDIT_STATEMENTS)
      .where(COLS.CREDIT_STATEMENTS.ACCOUNT_ID, account.id)
      .where(COLS.CREDIT_STATEMENTS.CYCLE_CLOSE_AT, cycleCloseAt)
      .first();
    if (existing) return { statement: existing, alreadyProcessed: true };

    const interestDue = asNumber(payload.interestDue);
    const feeDue = asNumber(payload.feeDue);
    const [statement] = await trx(TABLES.CREDIT_STATEMENTS).insert({
      [COLS.CREDIT_STATEMENTS.ACCOUNT_ID]: account.id,
      [COLS.CREDIT_STATEMENTS.CYCLE_START_AT]: cycleStartAt,
      [COLS.CREDIT_STATEMENTS.CYCLE_CLOSE_AT]: cycleCloseAt,
      [COLS.CREDIT_STATEMENTS.DUE_AT]: payload.dueAt ? asEffectiveAt(payload.dueAt, "dueAt") : null,
      [COLS.CREDIT_STATEMENTS.OPENING_PRINCIPAL]: asNumber(payload.openingPrincipal),
      [COLS.CREDIT_STATEMENTS.CLOSING_PRINCIPAL]: asNumber(payload.closingPrincipal),
      [COLS.CREDIT_STATEMENTS.INTEREST_DUE]: interestDue,
      [COLS.CREDIT_STATEMENTS.FEE_DUE]: feeDue,
      [COLS.CREDIT_STATEMENTS.MINIMUM_DUE]: payload.minimumDue === undefined ? null : asNumber(payload.minimumDue),
      [COLS.CREDIT_STATEMENTS.TOTAL_DUE]: asNumber(payload.totalDue),
      [COLS.CREDIT_STATEMENTS.STATUS]: payload.status || "OPEN",
      [COLS.CREDIT_STATEMENTS.RULE_SNAPSHOT]: ruleVersion.config,
      [COLS.CREDIT_STATEMENTS.SOURCE_REFERENCE]: payload.sourceReference || null,
    }).returning("*");
    if (interestDue > 0) {
      await insertLedgerInTrx(trx, {
        accountId: account.id, statementId: statement.id, eventType: "INTEREST_POSTED", bucket: "POSTED_INTEREST",
        interestDelta: interestDue, effectiveAt: cycleCloseAt, idempotencyKey: `card-statement-interest:${statement.id}`,
        sourceReference: payload.sourceReference,
      });
    }
    if (feeDue > 0) {
      await insertLedgerInTrx(trx, {
        accountId: account.id, statementId: statement.id, eventType: "FEE_POSTED", bucket: "FEE",
        feeDelta: feeDue, effectiveAt: cycleCloseAt, idempotencyKey: `card-statement-fee:${statement.id}`,
        sourceReference: payload.sourceReference,
      });
    }
    const statementPrincipalDue = Math.max(0, asNumber(payload.totalDue) - interestDue - feeDue);
    if (statementPrincipalDue > 0) {
      await insertLedgerInTrx(trx, {
        accountId: account.id, statementId: statement.id, eventType: "STATEMENT_PRINCIPAL_DUE", bucket: "REVOLVING_PRINCIPAL",
        effectiveAt: cycleCloseAt, idempotencyKey: `card-statement-principal:${statement.id}`,
        sourceReference: payload.sourceReference, metadata: { allocationBasis: statementPrincipalDue },
      });
    }
    return { statement, alreadyProcessed: false };
  });
}

async function recordOverdraftInterestCollection(statementId, payload) {
  return withTransaction(async (trx) => {
    const statement = await trx(TABLES.CREDIT_STATEMENTS).where(COLS.CREDIT_STATEMENTS.ID, statementId).forUpdate().first();
    if (!statement) throw new Error("Không tìm thấy statement thấu chi");
    const account = await getAccountInTrx(trx, statement.account_id, true);
    if (account.product_kind !== "OVERDRAFT") throw new Error("Statement này không thuộc thấu chi");
    if (!payload.idempotencyKey) throw new Error("idempotencyKey là bắt buộc");
    const existing = await trx(TABLES.CREDIT_ACCOUNT_LEDGER)
      .where(COLS.CREDIT_ACCOUNT_LEDGER.ACCOUNT_ID, account.id)
      .where(COLS.CREDIT_ACCOUNT_LEDGER.IDEMPOTENCY_KEY, String(payload.idempotencyKey))
      .first();
    if (existing) return { ledger: existing, alreadyProcessed: true, statement };

    const target = await trx(TABLES.CREDIT_ACCOUNT_LEDGER)
      .where(COLS.CREDIT_ACCOUNT_LEDGER.ACCOUNT_ID, account.id)
      .where(COLS.CREDIT_ACCOUNT_LEDGER.STATEMENT_ID, statement.id)
      .where(COLS.CREDIT_ACCOUNT_LEDGER.EVENT_TYPE, "INTEREST_POSTED")
      .orderBy(COLS.CREDIT_ACCOUNT_LEDGER.ID, "asc")
      .first();
    if (!target) throw new Error("Statement không có POSTED_INTEREST để thu");
    const totalCollected = await trx(TABLES.CREDIT_PAYMENT_ALLOCATIONS)
      .where(COLS.CREDIT_PAYMENT_ALLOCATIONS.TARGET_LEDGER_ID, target.id)
      .sum({ amount: COLS.CREDIT_PAYMENT_ALLOCATIONS.AMOUNT })
      .first();
    const outstanding = Math.max(0, asNumber(target.interest_delta) - asNumber(totalCollected?.amount));
    const amount = asNumber(payload.amount);
    if (amount <= 0 || amount > outstanding) throw new Error("Số tiền thu lãi phải lớn hơn 0 và không vượt lãi còn phải thu");

    const { ledger } = await insertLedgerInTrx(trx, {
      accountId: account.id,
      statementId: statement.id,
      eventType: "INTEREST_COLLECTION",
      bucket: "PAYMENT_UNALLOCATED",
      interestDelta: -amount,
      effectiveAt: asEffectiveAt(payload.effectiveAt),
      sourceReference: payload.sourceReference,
      idempotencyKey: String(payload.idempotencyKey),
      metadata: { collectionKind: "VPBANK_OVERDRAFT_INTEREST" },
    });
    await trx(TABLES.CREDIT_PAYMENT_ALLOCATIONS).insert({
      [COLS.CREDIT_PAYMENT_ALLOCATIONS.PAYMENT_LEDGER_ID]: ledger.id,
      [COLS.CREDIT_PAYMENT_ALLOCATIONS.TARGET_LEDGER_ID]: target.id,
      [COLS.CREDIT_PAYMENT_ALLOCATIONS.STATEMENT_ID]: statement.id,
      [COLS.CREDIT_PAYMENT_ALLOCATIONS.BUCKET]: "POSTED_INTEREST",
      [COLS.CREDIT_PAYMENT_ALLOCATIONS.AMOUNT]: amount,
    });
    const remaining = outstanding - amount;
    const status = remaining === 0 ? "INTEREST_COLLECTED" : "INTEREST_COLLECTION_PARTIAL";
    await trx(TABLES.CREDIT_STATEMENTS).where(COLS.CREDIT_STATEMENTS.ID, statement.id).update({
      [COLS.CREDIT_STATEMENTS.STATUS]: status,
      [COLS.CREDIT_STATEMENTS.UPDATED_AT]: trx.fn.now(),
    });
    await trx(TABLES.CREDIT_RECONCILIATION_RECORDS).insert({
      [COLS.CREDIT_RECONCILIATION_RECORDS.ACCOUNT_ID]: account.id,
      [COLS.CREDIT_RECONCILIATION_RECORDS.STATEMENT_ID]: statement.id,
      [COLS.CREDIT_RECONCILIATION_RECORDS.SOURCE_KIND]: "OVERDRAFT_INTEREST_COLLECTION",
      [COLS.CREDIT_RECONCILIATION_RECORDS.SOURCE_REFERENCE]: payload.sourceReference || null,
      [COLS.CREDIT_RECONCILIATION_RECORDS.EXPECTED_AMOUNT]: outstanding,
      [COLS.CREDIT_RECONCILIATION_RECORDS.OBSERVED_AMOUNT]: amount,
      [COLS.CREDIT_RECONCILIATION_RECORDS.STATUS]: status,
      [COLS.CREDIT_RECONCILIATION_RECORDS.EVIDENCE]: payload.evidence || {},
    });
    return { ledger, status, remainingInterest: remaining, alreadyProcessed: false };
  });
}
async function evaluateCreditCardDueStatements(asOf = new Date()) {
  const evaluationAt = asEffectiveAt(asOf, "asOf");
  return withTransaction(async (trx) => {
    const statements = await trx(TABLES.CREDIT_STATEMENTS)
      .whereNotNull(COLS.CREDIT_STATEMENTS.DUE_AT)
      .where(COLS.CREDIT_STATEMENTS.DUE_AT, "<=", evaluationAt)
      .whereIn(COLS.CREDIT_STATEMENTS.STATUS, ["OPEN", "MINIMUM_PAID"])
      .forUpdate();
    const results = [];
    for (const statement of statements) {
      const account = await getAccountInTrx(trx, statement.account_id, true);
      if (account.product_kind !== "CREDIT_CARD") continue;
      const paid = await trx(TABLES.CREDIT_PAYMENT_ALLOCATIONS)
        .join(TABLES.CREDIT_ACCOUNT_LEDGER, `${TABLES.CREDIT_PAYMENT_ALLOCATIONS}.${COLS.CREDIT_PAYMENT_ALLOCATIONS.PAYMENT_LEDGER_ID}`, `${TABLES.CREDIT_ACCOUNT_LEDGER}.${COLS.CREDIT_ACCOUNT_LEDGER.ID}`)
        .where(`${TABLES.CREDIT_PAYMENT_ALLOCATIONS}.${COLS.CREDIT_PAYMENT_ALLOCATIONS.STATEMENT_ID}`, statement.id)
        .where(`${TABLES.CREDIT_ACCOUNT_LEDGER}.${COLS.CREDIT_ACCOUNT_LEDGER.EFFECTIVE_AT}`, "<", statement.due_at)
        .sum({ amount: `${TABLES.CREDIT_PAYMENT_ALLOCATIONS}.${COLS.CREDIT_PAYMENT_ALLOCATIONS.AMOUNT}` })
        .first();
      const paidAmount = asNumber(paid?.amount);
      const status = paidAmount >= asNumber(statement.total_due)
        ? "PAID_IN_FULL"
        : paidAmount >= asNumber(statement.minimum_due)
          ? "MINIMUM_PAID"
          : "PAST_DUE";
      await trx(TABLES.CREDIT_STATEMENTS).where(COLS.CREDIT_STATEMENTS.ID, statement.id).update({
        [COLS.CREDIT_STATEMENTS.STATUS]: status,
        [COLS.CREDIT_STATEMENTS.UPDATED_AT]: trx.fn.now(),
      });
      results.push({ statementId: Number(statement.id), status, paidAmount, totalDue: asNumber(statement.total_due) });
    }
    return results;
  });
}
module.exports = {
  addRuleVersion,
  accrueOverdraftInterestForDate,
  closeOverdraftStatements,
  createCreditAccount,
  getAccountForPersonalAssetInTrx,
  getBalancesInTrx,
  getCreditAccountDetail,
  importCreditCardStatement,
  recordOverdraftInterestCollection,
  evaluateCreditCardDueStatements,
  recordPaymentInTrx,
  recordPrincipalInTrx,
  normalizeRule,
  getCycleStart,
  getCollectionDate,
};