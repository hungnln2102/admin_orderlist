import type { ProductEditFormState } from "../../types";

export const BASE_PRICE_CURRENCY_OPTIONS: Array<{
  value: ProductEditFormState["basePriceCurrency"];
  label: string;
}> = [
  { value: "VND", label: "VND" },
  { value: "USD", label: "USD" },
  { value: "EUR", label: "EUR" },
  { value: "GBP", label: "GBP" },
  { value: "CNY", label: "CNY" },
  { value: "JPY", label: "JPY" },
];

export const SECTION_PANEL_CLASS =
  "rounded-[22px] border border-white/10 bg-gradient-to-br from-slate-900/55 via-slate-900/45 to-indigo-950/55 p-4 md:p-5 shadow-[0_20px_55px_-35px_rgba(0,0,0,0.75)] backdrop-blur";

export const FIELD_LABEL_CLASS =
  "text-[11px] font-semibold uppercase tracking-[0.08em] text-white/65";

export const BASE_INPUT_CLASS =
  "mt-1.5 h-11 w-full rounded-xl border border-white/15 bg-slate-950/45 px-3 text-sm text-white placeholder:text-white/45 shadow-inner transition focus:border-sky-300/40 focus:ring-2 focus:ring-sky-200/20";

export const BASE_SELECT_CLASS =
  "mt-1.5 h-11 rounded-xl border border-white/15 bg-slate-950/45 px-3 text-sm text-white shadow-inner transition focus:border-sky-300/40 focus:ring-2 focus:ring-sky-200/20";
