/**
 * VPBank Email Ingestion Service
 * 
 * Äiá»u phá»‘i luá»“ng xá»­ lÃ½ email giao dá»‹ch ngÃ¢n hÃ ng theo chuáº©n ACID:
 * Checkpoint -> Parse -> Resolve Mapping -> Ghi Sá»• CÃ¡i (Credit / Debit) -> Outbox & Domain Event.
 */

const crypto = require("crypto");
const { db, TABLES, COLS, withTransaction } = require("@/db");
const { parseVpbankEmail } = require("./vpbankEmailParser");
const { recordPrincipalInTrx, recordPaymentInTrx } = require("../credit/creditLedgerService");
const { recordPersonalDebitTransactionInTrx } = require("./personalDebitTransactionService");
const { borrowPersonalAssetInTrx } = require("./financeHubService");

const C_REC = COLS.EMAIL_INGESTION_RECEIPTS;
const C_CHK = COLS.EMAIL_SYNC_CHECKPOINTS;
const C_MAP = COLS.BANK_INSTRUMENT_MAPPINGS;
const C_ASSET = COLS.PERSONAL_ASSETS;

function sha256(str) {
  if (!str) return null;
  return crypto.createHash("sha256").update(String(str)).digest("hex");
}

async function getOrCreateCheckpointInTrx(trx, { provider = "VPBANK_GMAIL", mailboxAlias, folderName = "INBOX", uidValidity }) {
  const identity = {
    [C_CHK.PROVIDER]: provider,
    [C_CHK.MAILBOX_ALIAS]: mailboxAlias,
    [C_CHK.FOLDER_NAME]: folderName,
  };
  await trx(TABLES.EMAIL_SYNC_CHECKPOINTS)
    .insert({ ...identity, [C_CHK.UID_VALIDITY]: uidValidity, [C_CHK.LAST_TERMINAL_UID]: 0, [C_CHK.WORKER_STATE]: "IDLE" })
    .onConflict([C_CHK.PROVIDER, C_CHK.MAILBOX_ALIAS, C_CHK.FOLDER_NAME])
    .ignore();

  let checkpoint = await trx(TABLES.EMAIL_SYNC_CHECKPOINTS).where(identity).forUpdate().first();
  if (checkpoint[C_CHK.UID_VALIDITY] !== uidValidity) {
    await trx(TABLES.EMAIL_SYNC_CHECKPOINTS).where(C_CHK.ID, checkpoint[C_CHK.ID]).update({
      [C_CHK.UID_VALIDITY]: uidValidity,
      [C_CHK.LAST_TERMINAL_UID]: 0,
      [C_CHK.LAST_SUCCESS_AT]: null,
      [C_CHK.LAST_ERROR_CODE]: null,
      [C_CHK.LAST_ERROR_MESSAGE]: null,
      [C_CHK.UPDATED_AT]: trx.fn.now(),
    });
    checkpoint = { ...checkpoint, [C_CHK.UID_VALIDITY]: uidValidity, [C_CHK.LAST_TERMINAL_UID]: 0 };
  }
  return checkpoint;
}

function normalizeAccountNumber(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits || null;
}

async function resolveInstrumentMappingInTrx(trx, { instrumentKind, maskedSuffix, sourceAccountNumber }) {
  const accountNumber = normalizeAccountNumber(sourceAccountNumber);
  const baseQuery = trx(TABLES.BANK_INSTRUMENT_MAPPINGS).where({
    [C_MAP.PROVIDER]: "VPBANK",
    [C_MAP.STATUS]: "ACTIVE",
  });
  if (accountNumber) {
    const exact = await baseQuery.clone().where(C_MAP.ACCOUNT_NUMBER, accountNumber).first();
    if (exact) return exact;
  }
  if (!maskedSuffix) return null;
  const cleanSuffix = String(maskedSuffix).replace(/^\*/, "").trim();
  return baseQuery
    .where(C_MAP.INSTRUMENT_KIND, instrumentKind)
    .where((builder) => {
      builder.where(C_MAP.MASKED_SUFFIX, cleanSuffix).orWhere(C_MAP.MASKED_SUFFIX, `*${cleanSuffix}`);
    })
    .first();
}

