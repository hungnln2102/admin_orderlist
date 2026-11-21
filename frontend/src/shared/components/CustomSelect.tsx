import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";

export interface CustomSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export type CustomSelectAccent = "cyan" | "amber" | "rose" | "emerald" | "indigo" | "purple";

export interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  accent?: CustomSelectAccent;
  size?: "sm" | "md";
  ariaLabel?: string;
  className?: string;
  menuClassName?: string;
}

const ACCENT_STYLES: Record<
  CustomSelectAccent,
  { openBorder: string; selectedBg: string; checkText: string; focusSearch: string }
> = {
  cyan: {
    openBorder: "border-cyan-500 ring-1 ring-cyan-500/25",
    selectedBg: "bg-cyan-500/15 text-cyan-200",
    checkText: "text-cyan-400",
    focusSearch: "focus:border-cyan-500",
  },
  amber: {
    openBorder: "border-amber-500 ring-1 ring-amber-500/25",
    selectedBg: "bg-amber-500/15 text-amber-200",
    checkText: "text-amber-400",
    focusSearch: "focus:border-amber-500",
  },
  rose: {
    openBorder: "border-rose-500 ring-1 ring-rose-500/25",
    selectedBg: "bg-rose-500/15 text-rose-200",
    checkText: "text-rose-400",
    focusSearch: "focus:border-rose-500",
  },
  emerald: {
    openBorder: "border-emerald-500 ring-1 ring-emerald-500/25",
    selectedBg: "bg-emerald-500/15 text-emerald-200",
    checkText: "text-emerald-400",
    focusSearch: "focus:border-emerald-500",
  },
  indigo: {
    openBorder: "border-indigo-500 ring-1 ring-indigo-500/25",
    selectedBg: "bg-indigo-500/15 text-indigo-200",
    checkText: "text-indigo-400",
    focusSearch: "focus:border-indigo-500",
  },
  purple: {
    openBorder: "border-purple-500 ring-1 ring-purple-500/25",
    selectedBg: "bg-purple-500/15 text-purple-200",
    checkText: "text-purple-400",
    focusSearch: "focus:border-purple-500",
  },
};

/**
 * CustomSelect — Dropdown chọn chuẩn Design System SSOT của dự án.
 * Thay thế hoàn toàn thẻ `<select>` gốc trình duyệt:
 * - Render menu qua React Portal nên không bao giờ bị cắt trong modal `overflow-y-auto`.
 * - Tự động lật lên trên khi gần đáy màn hình.
 * - Hỗ trợ bàn phím (ArrowUp, ArrowDown, Enter, Escape) và tìm kiếm nhanh.
 */
export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = "Chọn một mục...",
  disabled = false,
  searchable,
  searchPlaceholder = "Tìm kiếm...",
  accent = "cyan",
  size = "md",
  ariaLabel,
  className = "",
  menuClassName = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const accentStyle = ACCENT_STYLES[accent] || ACCENT_STYLES.cyan;
  const showSearch = searchable ?? options.length > 7;

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [options, search]);

  const updatePosition = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const estimatedHeight = Math.min(options.length * 36 + (showSearch ? 52 : 16), 280);
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < estimatedHeight && rect.top > spaceBelow;

    setMenuStyle({
      position: "fixed",
      left: Math.max(8, Math.min(rect.left, window.innerWidth - Math.max(rect.width, 180) - 8)),
      width: Math.max(rect.width, 160),
      ...(openUpward
        ? { bottom: window.innerHeight - rect.top + 6 }
        : { top: rect.bottom + 6 }),
      zIndex: 9999,
    });
  };

  useEffect(() => {
    if (!isOpen) {
      setSearch("");
      return;
    }
    updatePosition();
    const activeIdx = filteredOptions.findIndex((o) => o.value === value && !o.disabled);
    setHighlightedIndex(activeIdx >= 0 ? activeIdx : 0);

    if (showSearch) {
      requestAnimationFrame(() => searchInputRef.current?.focus());
    }

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
    };

    const handleScrollOrResize = (e: Event) => {
      if (menuRef.current && e.target instanceof Node && menuRef.current.contains(e.target)) {
        return;
      }
      updatePosition();
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isOpen]);

  const handleSelect = (opt: CustomSelectOption) => {
    if (opt.disabled) return;
    onChange(opt.value);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();
      return;
    }
    if (!isOpen) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        filteredOptions.length === 0 ? 0 : (prev + 1) % filteredOptions.length
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        filteredOptions.length === 0
          ? 0
          : (prev - 1 + filteredOptions.length) % filteredOptions.length
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = filteredOptions[highlightedIndex];
      if (target && !target.disabled) {
        handleSelect(target);
      }
    }
  };

  const sizeClass =
    size === "sm"
      ? "px-3 py-2 text-xs rounded-xl"
      : "px-3.5 py-2.5 text-xs sm:text-sm rounded-xl";

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        className={`w-full flex items-center justify-between gap-2 text-left bg-slate-900 border border-slate-700/80 text-slate-100 transition-all focus:outline-none ${sizeClass} ${
          isOpen ? accentStyle.openBorder : "hover:border-slate-600"
        } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"} ${className}`}
      >
        <span className={`truncate ${selectedOption ? "text-slate-100" : "text-slate-500"}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-slate-200" : ""
          }`}
        />
      </button>

      {isOpen &&
        !disabled &&
        ReactDOM.createPortal(
          <div
            ref={menuRef}
            style={menuStyle}
            role="listbox"
            onKeyDown={handleKeyDown}
            className={`rounded-2xl border border-slate-700/90 bg-[#0b1222]/98 backdrop-blur-xl shadow-2xl shadow-black/70 overflow-hidden animate-in fade-in zoom-in-95 duration-100 ${menuClassName}`}
          >
            {showSearch && (
              <div className="p-2 border-b border-slate-800">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setHighlightedIndex(0);
                    }}
                    placeholder={searchPlaceholder}
                    className={`w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none ${accentStyle.focusSearch}`}
                  />
                </div>
              </div>
            )}

            <div className="max-h-60 overflow-y-auto custom-scrollbar p-1.5 space-y-0.5">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-3 text-center text-xs text-slate-500">
                  Không tìm thấy lựa chọn phù hợp
                </div>
              ) : (
                filteredOptions.map((opt, idx) => {
                  const isSelected = opt.value === value;
                  const isHighlighted = idx === highlightedIndex;
                  return (
                    <button
                      key={`${opt.value}-${idx}`}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      disabled={opt.disabled}
                      onMouseEnter={() => !opt.disabled && setHighlightedIndex(idx)}
                      onClick={() => handleSelect(opt)}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs text-left transition-colors ${
                        opt.disabled
                          ? "text-slate-600 cursor-not-allowed"
                          : isSelected
                          ? `${accentStyle.selectedBg} font-semibold cursor-pointer`
                          : isHighlighted
                          ? "bg-slate-800/90 text-white cursor-pointer"
                          : "text-slate-200 hover:bg-slate-800/70 hover:text-white cursor-pointer"
                      }`}
                    >
                      <span className="truncate">{opt.label}</span>
                      {isSelected && (
                        <Check className={`w-3.5 h-3.5 shrink-0 ${accentStyle.checkText}`} />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
