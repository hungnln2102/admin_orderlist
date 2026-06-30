import React from "react";
import { getWarehouseTheme } from "../../utils/warehouseTheme";

export const MobileDetail: React.FC<{
  label: string;
  theme: ReturnType<typeof getWarehouseTheme>;
  children: React.ReactNode;
}> = ({ label, theme, children }) => (
  <div className={`min-w-0 overflow-hidden rounded-xl border p-3 ${theme.detailItemClass}`}>
    <p className={`mb-2 text-[10px] font-bold uppercase ${theme.detailLabelClass}`}>{label}</p>
    <div className="min-w-0 w-full overflow-hidden">{children}</div>
  </div>
);
