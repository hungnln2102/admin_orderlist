import type { PaymentAccountTab } from "../types";

interface PaymentAccountsTabsProps {
  activeTab: PaymentAccountTab;
  onChange: (tab: PaymentAccountTab) => void;
}

const TABS: Array<{ key: PaymentAccountTab; label: string }> = [
  { key: "bank", label: "STK ngân hàng" },
  { key: "usdt", label: "Ví USDT" },
];

export function PaymentAccountsTabs({ activeTab, onChange }: PaymentAccountsTabsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={`px-3.5 py-1.5 rounded-2xl text-xs sm:text-sm font-medium transition-colors ${
            activeTab === tab.key
              ? "bg-amber-500 text-white shadow-md shadow-amber-500/40"
              : "bg-slate-900/70 text-amber-200/80 hover:bg-slate-800"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
