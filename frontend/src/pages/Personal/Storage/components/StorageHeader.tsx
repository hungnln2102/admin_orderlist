import React from "react";
import { ArchiveBoxIcon } from "@heroicons/react/24/outline";

export const StorageHeader: React.FC = () => {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-4xl lg:text-5xl font-black text-white tracking-tighter">
        Kho <span className="text-indigo-400">Dữ Liệu</span>
      </h1>
      <p className="text-sm font-medium text-indigo-200/60 uppercase tracking-[0.3em]">
        Central Storage & Inventory Ledger
      </p>
    </div>
  );
};
