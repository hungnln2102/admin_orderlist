import React from "react";
import { ArchiveBoxIcon } from "@heroicons/react/24/outline";

type Props = { totalItems: number };

export const StorageHeader: React.FC<Props> = ({ totalItems }) => {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
        <div className="shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
          <ArchiveBoxIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Kho Dữ Liệu
          </h1>
          <p className="text-[11px] sm:text-xs text-white/40 mt-0.5">
            Quản lý tài khoản tồn kho hệ thống
          </p>
          <p className="mt-1 text-xs text-indigo-300/90 sm:hidden">
            <span className="tabular-nums font-semibold">{totalItems}</span>
            <span className="text-white/50"> tài khoản</span>
          </p>
        </div>
      </div>
      <div className="hidden sm:flex items-center gap-2 text-xs text-white/40">
        <span className="tabular-nums font-semibold text-indigo-300">{totalItems}</span>
        <span>tài khoản</span>
      </div>
    </div>
  );
};
