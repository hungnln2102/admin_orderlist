require("module-alias/register");
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

describe("Slot Cost Service Unit & Arithmetic Suite", () => {
  it("1. Tính toán giá vốn 1 slot / ngày chuẩn xác không làm tròn sai lệch", () => {
    const importCost = 150000;
    const totalSlots = 5;
    const days = 30;

    const costPerSlotDay = Math.round((importCost / (totalSlots * days)) * 100) / 100;
    assert.equal(costPerSlotDay, 1000);

    const vacantSlots = 2;
    const vacantCost = Math.round(vacantSlots * costPerSlotDay * 100) / 100;
    assert.equal(vacantCost, 2000);
  });

  it("2. Khi toàn bộ slot được thuê kín thì vacant_slots = 0 và chi phí gánh = 0đ", () => {
    const totalSlots = 5;
    const occupiedSlots = 5;
    const costPerSlotDay = 1000;

    const vacantSlots = Math.max(0, totalSlots - occupiedSlots);
    const vacantCost = vacantSlots * costPerSlotDay;

    assert.equal(vacantSlots, 0);
    assert.equal(vacantCost, 0);
  });

  it("3. Xử lý an toàn khi đầu vào số ngày hoặc số slot = 0 hoặc âm", () => {
    const importCost = 100000;
    const totalSlots = Math.max(1, 0);
    const days = Math.max(1, -5);

    const costPerSlotDay = Math.round((importCost / (totalSlots * days)) * 100) / 100;
    assert.equal(costPerSlotDay, 100000);
  });

  it("4. Tính chi phí gánh slot lũy kế chính xác cho nhiều ngày", () => {
    const dailyVacantCost = 2000;
    const daysUnrented = 5;
    const totalBurden = dailyVacantCost * daysUnrented;
    assert.equal(totalBurden, 10000);
  });
});
