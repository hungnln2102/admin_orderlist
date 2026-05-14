import { describe, expect, it } from "vitest";

/**
 * Giống logic `creditNoteById` trong CreateOrderModal — API có thể trả `id` string (BIGINT).
 */
function buildCreditNoteByIdMap<T extends { id: string | number }>(
  rows: T[]
): Map<number, T> {
  const m = new Map<number, T>();
  for (const r of rows) {
    const id = Number(r.id);
    if (Number.isFinite(id) && id > 0) {
      m.set(id, r);
    }
  }
  return m;
}

describe("buildCreditNoteByIdMap", () => {
  it("tìm được phiếu khi id là string (như pg/json)", () => {
    const rows = [{ id: "99", customer_name: "fg" }];
    const m = buildCreditNoteByIdMap(rows);
    expect(m.get(99)).toEqual(rows[0]);
    expect(m.get(Number("99"))).toEqual(rows[0]);
  });

  it("Map cũ [r.id, r] không lookup được bằng number", () => {
    const rows = [{ id: "99" as const }];
    const broken = new Map(rows.map((r) => [r.id, r] as const));
    expect(broken.get(99)).toBeUndefined();
    expect(broken.get("99")).toEqual(rows[0]);
  });
});
