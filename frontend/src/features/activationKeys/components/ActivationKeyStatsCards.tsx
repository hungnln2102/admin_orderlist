import React from "react";
import { KeyRound, CheckCircle2, Clock, Ban } from "lucide-react";
import { ActivationKeyCounts } from "../types";

interface Props {
  counts: ActivationKeyCounts;
  activeStatus: string;
  onSelectStatus: (status: string) => void;
}

export const ActivationKeyStatsCards: React.FC<Props> = ({
  counts,
  activeStatus,
  onSelectStatus,
}) => {
  const cards = [
    {
      id: "all",
      label: "Tổng Số Mã Key",
      count: counts.total,
      icon: KeyRound,
      color: "from-blue-500/20 to-cyan-500/10 border-blue-500/30 text-blue-400",
      activeRing: "ring-2 ring-blue-500",
      textColor: "text-blue-400",
    },
    {
      id: "available",
      label: "Chưa Kích Hoạt (Khả dụng)",
      count: counts.available,
      icon: Clock,
      color: "from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400",
      activeRing: "ring-2 ring-emerald-500",
      textColor: "text-emerald-400",
    },
    {
      id: "activated",
      label: "Đã Kích Hoạt (Đã cấp slot)",
      count: counts.activated,
      icon: CheckCircle2,
      color: "from-purple-500/20 to-indigo-500/10 border-purple-500/30 text-purple-400",
      activeRing: "ring-2 ring-purple-500",
      textColor: "text-purple-400",
    },
    {
      id: "revoked",
      label: "Đã Thu Hồi / Hủy",
      count: counts.revoked,
      icon: Ban,
      color: "from-rose-500/20 to-red-500/10 border-rose-500/30 text-rose-400",
      activeRing: "ring-2 ring-rose-500",
      textColor: "text-rose-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
      {cards.map((card) => {
        const Icon = card.icon;
        const isActive = activeStatus === card.id;

        return (
          <button
            key={card.id}
            type="button"
            onClick={() => onSelectStatus(card.id)}
            className={`text-left p-4 rounded-2xl bg-gradient-to-br ${card.color} border backdrop-blur-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
              isActive ? card.activeRing : "hover:border-slate-700"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {card.label}
              </span>
              <div className={`p-2 rounded-xl bg-slate-900/60 border border-slate-800 ${card.textColor}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {card.count.toLocaleString("vi-VN")}
            </div>
          </button>
        );
      })}
    </div>
  );
};

