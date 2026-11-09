const test = require("node:test");
const assert = require("node:assert/strict");
const { parseVpbankEmail, parseVNDAmount, parseDateTimeVN, extractCardSuffix } = require("../../src/domains/finance/services/vpbankEmailParser");

test("VPBank Email Parser Suite", async (t) => {
  await t.test("1. parseVNDAmount chuyển đổi chính xác các định dạng tiền tệ VNĐ", () => {
    assert.equal(parseVNDAmount("150,000 VND"), 150000);
    assert.equal(parseVNDAmount("1.500.000 đ"), 1500000);
    assert.equal(parseVNDAmount("- 350.000 VND"), 350000);
    assert.equal(parseVNDAmount("+ 1,451,834 đ"), 1451834);
    assert.equal(parseVNDAmount(null), null);
    assert.equal(parseVNDAmount("invalid"), null);
  });

  await t.test("2. parseDateTimeVN parse chính xác ngày giờ sang định dạng ISO GMT+7", () => {
    const iso = parseDateTimeVN("03/11/2026 18:39:41");
    assert.equal(iso, "2026-11-03T18:39:41+07:00");
  });

  await t.test("3. extractCardSuffix trích xuất đúng 4 số cuối thẻ", () => {
    assert.equal(extractCardSuffix("Thẻ VISA *2340 của Quý khách"), "2340");
    assert.equal(extractCardSuffix("Giao dịch thẻ 4541xxxx0985 thành công"), "0985");
    assert.equal(extractCardSuffix("Số tài khoản: 1234xxxx8181"), "8181");
  });

  await t.test("4. Bóc tách email chi tiêu thẻ tín dụng (CARD_SPEND)", () => {
    const email = {
      subject: "Thông báo giao dịch thẻ tín dụng quốc tế VPBank",
      from: "customercare@care.vpb.com.vn",
      authenticationResults: "mx.google.com; dkim=pass header.d=care.vpb.com.vn;",
      text: `
        Kính gửi Quý khách,
        Thẻ tín dụng quốc tế VISA *2340 vừa phát sinh giao dịch:
        - Số tiền giao dịch: - 150,000 VND
        - Thời gian: 03/11/2026 18:39:41
        merchant: Foody
        - Mã chuẩn chi: 987654
        - Hạn mức khả dụng còn lại: 18,242,622 VND
        Trân trọng cảm ơn Quý khách!
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

  await t.test("5. Bóc tách email thanh toán dư nợ thẻ tín dụng (+ CARD_PAYMENT)", () => {
    const email = {
      subject: "Thông báo thanh toán thẻ tín dụng thành công",
      from: "customercare@care.vpb.com.vn",
      authenticationResults: "mx.google.com; dkim=pass header.d=care.vpb.com.vn;",
      text: `
        Quý khách đã thanh toán thành công dư nợ thẻ tín dụng VISA *2340:
        Số tiền thanh toán: + 337,331 VND
        Thời gian giao dịch: 03/11/2026 00:25:10
        Mã giao dịch: VPB2611032491547559
        Hạn mức khả dụng sau thanh toán: 18,384,522 VND
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

  await t.test("8. Bóc tách email mã xác thực OTP / Non-transaction", () => {
    const email = {
      subject: "Mã xác thực OTP giao dịch trực tuyến VPBank",
      from: "customercare@care.vpb.com.vn",
      authenticationResults: "mx.google.com; dkim=pass header.d=care.vpb.com.vn;",
      text: "Mã OTP của quý khách là 654321, có hiệu lực trong 2 phút.",
    };

    const result = parseVpbankEmail(email);
    assert.equal(result.documentKind, "NON_TRANSACTION");
    assert.equal(result.isFinancial, false);
  });

  await t.test("9. Cảnh báo sender giả mạo không thuộc tên miền VPBank", () => {
    const email = {
      subject: "Thông báo giao dịch thẻ tín dụng",
      from: "attacker@gmail.com",
      text: "Thẻ *2340 trừ tiền 100,000 VND",
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

  await t.test("7. parses the full debit account number for transfer reconciliation", () => {
    const result = parseVpbankEmail({
      subject: "VPBank thong bao giao dich thanh cong",
      from: "customercare@care.vpb.com.vn",
      authenticationResults: "mx.google.com; dkim=pass header.d=care.vpb.com.vn;",
      text: [
        "Ma giao dich: FT2631154771090/VPB2611062501127952",
        "Tai khoan trich no: 9183400998",
        "So tien trich no: 607,410 VND",
        "Ten nguoi huong: CTY CP SHOPEEPAY",
        "Noi dung chuyen tien: NGO LE NGOC HUNG chuyen tien",
        "Ngay, gio giao dich: 06/11/2026 18:36:01",
      ].join("\n"),
    });

    assert.equal(result.sourceAccountNumber, "9183400998");
    assert.equal(result.direction, "OUTFLOW");
    assert.equal(result.amount, 607410);
    assert.equal(result.referenceCode, "FT2631154771090");
    assert.equal(result.isFinancial, true);
  });});



