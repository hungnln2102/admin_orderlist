import React from "react";
import { ArchiveBoxIcon } from "@heroicons/react/24/outline";

export const StorageHeader: React.FC = () => {
  return (
    <div className="flex items-center gap-2">
      <ArchiveBoxIcon className="h-7 w-7 text-indigo-300" />
      <div>
        <h1 className="text-xl font-semibold text-white">Lưu trữ</h1>
        <p className="text-sm text-white/70">
          Hàng đang còn tồn kho (chưa ghép vào đơn hàng)
        </p>
      </div>
    </div>
  );
};
