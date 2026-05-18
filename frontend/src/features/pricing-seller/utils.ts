import type { SellerPricingCategory, SellerPricingItem } from "./types";

const money = new Intl.NumberFormat("vi-VN");

export function formatVnd(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  return `${money.format(Math.round(safe))} ₫`;
}

export function parseDurationFromVariantName(variantName: string, displayName?: string): string {
  const candidates = [variantName, displayName ?? ""];
  for (const candidate of candidates) {
    const normalized = String(candidate || "").trim();
    const matched = normalized.match(/-{2,}\s*(\d+)\s*([md])$/i);
    if (!matched) continue;

    const value = Number(matched[1]);
    if (!Number.isFinite(value) || value <= 0) continue;

    return matched[2].toLowerCase() === "m" ? `${value} tháng` : `${value} ngày`;
  }
  return "-";
}

export function getCategoryFilterOptions(items: SellerPricingItem[]): SellerPricingCategory[] {
  const byId = new Map<number, SellerPricingCategory>();

  for (const item of items) {
    for (const category of item.categories || []) {
      const id = Number(category?.id);
      if (!Number.isFinite(id) || id <= 0) continue;
      const name = String(category?.name || "").trim();
      if (!name) continue;
      if (!byId.has(id)) {
        byId.set(id, { id, name });
      }
    }
  }

  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, "vi"));
}

export function toPlainRulesText(input?: string): string {
  const raw = String(input || "").trim();
  if (!raw) return "";

  const withBreaks = raw
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\/\s*(p|div|li|ul|ol|h1|h2|h3|h4|h5|h6)\s*>/gi, "\n");

  if (typeof window === "undefined" || typeof document === "undefined") {
    return withBreaks
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]{2,}/g, " ")
      .trim();
  }

  const container = document.createElement("div");
  container.innerHTML = withBreaks;
  return String(container.textContent || container.innerText || "")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}
