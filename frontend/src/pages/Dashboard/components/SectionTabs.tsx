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
    <div className="w-full flex p-1.5 rounded-[28px] glass-panel-light border border-white/5 shadow-2xl relative z-10 transition-all duration-300">
      <div className="flex-1 grid grid-cols-2 gap-2">
        {SECTION_TABS.map((tab) => {
          const isActive = activeSection === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onChange(tab.key)}
              className={`w-full rounded-[22px] px-6 py-4 text-sm font-black uppercase tracking-[0.15em] transition-all duration-500 relative overflow-hidden ${
                isActive
                  ? "text-white shadow-[0_0_30px_rgba(99,102,241,0.3)] bg-indigo-600/40 border border-indigo-400/30"
                  : "text-indigo-100/50 hover:text-white/80 hover:bg-white/5 border border-transparent"
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
