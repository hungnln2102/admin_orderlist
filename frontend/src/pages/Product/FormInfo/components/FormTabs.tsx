import type { FormInfoTab } from "../types";

interface FormTabsProps {
  activeTab: FormInfoTab;
  onChange: (tab: FormInfoTab) => void;
}

export function FormTabs({ activeTab, onChange }: FormTabsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onChange("form")}
        className={`px-3.5 py-1.5 rounded-2xl text-xs sm:text-sm font-medium transition-colors ${
          activeTab === "form"
            ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/40"
            : "bg-slate-900/70 text-indigo-200/80 hover:bg-slate-800"
        }`}
      >
        Form
      </button>
      <button
        type="button"
        onClick={() => onChange("input")}
        className={`px-3.5 py-1.5 rounded-2xl text-xs sm:text-sm font-medium transition-colors ${
          activeTab === "input"
            ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/40"
            : "bg-slate-900/70 text-indigo-200/80 hover:bg-slate-800"
        }`}
      >
        Input
      </button>
    </div>
  );
}

