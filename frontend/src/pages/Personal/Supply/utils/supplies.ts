import * as Helpers from "../../../../lib/helpers";

export const normalizeText = (text: string) => text.trim().toLowerCase();

export const parseMoney = (val: string) => {
  const str = String(val || "");
  const cleaned = str.replace(/[^\d-]/g, "");
  const normalized = cleaned.startsWith("-")
    ? "-" + cleaned.slice(1).replace(/-/g, "")
    : cleaned.replace(/-/g, "");
  const num = Number(normalized);
  return Number.isFinite(num) ? num : 0;
};

export const buildSepayQrUrl = Helpers.buildSepayQrUrl;
