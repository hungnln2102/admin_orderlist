import React from "react";

type SectionTabsProps = {
  activeSection: "overview" | "finance";
  onChange: (key: "overview" | "finance") => void;
};

const SECTION_TABS: Array<{ key: "overview" | "finance"; label: string }> = [
  { key: "overview", label: "Tổng quan" },
  { key: "finance", label: "Chi tiêu & Ngân sách" },
];

export const SectionTabs: React.FC<SectionTabsProps> = ({ activeSection, onChange }) => {
  return (
    <div className="w-full flex p-2 rounded-2xl bg-indigo-950/30 border border-indigo-500/25 shadow-[0_20px_50px_-12px_rgba(79,70,229,0.2)] backdrop-blur-xl transition-all duration-300">
      <div className="flex-1 grid grid-cols-2 gap-2.5">
        {SECTION_TABS.map((tab) => {
          const isActive = activeSection === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onChange(tab.key)}
              className={`w-full rounded-xl px-6 py-3 text-sm font-bold uppercase tracking-[0.12em] transition-all duration-500 relative overflow-hidden ${
                isActive
                  ? "text-white shadow-[0_8px_25px_-5px_rgba(99,102,241,0.4)] bg-gradient-to-r from-indigo-600/50 to-indigo-600/30 border border-indigo-400/50"
                  : "text-indigo-200/60 hover:text-indigo-100 hover:bg-indigo-900/20 border border-indigo-500/20"
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
