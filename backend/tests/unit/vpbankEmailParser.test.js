const test = require("node:test");
const assert = require("node:assert/strict");
const { parseVpbankEmail, parseVNDAmount, parseDateTimeVN, extractCardSuffix } = require("../../src/domains/finance/services/vpbankEmailParser");

test("VPBank Email Parser Suite", async (t) => {
  await t.test("1. parseVNDAmount chuyá»ƒn Ä‘á»•i chÃ­nh xÃ¡c cÃ¡c Ä‘á»‹nh dáº¡ng tiá»n tá»‡ VNÄ", () => {
    assert.equal(parseVNDAmount("150,000 VND"), 150000);
    assert.equal(parseVNDAmount("1.500.000 Ä‘"), 1500000);
    assert.equal(parseVNDAmount("- 350.000 VND"), 350000);
    assert.equal(parseVNDAmount("+ 1,451,834 Ä‘"), 1451834);
    assert.equal(parseVNDAmount(null), null);
    assert.equal(parseVNDAmount("invalid"), null);
  });

  await t.test("2. parseDateTimeVN parse chÃ­nh xÃ¡c ngÃ y giá» sang Ä‘á»‹nh dáº¡ng ISO GMT+7", () => {
    const iso = parseDateTimeVN("03/11/2026 18:39:41");
    assert.equal(iso, "2026-11-03T18:39:41+07:00");
  });

  await t.test("3. extractCardSuffix trÃ­ch xuáº¥t Ä‘Ãºng 4 sá»‘ cuá»‘i tháº»", () => {
    assert.equal(extractCardSuffix("Tháº» VISA *2340 cá»§a QuÃ½ khÃ¡ch"), "2340");
    assert.equal(extractCardSuffix("Giao dá»‹ch tháº» 4541xxxx0985 thÃ nh cÃ´ng"), "0985");
    assert.equal(extractCardSuffix("Sá»‘ tÃ i khoáº£n: 1234xxxx8181"), "8181");
  });

  await t.test("4. BÃ³c tÃ¡ch email chi tiÃªu tháº» tÃ­n dá»¥ng (CARD_SPEND)", () => {
    const email = {
      subject: "ThÃ´ng bÃ¡o giao dá»‹ch tháº» tÃ­n dá»¥ng quá»‘c táº¿ VPBank",
      from: "customercare@care.vpb.com.vn",
      authenticationResults: "mx.google.com; dkim=pass header.d=care.vpb.com.vn;",
      text: `
        KÃ­nh gá»­i QuÃ½ khÃ¡ch,
        Tháº» tÃ­n dá»¥ng quá»‘c táº¿ VISA *2340 vá»«a phÃ¡t sinh giao dá»‹ch:
        - Sá»‘ tiá»n giao dá»‹ch: - 150,000 VND
        - Thá»i gian: 03/11/2026 18:39:41
        merchant: Foody
        - MÃ£ chuáº©n chi: 987654
        - Háº¡n má»©c kháº£ dá»¥ng cÃ²n láº¡i: 18,242,622 VND
        TrÃ¢n trá»ng cáº£m Æ¡n QuÃ½ khÃ¡ch!
      `,
    };

    const result = parseVpbankEmail(email);
    assert.equal(result.documentKind, "CREDIT_CARD_TRANSACTION");
    assert.equal(result.instrumentKind, "CREDIT_CARD");
    assert.equal(result.transactionKind, "CARD_SPEND");
    assert.equal(result.maskedSuffix, "2340");
    assert.equal(result.amount, 150000);
    assert.equal(result.occurredAt, "2026-11-03T18:39:41+07:00");
    assert.equal(result.merchantNormalized, "Foody");
    assert.equal(result.referenceCode, "987654");
    assert.equal(result.availableLimitObserved, 18242622);
    assert.equal(result.isFinancial, true);
    assert.equal(result.senderValid, true);
  });

  await t.test("5. BÃ³c tÃ¡ch email thanh toÃ¡n dÆ° ná»£ tháº» tÃ­n dá»¥ng (+ CARD_PAYMENT)", () => {
    const email = {
      subject: "ThÃ´ng bÃ¡o thanh toÃ¡n tháº» tÃ­n dá»¥ng thÃ nh cÃ´ng",
      from: "customercare@care.vpb.com.vn",
      authenticationResults: "mx.google.com; dkim=pass header.d=care.vpb.com.vn;",
      text: `
        QuÃ½ khÃ¡ch Ä‘Ã£ thanh toÃ¡n thÃ nh cÃ´ng dÆ° ná»£ tháº» tÃ­n dá»¥ng VISA *2340:
        Sá»‘ tiá»n thanh toÃ¡n: + 337,331 VND
        Thá»i gian giao dá»‹ch: 03/11/2026 00:25:10
        MÃ£ giao dá»‹ch: VPB2611032491547559
        Háº¡n má»©c kháº£ dá»¥ng sau thanh toÃ¡n: 18,384,522 VND
      `,
    };

    const result = parseVpbankEmail(email);
    assert.equal(result.documentKind, "CREDIT_CARD_TRANSACTION");
    assert.equal(result.instrumentKind, "CREDIT_CARD");
    assert.equal(result.transactionKind, "CARD_PAYMENT");
    assert.equal(result.maskedSuffix, "2340");
    assert.equal(result.amount, 337331);
    assert.equal(result.referenceCode, "VPB2611032491547559");
    assert.equal(result.availableLimitObserved, 18384522);
    assert.equal(result.isFinancial, true);
  });

  await t.test("6. BÃ³c tÃ¡ch email biáº¿n Ä‘á»™ng sá»‘ dÆ° tháº» ghi ná»£ (DEBIT_CARD OUTFLOW)", () => {
    const email = {
      subject: "ThÃ´ng bÃ¡o biáº¿n Ä‘á»™ng sá»‘ dÆ° tÃ i khoáº£n thanh toÃ¡n",
      from: "customercare@care.vpb.com.vn",
      authenticationResults: "mx.google.com; dkim=pass header.d=care.vpb.com.vn;",
      text: `
        TÃ i khoáº£n 4541xxxx0985 biáº¿n Ä‘á»™ng:
        Sá»‘ tiá»n: - 2,000,000 VND
        Ná»™i dung: RÃºt tiá»n ATM ACB Hai Ba Trung
        Thá»i gian: 02/11/2026 14:15:00
        MÃ£ giao dá»‹ch: FT2611020019283
        Sá»‘ dÆ° kháº£ dá»¥ng: 4,888,568 VND
      `,
    };

    const result = parseVpbankEmail(email);
    assert.equal(result.documentKind, "DEBIT_CARD_TRANSACTION");
    assert.equal(result.instrumentKind, "DEBIT_CARD");
    assert.equal(result.direction, "OUTFLOW");
    assert.equal(result.maskedSuffix, "0985");
    assert.equal(result.amount, 2000000);
    assert.equal(result.merchantNormalized, "RÃºt tiá»n ATM ACB Hai Ba Trung");
    assert.equal(result.referenceCode, "FT2611020019283");
    assert.equal(result.observedBalanceAfter, 4888568);
    assert.equal(result.isFinancial, true);
  });

  await t.test("7. BÃ³c tÃ¡ch email sao kÃª Ä‘á»‹nh ká»³ (STATEMENT)", () => {
    const email = {
      subject: "VPBank - ThÃ´ng bÃ¡o sao kÃª tháº» tÃ­n dá»¥ng ká»³ thÃ¡ng 10/2026",
      from: "customercare@care.vpb.com.vn",
      authenticationResults: "mx.google.com; dkim=pass header.d=care.vpb.com.vn;",
      text: "KÃ­nh gá»­i QuÃ½ khÃ¡ch, VPBank xin gá»­i sao kÃª tháº» tÃ­n dá»¥ng VISA *2340 chu ká»³ 25/09 Ä‘áº¿n 25/10/2026...",
    };

    const result = parseVpbankEmail(email);
    assert.equal(result.documentKind, "CREDIT_CARD_STATEMENT");
    assert.equal(result.instrumentKind, "CREDIT_CARD");
    assert.equal(result.maskedSuffix, "2340");
    assert.equal(result.requiresManualStatementImport, true);
  });

  await t.test("8. BÃ³c tÃ¡ch email mÃ£ xÃ¡c thá»±c OTP / Non-transaction", () => {
    const email = {
      subject: "MÃ£ xÃ¡c thá»±c OTP giao dá»‹ch trá»±c tuyáº¿n VPBank",
      from: "customercare@care.vpb.com.vn",
      authenticationResults: "mx.google.com; dkim=pass header.d=care.vpb.com.vn;",
      text: "MÃ£ OTP cá»§a quÃ½ khÃ¡ch lÃ  654321, cÃ³ hiá»‡u lá»±c trong 2 phÃºt.",
    };

    const result = parseVpbankEmail(email);
    assert.equal(result.documentKind, "NON_TRANSACTION");
    assert.equal(result.isFinancial, false);
  });

  await t.test("9. Cáº£nh bÃ¡o sender giáº£ máº¡o khÃ´ng thuá»™c tÃªn miá»n VPBank", () => {
    const email = {
      subject: "ThÃ´ng bÃ¡o giao dá»‹ch tháº» tÃ­n dá»¥ng",
      from: "attacker@gmail.com",
      text: "Tháº» *2340 trá»« tiá»n 100,000 VND",
    };

    const result = parseVpbankEmail(email);
    assert.equal(result.senderValid, false);
  });

  await t.test("9. rejects a spoofed suffix domain", () => {
    const result = parseVpbankEmail({
      subject: "VPBank credit card transaction",
      from: "customercare@care.vpb.com.vn.attacker.example",
      authenticationResults: "mx.google.com; dkim=pass header.d=care.vpb.com.vn;",
      text: "Card *2340 charged 100,000 VND",
    });
    assert.equal(result.senderValid, false);
  });

  await t.test("10. rejects a From match without DKIM pass", () => {
    const result = parseVpbankEmail({
      subject: "VPBank credit card transaction",
      from: "customercare@care.vpb.com.vn",
      authenticationResults: "mx.google.com; dkim=fail header.d=care.vpb.com.vn;",
      text: "Card *2340 charged 100,000 VND",
    });
    assert.equal(result.senderValid, false);
  });});



