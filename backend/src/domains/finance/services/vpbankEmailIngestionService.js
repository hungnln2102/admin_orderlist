/**
 * VPBank Email Ingestion Service
 * 
 * Äiá»u phá»‘i luá»“ng xá»­ lÃ½ email giao dá»‹ch ngÃ¢n hÃ ng theo chuáº©n ACID:
 * Checkpoint -> Parse -> Resolve Mapping -> Ghi Sá»• CÃ¡i (Credit / Debit) -> Outbox & Domain Event.
 */

const crypto = require("crypto");
const { db, TABLES, COLS, withTransaction } = require("@/db");
const { eventBus, EVENTS } = require("@/events");
const { parseVpbankEmail } = require("./vpbankEmailParser");
const { recordPrincipalInTrx, recordPaymentInTrx } = require("../credit/creditLedgerService");
const { recordPersonalDebitTransactionInTrx } = require("./personalDebitTransactionService");

const C_REC = COLS.EMAIL_INGESTION_RECEIPTS;
const C_CHK = COLS.EMAIL_SYNC_CHECKPOINTS;
const C_MAP = COLS.BANK_INSTRUMENT_MAPPINGS;

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

async function resolveInstrumentMappingInTrx(trx, { instrumentKind, maskedSuffix }) {
  if (!maskedSuffix) return null;
  return trx(TABLES.BANK_INSTRUMENT_MAPPINGS)
    .where({
      [C_MAP.PROVIDER]: "VPBANK",
      [C_MAP.INSTRUMENT_KIND]: instrumentKind,
      [C_MAP.MASKED_SUFFIX]: maskedSuffix,
      [C_MAP.STATUS]: "ACTIVE",
    })
    .first();
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

  if (existingReceipt && (existingReceipt.status === "APPLIED" || existingReceipt.status === "REJECTED" || existingReceipt.status === "MANUAL_REVIEW")) {
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
  const mapping = await resolveInstrumentMappingInTrx(trx, {
    instrumentKind: parsed.instrumentKind,
    maskedSuffix: parsed.maskedSuffix,
  });

  if (!mapping) {
    await trx(TABLES.EMAIL_INGESTION_RECEIPTS)
      .where("id", receiptId)
      .update({
        [C_REC.STATUS]: "MANUAL_REVIEW",
        [C_REC.FAILURE_CODE]: "UNMAPPED_BANK_INSTRUMENT",
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
      failureCode: "UNMAPPED_BANK_INSTRUMENT",
      maskedSuffix: parsed.maskedSuffix,
      receiptId,
    };
  }

  // 7. Táº¡o businessKey duy nháº¥t chá»‘ng háº¡ch toÃ¡n 2 láº§n
  const businessKey = parsed.referenceCode
    ? `${parsed.instrumentKind}:${parsed.maskedSuffix}:${parsed.referenceCode}`
    : `${parsed.instrumentKind}:${parsed.maskedSuffix}:${parsed.occurredAt}:${parsed.amount}`;

  let ledgerId = null;
  let personalDebitLogId = null;

  // 8. Háº¡ch toÃ¡n theo Loáº¡i Dá»¥ng Cá»¥ (Credit Card vs Debit Card)
  if (parsed.instrumentKind === "CREDIT_CARD") {
    const creditAccountId = mapping.linked_credit_account_id;
    if (parsed.transactionKind === "CARD_SPEND") {
      const res = await recordPrincipalInTrx(trx, creditAccountId, {
        amount: parsed.amount,
        eventType: "CARD_SPEND",
        effectiveAt: parsed.occurredAt,
        sourceReference: parsed.referenceCode || `VPB_EMAIL_${emailUid}`,
        idempotencyKey: businessKey,
        metadata: {
          merchant: parsed.merchantNormalized,
          emailUid,
          receiptId,
        },
      });
      ledgerId = res.ledgerId;
    } else if (parsed.transactionKind === "CARD_PAYMENT") {
      const res = await recordPaymentInTrx(trx, creditAccountId, {
        amount: parsed.amount,
        effectiveAt: parsed.occurredAt,
        sourceReference: parsed.referenceCode || `VPB_EMAIL_${emailUid}`,
        idempotencyKey: businessKey,
        note: `VPBank Email: ${parsed.merchantNormalized}`,
      });
      ledgerId = res.paymentLedgerId || res.ledgerId;
    }

    trx.afterCommit(() => {
      eventBus.emit(EVENTS.FINANCE_CARD_TRANSACTION_SYNCED, {
        creditAccountId,
        ledgerId,
        amount: parsed.amount,
        transactionKind: parsed.transactionKind,
      });
    });
  } else if (parsed.instrumentKind === "DEBIT_CARD") {
    const financialAccountId = mapping.linked_financial_account_id;
    const res = await recordPersonalDebitTransactionInTrx(trx, {
      financialAccountId,
      direction: parsed.direction,
      amount: parsed.amount,
      merchantNormalized: parsed.merchantNormalized,
      occurredAt: parsed.occurredAt,
      observedBalanceAfter: parsed.observedBalanceAfter,
      businessKey,
      source: "VPBANK_EMAIL_SYNC",
      instrumentMask: `VPBank *${parsed.maskedSuffix}`,
      note: parsed.referenceCode ? `Ref: ${parsed.referenceCode}` : null,
    });
    personalDebitLogId = res.transaction.id;
  }

  // 9. Cáº­p nháº­t Receipt thÃ nh APPLIED
  await trx(TABLES.EMAIL_INGESTION_RECEIPTS)
    .where("id", receiptId)
    .update({
      [C_REC.STATUS]: "APPLIED",
      [C_REC.INSTRUMENT_MAPPING_ID]: mapping.id,
      [C_REC.BUSINESS_KEY]: businessKey,
      [C_REC.TRANSACTION_KIND]: parsed.transactionKind,
      [C_REC.LEDGER_ID]: ledgerId,
      [C_REC.PERSONAL_DEBIT_TRANSACTION_LOG_ID]: personalDebitLogId,
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




