import React from "react";

type StatCardProps = {
  title: string;
  value: React.ReactNode;
  accent: string;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

const StatCard = ({ title, value, accent, Icon }: StatCardProps) => {
  const colors = {
    sky: "from-sky-500 via-sky-400 to-blue-500",
    rose: "from-rose-500 via-pink-500 to-red-500",
    violet: "from-purple-500 via-violet-500 to-indigo-500",
    emerald: "from-emerald-500 via-emerald-400 to-lime-500",
  }[accent] || "from-gray-500 to-gray-600";

  return (
    <div className="relative isolate rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-white/10 px-5 py-4 shadow-lg">
      <div className="relative flex items-center gap-4">
        <div className={`rounded-2xl bg-gradient-to-br ${colors} p-3 text-white shadow-inner`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="text-right flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-white/60">{title}</p>
          <p className="text-xl font-extrabold text-white">{value}</p>
        </div>
      </div>
    </div>
  );
};

export default StatCard;
