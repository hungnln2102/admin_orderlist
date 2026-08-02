import { LOW_SLOT_THRESHOLD, LOW_THRESHOLD_RATIO } from "./constants";
import type { AvailabilityState } from "./types";

export const getCapacityAvailabilityState = (
  remaining: number,
  limit: number
): AvailabilityState => {
  if (limit <= 0) return "out";
  if (remaining <= 0) return "out";
  const ratio = remaining / limit;
  return ratio <= LOW_THRESHOLD_RATIO ? "low" : "ok";
};

export const getSlotAvailabilityState = (remaining: number): AvailabilityState => {
  if (remaining <= 0) return "out";
  if (remaining < LOW_SLOT_THRESHOLD) return "low";
  return "ok";
};
