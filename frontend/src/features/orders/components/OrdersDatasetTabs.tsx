import {
  ORDER_DATASET_CONFIG,
  ORDER_DATASET_SEQUENCE,
  type OrderDatasetKey,
} from "@/constants";

type OrdersDatasetTabsProps = {
  datasetKey: OrderDatasetKey;
  datasetCounts: Record<OrderDatasetKey, number>;
  onSelectDataset: (datasetKey: OrderDatasetKey) => void;
};

export function OrdersDatasetTabs({
  datasetKey,
  datasetCounts,
  onSelectDataset,
}: OrdersDatasetTabsProps) {
  return (
    <div className="rounded-[32px] glass-panel-dark p-4 shadow-2xl border border-white/5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {ORDER_DATASET_SEQUENCE.map((key) => {
          const datasetKeyValue = key as OrderDatasetKey;
          const config = ORDER_DATASET_CONFIG[datasetKeyValue];
          const isActive = datasetKey === datasetKeyValue;
          const count = datasetCounts[datasetKeyValue] ?? 0;

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDataset(datasetKeyValue)}
              className={`flex items-center justify-between rounded-2xl px-6 py-4 text-left transition-all duration-300 border ${
                isActive
                  ? "bg-gradient-to-br from-indigo-500/80 to-purple-600/80 text-white border-white/20 shadow-[0_12px_40px_-12px_rgba(99,102,241,0.5)] scale-[1.02]"
                  : "bg-white/5 text-slate-400 hover:bg-white/10 border-white/5 hover:text-slate-200"
              }`}
            >
              <div>
                <p className="text-sm font-semibold text-white drop-shadow">
                  {config.label}
                </p>
                <p className="text-xs text-indigo-100/80">
                  {config.description}
                </p>
              </div>

              <div className="text-2xl font-bold text-lime-200 drop-shadow">
                {count.toLocaleString("vi-VN")}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
