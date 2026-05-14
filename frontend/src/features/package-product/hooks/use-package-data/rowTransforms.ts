import type {
  AugmentedRow,
  PackageField,
  PackageTemplate,
  StatusFilter,
} from "../../utils/packageHelpers";
import { getSlotAvailabilityState } from "../../utils/packageHelpers";

export const filterRows = (
  scopedRows: AugmentedRow[],
  searchTerm: string,
  categoryFilter: string,
  statusFilter: StatusFilter
) =>
  scopedRows.filter((item) => {
    const term = searchTerm.trim().toLowerCase();
    const infoFields = [
      item.information,
      item.informationUser,
      item.informationMail,
      item.informationPass,
      item.accountUser,
      item.accountMail,
      item.accountPass,
      item.note,
    ];
    const matchesSearch =
      term.length === 0 ||
      infoFields.some((field) => {
        const normalizedValue = field == null ? "" : String(field);
        return normalizedValue.toLowerCase().includes(term);
      });
    const matchesCategory = categoryFilter === "all" || item.package === categoryFilter;
    const slotState = getSlotAvailabilityState(item.remainingSlots);
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "full" && slotState === "ok") ||
      statusFilter === slotState;
    return matchesSearch && matchesCategory && matchesStatus;
  });

export const sortRowsByRemainingSlots = (rows: AugmentedRow[]) =>
  [...rows].sort((a, b) => {
    const rawA = Number(a.remainingSlots);
    const rawB = Number(b.remainingSlots);
    const slotsA = Number.isFinite(rawA) ? rawA : Number.POSITIVE_INFINITY;
    const slotsB = Number.isFinite(rawB) ? rawB : Number.POSITIVE_INFINITY;
    const normA = slotsA <= 0 ? Number.POSITIVE_INFINITY : slotsA;
    const normB = slotsB <= 0 ? Number.POSITIVE_INFINITY : slotsB;
    if (normA === normB) return 0;
    return normA - normB;
  });

export const getTableColumnCount = (
  filteredRows: AugmentedRow[],
  selectedTemplate: PackageTemplate | null
) => {
  const hasCapacityRows = filteredRows.some((row) => row.hasCapacityField ?? false);
  const showCapacityColumn =
    hasCapacityRows ||
    (filteredRows.length === 0 &&
      (selectedTemplate?.fields.includes("capacity" as PackageField) ?? false));
  return {
    showCapacityColumn,
    tableColumnCount: showCapacityColumn ? 9 : 8,
  };
};

export const computeSlotStats = (filteredRows: AugmentedRow[]) => {
  const low = filteredRows.reduce(
    (total, row) =>
      getSlotAvailabilityState(row.remainingSlots) === "low" ? total + 1 : total,
    0
  );
  const out = filteredRows.reduce(
    (total, row) =>
      getSlotAvailabilityState(row.remainingSlots) === "out" ? total + 1 : total,
    0
  );
  return {
    total: filteredRows.length,
    low,
    out,
  };
};

export const computePackageSummaries = (
  computedRows: AugmentedRow[],
  templates: PackageTemplate[]
) => {
  const names = new Set<string>();
  computedRows.forEach((row) => {
    const trimmed = (row.package || "").trim();
    if (trimmed) names.add(trimmed);
  });
  templates.forEach((tpl) => {
    if (tpl.name) names.add(tpl.name);
  });
  const allPackageNames = Array.from(names).sort((a, b) => a.localeCompare(b));

  const stats = new Map<string, { total: number; low: number; out: number }>();
  allPackageNames.forEach((name) => stats.set(name, { total: 0, low: 0, out: 0 }));
  computedRows.forEach((row) => {
    const key = (row.package || "").trim();
    if (!key) return;
    let entry = stats.get(key);
    if (!entry) {
      entry = { total: 0, low: 0, out: 0 };
      stats.set(key, entry);
    }
    entry.total += 1;
    const availability = getSlotAvailabilityState(row.remainingSlots);
    if (availability === "low") entry.low += 1;
    if (availability === "out") entry.out += 1;
  });

  return allPackageNames.map((name) => ({
    name,
    ...(stats.get(name) ?? { total: 0, low: 0, out: 0 }),
  }));
};
