import { useMemo, type Dispatch, type SetStateAction } from "react";
import { CheckIcon } from "@heroicons/react/24/solid";
import { ChevronUpIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import type { InputDto } from "@/lib/formsApi";

type SetOrdered = Dispatch<SetStateAction<number[]>>;

interface FormInputSelectSectionProps {
  inputItems: InputDto[];
  orderedInputIds: number[];
  setOrderedInputIds: SetOrdered;
  disabled?: boolean;
}

function normalizeId(id: number) {
  const n = Number(id);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function FormInputSelectSection({
  inputItems,
  orderedInputIds,
  setOrderedInputIds,
  disabled = false,
}: FormInputSelectSectionProps) {
  const byId = useMemo(() => {
    const m = new Map<number, InputDto>();
    for (const it of inputItems) {
      m.set(normalizeId(it.id), it);
    }
    return m;
  }, [inputItems]);

  const selectedSet = useMemo(() => new Set(orderedInputIds), [orderedInputIds]);

  const unselected = useMemo(
    () => inputItems.filter((i) => !selectedSet.has(normalizeId(i.id))),
    [inputItems, selectedSet]
  );

  const allSelected =
    inputItems.length > 0 && inputItems.every((i) => selectedSet.has(normalizeId(i.id)));

  const selectAll = () => {
    if (allSelected) {
      setOrderedInputIds([]);
    } else {
      setOrderedInputIds(inputItems.map((i) => normalizeId(i.id)).filter((n) => n > 0));
    }
  };

  const toggle = (id: number) => {
    const n = normalizeId(id);
    if (n <= 0) return;
    setOrderedInputIds((prev) => {
      if (prev.includes(n)) return prev.filter((x) => x !== n);
      return [...prev, n];
    });
  };

  const move = (id: number, dir: -1 | 1) => {
    setOrderedInputIds((prev) => {
      const idx = prev.indexOf(id);
      if (idx < 0) return prev;
      const j = idx + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  };

  if (inputItems.length === 0) {
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-bold uppercase tracking-widest text-indigo-300/50 ml-1">
            Chọn input (nhiều lựa chọn)
          </label>
        </div>
        <p className="text-sm text-white/50 py-2 rounded-2xl border border-white/10 bg-white/5 px-3">
          Chưa có input nào. Tạo input trước.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2 gap-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-indigo-300/50 ml-1">
            Chọn input (nhiều lựa chọn)
          </label>
          <p className="text-[11px] text-white/40 mt-0.5 ml-1">
            Thứ tự bên dưới dùng cho hiển thị / lưu (nút lên / xuống).
          </p>
        </div>
        <button
          type="button"
          onClick={selectAll}
          disabled={disabled}
          className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors disabled:opacity-50 shrink-0"
        >
          {allSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"}
        </button>
      </div>

      <div className="max-h-72 overflow-y-auto rounded-2xl border border-white/10 bg-white/5 p-3 space-y-4">
        {orderedInputIds.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/35 mb-2">
              Thứ tự đã chọn
            </p>
            <ul className="grid grid-cols-2 md:grid-cols-3 gap-2 content-start">
              {orderedInputIds.map((oid, index) => {
                const item = byId.get(oid);
                if (!item) {
                  return (
                    <li
                      key={oid}
                      className="col-span-2 md:col-span-3 flex items-center justify-between gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2"
                    >
                      <span className="text-sm text-amber-100/90">
                        Input id {oid} không còn trong danh sách
                      </span>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() =>
                          setOrderedInputIds((prev) => prev.filter((x) => x !== oid))
                        }
                        className="text-xs text-amber-300 hover:text-amber-100 shrink-0"
                      >
                        Gỡ
                      </button>
                    </li>
                  );
                }
                return (
                  <li
                    key={oid}
                    className="flex flex-col min-h-[4.5rem] rounded-xl bg-indigo-500/20 border border-indigo-500/40 p-1.5"
                  >
                    <div className="flex items-center gap-1 w-full min-w-0">
                      <div className="flex flex-col shrink-0">
                        <button
                          type="button"
                          disabled={disabled || index === 0}
                          onClick={() => move(oid, -1)}
                          className="p-0.5 rounded text-white/50 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed"
                          aria-label="Lên trên"
                        >
                          <ChevronUpIcon className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={disabled || index === orderedInputIds.length - 1}
                          onClick={() => move(oid, 1)}
                          className="p-0.5 rounded text-white/50 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed"
                          aria-label="Xuống dưới"
                        >
                          <ChevronDownIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="text-[10px] text-white/40 w-4 shrink-0 tabular-nums text-center self-start pt-0.5">
                        {index + 1}
                      </span>
                      <span className="font-medium text-white text-sm leading-tight min-w-0 flex-1 line-clamp-2 text-left pr-0.5">
                        {item.name || "Chưa đặt tên"}
                      </span>
                      <label className="flex items-start justify-end shrink-0 cursor-pointer p-0.5">
                        <span
                          className="w-4 h-4 rounded border-2 border-indigo-400 bg-indigo-500/30 flex items-center justify-center"
                          aria-hidden
                        >
                          <CheckIcon className="w-2.5 h-2.5 text-indigo-400" />
                        </span>
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked
                          onChange={() => toggle(oid)}
                          disabled={disabled}
                        />
                      </label>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {unselected.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/35 mb-2">
              Chưa chọn (bấm để thêm)
            </p>
            <ul className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {unselected.map((item) => {
                const rowId = normalizeId(item.id);
                return (
                  <li key={rowId} className="min-w-0">
                    <label
                      className="flex items-center gap-2 min-h-[2.75rem] px-2.5 py-2 rounded-xl cursor-pointer transition-colors hover:bg-white/5 border border-white/10 bg-white/5 h-full"
                    >
                      <span className="flex-shrink-0 w-4 h-4 rounded border-2 border-white/30" />
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={false}
                        onChange={() => toggle(rowId)}
                        disabled={disabled}
                      />
                      <span className="font-medium text-white text-sm min-w-0 flex-1 line-clamp-2 leading-tight">
                        {item.name || "Chưa đặt tên"}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
