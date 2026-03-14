import React from "react";
import { ArchiveBoxIcon } from "@heroicons/react/24/outline";

type Props = { totalItems: number };

export const StorageHeader: React.FC<Props> = ({ totalItems }) => {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
          <ArchiveBoxIcon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Kho Dữ Liệu
          </h1>
          <p className="text-xs text-white/40 mt-0.5">
            Quản lý tài khoản tồn kho hệ thống
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
