import { SLOT_LINK_PREFS_KEY } from "./constants";
import type { SlotLinkPreferenceMap } from "./types";

export const readSlotLinkPrefs = (): SlotLinkPreferenceMap => {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(SLOT_LINK_PREFS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed;
    return {};
  } catch {
    return {};
  }
};

export const writeSlotLinkPrefs = (prefs: SlotLinkPreferenceMap) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SLOT_LINK_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // ignore storage access errors
  }
};
