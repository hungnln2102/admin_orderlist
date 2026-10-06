require("module-alias/register");
const systemConfigService = require("@/domains/system/services/systemConfigService");
const { db } = require("@/db");

async function runTest() {
  console.log("🧪 [QA Agent] Bắt đầu chạy Integration Test — System Configs (V2)...");

  try {
    // 1. Test initCache
    await systemConfigService.initCache();
    
    const warnDays = systemConfigService.get("RENEWAL_WARN_DAYS", 4);
    console.log(`  ⏳ [TC-01] Get RENEWAL_WARN_DAYS từ cache (Kỳ vọng: 4): ${warnDays}`);
    if (typeof warnDays !== "number" || warnDays !== 4) {
      throw new Error(`TC-01 FAILED: Expected 4 (number), got ${warnDays} (${typeof warnDays})`);
    }
    console.log("  ✅ [TC-01] PASS");

    const usdtRate = systemConfigService.get("USDT_EXCHANGE_RATE");
    console.log(`  ⏳ [TC-02] Get USDT_EXCHANGE_RATE từ cache (Kỳ vọng: 25400): ${usdtRate}`);
    if (typeof usdtRate !== "number" || usdtRate !== 25400) {
      throw new Error(`TC-02 FAILED: Expected 25400 (number), got ${usdtRate}`);
    }
    console.log("  ✅ [TC-02] PASS");

    const autoMatch = systemConfigService.get("SEPAY_AUTO_MATCH");
    console.log(`  ⏳ [TC-03] Get SEPAY_AUTO_MATCH (BOOLEAN) từ cache (Kỳ vọng: true): ${autoMatch}`);
    if (typeof autoMatch !== "boolean" || autoMatch !== true) {
      throw new Error(`TC-03 FAILED: Expected true (boolean), got ${autoMatch}`);
    }
    console.log("  ✅ [TC-03] PASS");

    // 2. Test Cập nhật Config ngầm (set)
    console.log("  ⏳ [TC-04] Cập nhật RENEWAL_WARN_DAYS từ 4 -> 5...");
    await systemConfigService.set("RENEWAL_WARN_DAYS", "5", "TEST_RUNNER");
    
    const updatedWarnDays = systemConfigService.get("RENEWAL_WARN_DAYS");
    if (updatedWarnDays !== 5) {
      throw new Error(`TC-04 FAILED: Expected updated value 5, got ${updatedWarnDays}`);
    }
    console.log("  ✅ [TC-04] PASS (Cache cập nhật thành công lên 5 mà không cần restart server)");

    // Restore lại giá trị cũ 4
    await systemConfigService.set("RENEWAL_WARN_DAYS", "4", "TEST_RUNNER");

    console.log("\n────────────────────────────────────");
    console.log("📊 KẾT QUẢ: 4 PASS / 0 FAIL");
    console.log("🎉 TẤT CẢ TEST CASES CẤU HÌNH ĐỘNG ĐÃ PASS!");

  } catch (error) {
    console.error("\n❌ TEST FAILED:", error.message);
    process.exitCode = 1;
  } finally {
    await db.destroy();
  }
}

runTest();
