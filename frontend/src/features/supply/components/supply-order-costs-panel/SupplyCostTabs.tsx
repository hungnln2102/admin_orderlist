import type React from "react";

import type { ActiveSupplyTab } from "./types";
import { SUPPLY_COST_TABS } from "./utils";

type SupplyCostTabsProps = {
  activeTab: ActiveSupplyTab;
  onChange: (tab: ActiveSupplyTab) => void;
};

const SupplyCostTabs: React.FC<SupplyCostTabsProps> = ({ activeTab, onChange }) => (
  <div className="rounded-2xl border border-indigo-500/25 bg-indigo-950/25 p-2 backdrop-blur-xl">
    <div className="grid min-h-[2.75rem] grid-cols-2 gap-2">
      {SUPPLY_COST_TABS.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={`w-full rounded-xl px-3 py-2.5 text-xs font-bold uppercase tracking-[0.08em] transition-all sm:text-sm ${
              isActive
                ? "border border-indigo-300/40 bg-gradient-to-br from-indigo-500/85 via-indigo-600/55 to-violet-700/45 text-white shadow-[0_10px_28px_-6px_rgba(99,102,241,0.45)]"
                : "border border-transparent text-indigo-200/65 hover:border-indigo-500/25 hover:bg-indigo-900/25 hover:text-indigo-100/95"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  </div>
);

export default SupplyCostTabs;
