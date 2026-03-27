import { ORDER_CODE_PREFIXES } from "../../../../constants";

type OrderCodePrefix =
  (typeof ORDER_CODE_PREFIXES)[keyof typeof ORDER_CODE_PREFIXES];

export type OrderCodeTheme = {
  rowSurfaceClass: string;
  expandablePanelClass: string;
  detailItemClass: string;
  detailLabelClass: string;
  accentTextClass: string;
  badgeClass: string;
  badgeTextClass: string;
  cardSurfaceClass: string;
  glowClass: string;
  dotClass: string;
  tagClass: string;
  tagTextClass: string;
  infoPanelClass: string;
  priceTextClass: string;
};

const DEFAULT_THEME: OrderCodeTheme = {
  rowSurfaceClass:
    "!border-indigo-400/12 !bg-indigo-500/[0.08] group-hover/row:!border-indigo-300/28 group-hover/row:!bg-indigo-500/[0.12]",
  expandablePanelClass: "!border-indigo-400/18 !bg-indigo-500/[0.06]",
  detailItemClass: "border-indigo-300/20 bg-indigo-500/[0.16]",
  detailLabelClass: "text-indigo-100/80",
  accentTextClass: "text-indigo-200/80",
  badgeClass: "bg-indigo-500/10 border-indigo-400/20",
  badgeTextClass: "text-indigo-100/80",
  cardSurfaceClass:
    "!border-indigo-400/15 !bg-indigo-500/[0.08] hover:!border-indigo-300/35 hover:!bg-indigo-500/[0.12]",
  glowClass: "bg-indigo-400",
  dotClass:
    "bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)]",
  tagClass: "bg-indigo-500/12 border-indigo-400/20",
  tagTextClass: "text-indigo-100/85",
  infoPanelClass:
    "bg-indigo-500/[0.06] border-indigo-300/10 group-hover:bg-indigo-500/[0.09]",
  priceTextClass: "text-indigo-100",
};

