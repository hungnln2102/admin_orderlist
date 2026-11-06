/**
 * VPBank Email Parser Engine (Pure Function)
 *
 * Parses VPBank transaction notifications without accessing persistence.
 */

const TRUSTED_SENDER_ADDRESSES = Object.freeze([
  "customercare@care.vpb.com.vn",
  "vpbankonline@vpb.com.vn",
]);
const TRUSTED_SENDER_DKIM_DOMAINS = new Map([
  ["customercare@care.vpb.com.vn", /header\.(?:d|i)=@?care\.vpb\.com\.vn/],
  ["vpbankonline@vpb.com.vn", /header\.(?:d|i)=@?vpb\.com\.vn/],
]);

function normalizeHtmlToLines(htmlOrText) {
  if (!htmlOrText) return "";
  return String(htmlOrText)
    .replace(/<br\s*[\/]?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/[ \t]+/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function normalizeForMatch(value) {
  const raw = String(value || "");
  let repaired = raw;
  if (/[\u00c2\u00c3\u00c4\u00c6]/.test(raw)) {
    try {
      const decoded = Buffer.from(raw, "latin1").toString("utf8");
      if (!decoded.includes("\ufffd")) repaired = decoded;
    } catch {
      repaired = raw;
    }
  }
  return repaired
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0111/g, "d")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function parseVNDAmount(raw) {
  if (!raw) return null;
  const cleaned = String(raw)
    .replace(/[VNDvnd\u0111\u0110]/g, "")
    .replace(/[+\-]/g, "")
    .trim();

  let numStr = cleaned;
  if (numStr.includes(".") && numStr.includes(",")) {
    if (numStr.lastIndexOf(",") > numStr.lastIndexOf(".")) numStr = numStr.replace(/\./g, "").replace(",", ".");
    else numStr = numStr.replace(/,/g, "");
  } else if (numStr.includes(".")) numStr = numStr.replace(/\./g, "");
  else if (numStr.includes(",")) numStr = numStr.replace(/,/g, "");

  const num = parseFloat(numStr);
  return Number.isFinite(num) ? Math.abs(num) : null;
}

function parseDateTimeVN(dateStr) {
  if (!dateStr) return null;
  const match = String(dateStr).match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (!match) {
    const date = new Date(dateStr);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  const [, day, month, year, hour = "00", minute = "00", second = "00"] = match;
  const pad = (value) => String(value).padStart(2, "0");
  return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:${pad(second)}+07:00`;
}

function extractCardSuffix(text) {
  if (!text) return null;
  const value = String(text);
  const match = value.match(/(?:visa|mastercard|jcb|th\u1ebb|t\u00e0i kho\u1ea3n|tk)?\s*[\*xX]{1,12}(\d{4})\b/i)
    || value.match(/\b\d{4}[xX*]{2,8}(\d{4})\b/)
    || value.match(/(?:s\u1ed1 th\u1ebb|s\u1ed1 t\u00e0i kho\u1ea3n|card number|account number)[:\s]+[^\d\n]*(\d{4})\b/i)
    || value.match(/\b[\*xX]{1,12}(\d{4})\b/);
  return match ? match[1] : null;
}

function extractSenderAddress(sender) {
  if (!sender) return "";
  if (typeof sender === "object") return String(sender.value?.[0]?.address || sender.text || "").trim().toLowerCase();
  const match = String(sender).match(/<([^>]+)>/);
  return String(match?.[1] || sender).trim().toLowerCase();
}

function isSenderAuthenticated(sender, email) {
  const authenticationResults = String(email.authenticationResults || "").toLowerCase();
  const expectedDkimDomain = TRUSTED_SENDER_DKIM_DOMAINS.get(extractSenderAddress(sender));
  return /dkim=pass/.test(authenticationResults) && Boolean(expectedDkimDomain?.test(authenticationResults));
}

function isSenderValid(sender, email = {}) {
  return TRUSTED_SENDER_DKIM_DOMAINS.has(extractSenderAddress(sender)) && isSenderAuthenticated(sender, email);
}

function extractAmountCandidate(line) {
  const match = String(line || "").match(/([+\-]?\s*[\d.,]+\s*(?:VND|\u0111|USD))/i);
  return match ? match[1] : null;
}

function extractAdjacentAmount(lines, labelPattern) {
  for (let index = 0; index < lines.length; index += 1) {
    if (!labelPattern.test(normalizeForMatch(lines[index]))) continue;
    for (const candidateIndex of [index, index - 1, index + 1]) {
      if (candidateIndex < 0 || candidateIndex >= lines.length) continue;
      const amount = extractAmountCandidate(lines[candidateIndex]);
      if (amount) return amount;
    }
  }
  return null;
}

function extractAdjacentReference(lines) {
  const labelPattern = /ma giao dich|ma chuan chi|so chuan chi|reference code|trace number|ma tham chieu|trans id|transaction code/;
  for (let index = 0; index < lines.length; index += 1) {
    if (!labelPattern.test(normalizeForMatch(lines[index]))) continue;
    for (const candidateIndex of [index, index - 1, index + 1]) {
      if (candidateIndex < 0 || candidateIndex >= lines.length) continue;
      const match = String(lines[candidateIndex]).match(/\b(?=[A-Z0-9_-]*\d)[A-Z0-9_-]{6,}\b/i);
      if (match) return match[0];
    }
  }
  return null;
}

function extractMerchant(lines, isCreditCard, isPaymentToCard) {
  const labels = /noi dung chuyen tien|don vi chap nhan thanh toan|noi giao dich|merchant|noi dung giao dich|noi dung|mo ta/;
  for (let index = 0; index < lines.length; index += 1) {
    const raw = String(lines[index] || "").trim();
    if (!labels.test(normalizeForMatch(raw))) continue;
    const afterColon = raw.split(/[:\-]/).slice(1).join(" ").trim();
    if (afterColon) return afterColon;
    for (const candidateIndex of [index - 1, index + 1]) {
      const candidate = String(lines[candidateIndex] || "").trim();
      if (!candidate || extractAmountCandidate(candidate)) continue;
      if (/\d{1,2}[\/-]\d{1,2}[\/-]\d{4}|\b(?:FT|VPB)\d{6,}/i.test(candidate)) continue;
      return candidate;
    }
  }
  if (isPaymentToCard) return "Thanh toan du no the tin dung";
  if (isCreditCard) return "Chi tieu the tin dung";
  return "Giao dich the ghi no";
}

function extractDebitAccountNumber(lines) {
  for (let index = 0; index < lines.length; index += 1) {
    if (!/tai khoan trich no|debit account/i.test(normalizeForMatch(lines[index]))) continue;
    const candidates = [lines[index], lines[index + 1]].filter(Boolean).join(" ");
    const match = candidates.match(/\b\d{6,20}\b/);
    if (match) return match[0];
  }
  return null;
}
function parseVpbankEmail(email) {
  const subject = String(email.subject || "").trim();
  const rawSender = email.from ? (typeof email.from === "object" ? (email.from.text || email.from.value?.[0]?.address) : String(email.from)) : "";
  const linesText = normalizeHtmlToLines(email.text || email.html || "");
  const lines = linesText.split("\n").map((line) => line.trim()).filter(Boolean);
  const fullContent = `${subject}\n${linesText}`;
  const normalizedContent = normalizeForMatch(fullContent);
  const normalizedSubject = normalizeForMatch(subject);
  const senderValid = isSenderValid(rawSender, email);

  if (/ma xac thuc|\botp\b|chuc mung|uu dai|khuyen mai|thong bao bao tri|canh giac/.test(normalizedSubject) || (!subject && !linesText)) {
    return { documentKind: "NON_TRANSACTION", instrumentKind: "UNKNOWN", confidence: senderValid ? "HIGH" : "LOW", senderValid, isFinancial: false };
  }

  const isStatement = /sao ke|statement/.test(normalizedSubject) || /thong bao sao ke|ky sao ke/.test(normalizedContent);
  if (isStatement) {
    const maskedSuffix = extractCardSuffix(fullContent);
    const isCredit = /the tin dung|credit/.test(normalizedContent);
    return { documentKind: isCredit ? "CREDIT_CARD_STATEMENT" : "DEBIT_ACCOUNT_STATEMENT", instrumentKind: isCredit ? "CREDIT_CARD" : "DEBIT_CARD", maskedSuffix, confidence: "HIGH", senderValid, isFinancial: true, requiresManualStatementImport: true };
  }

  const isCreditCard = /the tin dung|credit card|han muc kha dung|visa|mastercard|jcb/.test(normalizedContent);
  const isPaymentToCard = /thanh toan (thanh cong )?the|thanh toan du no|nap tien the|hoan tat thanh toan/.test(normalizedContent)
    || (isCreditCard && /\+\s*[\d.,]+\s*(?:vnd|\u0111)/i.test(fullContent));
  let rawAmount = extractAdjacentAmount(lines, /so tien|changed amount|amount/);
  if (!rawAmount) {
    const amountMatch = fullContent.match(/([+\-]\s*[\d.,]+\s*(?:VND|\u0111))/i);
    rawAmount = amountMatch ? amountMatch[1] : null;
  }
  const amount = parseVNDAmount(rawAmount);
  const dateMatch = fullContent.match(/(\d{1,2}[\/-]\d{1,2}[\/-]\d{4}\s+\d{1,2}:\d{1,2}(?::\d{1,2})?)/);
  const occurredAt = parseDateTimeVN(dateMatch?.[1]) || (email.date ? new Date(email.date).toISOString() : new Date().toISOString());
  let referenceCode = extractAdjacentReference(lines);
  if (!referenceCode) {
    const referenceMatch = fullContent.match(/\b(VPB\d{14,20})\b/i) || fullContent.match(/\b(FT\d{12,18})\b/i);
    referenceCode = referenceMatch ? referenceMatch[1] : null;
  }
  const merchant = extractMerchant(lines, isCreditCard, isPaymentToCard).replace(/\s+/g, " ").trim();
  const maskedSuffix = extractCardSuffix(fullContent);
  const sourceAccountNumber = extractDebitAccountNumber(lines);
  const rawAvailable = extractAdjacentAmount(lines, /han muc kha dung sau thanh toan|han muc kha dung con lai|han muc sau thanh toan|han muc con lai|han muc kha dung|so du kha dung sau giao dich|so du kha dung con lai|so du kha dung|so du con lai|so du tai khoan|available limit|available balance/);
  const observedBalance = parseVNDAmount(rawAvailable);

  if (isCreditCard) {
    return { documentKind: "CREDIT_CARD_TRANSACTION", instrumentKind: "CREDIT_CARD", maskedSuffix, sourceAccountNumber, transactionKind: isPaymentToCard ? "CARD_PAYMENT" : "CARD_SPEND", amount, occurredAt, merchantNormalized: merchant, referenceCode: referenceCode || null, availableLimitObserved: observedBalance, observedBalanceAfter: null, confidence: amount && (maskedSuffix || sourceAccountNumber) ? "HIGH" : "MEDIUM", senderValid, isFinancial: Boolean(amount && amount > 0) };
  }

  const isOutflow = /-\s*[\d.,]+/.test(rawAmount || "") || /rut tien|thanh toan|chuyen tien di|chi tieu/.test(normalizedContent);
  const direction = /trich no/.test(normalizedContent) ? "OUTFLOW" : (isOutflow ? "OUTFLOW" : "INFLOW");
  return { documentKind: "DEBIT_CARD_TRANSACTION", instrumentKind: maskedSuffix ? "DEBIT_CARD" : "UNKNOWN", maskedSuffix, sourceAccountNumber, transactionKind: direction, direction, amount, occurredAt, merchantNormalized: merchant, referenceCode: referenceCode || null, observedBalanceAfter: observedBalance, availableLimitObserved: null, confidence: amount && (maskedSuffix || sourceAccountNumber) ? "HIGH" : "MEDIUM", senderValid, isFinancial: Boolean(amount && amount > 0) };
}

module.exports = { TRUSTED_SENDER_ADDRESSES, extractCardSuffix, extractSenderAddress, isSenderValid, normalizeHtmlToLines, parseDateTimeVN, parseVNDAmount, parseVpbankEmail };