async function resolvePersonalDebtAssetInTrx(trx, { maskedSuffix, sourceAccountNumber }) {
  const accountNumber = normalizeAccountNumber(sourceAccountNumber);
  if (accountNumber) {
    const assets = await trx(TABLES.PERSONAL_ASSETS)
      .where({ [C_ASSET.TYPE]: "DEBT_PAYABLE", [C_ASSET.DEBT_ACCOUNT_NUMBER]: accountNumber })
      .forUpdate();
    if (assets.length === 1) return assets[0];
    if (assets.length > 1) return null;
  }
  if (!maskedSuffix) return null;
  const cleanSuffix = String(maskedSuffix).replace(/^\*/, "").trim();
  const assets = await trx(TABLES.PERSONAL_ASSETS)
    .where({ [C_ASSET.TYPE]: "DEBT_PAYABLE", [C_ASSET.CARD_LAST_DIGITS]: cleanSuffix })
    .whereILike(C_ASSET.BANK_NAME, "%VPBank%")
    .forUpdate();
  return assets.length === 1 ? assets[0] : null;
}
function observedValueNote(parsed) {
  if (Number.isFinite(Number(parsed.availableLimitObserved))) {
    return `H\u1ea1n m\u1ee9c c\u00f2n l\u1ea1i: ${Number(parsed.availableLimitObserved).toLocaleString("vi-VN")} VND`;
  }
  if (Number.isFinite(Number(parsed.observedBalanceAfter))) {
    return `S\u1ed1 d\u01b0 quan s\u00e1t: ${Number(parsed.observedBalanceAfter).toLocaleString("vi-VN")} VND`;
  }
  return null;
}

function canRecordPersonalDebtMovement(parsed) {
  return (parsed.instrumentKind === "CREDIT_CARD" && parsed.transactionKind === "CARD_SPEND")
    || (parsed.direction === "OUTFLOW" && Boolean(parsed.sourceAccountNumber || parsed.maskedSuffix));
}

/**
 * Xá»­ lÃ½ má»™t email message trong Knex Transaction
 */
