export type WarehouseTheme = {
  rowSurfaceClass: string;
  expandablePanelClass: string;
  detailItemClass: string;
  detailLabelClass: string;
  accentTextClass: string;
};

const INDIGO: WarehouseTheme = {
  rowSurfaceClass:
    "!border-indigo-400/12 !bg-indigo-500/[0.08] group-hover/row:!border-indigo-300/28 group-hover/row:!bg-indigo-500/[0.12]",
  expandablePanelClass: "!border-indigo-400/18 !bg-indigo-500/[0.06]",
  detailItemClass: "border-indigo-300/20 bg-indigo-500/[0.16]",
  detailLabelClass: "text-indigo-100/80",
  accentTextClass: "text-indigo-200/80",
};

const EMERALD: WarehouseTheme = {
  rowSurfaceClass:
    "!border-emerald-400/15 !bg-emerald-500/[0.09] group-hover/row:!border-emerald-300/30 group-hover/row:!bg-emerald-500/[0.13]",
  expandablePanelClass: "!border-emerald-400/20 !bg-emerald-500/[0.07]",
  detailItemClass: "border-emerald-300/25 bg-emerald-500/[0.18]",
  detailLabelClass: "text-emerald-100/80",
  accentTextClass: "text-emerald-200/85",
};

const SKY: WarehouseTheme = {
  rowSurfaceClass:
    "!border-sky-400/15 !bg-sky-500/[0.09] group-hover/row:!border-sky-300/30 group-hover/row:!bg-sky-500/[0.13]",
  expandablePanelClass: "!border-sky-400/20 !bg-sky-500/[0.07]",
  detailItemClass: "border-sky-300/25 bg-sky-500/[0.18]",
  detailLabelClass: "text-sky-100/80",
  accentTextClass: "text-sky-200/85",
};

export function getWarehouseTheme(status?: string | null): WarehouseTheme {
  const v = (status || "").toLowerCase();
  if (v.includes("tồn") || v.includes("ton")) return EMERALD;
  if (v.includes("dùng") || v.includes("dung")) return SKY;
  return INDIGO;
}

export const WAREHOUSE_TOTAL_COLUMNS = 3;
