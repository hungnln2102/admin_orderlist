import React, { useEffect, useMemo, useRef, useState } from "react";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { SearchableSelectProps } from "./types";
import { inputClass } from "./helpers";

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  name,
  value,
  options,
  placeholder,
  disabled,
  allowCustom,
  onChange,
  onClear,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedLabel = useMemo(() => {
    const found = options.find((o) => o.value === value);
    if (found) return found.label;
    if (allowCustom && value) return String(value);
    return "";
  }, [options, value, allowCustom]);

  useEffect(() => {
    setQuery(selectedLabel);
  }, [selectedLabel]);

  const filtered = useMemo(() => {
    const q = (query || "").toLowerCase().trim();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (containerRef.current.contains(e.target as Node)) return;
      // also check if click is inside the portal
      const portalEl = document.getElementById("searchable-select-portal");
      if (portalEl && portalEl.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!open) return;
    const updateRect = () => {
      if (containerRef.current) setRect(containerRef.current.getBoundingClientRect());
    };
    updateRect();
    window.addEventListener("scroll", updateRect, true);
    window.addEventListener("resize", updateRect);
    return () => {
      window.removeEventListener("scroll", updateRect, true);
      window.removeEventListener("resize", updateRect);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <input
        name={name}
        type="text"
        value={query}
        onChange={(e) => {
          const next = e.target.value;
          setQuery(next);
          if (next === "") {
            onClear?.();
          } else if (allowCustom) {
            onChange(next, { value: next, label: next });
          }
          if (!open) setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        disabled={disabled}
        placeholder={placeholder}
        className={`${inputClass} pr-10`}
        autoComplete="off"
      />
      {Boolean(query) && onClear && !disabled && (
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            setQuery("");
            onClear();
            setOpen(false);
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full px-1.5 py-0.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white"
          aria-label="Clear"
        >
          x
        </button>
      )}

      {open && !disabled && rect && (
        <ModalPortal>
          <div 
            id="searchable-select-portal"
            className="fixed z-[9999] rounded-xl border border-slate-600 bg-slate-800 shadow-[0_24px_45px_-18px_rgba(2,6,23,0.95)] max-h-64 overflow-auto animate-in fade-in slide-in-from-top-2 duration-150"
            style={{
              top: rect.bottom + 8,
              left: rect.left,
              width: rect.width,
            }}
          >
            {filtered.length === 0 ? (
            allowCustom && query.trim() !== "" ? (
              <div
                className="px-4 py-2.5 text-sm cursor-pointer text-cyan-300 hover:bg-cyan-500/10 transition-colors"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setOpen(false);
                  onChange(query, { value: query, label: query });
                }}
              >
                + Thêm "{query}"
              </div>
            ) : (
              <div className="px-4 py-3 text-sm text-slate-400 italic">
                Không có kết quả
              </div>
            )
          ) : (
            <>
              {filtered.map((opt) => (
                <div
                  key={`${String(opt.value)}-${opt.label}`}
                  className={`px-4 py-2.5 text-sm cursor-pointer transition-colors ${
                    opt.value === value
                      ? "bg-cyan-500/15 text-cyan-200"
                      : "text-slate-200 hover:bg-cyan-500/10 active:bg-cyan-500/20"
                  }`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setQuery(opt.label);
                    setOpen(false);
                    onChange(opt.value, opt);
                  }}
                >
                  {opt.label}
                </div>
              ))}
              {allowCustom && query.trim() !== "" && !filtered.some(o => o.label.toLowerCase() === query.trim().toLowerCase()) && (
                <div
                  className="px-4 py-2.5 text-sm cursor-pointer border-t border-slate-700 text-cyan-300 hover:bg-cyan-500/10 transition-colors"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setOpen(false);
                    onChange(query, { value: query, label: query });
                  }}
                >
                  + Thêm "{query}"
                </div>
              )}
            </>
          )}
          </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default SearchableSelect;
