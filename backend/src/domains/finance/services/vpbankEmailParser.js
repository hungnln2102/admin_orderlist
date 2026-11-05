/**
 * VPBank Email Parser Engine (Pure Function)
 * 
 * BÃ³c tÃ¡ch ná»™i dung email biáº¿n Ä‘á»™ng tá»« VPBank (customercare@care.vpb.com.vn).
 * KhÃ´ng truy cáº­p Database, khÃ´ng lÆ°u tráº¡ng thÃ¡i (Stateless & Pure).
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

function parseVNDAmount(raw) {
  if (!raw) return null;
  const cleaned = String(raw)
    .replace(/[VNDvndÄ‘Ä]/g, "")
    .replace(/[\+\-]/g, "")
    .trim();
  
  let numStr = cleaned;
  if (numStr.includes(".") && numStr.includes(",")) {
    if (numStr.lastIndexOf(",") > numStr.lastIndexOf(".")) {
      numStr = numStr.replace(/\./g, "").replace(",", ".");
    } else {
      numStr = numStr.replace(/,/g, "");
    }
  } else if (numStr.includes(".")) {
    numStr = numStr.replace(/\./g, "");
  } else if (numStr.includes(",")) {
    numStr = numStr.replace(/,/g, "");
  }

  const num = parseFloat(numStr);
  return Number.isFinite(num) ? Math.abs(num) : null;
}

function parseDateTimeVN(dateStr) {
  if (!dateStr) return null;
  const match = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (!match) {
    const d = new Date(dateStr);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }

  const [, day, month, year, hour = "00", minute = "00", second = "00"] = match;
  const pad = (n) => String(n).padStart(2, "0");
  return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:${pad(second)}+07:00`;
}

function extractCardSuffix(text) {
  if (!text) return null;
  // TÃ¬m máº«u tháº»: VISA *2340, *2340, 4541xxxx0985, 1234xxxx8181
  const match = text.match(/(?:VISA|MasterCard|JCB|tháº»|tÃ i khoáº£n|TK)?\s*[\*xX]{1,12}(\d{4})\b/i)
    || text.match(/\b\d{4}[xX*]{2,8}(\d{4})\b/)
    || text.match(/(?:sá»‘ tháº»|sá»‘ tÃ i khoáº£n|card number|account number)[:\s]+[^\d\n]*(\d{4})\b/i)
    || text.match(/\b[\*xX]{1,12}(\d{4})\b/);
  return match ? match[1] : null;
}

function extractLineValue(linesText, labelPatterns) {
  for (const line of linesText.split("\n")) {
    const trimmed = line.trim();
    for (const pattern of labelPatterns) {
      const match = trimmed.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
  }
  return null;
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
  return /dkim=pass/.test(authenticationResults)
    && Boolean(expectedDkimDomain?.test(authenticationResults));
}

function isSenderValid(sender, email = {}) {
  return TRUSTED_SENDER_DKIM_DOMAINS.has(extractSenderAddress(sender)) && isSenderAuthenticated(sender, email);
}

/**
 * Main Pure Parser
 * @param {Object} email { subject, text, html, from, date, messageId }
 * @returns {Object} Parsed Result
 */
