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
    <div className="w-full grid grid-cols-2 gap-3 rounded-2xl border border-white/15 bg-white/5 p-3 shadow-[0_16px_45px_-28px_rgba(0,0,0,0.55)]">
      {SECTION_TABS.map((tab) => {
        const isActive = activeSection === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`w-full rounded-full px-4 py-3 text-sm font-semibold transition shadow-sm ${
              isActive
                ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-[0_10px_30px_-18px_rgba(59,130,246,0.8)]"
                : "bg-white/10 text-white/80 hover:bg-white/20"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};
