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

  await t.test("6. parses a Unicode VPBank debit balance notification", () => {
    const result = parseVpbankEmail({
      subject: "Th\u00f4ng b\u00e1o bi\u1ebfn \u0111\u1ed9ng s\u1ed1 d\u01b0 t\u00e0i kho\u1ea3n thanh to\u00e1n",
      from: "customercare@care.vpb.com.vn",
      authenticationResults: "mx.google.com; dkim=pass header.d=care.vpb.com.vn;",
      text: ["T\u00e0i kho\u1ea3n 4541xxxx0985 bi\u1ebfn \u0111\u1ed9ng:", "- 2,000,000 VND", "S\u1ed1 ti\u1ec1n thay \u0111\u1ed5i / Changed Amount", "R\u00fat ti\u1ec1n ATM ACB Hai Ba Trung", "N\u1ed9i dung / Transaction Content", "02/11/2026 14:15:00", "Th\u1eddi gian / Time", "FT2611020019283", "M\u00e3 giao d\u1ecbch / Transaction Code", "4,888,568 VND", "S\u1ed1 d\u01b0 kh\u1ea3 d\u1ee5ng / Available Balance"].join("\n"),
    });
    assert.equal(result.documentKind, "DEBIT_CARD_TRANSACTION");
    assert.equal(result.instrumentKind, "DEBIT_CARD");
    assert.equal(result.direction, "OUTFLOW");
    assert.equal(result.maskedSuffix, "0985");
    assert.equal(result.amount, 2000000);
    assert.equal(result.merchantNormalized, "R\u00fat ti\u1ec1n ATM ACB Hai Ba Trung");
    assert.equal(result.referenceCode, "FT2611020019283");
    assert.equal(result.observedBalanceAfter, 4888568);
    assert.equal(result.isFinancial, true);
  });

  await t.test("7. recognizes a Unicode VPBank credit-card statement", () => {
    const result = parseVpbankEmail({
      subject: "VPBank - Th\u00f4ng b\u00e1o sao k\u00ea th\u1ebb t\u00edn d\u1ee5ng k\u1ef3 th\u00e1ng 10/2026",
      from: "customercare@care.vpb.com.vn",
      authenticationResults: "mx.google.com; dkim=pass header.d=care.vpb.com.vn;",
      text: "K\u00ednh g\u1eedi Qu\u00fd kh\u00e1ch, VPBank xin g\u1eedi sao k\u00ea th\u1ebb t\u00edn d\u1ee5ng VISA *2340 chu k\u1ef3 25/09 \u0111\u1ebfn 25/10/2026...",
    });
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

  });
  await t.test("11. parses VPBank available limit when the amount precedes its label", () => {
    const result = parseVpbankEmail({
      subject: "VPBank xin thong bao bien dong so du The tin dung cua Quy khach",
      from: "customercare@care.vpb.com.vn",
      authenticationResults: "mx.google.com; dkim=pass header.d=care.vpb.com.vn;",
      text: ["- 63,550 VND", "S\u1ed1 ti\u1ec1n thay \u0111\u1ed5i / Changed Amount", "FOODY", "N\u1ed9i dung / Transaction Content", "17,870,822 VND", "H\u1ea1n m\u1ee9c c\u00f2n l\u1ea1i / Available Limit", "VISA *2340", "06/11/2026 13:13:37", "630906039965", "M\u00e3 giao d\u1ecbch / Transaction Code"].join("\n"),
    });
    assert.equal(result.documentKind, "CREDIT_CARD_TRANSACTION");
    assert.equal(result.transactionKind, "CARD_SPEND");
    assert.equal(result.amount, 63550);
    assert.equal(result.availableLimitObserved, 17870822);
    assert.equal(result.referenceCode, "630906039965");
  });
});



