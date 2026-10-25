import React, { useState, useEffect, useMemo, useRef } from "react";
import { Search, ChevronDown } from "lucide-react";
import { CatalogProduct } from "../types";

interface SearchableProductDropdownProps {
  products: CatalogProduct[];
  selectedProductId: number | null;
  onSelectProduct: (productIdStr: string) => void;
  disabled?: boolean;
}

export const SearchableProductDropdown: React.FC<SearchableProductDropdownProps> = ({
  products,
  selectedProductId,
  onSelectProduct,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedProduct = products.find(
    (p) => Number(p.id) === selectedProductId || String(p.id) === String(selectedProductId)
  );

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products;
    const term = search.toLowerCase().trim();
    return products.filter(
      (p) =>
        (p.package_product && p.package_product.toLowerCase().includes(term)) ||
        p.san_pham.toLowerCase().includes(term)
    );
  }, [products, search]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-left flex items-center justify-between transition-all min-h-[38px] ${disabled ? "cursor-not-allowed opacity-80 bg-slate-950/80" : "hover:border-cyan-500/50 focus:outline-none cursor-pointer"}`}
      >
        <span className="text-xs font-medium text-white break-words whitespace-normal leading-snug flex-1 pr-2">
          {selectedProduct ? (
            <span className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-cyan-300">
                {selectedProduct.package_product || selectedProduct.san_pham}
              </span>
              {selectedProduct.san_pham && selectedProduct.san_pham !== selectedProduct.package_product && (
                <span className="text-[10.5px] text-slate-400 font-mono">({selectedProduct.san_pham})</span>
              )}
            </span>
          ) : (
            <span className="text-slate-400">-- Chọn sản phẩm từ danh mục --</span>
          )}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 ml-1 transition-transform ${isOpen ? "rotate-180 text-cyan-400" : ""}`} />
      </button>

      {/* Downwards Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 w-full sm:w-[540px] md:w-[600px] max-w-[calc(100vw-3rem)] sm:max-w-[620px] mt-1.5 z-50 bg-[#0c1222] border border-cyan-500/40 rounded-xl shadow-2xl p-2.5 space-y-2 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100 max-h-96 flex flex-col">
          {/* Search Box */}
          <div className="relative shrink-0">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              autoFocus
              placeholder="Gõ tìm kiếm tên sản phẩm, gói..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Product Items List */}
          <div className="overflow-y-auto custom-scrollbar divide-y divide-slate-800/40 space-y-1 flex-1 max-h-72">
            {filteredProducts.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-500 italic">
                Không tìm thấy sản phẩm khớp với từ khóa
              </div>
            ) : (
              filteredProducts.map((p) => {
                const isSelected = Number(p.id) === selectedProductId || String(p.id) === String(selectedProductId);
                const primaryName = p.package_product || p.san_pham;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      onSelectProduct(String(p.id));
                      setIsOpen(false);
                      setSearch("");
                    }}
                    className={`w-full text-left p-2.5 rounded-lg transition-colors flex items-center justify-between gap-3 group ${
                      isSelected
                        ? "bg-cyan-500/20 text-cyan-200 font-bold border border-cyan-500/30"
                        : "hover:bg-slate-800/80 text-slate-300"
                    }`}
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="text-xs font-bold text-slate-100 group-hover:text-cyan-300 whitespace-normal break-words leading-snug">
                        {primaryName}
                      </div>
                      {p.san_pham && p.san_pham !== primaryName && (
                        <div className="text-[11px] text-slate-400 font-mono whitespace-normal break-words mt-0.5">
                          {p.san_pham}
                        </div>
                      )}
                    </div>
                    {p.retail_price > 0 && (
                      <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md shrink-0">
                        {new Intl.NumberFormat("vi-VN").format(p.retail_price)} ₫
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
