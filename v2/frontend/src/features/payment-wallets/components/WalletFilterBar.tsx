import React from "react";
import { Search } from "lucide-react";
import { PaymentTabKey } from "../types";

interface WalletFilterBarProps {
  activeTab: PaymentTabKey;
  search: string;
  onSearchChange: (val: string) => void;
  resultCount: number;
}

export const WalletFilterBar: React.FC<WalletFilterBarProps> = ({
  activeTab,
  search,
  onSearchChange,
  resultCount,
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-800/80 backdrop-blur-xl">
      <div className="relative flex-1 w-full">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          placeholder={activeTab === "bank" ? "Tìm theo số tài khoản, chủ tài khoản, ngân hàng..." : "Tìm theo địa chỉ ví USDT, mạng lưới, nhãn..."}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
        />
      </div>
      <div className="text-xs text-slate-400 font-medium whitespace-nowrap">
        Hiển thị: <span className="font-bold text-white">{resultCount}</span> kết quả
      </div>
    </div>
  );
};