function parseVpbankEmail(email) {
  const subject = String(email.subject || "").trim();
  const rawSender = email.from ? (typeof email.from === "object" ? (email.from.text || email.from.value?.[0]?.address) : String(email.from)) : "";
  const linesText = normalizeHtmlToLines(email.text || email.html || "");
  const fullContent = `${subject}\n${linesText}`;

  const senderValid = isSenderValid(rawSender, email);

  // 1. Non-transaction
  const isOtpOrMarketing = /mÃ£ xÃ¡c thá»±c|otp|chÃºc má»«ng|Æ°u Ä‘Ã£i|khuyáº¿n máº¡i|thÃ´ng bÃ¡o báº£o trÃ¬|cáº£nh giÃ¡c/i.test(subject);
  if (isOtpOrMarketing || (!subject && !linesText)) {
    return {
      documentKind: "NON_TRANSACTION",
      instrumentKind: "UNKNOWN",
      confidence: senderValid ? "HIGH" : "LOW",
      senderValid,
      isFinancial: false,
    };
  }

  // 2. Statement
  const isStatement = /sao kÃª|statement/i.test(subject) || /thÃ´ng bÃ¡o sao kÃª|ká»³ sao kÃª/i.test(linesText);
  if (isStatement) {
    const maskedSuffix = extractCardSuffix(fullContent);
    const isCredit = /tháº» tÃ­n dá»¥ng|credit/i.test(fullContent);
    return {
      documentKind: isCredit ? "CREDIT_CARD_STATEMENT" : "DEBIT_ACCOUNT_STATEMENT",
      instrumentKind: isCredit ? "CREDIT_CARD" : "DEBIT_CARD",
      maskedSuffix,
      confidence: "HIGH",
      senderValid,
      isFinancial: true,
      requiresManualStatementImport: true,
    };
  }

  // 3. Transactions
  const isCreditCard = /tháº» tÃ­n dá»¥ng|credit card|háº¡n má»©c kháº£ dá»¥ng/i.test(fullContent) || /visa|mastercard|jcb/i.test(fullContent);
  const isPaymentToCard = /thanh toÃ¡n (?:thÃ nh cÃ´ng )?tháº»|thanh toÃ¡n dÆ° ná»£|náº¡p tiá»n tháº»|hoÃ n táº¥t thanh toÃ¡n/i.test(fullContent)
    || (isCreditCard && /\+\s*[\d\.,]+\s*(?:vnd|Ä‘)/i.test(fullContent));

  // Extract Amount
  let rawAmount = extractLineValue(linesText, [
    /s\u1ed1 ti\u1ec1n (?:tr\u00edch n\u1ee3|ghi c\u00f3)[:\s]+([\+\-]?\s*[\d\.,]+\s*(?:VND|\u0111|USD))/i,
    /(?:sá»‘ tiá»n giao dá»‹ch|sá»‘ tiá»n thanh toÃ¡n|sá»‘ tiá»n|amount)[:\s]+([\+\-]?\s*[\d\.,]+\s*(?:VND|Ä‘|USD))/i,
    /(?:thanh toÃ¡n|chi tiÃªu|rÃºt tiá»n)\s+([\d\.,]+\s*(?:VND|Ä‘))/i,
  ]);
  if (!rawAmount) {
    const amountMatch = fullContent.match(/([\+\-]\s*[\d\.,]+\s*(?:VND|Ä‘))/i);
    rawAmount = amountMatch ? amountMatch[1] : null;
  }
  const amount = parseVNDAmount(rawAmount);

  // Extract Occurred At
  const rawDate = extractLineValue(linesText, [
    /(?:thá»i gian giao dá»‹ch|thá»i gian|ngÃ y giao dá»‹ch|date|time)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}(?:\s+\d{1,2}:\d{1,2}(?::\d{1,2})?)?)/i,
    /lÃºc\s+(\d{1,2}:\d{1,2}(?::\d{1,2})?\s+ngÃ y\s+\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i,
  ]) || extractLineValue(fullContent, [
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}\s+\d{1,2}:\d{1,2}(?::\d{1,2})?)/,
  ]);
  const occurredAt = parseDateTimeVN(rawDate) || (email.date ? new Date(email.date).toISOString() : new Date().toISOString());

  // Extract Reference Code
  let referenceCode = extractLineValue(linesText, [
    /(?:mÃ£ giao dá»‹ch|mÃ£ chuáº©n chi|sá»‘ chuáº©n chi|reference code|trace number|mÃ£ tham chiáº¿u|trans id)[:\s]+([a-zA-Z0-9_\-]+)/i,
  ]);
  if (!referenceCode) {
    const refMatch = fullContent.match(/\b(VPB\d{14,20})\b/i) || fullContent.match(/\b(FT\d{12,18})\b/i);
    referenceCode = refMatch ? refMatch[1] : null;
  }

  // Extract Merchant
  let merchant = extractLineValue(linesText, [
    /n\u1ed9i dung chuy\u1ec3n ti\u1ec1n[:\s]+(.+)/i,
    /(?:Ä‘Æ¡n vá»‹ cháº¥p nháº­n thanh toÃ¡n|nÆ¡i giao dá»‹ch|táº¡i|merchant)[:\s]+(.+)/i,
    /(?:ná»™i dung giao dá»‹ch|ná»™i dung|mÃ´ táº£)[:\s]+(.+)/i,
  ]);
  if (!merchant) {
    if (isPaymentToCard) merchant = "Thanh toÃ¡n dÆ° ná»£ tháº» tÃ­n dá»¥ng";
    else if (isCreditCard) merchant = "Chi tiÃªu tháº» tÃ­n dá»¥ng";
    else merchant = "Giao dá»‹ch tháº» ghi ná»£";
  }
  merchant = merchant.replace(/\s+/g, " ").trim();

  // Extract Masked Suffix
  const maskedSuffix = extractCardSuffix(fullContent);

  // Extract Available Limit / Balance
  const rawAvailable = extractLineValue(linesText, [
    /(?:háº¡n má»©c kháº£ dá»¥ng sau thanh toÃ¡n|háº¡n má»©c kháº£ dá»¥ng cÃ²n láº¡i|háº¡n má»©c sau thanh toÃ¡n|háº¡n má»©c cÃ²n láº¡i|háº¡n má»©c kháº£ dá»¥ng)[:\s]+([\d\.,]+\s*(?:VND|Ä‘))/i,
    /(?:sá»‘ dÆ° kháº£ dá»¥ng sau giao dá»‹ch|sá»‘ dÆ° kháº£ dá»¥ng cÃ²n láº¡i|sá»‘ dÆ° kháº£ dá»¥ng|sá»‘ dÆ° cÃ²n láº¡i|sá»‘ dÆ° tÃ i khoáº£n)[:\s]+([\d\.,]+\s*(?:VND|Ä‘))/i,
  ]);
  const observedBalance = parseVNDAmount(rawAvailable);

  // Credit Card
  if (isCreditCard) {
    const transactionKind = isPaymentToCard ? "CARD_PAYMENT" : "CARD_SPEND";
    return {
      documentKind: "CREDIT_CARD_TRANSACTION",
      instrumentKind: "CREDIT_CARD",
      maskedSuffix,
      transactionKind,
      amount,
      occurredAt,
      merchantNormalized: merchant,
      referenceCode: referenceCode || null,
      availableLimitObserved: observedBalance,
      observedBalanceAfter: null,
      confidence: amount && maskedSuffix ? "HIGH" : "MEDIUM",
      senderValid,
      isFinancial: Boolean(amount && amount > 0),
    };
  }

  // Debit Card
  const isOutflow = /\-\s*[\d\.,]+/i.test(rawAmount || "") || /rÃºt tiá»n|thanh toÃ¡n|chuyá»ƒn tiá»n Ä‘i|chi tiÃªu/i.test(fullContent);
  let direction = isOutflow ? "OUTFLOW" : "INFLOW";
  if (/tr\u00edch n\u1ee3/i.test(fullContent)) direction = "OUTFLOW";

  return {
    documentKind: "DEBIT_CARD_TRANSACTION",
    instrumentKind: maskedSuffix ? "DEBIT_CARD" : "UNKNOWN",
    maskedSuffix,
    transactionKind: direction,
    direction,
    amount,
    occurredAt,
    merchantNormalized: merchant,
    referenceCode: referenceCode || null,
    observedBalanceAfter: observedBalance,
    availableLimitObserved: null,
    confidence: amount && maskedSuffix ? "HIGH" : "MEDIUM",
    senderValid,
    isFinancial: Boolean(amount && amount > 0),
  };
}

module.exports = {
  TRUSTED_SENDER_ADDRESSES,
  extractCardSuffix,
  extractSenderAddress,
  isSenderValid,
  normalizeHtmlToLines,
  parseDateTimeVN,
  parseVNDAmount,
  parseVpbankEmail,
};


