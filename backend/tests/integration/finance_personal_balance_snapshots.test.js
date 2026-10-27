/**
 * finance_personal_balance_snapshots.test.js
 * Integration test cho Nhật ký chốt số dư tài chính cá nhân & Stat tròn biến động:
 * - Chốt số dư ngày 26/10 và ngày 27/10
 * - Đo lường biến động delta VND và tỷ lệ % tăng trưởng
 * - Cập nhật và xóa snapshot
 */

require("module-alias/register");
const assert = require("assert");
const { db, TABLES } = require("@/db");
const financeHubService = require("@/domains/finance/services/financeHubService");

async function runTest() {
  console.log("🧪 [QA Agent] Bắt đầu Integration Test — Personal Balance Snapshots & Circular Stat...");

  const testDate1 = "2026-10-26";
  const testDate2 = "2026-10-27";

  // Dọn dẹp dữ liệu test cũ
  await db(TABLES.PERSONAL_BALANCE_SNAPSHOTS)
    .whereIn("snapshot_date", [testDate1, testDate2])
    .del();

  try {
    // ----------------------------------------------------
    // TC-01: Tạo mốc snapshot ngày 26/10/2026 (142M)
    // ----------------------------------------------------
    console.log("⏳ [TC-01] Tạo mốc chốt số dư ngày 26/10/2026...");
    const snap1 = await financeHubService.createPersonalBalanceSnapshot({
      snapshotDate: testDate1,
      items: [
        { name: "Tài khoản cá nhân", amount: 102000000 },
        { name: "Hanagold", amount: 5000000 },
        { name: "Momo", amount: 15000000 },
        { name: "Supper Sinh Lời", amount: 20000000 },
      ],
      note: "Test chốt ngày 26",
      autoSyncCurrentBalance: false,
    });

    assert.strictEqual(snap1.snapshotDate, testDate1);
    assert.strictEqual(snap1.personalBalance, 142000000, "Tài sản cá nhân ngày 26 phải là 142.000.000 ₫");
    assert.ok(snap1.shopBalance >= 0, "Tài sản shop phải được tự động lấy từ hệ thống");
    assert.strictEqual(snap1.totalBalance, snap1.personalBalance + snap1.shopBalance, "Tổng tài sản phải = cá nhân + shop");
    assert.strictEqual(snap1.previousBalance, 0);
    assert.strictEqual(snap1.deltaAmount, 0);
    assert.strictEqual(snap1.deltaPercent, 0);

    // ----------------------------------------------------
    // TC-02: Tạo mốc snapshot ngày 27/10/2026 (153M cá nhân) -> Kiểm tra Delta & Stat tròn
    // ----------------------------------------------------
    console.log("⏳ [TC-02] Tạo mốc chốt số dư ngày 27/10/2026...");
    const snap2 = await financeHubService.createPersonalBalanceSnapshot({
      snapshotDate: testDate2,
      shopBalance: snap1.shopBalance, // Giữ cùng shop balance để kiểm tra delta cá nhân
      items: [
        { name: "Tài khoản cá nhân", amount: 103000000 },
        { name: "Hanagold", amount: 10000000 },
        { name: "Momo", amount: 20000000 },
        { name: "Supper Sinh Lời", amount: 20000000 },
      ],
      note: "Test chốt ngày 27",
      autoSyncCurrentBalance: false,
    });

    assert.strictEqual(snap2.snapshotDate, testDate2);
    assert.strictEqual(snap2.personalBalance, 153000000, "Tài sản cá nhân ngày 27 phải là 153.000.000 ₫");
    assert.strictEqual(snap2.previousBalance, snap1.totalBalance, "Số dư liền trước phải bằng totalBalance snap1");
    assert.strictEqual(snap2.deltaAmount, 11000000, "Chênh lệch tiền mặt phải là +11.000.000 ₫");
    assert.ok(snap2.deltaPercent > 0, "Tỷ lệ tăng trưởng phải dương");


    // ----------------------------------------------------
    // TC-03: Lấy danh sách snapshots & latestComparison
    // ----------------------------------------------------
    console.log("⏳ [TC-03] Kiểm tra getPersonalBalanceSnapshots & latestComparison...");
    const { snapshots, latestComparison } = await financeHubService.getPersonalBalanceSnapshots();

    assert.ok(snapshots.length >= 2, "Phải có ít nhất 2 bản ghi snapshot");
    assert.strictEqual(snapshots[0].snapshotDate, testDate2, "Bản ghi mới nhất phải là ngày 27/10");
    assert.strictEqual(snapshots[1].snapshotDate, testDate1, "Bản ghi trước đó phải là ngày 26/10");

    assert.ok(latestComparison !== null, "Phải có dữ liệu so sánh mới nhất");
    assert.strictEqual(latestComparison.deltaAmount, 11000000);
    assert.ok(latestComparison.deltaPercent > 0, "Tỷ lệ tăng trưởng phải dương");
    assert.strictEqual(latestComparison.isIncrease, true, "isIncrease phải là true khi tăng trưởng");


    // ----------------------------------------------------
    // TC-04: Xóa snapshot ngày 26 & 27
    // ----------------------------------------------------
    console.log("⏳ [TC-04] Dọn dẹp bản ghi snapshot sau test...");
    await financeHubService.deletePersonalBalanceSnapshot(snap1.id);
    await financeHubService.deletePersonalBalanceSnapshot(snap2.id);

    console.log("✅ [QA Agent] Toàn bộ Integration Test Personal Balance Snapshots thành công 100%!");
  } catch (error) {
    console.error("❌ [QA Agent] Test thất bại:", error);
    throw error;
  }
}

if (require.main === module) {
  runTest()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = runTest;
