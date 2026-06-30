import type React from "react";

export type WalletCardTab = "daily_flow" | "withdraw";

type WalletBalancesTabsProps = {
  activeTab: WalletCardTab;
  onTabChange: (tab: WalletCardTab) => void;
};

export const WalletBalancesTabs: React.FC<WalletBalancesTabsProps> = ({
  activeTab,
  onTabChange,
}) => (
  <div className="inline-flex items-center rounded-lg border border-white/15 bg-slate-900/50 p-1">
    <button
      type="button"
      onClick={() => onTabChange("daily_flow")}
      className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
        activeTab === "daily_flow"
          ? "bg-indigo-500/70 text-white"
          : "text-white/70 hover:text-white"
      }`}
    >
      D??ng ti???n theo ng??y
    </button>
    <button
      type="button"
      onClick={() => onTabChange("withdraw")}
      className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
        activeTab === "withdraw"
          ? "bg-indigo-500/70 text-white"
          : "text-white/70 hover:text-white"
      }`}
    >
      R??t ti???n
    </button>
  </div>
);

type WalletWithdrawActionButtonProps = {
  visible: boolean;
  onClick: () => void;
};

export const WalletWithdrawActionButton: React.FC<WalletWithdrawActionButtonProps> = ({
  visible,
  onClick,
}) =>
  visible ? (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-lg border border-indigo-300/40 bg-indigo-500/20 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500/30"
    >
      + R??t ti???n
    </button>
  ) : null;
