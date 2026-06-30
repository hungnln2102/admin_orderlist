import {
  DEFAULT_CAPACITY_LIMIT,
  DEFAULT_SLOT_LIMIT,
  getCapacityAvailabilityState,
  getSlotAvailabilityState,
  type AugmentedRow,
} from "../utils/packageHelpers";

export const getAvailabilityColorClass = (state: "out" | "low" | "ok") =>
  state === "out" ? "bg-red-500" : state === "low" ? "bg-yellow-500" : "bg-green-500";

export const buildPackageRowMetrics = (row: AugmentedRow) => {
  const totalSlots = row.slotLimit || DEFAULT_SLOT_LIMIT;
  const slotUsed = row.slotUsed;
  const remainingSlots = row.remainingSlots;
  const slotUsedFillRatio =
    totalSlots > 0
      ? Math.min((Math.min(slotUsed, totalSlots) / totalSlots) * 100, 100)
      : 0;
  const slotColorClass = getAvailabilityColorClass(
    getSlotAvailabilityState(remainingSlots)
  );

  const capacityLimit = row.capacityLimit || DEFAULT_CAPACITY_LIMIT;
  const capacityUsed = row.capacityUsed;
  const remainingCapacity = row.remainingCapacity;
  const capacityUsedFillRatio =
    capacityLimit > 0
      ? Math.min((Math.min(capacityUsed, capacityLimit) / capacityLimit) * 100, 100)
      : 0;
  const capacityColorClass = getAvailabilityColorClass(
    getCapacityAvailabilityState(remainingCapacity, capacityLimit)
  );

  const usedWithinLimit = Math.min(slotUsed, totalSlots);
  const slotAssignments = row.slotAssignments ?? [];
  const slotCells = Array.from({ length: Math.max(totalSlots, 0) }, (_, idx) => {
    const slotNumber = idx + 1;
    const isUsed = slotNumber <= usedWithinLimit;
    const assignment = slotAssignments[slotNumber - 1] ?? null;
    return { slotNumber, isUsed, assignment };
  });

  return {
    totalSlots,
    slotUsed,
    remainingSlots,
    slotUsedFillRatio,
    slotColorClass,
    capacityLimit,
    capacityUsed,
    remainingCapacity,
    capacityUsedFillRatio,
    capacityColorClass,
    slotCells,
  };
};