const ORDER_CODE_THEMES: Record<OrderCodePrefix, OrderCodeTheme> = {
  [ORDER_CODE_PREFIXES.COLLABORATOR]: {
    rowSurfaceClass:
      "!border-sky-400/15 !bg-sky-500/[0.09] group-hover/row:!border-sky-300/30 group-hover/row:!bg-sky-500/[0.13]",
    expandablePanelClass: "!border-sky-400/20 !bg-sky-500/[0.07]",
    detailItemClass: "border-sky-300/25 bg-sky-500/[0.18]",
    detailLabelClass: "text-sky-100/80",
    accentTextClass: "text-sky-200/85",
    badgeClass: "bg-sky-500/12 border-sky-400/22",
    badgeTextClass: "text-sky-100/85",
    cardSurfaceClass:
      "!border-sky-400/15 !bg-sky-500/[0.09] hover:!border-sky-300/35 hover:!bg-sky-500/[0.13]",
    glowClass: "bg-sky-400",
    dotClass:
      "bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.85)]",
    tagClass: "bg-sky-500/14 border-sky-400/22",
    tagTextClass: "text-sky-100/90",
    infoPanelClass:
      "bg-sky-500/[0.07] border-sky-300/10 group-hover:bg-sky-500/[0.1]",
    priceTextClass: "text-sky-100",
  },
  [ORDER_CODE_PREFIXES.RETAIL]: {
    rowSurfaceClass:
      "!border-fuchsia-300/18 !bg-fuchsia-500/[0.12] group-hover/row:!border-fuchsia-200/35 group-hover/row:!bg-fuchsia-500/[0.17]",
    expandablePanelClass: "!border-fuchsia-300/24 !bg-fuchsia-500/[0.1]",
    detailItemClass: "border-fuchsia-200/30 bg-fuchsia-500/[0.22]",
    detailLabelClass: "text-fuchsia-100/85",
    accentTextClass: "text-fuchsia-200/95",
    badgeClass: "bg-fuchsia-500/18 border-fuchsia-300/28",
    badgeTextClass: "text-fuchsia-100/90",
    cardSurfaceClass:
      "!border-fuchsia-300/18 !bg-fuchsia-500/[0.12] hover:!border-fuchsia-200/40 hover:!bg-fuchsia-500/[0.17]",
    glowClass: "bg-fuchsia-300",
    dotClass:
      "bg-fuchsia-300 shadow-[0_0_10px_rgba(244,114,182,0.9)]",
    tagClass: "bg-fuchsia-500/18 border-fuchsia-300/28",
    tagTextClass: "text-fuchsia-100/95",
    infoPanelClass:
      "bg-fuchsia-500/[0.1] border-fuchsia-200/12 group-hover:bg-fuchsia-500/[0.14]",
    priceTextClass: "text-fuchsia-100",
  },
  [ORDER_CODE_PREFIXES.PROMO]: {
    rowSurfaceClass:
      "!border-amber-300/18 !bg-amber-500/[0.1] group-hover/row:!border-amber-200/35 group-hover/row:!bg-amber-500/[0.14]",
    expandablePanelClass: "!border-amber-300/22 !bg-amber-500/[0.08]",
    detailItemClass: "border-amber-200/28 bg-amber-500/[0.2]",
    detailLabelClass: "text-amber-100/85",
    accentTextClass: "text-amber-200/90",
    badgeClass: "bg-amber-500/14 border-amber-300/25",
    badgeTextClass: "text-amber-100/90",
    cardSurfaceClass:
      "!border-amber-300/18 !bg-amber-500/[0.1] hover:!border-amber-200/38 hover:!bg-amber-500/[0.14]",
    glowClass: "bg-amber-300",
    dotClass:
      "bg-amber-300 shadow-[0_0_8px_rgba(252,211,77,0.85)]",
    tagClass: "bg-amber-500/16 border-amber-300/24",
    tagTextClass: "text-amber-100/90",
    infoPanelClass:
      "bg-amber-500/[0.08] border-amber-200/10 group-hover:bg-amber-500/[0.11]",
    priceTextClass: "text-amber-100",
  },
  [ORDER_CODE_PREFIXES.GIFT]: {
    rowSurfaceClass:
      "!border-rose-400/15 !bg-rose-500/[0.09] group-hover/row:!border-rose-300/30 group-hover/row:!bg-rose-500/[0.13]",
    expandablePanelClass: "!border-rose-400/20 !bg-rose-500/[0.07]",
    detailItemClass: "border-rose-300/25 bg-rose-500/[0.18]",
    detailLabelClass: "text-rose-100/80",
    accentTextClass: "text-rose-200/85",
    badgeClass: "bg-rose-500/12 border-rose-400/22",
    badgeTextClass: "text-rose-100/85",
    cardSurfaceClass:
      "!border-rose-400/15 !bg-rose-500/[0.09] hover:!border-rose-300/35 hover:!bg-rose-500/[0.13]",
    glowClass: "bg-rose-400",
    dotClass:
      "bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.85)]",
    tagClass: "bg-rose-500/14 border-rose-400/22",
    tagTextClass: "text-rose-100/90",
    infoPanelClass:
      "bg-rose-500/[0.07] border-rose-300/10 group-hover:bg-rose-500/[0.1]",
    priceTextClass: "text-rose-100",
  },
  [ORDER_CODE_PREFIXES.IMPORT]: {
    rowSurfaceClass:
      "!border-cyan-400/15 !bg-cyan-500/[0.08] group-hover/row:!border-cyan-300/30 group-hover/row:!bg-cyan-500/[0.12]",
    expandablePanelClass: "!border-cyan-400/20 !bg-cyan-500/[0.07]",
    detailItemClass: "border-cyan-300/25 bg-cyan-500/[0.18]",
    detailLabelClass: "text-cyan-100/80",
    accentTextClass: "text-cyan-200/85",
    badgeClass: "bg-cyan-500/12 border-cyan-400/22",
    badgeTextClass: "text-cyan-100/85",
    cardSurfaceClass:
      "!border-cyan-400/15 !bg-cyan-500/[0.08] hover:!border-cyan-300/35 hover:!bg-cyan-500/[0.12]",
    glowClass: "bg-cyan-400",
    dotClass:
      "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.85)]",
    tagClass: "bg-cyan-500/14 border-cyan-400/22",
    tagTextClass: "text-cyan-100/90",
    infoPanelClass:
      "bg-cyan-500/[0.07] border-cyan-300/10 group-hover:bg-cyan-500/[0.1]",
    priceTextClass: "text-cyan-100",
  },
  [ORDER_CODE_PREFIXES.STUDENT]: {
    rowSurfaceClass:
      "!border-emerald-400/15 !bg-emerald-500/[0.08] group-hover/row:!border-emerald-300/30 group-hover/row:!bg-emerald-500/[0.12]",
    expandablePanelClass: "!border-emerald-400/20 !bg-emerald-500/[0.07]",
    detailItemClass: "border-emerald-300/25 bg-emerald-500/[0.18]",
    detailLabelClass: "text-emerald-100/80",
    accentTextClass: "text-emerald-200/85",
    badgeClass: "bg-emerald-500/12 border-emerald-400/22",
    badgeTextClass: "text-emerald-100/85",
    cardSurfaceClass:
      "!border-emerald-400/15 !bg-emerald-500/[0.08] hover:!border-emerald-300/35 hover:!bg-emerald-500/[0.12]",
    glowClass: "bg-emerald-400",
    dotClass:
      "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.85)]",
    tagClass: "bg-emerald-500/14 border-emerald-400/22",
    tagTextClass: "text-emerald-100/90",
    infoPanelClass:
      "bg-emerald-500/[0.07] border-emerald-300/10 group-hover:bg-emerald-500/[0.1]",
    priceTextClass: "text-emerald-100",
  },
};

export function resolveOrderCodePrefix(
  orderCode?: string | null
): OrderCodePrefix | null {
  const normalized = String(orderCode || "").trim().toUpperCase();
  if (!normalized) return null;

  const prefixes = Object.values(ORDER_CODE_PREFIXES) as OrderCodePrefix[];
  return prefixes.find((prefix) => normalized.startsWith(prefix)) ?? null;
}

export function getOrderCodeTheme(orderCode?: string | null): OrderCodeTheme {
  const prefix = resolveOrderCodePrefix(orderCode);
  if (!prefix) return DEFAULT_THEME;
  return ORDER_CODE_THEMES[prefix] ?? DEFAULT_THEME;
}
