import { CheckIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import type { WarehouseItem } from "../../../../../Personal/Storage/types";

type StockDropdownMenuProps = {
  filteredItems: WarehouseItem[];
  totalCount: number;
  loading: boolean;
  selectedId: number | null;
  search: string;
  onSearchChange: (value: string) => void;
  onSelect: (item: WarehouseItem) => void;
};

export function StockDropdownMenu({
  filteredItems,
  totalCount,
  loading,
  selectedId,
  search,
  onSearchChange,
  onSelect,
}: StockDropdownMenuProps) {
  return (
    <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-white/[0.1] bg-[#0d1225] shadow-2xl">
      <div className="border-b border-white/[0.06] p-2">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Tìm tài khoản..."
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] py-1.5 pl-8 pr-3 text-xs text-white placeholder:text-white/20 focus:border-indigo-500/40 focus:outline-none"
            autoFocus
          />
        </div>
      </div>
      <div className="max-h-48 overflow-y-auto">
        {filteredItems.length === 0 ? (
          <div className="px-3 py-4 text-center text-xs text-white/30">
            {loading
              ? "Đang tải kho hàng..."
              : "Không tìm thấy tài khoản tồn kho nào."}
          </div>
        ) : (
          filteredItems.map((item) => {
            const isActive = selectedId === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item)}
                className={`flex w-full items-center gap-2 border-l-2 px-3 py-2 text-left transition-colors ${
                  isActive
                    ? "border-indigo-500 bg-indigo-500/15"
                    : "border-transparent hover:bg-white/[0.04]"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-white">
                      {item.account || "—"}
                    </span>
                    {item.category && (
                      <span className="inline-flex shrink-0 items-center rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-medium text-white/40">
                        {item.category}
                      </span>
                    )}
                  </div>
                  {item.note && (
                    <p className="mt-0.5 truncate text-[11px] text-white/25">
                      {item.note}
                    </p>
                  )}
                </div>
                {isActive && (
                  <CheckIcon className="h-4 w-4 shrink-0 text-indigo-400" />
                )}
              </button>
            );
          })
        )}
      </div>
      <div className="border-t border-white/[0.06] px-3 py-1.5 text-[10px] text-white/20">
        {totalCount} tài khoản tồn kho
      </div>
    </div>
  );
}
