import React, { useEffect, useMemo, useRef, useState } from "react";
import { SearchableSelectProps } from "./types";
import { inputClass } from "./helpers";

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  name,
  value,
  options,
  placeholder,
  disabled,
  onChange,
  onClear,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedLabel = useMemo(() => {
    const found = options.find((o) => o.value === value);
    return found ? found.label : "";
  }, [options, value]);

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
      setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

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
          }
          if (!open) setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        disabled={disabled}
        placeholder={placeholder}
        className={`${inputClass} pr-8`}
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
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-white"
          aria-label="Clear"
        >
          ×
        </button>
      )}

      {open && !disabled && (
        <div className="absolute z-20 mt-2 w-full glass-panel-dark border-white/10 shadow-2xl max-h-60 overflow-auto animate-in fade-in slide-in-from-top-2 duration-200">
          {filtered.length === 0 ? (
            <div className="px-4 py-3 text-sm text-indigo-300/60 italic">
              Không có kết quả
            </div>
          ) : (
            filtered.map((opt) => (
              <div
                key={`${String(opt.value)}-${opt.label}`}
                className={`px-4 py-2.5 text-sm cursor-pointer transition-colors hover:bg-indigo-500/20 active:bg-indigo-500/30 ${
                  opt.value === value ? "bg-indigo-500/10 text-indigo-300" : "text-slate-200"
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
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
