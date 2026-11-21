import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";

export interface SearchableComboboxProps {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  accent?: "blue" | "amber" | "cyan" | "emerald";
  listHeaderLabel?: string;
  emptyText?: string;
  allowCustomValue?: boolean;
  customValuePrefix?: string;
  toggleTitle?: string;
  className?: string;
}

const ACCENT_BORDER_MAP: Record<NonNullable<SearchableComboboxProps["accent"]>, string> = {
  blue: "focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400/30",
  amber: "border-amber-500/40 focus-within:border-amber-400 focus-within:ring-1 focus-within:ring-amber-400/30",
  cyan: "focus-within:border-cyan-400 focus-within:ring-1 focus-within:ring-cyan-400/30",
  emerald: "focus-within:border-emerald-400 focus-within:ring-1 focus-within:ring-emerald-400/30",
};

/**
 * SearchableCombobox — Ô nhập kết hợp danh sách chọn có tìm kiếm, điều hướng bàn phím (Up/Down/Enter/Esc)
 * và hỗ trợ giá trị nhập tay. Dùng chung qua `@/shared/components` (FE-11).
 */
export const SearchableCombobox: React.FC<SearchableComboboxProps> = ({
  value,
  onChange,
  options,
  placeholder,
  required = false,
  disabled = false,
  accent = "blue",
  listHeaderLabel = "Danh sách gợi ý",
  emptyText = "Không tìm thấy kết quả phù hợp",
  allowCustomValue = true,
  customValuePrefix = "Dùng giá trị nhập tay:",
  toggleTitle = "Mở danh sách chọn",
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    if (!value) return options;
    const lower = value.toLowerCase();
    return options.filter((item) => item.toLowerCase().includes(lower));
  }, [options, value]);

  useEffect(() => {
    setHighlightedIndex(filtered.length > 0 ? 0 : -1);
  }, [value, isOpen, filtered.length]);

  const isCustomValue = Boolean(
    allowCustomValue &&
      value &&
      !options.some((o) => o.toLowerCase() === value.toLowerCase())
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (e.key === "Escape") {
      setIsOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      setHighlightedIndex((prev) => (filtered.length === 0 ? -1 : (prev + 1) % filtered.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      setHighlightedIndex((prev) =>
        filtered.length === 0 ? -1 : (prev - 1 + filtered.length) % filtered.length
      );
    } else if (e.key === "Enter" && isOpen && highlightedIndex >= 0 && filtered[highlightedIndex]) {
      e.preventDefault();
      onChange(filtered[highlightedIndex]);
      setIsOpen(false);
    }
  };

  const borderFocusClass = ACCENT_BORDER_MAP[accent] || ACCENT_BORDER_MAP.blue;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div
        className={`flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 transition-all ${borderFocusClass} ${
          disabled ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        <input
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          required={required}
          disabled={disabled}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => !disabled && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full bg-transparent text-white font-mono text-xs focus:outline-none"
        />
        {value && !disabled && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-slate-500 hover:text-slate-300 p-1 cursor-pointer transition-colors"
            title="Xóa giá trị"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setIsOpen((prev) => !prev)}
          className="text-slate-400 hover:text-cyan-400 p-1 cursor-pointer transition-colors"
          title={toggleTitle}
        >
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-cyan-400" : ""
            }`}
          />
        </button>
      </div>

      {isOpen && !disabled && (
        <div
          role="listbox"
          className="absolute z-50 left-0 right-0 mt-1 max-h-52 overflow-y-auto custom-scrollbar bg-[#0f172a] border border-slate-700/85 rounded-xl shadow-2xl p-1 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 flex items-center justify-between border-b border-slate-800 mb-1">
            <span>
              {listHeaderLabel} ({options.length})
            </span>
            {value && <span className="text-cyan-400">Khớp: {filtered.length}</span>}
          </div>

          {filtered.length > 0 ? (
            filtered.map((item, idx) => {
              const isSelected = item.toLowerCase() === value.toLowerCase();
              const isHighlighted = idx === highlightedIndex;
              return (
                <button
                  key={`${item}-${idx}`}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  onClick={() => {
                    onChange(item);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-mono flex items-center justify-between transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-cyan-500/20 text-cyan-300 font-semibold"
                      : isHighlighted
                      ? "bg-slate-800 text-white"
                      : "text-slate-200 hover:bg-slate-800/80 hover:text-white"
                  }`}
                >
                  <span className="truncate">{item}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0 ml-2" />}
                </button>
              );
            })
          ) : (
            <div className="px-3 py-2 text-center text-[11px] text-slate-400">{emptyText}</div>
          )}

          {isCustomValue && (
            <div className="border-t border-slate-800 mt-1 pt-1">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-mono text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span className="truncate">
                  {customValuePrefix} <strong>{value}</strong>
                </span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
