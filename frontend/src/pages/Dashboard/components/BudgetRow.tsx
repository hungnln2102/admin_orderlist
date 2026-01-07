import React from "react";

interface Props {
  name: string;
  used: number;
  total: number;
}

const BudgetRow: React.FC<Props> = ({ name, used, total }) => {
  const percent = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
  return (
    <div className="rounded-2xl bg-white/60 p-4 shadow-inner shadow-slate-900/10">
      <div className="flex items-center justify-between text-sm font-semibold text-white">
        <span>{name}</span>
        <span className="text-xs text-white/80">
          {used.toLocaleString("vi-VN")} / {total.toLocaleString("vi-VN")}
        </span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-white/30">
        <div
          className="h-2 rounded-full bg-indigo-400"
          style={{ width: `${percent}%` }}
          aria-label={`progress-${name}`}
        />
      </div>
    </div>
  );
};

export default BudgetRow;
