import React from "react";
import { AdjustmentsHorizontalIcon, PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { type WalletBalancesHeaderLabels } from "./types";

type WalletBalancesHeaderProps = {
  labels: WalletBalancesHeaderLabels;
  totalWallet5: number | null;
  currencyFormatter: Intl.NumberFormat;
  adding: boolean;
  onToggleAdd: () => void;
  onOpenManageColumns?: () => void;
  centerSlot?: React.ReactNode;
  showManageButton?: boolean;
  showAddButton?: boolean;
  rightSlot?: React.ReactNode;
};

const WalletBalancesHeader: React.FC<WalletBalancesHeaderProps> = ({
  labels,
  totalWallet5,
  currencyFormatter,
  adding,
  onToggleAdd,
  onOpenManageColumns,
  centerSlot,
  showManageButton = true,
  showAddButton = true,
  rightSlot,
}) => {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <div className="min-w-[180px]">
        <p className="text-sm font-semibold text-white">{labels.title}</p>
        {totalWallet5 !== null && (
          <p className="text-xs text-white/70">
            {labels.totalWallet5Label} {currencyFormatter.format(totalWallet5)}
          </p>
        )}
      </div>
      <div className="flex min-w-[220px] flex-1 items-center justify-center">
        {centerSlot}
      </div>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        {rightSlot}
        {showManageButton && onOpenManageColumns ? (
          <button
            type="button"
            onClick={onOpenManageColumns}
            className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/20"
          >
            <AdjustmentsHorizontalIcon className="h-4 w-4" />
            {labels.manageColumnsLabel}
          </button>
        ) : null}
        {showAddButton ? (
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
        ) : null}
      </div>
    </div>
  );
};

export default WalletBalancesHeader;
