import React from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { type WalletBalancesHeaderLabels } from "./types";

type WalletBalancesHeaderProps = {
  labels: WalletBalancesHeaderLabels;
  totalWallet5: number | null;
  currencyFormatter: Intl.NumberFormat;
  adding: boolean;
  onToggleAdd: () => void;
};

const WalletBalancesHeader: React.FC<WalletBalancesHeaderProps> = ({
  labels,
  totalWallet5,
  currencyFormatter,
  adding,
  onToggleAdd,
}) => {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-sm font-semibold text-white">{labels.title}</p>
        {totalWallet5 !== null && (
          <p className="text-xs text-white/70">
            {labels.totalWallet5Label} {currencyFormatter.format(totalWallet5)}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onToggleAdd}
        className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/20"
      >
        {adding ? (
          <XMarkIcon className="h-4 w-4" />
        ) : (
          <PlusIcon className="h-4 w-4" />
        )}
        {adding ? labels.closeLabel : labels.addLabel}
      </button>
    </div>
  );
};

export default WalletBalancesHeader;
