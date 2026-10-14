/**
 * finance_break_even_engine.test.js
 * Integration test cho Trung Tâm Tài Chính:
 * - Động cơ điểm hòa vốn (Break-even Engine) với lợi nhuận khởi đầu âm
 * - Thuật toán trả góp theo kỳ và tự động kết thúc khi hết kỳ
 * - Tính toán Tài sản ròng (Net Worth)
 */

require("module-alias/register");
const assert = require("assert");
const { db, TABLES } = require("@/db");
const financeHubService = require("@/domains/finance/services/financeHubService");

async function runTest() {
  console.log("🧪 [QA Agent] Bắt đầu Integration Test — Động Cơ Hòa Vốn & Trả Góp (Finance Break-even Engine)...");

  // Chuẩn bị tháng test
  const currentMonth = "2026-10";

  // Dọn dẹp dữ liệu test cũ nếu có
  await db(TABLES.FIXED_COSTS).where("name", "like", "TEST_%").del();
  await db(TABLES.INSTALLMENTS).where("name", "like", "TEST_%").del();
  await db(TABLES.PERSONAL_ASSETS).where("name", "like", "TEST_%").del();
  await db(TABLES.ORDER_LIST).where("id_order", "like", "MAVFINTST%").del();

  try {
    // ----------------------------------------------------
    // TC-01: Kiểm tra thuật toán xác định kỳ trả góp
    // ----------------------------------------------------
    console.log("⏳ [TC-01] Kiểm tra hàm calculateInstallmentState...");

    // Trường hợp 1: Khoản trả góp bắt đầu tháng 2026-10 (kỳ 1/12)
    const instActive = {
      start_period: "2026-10",
      total_periods: 12,
      monthly_amount: 3000000,
      is_active: true,
    };
    const state1 = financeHubService.calculateInstallmentState(instActive, "2026-10");
    assert.strictEqual(state1.status, "ACTIVE", "Tháng bắt đầu phải có trạng thái ACTIVE");
    assert.strictEqual(state1.currentPeriod, 1, "Tháng 2026-10 phải là kỳ 1");
    assert.strictEqual(state1.isEffective, true, "Phải có hiệu lực trừ vào chi phí tháng");
    assert.strictEqual(state1.remainingPeriods, 11, "Còn 11 kỳ");
    assert.strictEqual(state1.remainingDebt, 33000000, "Dư nợ còn lại 33tr");

    // Trường hợp 2: Khoản trả góp bắt đầu từ tương lai (2026-12)
    const stateNotStarted = financeHubService.calculateInstallmentState({
      start_period: "2026-12",
      total_periods: 6,
      monthly_amount: 2000000,
      is_active: true,
    }, "2026-10");
    assert.strictEqual(stateNotStarted.status, "NOT_STARTED");
    assert.strictEqual(stateNotStarted.isEffective, false, "Chưa đến tháng bắt đầu thì không được tính vào tháng này");

    // Trường hợp 3: Khoản trả góp bắt đầu từ 2025-01 với 12 kỳ -> Tại 2026-10 đã hết hạn!
    const stateExpired = financeHubService.calculateInstallmentState({
      start_period: "2025-01",
      total_periods: 12,
      monthly_amount: 1500000,
      is_active: true,
    }, "2026-10");
    assert.strictEqual(stateExpired.status, "COMPLETED", "Đã qua 12 tháng phải tự động COMPLETED");
    assert.strictEqual(stateExpired.isEffective, false, "Đã hoàn thành thì không được tính vào chi phí nữa!");
    assert.strictEqual(stateExpired.remainingDebt, 0, "Dư nợ phải về 0");
    console.log("✅ [TC-01] Thuật toán tính chu kỳ trả góp hoạt động chính xác 100%!");

    // ----------------------------------------------------
    // TC-02: Tạo chi phí cố định (Tiền nhà 5tr) và Trả góp (3tr/tháng x 12 kỳ)
    // ----------------------------------------------------
    console.log("⏳ [TC-02] Tạo Chi phí cố định (Tiền nhà 5.000.000 ₫) & Trả góp (3.000.000 ₫/tháng)...");

    const fixedRent = await financeHubService.createFixedCost({
      name: "TEST_Tiền thuê nhà",
      amount: 5000000,
      category: "LIVING",
      isActive: true,
      note: "Thuê chung cư hàng tháng",
    });
    assert(fixedRent.id > 0, "Phải tạo được chi phí cố định");

    const instMacbook = await financeHubService.createInstallment({
      name: "TEST_Trả góp MacBook",
      monthlyAmount: 3000000,
      totalPeriods: 12,
      startPeriod: "2026-10",
      dueDay: 15,
      isActive: true,
      note: "Góp qua thẻ tín dụng",
    });
    assert(instMacbook.id > 0, "Phải tạo được khoản trả góp");

    // Tạo tài sản cá nhân: Sổ tiết kiệm 50tr
    await financeHubService.createPersonalAsset({
      name: "TEST_Sổ tiết kiệm Techcombank",
      type: "SAVINGS",
      amount: 50000000,
      note: "Gửi kỳ hạn 6 tháng",
    });

    console.log("✅ [TC-02] Dữ liệu mẫu đã được lưu vào DB thành công!");

    // ----------------------------------------------------
    // TC-03: Kiểm tra Động cơ Hòa Vốn - Lợi nhuận khởi điểm âm (-8.000.000 ₫)
    // ----------------------------------------------------
    console.log("⏳ [TC-03] Kiểm tra điểm hòa vốn và lợi nhuận ban đầu âm...");

    const summaryInitial = await financeHubService.getFinanceSummary("2026-10");
    const beInitial = summaryInitial.breakEven;

    console.log(`   - Mục tiêu hòa vốn: ${beInitial.breakEvenTarget.toLocaleString()} ₫`);
    console.log(`   - Lợi nhuận khởi điểm ngày 1: ${beInitial.initialDeficit.toLocaleString()} ₫`);
    console.log(`   - Lợi nhuận ròng hiện tại: ${beInitial.netProfit.toLocaleString()} ₫`);

    assert.strictEqual(beInitial.activeFixedCostsTotal >= 5000000, true, "Tổng chi phí cố định phải bao gồm 5tr tiền nhà");
    assert.strictEqual(beInitial.installmentsInMonthTotal >= 3000000, true, "Tổng trả góp phải bao gồm 3tr MacBook");
    assert.strictEqual(beInitial.initialDeficit, -beInitial.breakEvenTarget, "Lợi nhuận khởi điểm phải bằng số âm của mục tiêu hòa vốn");
    assert.strictEqual(beInitial.initialDeficit <= -8000000, true, "Lợi nhuận khởi điểm phải âm tối thiểu -8.000.000 ₫");

    console.log("✅ [TC-03] Lợi nhuận khởi điểm đầu tháng luôn luôn là ÂM theo đúng yêu cầu!");

    // ----------------------------------------------------
    // TC-04: Giả lập đơn bán hàng của Shop để kéo dần về điểm hòa vốn
    // ----------------------------------------------------
    console.log("⏳ [TC-04] Giả lập đơn bán hàng MAVFINTST01 (Giá bán 12tr, Giá vốn 2tr => Lãi gộp 10tr)...");

    await db(TABLES.ORDER_LIST).insert({
      id_order: "MAVFINTST01",
      customer: "Khách VIP Test",
      price: 12000000,
      cost: 2000000,
      status: "PAID",
      information_order: "vip_test@gmail.com",
      created_at: "2026-10-05 10:00:00+07",
    });

    const summaryAfterSale = await financeHubService.getFinanceSummary("2026-10");
    const beAfter = summaryAfterSale.breakEven;

    console.log(`   - Lãi gộp từ đơn hàng: ${beAfter.shopGrossProfit.toLocaleString()} ₫`);
    console.log(`   - Lợi nhuận ròng sau bán: ${beAfter.netProfit.toLocaleString()} ₫`);
    console.log(`   - Tiến độ hòa vốn: ${beAfter.breakEvenPercent}%`);
    console.log(`   - Đã vượt hòa vốn: ${beAfter.isBreakEvenPassed}`);

    assert.strictEqual(beAfter.shopGrossProfit >= 10000000, true, "Lãi gộp shop phải tăng thêm 10tr");
    // Lợi nhuận ròng = Lãi gộp (>= 10tr) - Chi phí cố định & Trả góp (>= 8tr) => Phải chuyển sang số dương!
    assert.strictEqual(beAfter.netProfit >= 0, true, "Lợi nhuận ròng đã chuyển sang dương");
    assert.strictEqual(beAfter.isBreakEvenPassed, true, "Trạng thái đã vượt điểm hòa vốn");

    console.log("✅ [TC-04] Đơn hàng bán ra đã kéo thành công từ số âm sang vùng lãi ròng dương!");

    // ----------------------------------------------------
    // TC-05: Kiểm tra Tài sản ròng (Net Worth)
    // ----------------------------------------------------
    console.log("⏳ [TC-05] Kiểm tra chỉ số Tài sản ròng (Net Worth)...");
    const nw = summaryAfterSale.netWorth;
    console.log(`   - Tổng tài sản: ${nw.totalAssets.toLocaleString()} ₫`);
    console.log(`   - Tổng nợ & dư nợ trả góp: ${nw.totalLiabilities.toLocaleString()} ₫`);
    console.log(`   - Tài sản ròng (Net Worth): ${nw.netWorth.toLocaleString()} ₫`);

    assert(nw.totalAssets >= 50000000, "Tổng tài sản phải bao gồm 50tr tiền tiết kiệm");
    assert(nw.totalLiabilities >= 33000000, "Tổng nợ phải bao gồm 11 kỳ còn lại của MacBook = 33tr");
    assert.strictEqual(nw.netWorth, nw.totalAssets - nw.totalLiabilities, "Net Worth phải = Tổng tài sản - Tổng nợ");

    console.log("✅ [TC-05] Chỉ số Tài sản ròng (Net Worth) tính toán chuẩn mực!");

    // ----------------------------------------------------
    // TC-06: Kiểm tra Động cơ Nợ gối đầu qua từng ngày (Daily Rolling Deficit Curve)
    // ----------------------------------------------------
    console.log("⏳ [TC-06] Kiểm tra Động cơ Nợ gối đầu qua từng ngày (Daily Rolling Deficit Curve)...");
    const dbe = summaryAfterSale.dailyBreakEven;
    assert(dbe, "summary phải có dailyBreakEven");
    assert.strictEqual(dbe.daysInMonth, 31, "Tháng 10 phải có 31 ngày");
    assert.strictEqual(dbe.chartData.length, 31, "chartData phải có 31 phần tử");
    assert.strictEqual(dbe.dailyBurden, Math.round(beAfter.breakEvenTarget / 31), "Định mức ngày phải bằng Target / 31");
    assert.strictEqual(dbe.breakEvenDay, 5, "Ngày 5 phát sinh đơn 10tr kéo vượt mốc 8tr nên phải là ngày hòa vốn!");

    const day1 = dbe.chartData[0];
    assert.strictEqual(day1.day, 1);
    assert.strictEqual(day1.previousDebt, 0, "Ngày 1 chưa có nợ gối đầu từ hôm trước");
    assert.strictEqual(day1.rollingBalance, -dbe.dailyBurden, "Ngày 1 chưa có đơn hàng thì số dư âm bằng đúng dailyBurden");

    const day2 = dbe.chartData[1];
    assert.strictEqual(day2.day, 2);
    assert.strictEqual(day2.previousDebt, dbe.dailyBurden, "Ngày 2 phải gánh nợ gối đầu từ ngày 1");

    const day5 = dbe.chartData[4];
    assert.strictEqual(day5.day, 5);
    assert.strictEqual(day5.todayProfit, 10000000, "Ngày 5 ghi nhận lãi gộp 10tr từ đơn hàng");
    assert.strictEqual(day5.isDebtFreeToday, true, "Ngày 5 phải xóa sạch nợ gối đầu và có thặng dư");
    assert.strictEqual(day5.isMasterBreakEvenPassed, true, "Ngày 5 vượt mốc hòa vốn toàn tháng");

    console.log("✅ [TC-06] Động cơ Nợ gối đầu qua từng ngày và đường cong hòa vốn hoạt động chính xác tuyệt đối!");

    console.log("======================================================");
    console.log("🎉 TẤT CẢ 6/6 TEST CASES ĐỘNG CƠ HÒA VỐN & TRẢ GÓP ĐÃ PASS 100%!");
    console.log("======================================================");
  } finally {
    // Dọn dẹp bản ghi test
    await db(TABLES.FIXED_COSTS).where("name", "like", "TEST_%").del();
    await db(TABLES.INSTALLMENTS).where("name", "like", "TEST_%").del();
    await db(TABLES.PERSONAL_ASSETS).where("name", "like", "TEST_%").del();
    await db(TABLES.ORDER_LIST).where("id_order", "like", "MAVFINTST%").del();
    await db.destroy();
  }
}

runTest().catch((err) => {
  console.error("❌ Test thất bại:", err);
  process.exit(1);
});
