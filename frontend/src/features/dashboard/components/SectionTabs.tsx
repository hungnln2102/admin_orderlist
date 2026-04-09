import React from "react";

type SectionTabsProps = {
  activeSection: "overview" | "finance";
  onChange: (key: "overview" | "finance") => void;
  /** Đặt trong khối cha (cùng viền/bóng) — bỏ lớp vỏ ngoài trùng lặp */
  embedded?: boolean;
};

const SECTION_TABS: Array<{ key: "overview" | "finance"; label: string }> = [
  { key: "overview", label: "Tổng quan" },
  { key: "finance", label: "Chi tiêu & Ngân sách" },
];

export const SectionTabs: React.FC<SectionTabsProps> = ({
  activeSection,
  onChange,
  embedded = false,
}) => {
  const shell = embedded
    ? "w-full flex p-0 rounded-xl bg-transparent border-0 shadow-none backdrop-blur-none"
    : "w-full flex p-2 rounded-2xl bg-indigo-950/30 border border-indigo-500/25 shadow-[0_20px_50px_-12px_rgba(79,70,229,0.2)] backdrop-blur-xl transition-all duration-300";

  return (
    <div className={shell}>
      <div className="flex-1 grid grid-cols-2 gap-2 sm:gap-2.5 min-h-[2.875rem]">
        {SECTION_TABS.map((tab) => {
          const isActive = activeSection === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange(tab.key)}
              className={`w-full rounded-xl px-4 py-2.5 sm:px-5 sm:py-3 text-[11px] sm:text-sm font-bold uppercase tracking-[0.1em] sm:tracking-[0.12em] transition-all duration-300 relative overflow-hidden ${
                isActive
                  ? "text-white shadow-[0_10px_28px_-6px_rgba(99,102,241,0.45)] bg-gradient-to-br from-indigo-500/85 via-indigo-600/55 to-violet-700/45 border border-indigo-300/40 ring-1 ring-white/10"
                  : "text-indigo-200/55 hover:text-indigo-100/95 hover:bg-indigo-900/25 border border-transparent hover:border-indigo-500/25"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