async function processEmailMessageInTrx(trx, emailData, options = {}) {
  const provider = options.provider || "VPBANK_GMAIL";
  const mailboxAlias = options.mailboxAlias || "default";
  const folderName = options.folderName || "INBOX";
  const emailUid = Number(emailData.uid || emailData.emailUid || 0);
  const uidValidity = String(emailData.uidValidity || options.uidValidity || "1");

  const checkpoint = await getOrCreateCheckpointInTrx(trx, { provider, mailboxAlias, folderName, uidValidity });

  // 1. Kiá»ƒm tra tÃ­nh Idempotency trÃªn receipt identity
  const existingReceipt = await trx(TABLES.EMAIL_INGESTION_RECEIPTS)
    .where({
      [C_REC.PROVIDER]: provider,
      [C_REC.MAILBOX_ALIAS]: mailboxAlias,
      [C_REC.FOLDER_NAME]: folderName,
      [C_REC.UID_VALIDITY]: uidValidity,
      [C_REC.EMAIL_UID]: emailUid,
    })
    .first();

  const canReprocessManualReview = options.reprocessManualReview
    && existingReceipt?.status === "MANUAL_REVIEW"
    && existingReceipt?.failure_code === "UNMAPPED_BANK_INSTRUMENT";
  if (existingReceipt && !canReprocessManualReview && (existingReceipt.status === "APPLIED" || existingReceipt.status === "REJECTED" || existingReceipt.status === "MANUAL_REVIEW")) {
    return {
      status: existingReceipt.status,
      alreadyProcessed: true,
      receiptId: existingReceipt.id,
    };
  }

  // 2. Cháº¡y bá»™ bÃ³c tÃ¡ch Pure Parser
  const parsed = parseVpbankEmail(emailData);
  const subject = String(emailData.subject || "").trim();
  const bodyText = String(emailData.text || emailData.html || "").trim();
  const subjectHash = sha256(subject);
  const bodyHash = sha256(bodyText);
  const rawSender = emailData.from ? (typeof emailData.from === "object" ? (emailData.from.text || emailData.from.value?.[0]?.address) : String(emailData.from)) : "";

  // 3. Khá»Ÿi táº¡o / cáº­p nháº­t receipt dáº¡ng PARSED
  let receiptId = existingReceipt ? existingReceipt.id : null;
  if (!receiptId) {
    const [newRec] = await trx(TABLES.EMAIL_INGESTION_RECEIPTS)
      .insert({
        [C_REC.PROVIDER]: provider,
        [C_REC.MAILBOX_ALIAS]: mailboxAlias,
        [C_REC.FOLDER_NAME]: folderName,
        [C_REC.UID_VALIDITY]: uidValidity,
        [C_REC.EMAIL_UID]: emailUid,
        [C_REC.MESSAGE_ID]: emailData.messageId || null,
        [C_REC.SENDER_ADDRESS]: rawSender,
        [C_REC.SUBJECT]: subject,
        [C_REC.RECEIVED_AT]: emailData.date ? new Date(emailData.date) : new Date(),
        [C_REC.SUBJECT_HASH]: subjectHash,
        [C_REC.BODY_HASH]: bodyHash,
        [C_REC.PARSE_VERSION]: "1.0",
        [C_REC.DOCUMENT_KIND]: parsed.documentKind,
        [C_REC.INSTRUMENT_KIND]: parsed.instrumentKind,
        [C_REC.INSTRUMENT_MASK]: parsed.maskedSuffix ? `*${parsed.maskedSuffix}` : null,
        [C_REC.SOURCE_ACCOUNT_NUMBER]: normalizeAccountNumber(parsed.sourceAccountNumber),
        [C_REC.STATUS]: "PARSED",
        [C_REC.AMOUNT]: parsed.amount || null,
      })
      .returning("id");
    receiptId = newRec.id || newRec;
  }

  // 4. Náº¿u khÃ´ng pháº£i giao dá»‹ch tÃ i chÃ­nh hoáº·c ngÆ°á»i gá»­i giáº£ máº¡o -> REJECTED
  if (!parsed.isFinancial || !parsed.senderValid) {
    const failureCode = !parsed.senderValid ? "INVALID_SENDER" : "NON_FINANCIAL_DOCUMENT";
    await trx(TABLES.EMAIL_INGESTION_RECEIPTS)
      .where("id", receiptId)
      .update({
        [C_REC.STATUS]: "REJECTED",
        [C_REC.FAILURE_CODE]: failureCode,
        [C_REC.TERMINAL_AT]: trx.fn.now(),
        [C_REC.UPDATED_AT]: trx.fn.now(),
      });

    // Advance terminal uid náº¿u UID nÃ y lá»›n hÆ¡n
    if (emailUid > Number(checkpoint[C_CHK.LAST_TERMINAL_UID])) {
      await trx(TABLES.EMAIL_SYNC_CHECKPOINTS)
        .where(C_CHK.ID, checkpoint[C_CHK.ID])
        .update({ [C_CHK.LAST_TERMINAL_UID]: emailUid, [C_CHK.UPDATED_AT]: trx.fn.now() });
    }
    return { status: "REJECTED", failureCode, receiptId };
  }

  // 5. Náº¿u lÃ  sao kÃª Ä‘á»‹nh ká»³ -> MANUAL_REVIEW (yÃªu cáº§u Master kiá»ƒm tra vÃ  import báº±ng nÃºt chuyÃªn dá»¥ng)
  if (parsed.requiresManualStatementImport) {
    await trx(TABLES.EMAIL_INGESTION_RECEIPTS)
      .where("id", receiptId)
      .update({
        [C_REC.STATUS]: "MANUAL_REVIEW",
        [C_REC.FAILURE_CODE]: "STATEMENT_REQUIRES_MANUAL_IMPORT",
        [C_REC.TERMINAL_AT]: trx.fn.now(),
        [C_REC.UPDATED_AT]: trx.fn.now(),
      });
    if (emailUid > Number(checkpoint[C_CHK.LAST_TERMINAL_UID])) {
      await trx(TABLES.EMAIL_SYNC_CHECKPOINTS).where(C_CHK.ID, checkpoint[C_CHK.ID]).update({
        [C_CHK.LAST_TERMINAL_UID]: emailUid,
        [C_CHK.UPDATED_AT]: trx.fn.now(),
      });
    }
    return { status: "MANUAL_REVIEW", failureCode: "STATEMENT_REQUIRES_MANUAL_IMPORT", receiptId };
  }

  // 6. TÃ¬m mapping tháº» trong database
  // Resolve the full debit account first; suffix matching remains legacy fallback only.
  const resolvedDebtAsset = await resolvePersonalDebtAssetInTrx(trx, {
    maskedSuffix: parsed.maskedSuffix,
    sourceAccountNumber: parsed.sourceAccountNumber,
  });
  const personalDebtAsset = resolvedDebtAsset
    && !["CREDIT_CARD", "OVERDRAFT"].includes(resolvedDebtAsset[C_ASSET.DEBT_KIND])
    ? resolvedDebtAsset
    : null;
  let mapping = await resolveInstrumentMappingInTrx(trx, {
    instrumentKind: parsed.instrumentKind,
    maskedSuffix: parsed.maskedSuffix,
    sourceAccountNumber: parsed.sourceAccountNumber,
  });
  if (resolvedDebtAsset && ["CREDIT_CARD", "OVERDRAFT"].includes(resolvedDebtAsset[C_ASSET.DEBT_KIND])) {
    const linkedCreditAccount = await trx(TABLES.CREDIT_ACCOUNTS)
      .where(COLS.CREDIT_ACCOUNTS.PERSONAL_ASSET_ID, resolvedDebtAsset[C_ASSET.ID])
      .first();
    if (linkedCreditAccount) {
      mapping = { ...(mapping || {}), linked_credit_account_id: linkedCreditAccount.id };
    }
  }
  if (!mapping && (!personalDebtAsset || !canRecordPersonalDebtMovement(parsed))) {
    const failureCode = personalDebtAsset ? "PAYMENT_SOURCE_ACCOUNT_REQUIRED" : "UNMAPPED_BANK_INSTRUMENT";
    await trx(TABLES.EMAIL_INGESTION_RECEIPTS)
      .where("id", receiptId)
      .update({
        [C_REC.STATUS]: "MANUAL_REVIEW",
        [C_REC.FAILURE_CODE]: failureCode,
        [C_REC.TERMINAL_AT]: trx.fn.now(),
        [C_REC.UPDATED_AT]: trx.fn.now(),
      });
    if (emailUid > Number(checkpoint[C_CHK.LAST_TERMINAL_UID])) {
      await trx(TABLES.EMAIL_SYNC_CHECKPOINTS).where(C_CHK.ID, checkpoint[C_CHK.ID]).update({
        [C_CHK.LAST_TERMINAL_UID]: emailUid,
        [C_CHK.UPDATED_AT]: trx.fn.now(),
      });
    }
    return {
      status: "MANUAL_REVIEW",
      failureCode,
      maskedSuffix: parsed.maskedSuffix,
      receiptId,
    };
  }

  // 7. Táº¡o businessKey duy nháº¥t chá»‘ng háº¡ch toÃ¡n 2 láº§n
  const businessKey = parsed.referenceCode
    ? `${parsed.instrumentKind}:${parsed.sourceAccountNumber || parsed.maskedSuffix}:${parsed.referenceCode}`
    : `${parsed.instrumentKind}:${parsed.sourceAccountNumber || parsed.maskedSuffix}:${parsed.occurredAt}:${parsed.amount}`;

  let ledgerId = null;
  let personalDebitLogId = null;
  let personalDebtPaymentLogId = null;

  // 8. Háº¡ch toÃ¡n theo Loáº¡i Dá»¥ng Cá»¥ (Credit Card vs Debit Card)
  if (personalDebtAsset) {
    const debtBusinessKey = parsed.referenceCode
      ? `PERSONAL_DEBT:${personalDebtAsset[C_ASSET.ID]}:${parsed.referenceCode}`
      : `VPBANK_EMAIL_${receiptId}`;
    const observations = observedValueNote(parsed);
    const debtResult = await borrowPersonalAssetInTrx(trx, personalDebtAsset[C_ASSET.ID], {
      amount: parsed.amount,
      merchantName: parsed.merchantNormalized,
      effectiveAt: parsed.occurredAt,
      referenceCode: parsed.referenceCode || debtBusinessKey,
      idempotencyKey: debtBusinessKey,
      directExpense: true,
      note: [
        `VPBank email ${parsed.transactionKind || parsed.direction || "OUTFLOW"}`,
        parsed.merchantNormalized || null,
        observations,
      ].filter(Boolean).join(" | "),
    });
    personalDebtPaymentLogId = debtResult.logId;
  } else if (mapping?.linked_credit_account_id) {
    const creditAccountId = Number(mapping.linked_credit_account_id);
    const creditAccount = await trx(TABLES.CREDIT_ACCOUNTS)
      .where(COLS.CREDIT_ACCOUNTS.ID, creditAccountId)
      .first();
    if (!creditAccount) throw new Error("Mapped credit account không tồn tại");
    const isPayment = parsed.transactionKind === "CARD_PAYMENT" || parsed.direction === "INFLOW";
    const res = isPayment
      ? await recordPaymentInTrx(trx, creditAccountId, {
        amount: parsed.amount,
        effectiveAt: parsed.occurredAt,
        sourceReference: parsed.referenceCode || `VPB_EMAIL_${emailUid}`,
        idempotencyKey: businessKey,
        note: `VPBank Email: ${parsed.merchantNormalized}`,
      })
      : await recordPrincipalInTrx(trx, creditAccountId, {
        amount: parsed.amount,
        eventType: creditAccount.product_kind === "OVERDRAFT" ? "OVERDRAFT_DRAW" : "CARD_SPEND",
        effectiveAt: parsed.occurredAt,
        sourceReference: parsed.referenceCode || `VPB_EMAIL_${emailUid}`,
        idempotencyKey: businessKey,
        metadata: { merchant: parsed.merchantNormalized, emailUid, receiptId, sourceAccountNumber: parsed.sourceAccountNumber || null },
      });
    ledgerId = res.ledger?.id || res.ledgerId || null;

  } else if (mapping?.linked_financial_account_id) {
    const financialAccountId = Number(mapping.linked_financial_account_id);
    const res = await recordPersonalDebitTransactionInTrx(trx, {
      financialAccountId,
      direction: parsed.direction,
      amount: parsed.amount,
      merchantNormalized: parsed.merchantNormalized,
      occurredAt: parsed.occurredAt,
      observedBalanceAfter: parsed.observedBalanceAfter,
      businessKey,
      source: "VPBANK_EMAIL_SYNC",
      instrumentMask: parsed.sourceAccountNumber ? `VPBank ${parsed.sourceAccountNumber}` : `VPBank *${parsed.maskedSuffix}`,
      note: parsed.referenceCode ? `Ref: ${parsed.referenceCode}` : null,
    });
    personalDebitLogId = res.transaction.id;
  } else {
    throw new Error("Mapped bank instrument has no valid target");
  }
  // 9. Cáº­p nháº­t Receipt thÃ nh APPLIED
  await trx(TABLES.EMAIL_INGESTION_RECEIPTS)
    .where("id", receiptId)
    .update({
      [C_REC.STATUS]: "APPLIED",
      [C_REC.INSTRUMENT_MAPPING_ID]: mapping ? mapping.id : null,
      [C_REC.BUSINESS_KEY]: businessKey,
      [C_REC.TRANSACTION_KIND]: parsed.transactionKind,
      [C_REC.LEDGER_ID]: ledgerId,
      [C_REC.PERSONAL_DEBIT_TRANSACTION_LOG_ID]: personalDebitLogId,
      [C_REC.PERSONAL_DEBT_PAYMENT_LOG_ID]: personalDebtPaymentLogId,
      [C_REC.FAILURE_CODE]: null,
      [C_REC.FAILURE_MESSAGE]: null,
      [C_REC.METADATA]: {
        availableLimitObserved: parsed.availableLimitObserved || null,
        observedBalanceAfter: parsed.observedBalanceAfter || null,
      },
      [C_REC.TERMINAL_AT]: trx.fn.now(),
      [C_REC.UPDATED_AT]: trx.fn.now(),
    });

  // 10. Cáº­p nháº­t checkpoint terminal UID
  if (emailUid > Number(checkpoint[C_CHK.LAST_TERMINAL_UID])) {
    await trx(TABLES.EMAIL_SYNC_CHECKPOINTS)
      .where(C_CHK.ID, checkpoint[C_CHK.ID])
      .update({
        [C_CHK.LAST_TERMINAL_UID]: emailUid,
        [C_CHK.LAST_SUCCESS_AT]: trx.fn.now(),
        [C_CHK.LAST_ERROR_CODE]: null,
        [C_CHK.LAST_ERROR_MESSAGE]: null,
        [C_CHK.UPDATED_AT]: trx.fn.now(),
      });
  }

  return {
    status: "APPLIED",
    receiptId,
    businessKey,
    ledgerId,
    personalDebitLogId,
    personalDebtPaymentLogId,
    amount: parsed.amount,
  };
}

async function ingestEmailMessage(emailData, options = {}) {
  return withTransaction((trx) => processEmailMessageInTrx(trx, emailData, options));
}

module.exports = {
  ingestEmailMessage,
  processEmailMessageInTrx,
};




