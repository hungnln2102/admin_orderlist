import React, { useState, useEffect, useMemo, useRef } from "react";
import { Search, ChevronDown } from "lucide-react";
import { CatalogSupplierCost, CatalogSupplier } from "../types";

interface SearchableSupplierDropdownProps {
  productSuppliers: CatalogSupplierCost[];
  allSuppliers: CatalogSupplier[];
  selectedSupplierName: string;
  onSelectSupplier: (supplierName: string) => void;
  loadingSuppliers: boolean;
  disabled?: boolean;
}

export const SearchableSupplierDropdown: React.FC<SearchableSupplierDropdownProps> = ({
  productSuppliers,
  allSuppliers,
  selectedSupplierName,
  onSelectSupplier,
  loadingSuppliers,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isProductSpecific = productSuppliers.length > 0;

  const displayList = useMemo(() => {
    if (isProductSpecific) {
      return productSuppliers.map((s) => ({
        id: s.id,
        name: s.supplier_name || s.ncc_name || "",
        cost: Number(s.price || s.gia_nhap || 0),
        numberBank: s.number_bank || "",
        isSpecific: true,
      }));
    }
    return allSuppliers.map((s) => ({
      id: s.id,
      name: s.supplier_name || s.ncc_name || "",
      cost: 0,
      numberBank: s.number_bank || "",
      isSpecific: false,
    }));
  }, [productSuppliers, allSuppliers, isProductSpecific]);

  const filteredList = useMemo(() => {
    if (!search.trim()) return displayList;
    const term = search.toLowerCase().trim();
    return displayList.filter(
      (s) => s.name.toLowerCase().includes(term) || s.numberBank.includes(term)
    );
  }, [displayList, search]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedItem = displayList.find((s) => s.name === selectedSupplierName);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-left flex items-center justify-between focus:outline-none transition-all min-h-[38px] ${disabled ? "opacity-60 cursor-not-allowed hover:border-slate-800" : "cursor-pointer hover:border-cyan-500/50"}`}
      >
        <span className="text-xs font-medium text-white break-words whitespace-normal leading-snug flex-1 pr-2">
          {loadingSuppliers ? (
            <span className="text-cyan-400 animate-pulse">Đang tải NCC phù hợp...</span>
          ) : selectedSupplierName ? (
            <span className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-cyan-300">{selectedSupplierName}</span>
              {selectedItem && selectedItem.cost > 0 && (
                <span className="text-[11px] text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                  (Giá nhập: {new Intl.NumberFormat("vi-VN").format(selectedItem.cost)} ₫)
                </span>
              )}
            </span>
          ) : (
            <span className="text-slate-400">
              {isProductSpecific ? "-- Chọn NCC cung cấp sản phẩm này --" : "-- Chọn Nhà cung cấp --"}
            </span>
          )}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 ml-1 transition-transform ${isOpen ? "rotate-180 text-cyan-400" : ""}`} />
      </button>

      {/* Downwards Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 w-full sm:min-w-[500px] mt-1.5 z-50 bg-[#0c1222] border border-cyan-500/40 rounded-xl shadow-2xl p-2.5 space-y-2 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100 max-h-80 flex flex-col">
          {/* Header Info */}
          <div className="px-1 text-[11px] font-bold text-cyan-400 uppercase tracking-wider flex items-center justify-between">
            <span>{isProductSpecific ? "NCC Cung cấp sản phẩm này (Tối ưu)" : "Tất cả nhà cung cấp"}</span>
            <span className="text-slate-500 font-normal">{filteredList.length} NCC</span>
          </div>

          {/* Search Box */}
          <div className="relative shrink-0">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              autoFocus
              placeholder="Gõ tìm tên nhà cung cấp..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Supplier Items List */}
          <div className="overflow-y-auto custom-scrollbar divide-y divide-slate-800/40 space-y-1 flex-1 max-h-60">
            {filteredList.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-500 italic">
                Không tìm thấy NCC nào phù hợp
              </div>
            ) : (
              filteredList.map((s) => {
                const isSelected = s.name === selectedSupplierName;
                return (
                  <button
                    key={`${s.id}-${s.name}`}
                    type="button"
                    onClick={() => {
                      onSelectSupplier(s.name);
                      setIsOpen(false);
                      setSearch("");
                    }}
                    className={`w-full text-left p-2 rounded-lg transition-colors flex items-center justify-between gap-2 group ${
                      isSelected
                        ? "bg-cyan-500/20 text-cyan-200 font-bold border border-cyan-500/30"
                        : "hover:bg-slate-800/80 text-slate-300"
                    }`}
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="text-xs font-bold text-slate-100 group-hover:text-cyan-300 truncate">
                        {s.name}
                      </div>
                      {s.numberBank && (
                        <div className="text-[10.5px] text-slate-400 truncate">STK: {s.numberBank}</div>
                      )}
                    </div>
                    {s.cost > 0 && (
                      <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded shrink-0">
                        Vốn: {new Intl.NumberFormat("vi-VN").format(s.cost)} ₫
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
