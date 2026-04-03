type PromoTab = "list" | "history";

type PromoTabSwitchProps = {
  activeTab: PromoTab;
  onSelectTab: (tab: PromoTab) => void;
};

export function PromoTabSwitch({
  activeTab,
  onSelectTab,
}: PromoTabSwitchProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onSelectTab("list")}
        className={`px-3.5 py-1.5 rounded-2xl text-xs sm:text-sm font-medium transition-colors ${
          activeTab === "list"
            ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/40"
            : "bg-slate-900/70 text-indigo-200/80 hover:bg-slate-800"
        }`}
      >
        Danh sách mã khuyến mãi
      </button>
      <button
        type="button"
        onClick={() => onSelectTab("history")}
        className={`px-3.5 py-1.5 rounded-2xl text-xs sm:text-sm font-medium transition-colors ${
          activeTab === "history"
            ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/40"
            : "bg-slate-900/70 text-indigo-200/80 hover:bg-slate-800"
        }`}
      >
        Lịch sử sử dụng mã khuyến mãi
      </button>
    </div>
  );
}
