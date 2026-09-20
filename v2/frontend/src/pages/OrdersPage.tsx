import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ShoppingBag,
  Plus,
  Search,
  Edit2,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  XCircle,
  X,
  Filter,
  DollarSign,
  Eye,
  Calendar,
  User,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { DateRangePicker } from "../shared/components/DateRangePicker";
import { useNotification } from "@/shared/context/NotificationContext";

interface Order {
  id: number;
  id_order: string;
  id_product?: number | string;
  customer: string;
  contact: string;
  information_order: string;
  slot?: string;
  price: number;
  gross_selling_price?: number;
  cost?: number;
  supply_id?: number | string;
  status: string;
  payment_method?: string;
  note?: string;
  created_at?: string;
  order_date?: string;
  expired_at?: string;
  days?: number | string;
  refund?: string;
  transaction?: string;
}

export type OrderDatasetKey = "active" | "import" | "expired" | "canceled";

interface OrdersPageProps {
  initialTab?: OrderDatasetKey;
}

const DEFAULT_FORM_DATA = {
  customer: "",
  contact: "",
  information_order: "",
  slot: "",
  id_product: "",
  supply_id: "",
  price: 150000,
  gross_selling_price: 150000,
  cost: 0,
  status: "Chưa Thanh Toán",
  payment_method: "bank",
  note: "",
  days: 365,
  order_date: "",
  expired_at: "",
};

export interface CatalogProduct {
  id: number;
  san_pham: string;
  package_product: string;
  base_price: number;
  retail_price: number;
  ctv_price: number;
  student_price: number;
  promo_price: number;
  is_active: boolean;
}

export interface CatalogSupplierCost {
  id: number;
  variant_id: number;
  supplier_id: number;
  supplier_name: string;
  ncc_name?: string;
  number_bank?: string;
  price: number;
  gia_nhap?: number;
}

export interface CatalogSupplier {
  id: number;
  supplier_name: string;
  ncc_name?: string;
  number_bank?: string;
}

interface SearchableProductDropdownProps {
  products: CatalogProduct[];
  selectedProductId: number | null;
  onSelectProduct: (productIdStr: string) => void;
}

const SearchableProductDropdown: React.FC<SearchableProductDropdownProps> = ({
  products,
  selectedProductId,
  onSelectProduct,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products;
    const term = search.toLowerCase().trim();
    return products.filter(
      (p) =>
        p.san_pham.toLowerCase().includes(term) ||
        (p.package_product && p.package_product.toLowerCase().includes(term))
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
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-left flex items-center justify-between hover:border-cyan-500/50 focus:outline-none transition-all cursor-pointer min-h-[38px]"
      >
        <span className="text-xs font-medium text-white break-words whitespace-normal leading-snug flex-1 pr-2">
          {selectedProduct ? (
            <span className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-cyan-300">{selectedProduct.san_pham}</span>
              {selectedProduct.package_product && selectedProduct.package_product !== selectedProduct.san_pham && (
                <span className="text-[10.5px] text-slate-400">({selectedProduct.package_product})</span>
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
        <div className="absolute top-full left-0 w-full sm:min-w-[600px] lg:min-w-[680px] mt-1.5 z-50 bg-[#0c1222] border border-cyan-500/40 rounded-xl shadow-2xl p-2.5 space-y-2 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100 max-h-96 flex flex-col">
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
                const isSelected = p.id === selectedProductId;
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
                        {p.san_pham}
                      </div>
                      {p.package_product && p.package_product !== p.san_pham && (
                        <div className="text-[11px] text-slate-400 font-normal whitespace-normal break-words mt-0.5">
                          {p.package_product}
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

interface SearchableSupplierDropdownProps {
  productSuppliers: CatalogSupplierCost[];
  allSuppliers: CatalogSupplier[];
  selectedSupplierName: string;
  onSelectSupplier: (supplierName: string) => void;
  loadingSuppliers: boolean;
}

const SearchableSupplierDropdown: React.FC<SearchableSupplierDropdownProps> = ({
  productSuppliers,
  allSuppliers,
  selectedSupplierName,
  onSelectSupplier,
  loadingSuppliers,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = React.useRef<HTMLDivElement>(null);

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
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-left flex items-center justify-between hover:border-cyan-500/50 focus:outline-none transition-all cursor-pointer min-h-[38px]"
      >
        <span className="text-xs font-medium text-white break-words whitespace-normal leading-snug flex-1 pr-2">
          {loadingSuppliers ? (
            <span className="text-cyan-400 font-semibold animate-pulse">Đang tải NCC...</span>
          ) : selectedSupplierName ? (
            <span className="font-bold text-purple-300">{selectedSupplierName}</span>
          ) : (
            <span className="text-slate-400">-- Chọn nhà cung cấp --</span>
          )}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 ml-1 transition-transform ${isOpen ? "rotate-180 text-cyan-400" : ""}`} />
      </button>

      {/* Downwards Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 w-full sm:min-w-[480px] mt-1.5 z-50 bg-[#0c1222] border border-cyan-500/40 rounded-xl shadow-2xl p-2.5 space-y-2 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100 max-h-80 flex flex-col">
          {/* Search Box */}
          <div className="relative shrink-0">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              autoFocus
              placeholder="Gõ tìm tên NCC..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Supplier Items List */}
          <div className="overflow-y-auto custom-scrollbar divide-y divide-slate-800/40 space-y-1 flex-1 max-h-56">
            {filteredList.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-500 italic">
                Không tìm thấy nhà cung cấp nào
              </div>
            ) : (
              filteredList.map((s) => {
                const isSelected = s.name === selectedSupplierName;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      onSelectSupplier(s.name);
                      setIsOpen(false);
                      setSearch("");
                    }}
                    className={`w-full text-left p-2.5 rounded-lg transition-colors flex items-center justify-between gap-3 group ${
                      isSelected
                        ? "bg-purple-500/20 text-purple-200 font-bold border border-purple-500/30"
                        : "hover:bg-slate-800/80 text-slate-300"
                    }`}
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="text-xs font-bold text-slate-100 group-hover:text-purple-300 whitespace-normal break-words leading-snug">
                        {s.name}
                      </div>
                      {s.numberBank && (
                        <div className="text-[10px] text-slate-400 font-normal whitespace-normal mt-0.5">
                          STK: {s.numberBank}
                        </div>
                      )}
                    </div>
                    {s.cost > 0 && (
                      <span className="text-xs font-bold text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1 rounded-md shrink-0">
                        Giá nhập: {new Intl.NumberFormat("vi-VN").format(s.cost)} ₫
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

export const OrdersPage: React.FC<OrdersPageProps> = ({ initialTab = "active" }) => {
  const notify = useNotification();
  const [activeTab, setActiveTab] = useState<OrderDatasetKey>(initialTab);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalOrders, setTotalOrders] = useState<number>(0);
  const [tabCounts, setTabCounts] = useState({ active: 0, import: 0, expired: 0, canceled: 0 });

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState<boolean>(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Form states
  const [formData, setFormData] = useState(DEFAULT_FORM_DATA);

  // Catalog Data States for Dropdowns & Auto-fill
  const [productsCatalog, setProductsCatalog] = useState<CatalogProduct[]>([]);
  const [allSuppliersCatalog, setAllSuppliersCatalog] = useState<CatalogSupplier[]>([]);
  const [productSuppliersCatalog, setProductSuppliersCatalog] = useState<CatalogSupplierCost[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState<boolean>(false);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [isCustomPriceMode, setIsCustomPriceMode] = useState<boolean>(false);

  // Fetch product catalog and all suppliers catalog once
  useEffect(() => {
    fetch("/api/products/prices?limit=500")
      .then((res) => res.json())
      .then((data) => {
        if (data.data) {
          setProductsCatalog(data.data);
        }
      })
      .catch((err) => console.error("Lỗi tải danh mục sản phẩm:", err));

    fetch("/api/products/all-suppliers")
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data.data || [];
        setAllSuppliersCatalog(list);
      })
      .catch((err) => console.error("Lỗi tải danh sách NCC:", err));
  }, []);

  const fetchSuppliersForProduct = async (productId: number) => {
    setLoadingSuppliers(true);
    try {
      const res = await fetch(`/api/products/${productId}/suppliers`);
      const data = await res.json();
      if (res.ok) {
        const list: CatalogSupplierCost[] = Array.isArray(data) ? data : data.data || [];
        setProductSuppliersCatalog(list);
        return list;
      }
    } catch (err) {
      console.error("Lỗi tải NCC cho sản phẩm:", err);
    } finally {
      setLoadingSuppliers(false);
    }
    setProductSuppliersCatalog([]);
    return [];
  };

  const handleProductChange = async (productIdVal: string) => {
    if (!productIdVal) {
      setSelectedProductId(null);
      setProductSuppliersCatalog([]);
      return;
    }

    const pId = Number(productIdVal);
    const prod = productsCatalog.find((p) => p.id === pId);
    if (!prod) return;

    setSelectedProductId(prod.id);
    const sellingPrice = prod.retail_price > 0 ? prod.retail_price : (prod.ctv_price > 0 ? prod.ctv_price : prod.base_price);
    const infoOrder = prod.package_product && prod.package_product !== prod.san_pham
      ? `${prod.san_pham} (${prod.package_product})`
      : prod.san_pham;

    // Fetch suppliers for this specific product
    const suppliers = await fetchSuppliersForProduct(prod.id);

    let defaultSupplyName = formData.supply_id;
    let defaultCost = formData.cost;

    if (suppliers.length > 0) {
      const lowestSupplier = [...suppliers].sort((a, b) => (Number(a.price || a.gia_nhap || 0)) - (Number(b.price || b.gia_nhap || 0)))[0];
      defaultSupplyName = lowestSupplier.supplier_name || lowestSupplier.ncc_name || "";
      defaultCost = Number(lowestSupplier.price || lowestSupplier.gia_nhap || 0);
    } else if (prod.base_price > 0) {
      defaultCost = prod.base_price;
    }

    // Auto-calculate duration days & expired_at from product package name (v1 logic)
    const textToMatch = `${prod.san_pham} ${prod.package_product || ""}`;
    let derivedDays = 365;
    const matchM = textToMatch.match(/--(\d+)m/i) || textToMatch.match(/(\d+)\s*(tháng|month|m\b)/i);
    const matchY = textToMatch.match(/(\d+)\s*(năm|year|y\b)/i);

    if (matchM) {
      const months = Number(matchM[1]);
      if (months > 0) derivedDays = months === 12 ? 365 : months * 30;
    } else if (matchY) {
      const years = Number(matchY[1]);
      if (years > 0) derivedDays = years * 365;
    }

    const baseDateStr = formData.order_date || new Date().toISOString().split("T")[0];
    const baseDate = new Date(baseDateStr);
    const expiryDate = new Date(baseDate.getTime() + derivedDays * 24 * 60 * 60 * 1000);
    const expiryStr = expiryDate.toISOString().split("T")[0];

    setFormData((prev) => ({
      ...prev,
      id_product: prod.san_pham,
      information_order: infoOrder,
      price: sellingPrice,
      gross_selling_price: sellingPrice,
      supply_id: defaultSupplyName,
      cost: defaultCost,
      days: derivedDays,
      expired_at: expiryStr,
    }));
  };

  const handleSupplierChange = (supplierVal: string) => {
    if (!supplierVal) {
      setFormData((prev) => ({ ...prev, supply_id: "", cost: 0 }));
      return;
    }

    const foundInProduct = productSuppliersCatalog.find(
      (s) => (s.supplier_name || s.ncc_name) === supplierVal || String(s.supplier_id) === supplierVal
    );

    if (foundInProduct) {
      const costVal = Number(foundInProduct.price || foundInProduct.gia_nhap || 0);
      setFormData((prev) => ({
        ...prev,
        supply_id: foundInProduct.supplier_name || foundInProduct.ncc_name || supplierVal,
        cost: costVal,
      }));
    } else {
      const foundInAll = allSuppliersCatalog.find(
        (s) => (s.supplier_name || s.ncc_name) === supplierVal || String(s.id) === supplierVal
      );
      setFormData((prev) => ({
        ...prev,
        supply_id: foundInAll ? (foundInAll.supplier_name || foundInAll.ncc_name || supplierVal) : supplierVal,
      }));
    }
  };

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/orders?page=${page}&limit=15&search=${encodeURIComponent(
          search
        )}&status=${encodeURIComponent(statusFilter)}&tab=${activeTab}`
      );
      const data = await res.json();
      if (res.ok) {
        setOrders(data.data || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalOrders(data.pagination?.total || 0);
        if (data.tabCounts) {
          setTabCounts(data.tabCounts);
        }
      } else {
        console.error("Lỗi lấy danh sách đơn:", data.error);
      }
    } catch (err) {
      console.error("Lỗi kết nối API:", err);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, activeTab]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Lock background body scroll when any modal is open
  useEffect(() => {
    const isAnyModalOpen = isCreateModalOpen || isEditModalOpen || isDeleteModalOpen || isViewModalOpen;
    if (isAnyModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isCreateModalOpen, isEditModalOpen, isDeleteModalOpen, isViewModalOpen]);

  const calculateRemainingDays = useCallback((order: Order) => {
    if (order.status === "Đã Hủy" || order.status === "Hủy" || order.status === "Đã Hoàn") return 0;
    if (order.expired_at) {
      let expiry: Date | null = null;
      const str = String(order.expired_at).trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        const [y, m, d] = str.split("-").map(Number);
        expiry = new Date(y, m - 1, d);
      } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
        const [d, m, y] = str.split("/").map(Number);
        expiry = new Date(y, m - 1, d);
      } else {
        const parsed = new Date(order.expired_at);
        if (!isNaN(parsed.getTime())) {
          expiry = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
        }
      }

      if (expiry) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        expiry.setHours(0, 0, 0, 0);
        return Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      }
    }
    return Number(order.days || 0);
  }, []);

  const calculateRemainingValue = useCallback((order: Order) => {
    const remainingDays = calculateRemainingDays(order);
    if (remainingDays <= 0) return 0;
    const price = Number(order.price || 0);
    const totalDays = Number(order.days || 365);
    if (totalDays <= 0) return 0;
    return Math.max(0, Math.round((price / totalDays) * remainingDays));
  }, [calculateRemainingDays]);

  const formatDateDisplay = useCallback((dateStr?: string) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "—";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }, []);

  const getDisplayProductName = useCallback(
    (idProduct?: number | string) => {
      if (!idProduct) return "";
      const str = String(idProduct).trim();
      if (!str) return "";

      const parseDurationText = (text: string): string => {
        if (!text) return "";
        const lower = text.toLowerCase();
        const matchM = lower.match(/--(\d+)m/i) || lower.match(/(\d+)\s*(tháng|month|m\b)/i);
        const matchY = lower.match(/--(\d+)y/i) || lower.match(/(\d+)\s*(năm|year|y\b)/i);

        if (matchM && Number(matchM[1]) > 0) {
          const months = Number(matchM[1]);
          return `${months} tháng`;
        }
        if (matchY && Number(matchY[1]) > 0) {
          const years = Number(matchY[1]);
          return `${years} năm`;
        }
        return "";
      };

      const pId = Number(str);
      let variantName = "";
      let rawName = str;

      if (!isNaN(pId) && pId > 0) {
        const found = productsCatalog.find((p) => p.id === pId);
        if (found) {
          variantName = found.package_product || found.san_pham;
          rawName = `${found.san_pham} ${found.package_product || ""}`;
        }
      } else {
        const found = productsCatalog.find(
          (p) => p.san_pham.toLowerCase() === str.toLowerCase() || (p.package_product && p.package_product.toLowerCase() === str.toLowerCase())
        );
        if (found) {
          variantName = found.package_product || found.san_pham;
          rawName = `${found.san_pham} ${found.package_product || ""}`;
        } else {
          variantName = str;
        }
      }

      const durationStr = parseDurationText(rawName);
      if (durationStr) {
        if (variantName.toLowerCase().includes(durationStr.toLowerCase())) {
          return variantName;
        }
        return `${variantName} (${durationStr})`;
      }

      return variantName || str;
    },
    [productsCatalog]
  );

  const getOrderPrefixConfig = useCallback((idOrder?: string) => {
    if (!idOrder) {
      return {
        prefix: "MAV",
        badgeBg: "bg-slate-800/80",
        badgeText: "text-slate-300",
        badgeBorder: "border-slate-700/80",
        leftBorder: "border-l-slate-700",
        glow: "shadow-slate-900/50",
      };
    }
    const upper = idOrder.toUpperCase();
    if (upper.startsWith("MAVC")) {
      return {
        prefix: "MAVC",
        badgeBg: "bg-cyan-500/15",
        badgeText: "text-cyan-300 font-extrabold",
        badgeBorder: "border-cyan-500/40",
        leftBorder: "border-l-cyan-500",
        glow: "shadow-cyan-500/10",
      };
    }
    if (upper.startsWith("MAVL")) {
      return {
        prefix: "MAVL",
        badgeBg: "bg-purple-500/15",
        badgeText: "text-purple-300 font-extrabold",
        badgeBorder: "border-purple-500/40",
        leftBorder: "border-l-purple-500",
        glow: "shadow-purple-500/10",
      };
    }
    if (upper.startsWith("MAVN")) {
      return {
        prefix: "MAVN",
        badgeBg: "bg-emerald-500/15",
        badgeText: "text-emerald-300 font-extrabold",
        badgeBorder: "border-emerald-500/40",
        leftBorder: "border-l-emerald-500",
        glow: "shadow-emerald-500/10",
      };
    }
    if (upper.startsWith("MAVK")) {
      return {
        prefix: "MAVK",
        badgeBg: "bg-amber-500/15",
        badgeText: "text-amber-300 font-extrabold",
        badgeBorder: "border-amber-500/40",
        leftBorder: "border-l-amber-500",
        glow: "shadow-amber-500/10",
      };
    }
    if (upper.startsWith("MAVS")) {
      return {
        prefix: "MAVS",
        badgeBg: "bg-rose-500/15",
        badgeText: "text-rose-300 font-extrabold",
        badgeBorder: "border-rose-500/40",
        leftBorder: "border-l-rose-500",
        glow: "shadow-rose-500/10",
      };
    }
    return {
      prefix: "MAV",
      badgeBg: "bg-indigo-500/15",
      badgeText: "text-indigo-300 font-extrabold",
      badgeBorder: "border-indigo-500/40",
      leftBorder: "border-l-indigo-500",
      glow: "shadow-indigo-500/10",
    };
  }, []);

  const DATASET_TABS_CONFIG = useMemo(() => [
    {
      key: "active" as OrderDatasetKey,
      label: "Đơn Bán Khách Hàng",
      description: "Danh sách đơn hàng bán lẻ & CTV",
      count: tabCounts.active,
      gradient: "from-cyan-500/20 via-sky-500/10 to-transparent",
      borderColor: "border-cyan-500/40",
      activeText: "text-cyan-300",
    },
    {
      key: "import" as OrderDatasetKey,
      label: "Đơn Nhập Kho & NCC",
      description: "Quản lý đơn vốn nhập kho & nhà cung cấp",
      count: tabCounts.import,
      gradient: "from-purple-500/20 via-indigo-500/10 to-transparent",
      borderColor: "border-purple-500/40",
      activeText: "text-purple-300",
    },
    {
      key: "expired" as OrderDatasetKey,
      label: "Đơn Hết Hạn",
      description: "Danh sách đơn hàng đã hết thời hạn",
      count: tabCounts.expired,
      gradient: "from-amber-500/20 via-orange-500/10 to-transparent",
      borderColor: "border-amber-500/40",
      activeText: "text-amber-300",
    },
    {
      key: "canceled" as OrderDatasetKey,
      label: "Hoàn Tiền & Đã Hủy",
      description: "Đơn đã hoàn, chưa hoàn tiền & đơn hủy",
      count: tabCounts.canceled,
      gradient: "from-rose-500/20 via-pink-500/10 to-transparent",
      borderColor: "border-rose-500/40",
      activeText: "text-rose-300",
    },
  ], [tabCounts]);

  // Stat summary calculations for active view (memoized)
  const { totalRevenue, paidCount, pendingCount } = useMemo(() => {
    const revenue = orders.reduce((sum: number, o: Order) => sum + Number(o.price || 0), 0);
    const paid = orders.filter((o: Order) => o.status === "Hoàn thành" || o.status === "Đã Thanh Toán").length;
    const pending = orders.filter((o: Order) => o.status === "Chờ xử lý" || o.status === "Chưa Thanh Toán" || o.status === "Cần gia hạn" || o.status === "CẦN GIA HẠN" || o.status === "Hết Hạn").length;
    return { totalRevenue: revenue, paidCount: paid, pendingCount: pending };
  }, [orders]);

  const handleOpenCreate = () => {
    const today = new Date().toISOString().split("T")[0];
    const nextYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    setSelectedProductId(null);
    setProductSuppliersCatalog([]);
    setIsCustomPriceMode(false);
    setFormData({
      ...DEFAULT_FORM_DATA,
      order_date: today,
      expired_at: nextYear,
    });
    setIsCreateModalOpen(true);
  };

  const handleOpenView = (order: Order) => {
    setSelectedOrder(order);
    setIsViewModalOpen(true);
  };

  const handleOpenEdit = async (order: Order) => {
    setSelectedOrder(order);
    setIsCustomPriceMode(false);
    const prodName = order.id_product ? String(order.id_product) : "";
    const matchedProd = productsCatalog.find(
      (p) => p.san_pham.toLowerCase() === prodName.toLowerCase() || String(p.id) === prodName
    );

    if (matchedProd) {
      setSelectedProductId(matchedProd.id);
      await fetchSuppliersForProduct(matchedProd.id);
    } else {
      setSelectedProductId(null);
      setProductSuppliersCatalog([]);
    }

    setFormData({
      customer: order.customer || "",
      contact: order.contact || "",
      information_order: order.information_order || "",
      slot: order.slot || "",
      id_product: prodName,
      supply_id: order.supply_id ? String(order.supply_id) : "",
      price: Number(order.price || 0),
      gross_selling_price: Number(order.gross_selling_price || order.price || 0),
      cost: Number(order.cost || 0),
      status: order.status || "Đã Thanh Toán",
      payment_method: order.payment_method || "bank",
      note: order.note || "",
      days: Number(order.days || 365),
      order_date: order.order_date ? new Date(order.order_date).toISOString().split("T")[0] : "",
      expired_at: order.expired_at ? new Date(order.expired_at).toISOString().split("T")[0] : "",
    });
    setIsEditModalOpen(true);
  };

  const handleOpenDelete = (order: Order) => {
    setSelectedOrder(order);
    setIsDeleteModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setIsCreateModalOpen(false);
        notify.success("Tạo đơn hàng thành công!", "Tạo Đơn Hàng");
        fetchOrders();
      } else {
        const errData = await res.json();
        notify.error(errData.error || "Tạo đơn thất bại", "Lỗi Tạo Đơn");
      }
    } catch (err) {
      notify.error("Lỗi kết nối máy chủ", "Kết Nối Thất Bại");
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    try {
      const res = await fetch(`/api/orders/${selectedOrder.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setIsEditModalOpen(false);
        notify.success("Cập nhật đơn hàng thành công!", "Cập Nhật Đơn Hàng");
        fetchOrders();
      } else {
        const errData = await res.json();
        notify.error(errData.error || "Cập nhật đơn thất bại", "Lỗi Cập Nhật");
      }
    } catch (err) {
      notify.error("Lỗi kết nối máy chủ", "Kết Nối Thất Bại");
    }
  };

  const handleDeleteSubmit = async () => {
    if (!selectedOrder) return;
    try {
      const res = await fetch(`/api/orders/${selectedOrder.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setIsDeleteModalOpen(false);
        notify.success("Đã xóa đơn hàng thành công!", "Xóa Đơn Hàng");
        fetchOrders();
      } else {
        const errData = await res.json();
        notify.error(errData.error || "Xóa đơn thất bại", "Lỗi Xóa Đơn");
      }
    } catch (err) {
      notify.error("Lỗi kết nối máy chủ", "Kết Nối Thất Bại");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Hoàn thành":
      case "Đã Thanh Toán":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-500/10 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Đã Thanh Toán
          </span>
        );
      case "Cần gia hạn":
      case "CẦN GIA HẠN":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-sm shadow-amber-500/10 whitespace-nowrap">
            <Clock className="w-3.5 h-3.5" />
            Cần Gia Hạn
          </span>
        );
      case "Chờ xử lý":
      case "Chưa Thanh Toán":
      case "Đang xử lý":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-500/10 text-sky-400 border border-sky-500/30 shadow-sm shadow-sky-500/10 whitespace-nowrap">
            <Clock className="w-3.5 h-3.5" />
            {status}
          </span>
        );
      case "Đã Hoàn":
      case "Đã hoàn":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-pink-500/10 text-pink-400 border border-pink-500/30 shadow-sm shadow-pink-500/10 whitespace-nowrap">
            <RefreshCw className="w-3.5 h-3.5 text-pink-400" />
            Đã Hoàn Tiền
          </span>
        );
      case "Chưa Hoàn":
      case "Chưa hoàn":
      case "Chờ Hoàn":
      case "Chờ hoàn":
      case "Hoàn Tiền":
      case "Hoàn tiền":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-300 border border-purple-500/30 shadow-sm shadow-purple-500/10 whitespace-nowrap">
            <Clock className="w-3.5 h-3.5 text-purple-300" />
            Chưa Hoàn Tiền
          </span>
        );
      case "Đã Hủy":
      case "Hủy":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30 shadow-sm shadow-rose-500/10 whitespace-nowrap">
            <XCircle className="w-3.5 h-3.5" />
            Đã Hủy
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-500/10 text-slate-300 border border-slate-500/30 whitespace-nowrap">
            <AlertCircle className="w-3.5 h-3.5" />
            {status || "Khác"}
          </span>
        );
    }
  };

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-[1650px] mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-4 sm:p-6 rounded-2xl border border-slate-800/80 backdrop-blur-xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-cyan-500/20 to-blue-500/10 text-cyan-400 rounded-xl border border-cyan-500/30 shadow-inner">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Quản Lý Đơn Hàng
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Đồng bộ dữ liệu PostgreSQL thực tế (978 đơn hàng) + Event Bus tự động
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={fetchOrders}
            className="p-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl transition border border-slate-700 flex items-center justify-center active:scale-95"
            title="Tải lại dữ liệu"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-cyan-400" : ""}`} />
          </button>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium text-xs sm:text-sm rounded-xl shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Tạo Đơn Hàng Mới</span>
          </button>
        </div>
      </div>

      {/* Dataset Sub-Tabs Navigation (V1 4 Sub-Tabs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {DATASET_TABS_CONFIG.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setPage(1);
              }}
              className={`relative text-left p-4 rounded-2xl border transition-all duration-300 backdrop-blur-xl group overflow-hidden ${
                isActive
                  ? `bg-slate-900/90 ${tab.borderColor} shadow-xl shadow-cyan-500/5 ring-1 ring-cyan-500/20`
                  : "bg-slate-900/50 border-slate-800/80 hover:bg-slate-800/50 hover:border-slate-700/80"
              }`}
            >
              {/* Background Glow */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${tab.gradient} opacity-50 group-hover:opacity-100 transition-opacity pointer-events-none`}
              />

              <div className="relative z-10 flex items-start justify-between gap-3">
                <div>
                  <h3
                    className={`font-bold text-sm tracking-wide transition-colors ${
                      isActive ? "text-white" : "text-slate-300 group-hover:text-white"
                    }`}
                  >
                    {tab.label}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                    {tab.description}
                  </p>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border transition-colors ${
                    isActive
                      ? `${tab.activeText} bg-slate-950/80 border-cyan-500/40`
                      : "text-slate-400 bg-slate-950/40 border-slate-800"
                  }`}
                >
                  {tab.count}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 backdrop-blur-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Tổng Đơn Tab</span>
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">{totalOrders}</p>
          <p className="text-[11px] text-slate-400">Danh mục tab hiện tại</p>
        </div>

        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 backdrop-blur-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Đã Thanh Toán</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-400">{paidCount}</p>
          <p className="text-[11px] text-emerald-400/80">Trang hiện tại: {paidCount} đơn</p>
        </div>

        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 backdrop-blur-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Cần Gia Hạn / Hết Hạn</span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-amber-400">{pendingCount}</p>
          <p className="text-[11px] text-amber-400/80">Trang hiện tại: {pendingCount} đơn</p>
        </div>

        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 backdrop-blur-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Doanh Số Trang</span>
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-purple-300 truncate">
            {totalRevenue.toLocaleString("vi-VN")} ₫
          </p>
          <p className="text-[11px] text-purple-400/80">Doanh thu 15 đơn trang này</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative sm:col-span-2">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo Mã đơn (MAV...), Khách hàng, SĐT/Zalo/FB, Email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-white text-xs sm:text-sm placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 transition"
          />
        </div>

        <div className="relative">
          <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-white text-xs sm:text-sm appearance-none focus:outline-none focus:border-cyan-500/50 transition cursor-pointer"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="Đã Thanh Toán">Đã Thanh Toán / Hoàn thành</option>
            <option value="Cần gia hạn">Cần gia hạn</option>
            <option value="Chưa Thanh Toán">Chưa Thanh Toán</option>
            <option value="Đã Hủy">Đã Hủy</option>
          </select>
        </div>
      </div>

      {/* Responsive View Switch: Desktop Table (>= md) vs Mobile Card Stack (< md) */}

      {/* 1. Desktop & Tablet Table (md+) */}
      <div className="hidden md:block bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-xl shadow-xl">
        <div className="overflow-x-auto custom-scrollbar w-full">
          <table className="w-full min-w-[1150px] border-collapse text-white">
            <thead>
              <tr className="border-b border-slate-800/80 bg-slate-950/50 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="w-[130px] py-4 px-3 text-center">Sản Phẩm</th>
                <th className="min-w-[220px] py-4 px-3 text-center">Thông Tin Đơn</th>
                <th className="min-w-[160px] py-4 px-3 text-center">Khách Hàng</th>
                <th className="w-[170px] py-4 px-3 text-center">Thời Hạn</th>
                <th className="w-[90px] py-4 px-3 text-center">Còn Lại</th>
                <th className="w-[120px] py-4 px-3 text-center">Giá Tiền</th>
                <th className="w-[130px] py-4 px-3 text-center">Trạng Thái</th>
                <th className="w-[110px] py-4 px-3 text-center pr-4">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-sm text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
                      <span>Đang tải dữ liệu đơn hàng...</span>
                    </div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    Không tìm thấy đơn hàng nào trong tab này.
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const remainingDays = calculateRemainingDays(order);
                  const prefixConfig = getOrderPrefixConfig(order.id_order);
                  return (
                    <tr
                      key={order.id}
                      className={`hover:bg-slate-800/40 transition group border-l-4 ${prefixConfig.leftBorder}`}
                    >
                      {/* 1. SẢN PHẨM & MÃ ĐƠN */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        <div className="flex flex-col items-center">
                          <div className={`inline-flex items-center px-2.5 py-1 rounded-lg border font-mono font-black text-xs sm:text-sm tracking-wider shadow-sm ${prefixConfig.badgeBg} ${prefixConfig.badgeText} ${prefixConfig.badgeBorder} ${prefixConfig.glow}`}>
                            {order.id_order || `#${order.id}`}
                          </div>
                          {order.id_product && (
                            <span className="text-[11px] font-bold text-cyan-300 uppercase tracking-wider mt-1 truncate max-w-[160px] block" title={getDisplayProductName(order.id_product)}>
                              {getDisplayProductName(order.id_product)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 2. THÔNG TIN ĐƠN & SLOT */}
                      <td className="py-3.5 px-3 text-center max-w-[240px] overflow-hidden">
                        <div className="flex flex-col items-center">
                          <span
                            className="truncate w-full block text-slate-200 text-xs sm:text-sm font-medium"
                            title={order.information_order}
                          >
                            {order.information_order || "—"}
                          </span>
                          {order.slot && (
                            <div
                              className="mt-1 px-2 py-0.5 rounded-md border border-slate-700/80 bg-slate-900/80 text-[10px] text-cyan-300 font-mono truncate max-w-full block"
                              title={order.slot}
                            >
                              {order.slot}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 3. KHÁCH HÀNG & LIÊN HỆ */}
                      <td className="py-3.5 px-3 text-center max-w-[180px] overflow-hidden">
                        <div className="flex flex-col items-center">
                          <span
                            className="font-bold text-white text-xs sm:text-sm truncate w-full block"
                            title={order.customer}
                          >
                            {order.customer || "—"}
                          </span>
                          {order.contact && (
                            <span
                              className="text-[11px] text-slate-400 truncate w-full block mt-0.5"
                              title={order.contact}
                            >
                              {order.contact}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 4. THỜI HẠN */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] font-mono text-slate-300">
                          <span>{formatDateDisplay(order.order_date || order.created_at)}</span>
                          <span className="text-slate-600">/</span>
                          <span className="text-cyan-300 font-semibold">{formatDateDisplay(order.expired_at)}</span>
                        </div>
                      </td>

                      {/* 5. CÒN LẠI */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        <span
                          className={`font-mono font-black text-sm ${
                            remainingDays <= 0
                              ? "text-rose-400"
                              : remainingDays <= 4
                              ? "text-amber-400"
                              : "text-emerald-400"
                          }`}
                        >
                          {remainingDays}
                        </span>
                      </td>

                      {/* 6. GIÁ TIỀN & GIÁ TRỊ CÒN LẠI */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        <div className="flex flex-col items-center">
                          <span className="font-bold text-white text-xs sm:text-sm">
                            {Number(order.price || 0).toLocaleString("vi-VN")} ₫
                          </span>
                          {calculateRemainingValue(order) > 0 && (
                            <span className="text-[10.5px] font-mono text-cyan-300 font-semibold mt-0.5">
                              Còn lại: {calculateRemainingValue(order).toLocaleString("vi-VN")} ₫
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 7. TRẠNG THÁI */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        <div className="flex justify-center">
                          {getStatusBadge(order.status)}
                        </div>
                      </td>

                      {/* 8. THAO TÁC */}
                      <td className="py-3.5 px-3 text-center pr-4 whitespace-nowrap">
                        <div className="flex justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenView(order)}
                            className="p-1.5 bg-slate-800 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-400 rounded-lg transition border border-slate-700 hover:border-cyan-500/30 active:scale-95"
                            title="Xem chi tiết đơn hàng"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(order)}
                            className="p-1.5 bg-slate-800 hover:bg-amber-500/20 text-slate-300 hover:text-amber-400 rounded-lg transition border border-slate-700 hover:border-amber-500/30 active:scale-95"
                            title="Sửa đơn hàng"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenDelete(order)}
                            className="p-1.5 bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 rounded-lg transition border border-slate-700 hover:border-rose-500/30 active:scale-95"
                            title="Xóa đơn hàng"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Desktop Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-slate-800/80 bg-slate-950/40 text-xs text-slate-400">
            <div>
              Trang <strong className="text-slate-200">{page}</strong> / {totalPages} (Tổng {totalOrders} đơn hàng)
            </div>

            <div className="flex items-center gap-1.5">
              <button
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Trước</span>
              </button>

              <div className="flex items-center gap-1 px-2">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pNum = page;
                  if (page <= 3) {
                    pNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pNum = totalPages - 4 + i;
                  } else {
                    pNum = page - 2 + i;
                  }
                  if (pNum < 1 || pNum > totalPages) return null;
                  return (
                    <button
                      key={pNum}
                      onClick={() => setPage(pNum)}
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                        pNum === page
                          ? "bg-cyan-500 text-slate-950 font-black shadow-md shadow-cyan-500/20"
                          : "bg-slate-900/60 border border-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800"
                      }`}
                    >
                      {pNum}
                    </button>
                  );
                })}
              </div>

              <button
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <span>Sau</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. Mobile Card Stack (< md) */}
      <div className="block md:hidden space-y-3">
        {loading ? (
          <div className="p-8 text-center text-slate-400 bg-slate-900/60 border border-slate-800 rounded-2xl">
            <RefreshCw className="w-6 h-6 animate-spin text-cyan-400 mx-auto mb-2" />
            <span>Đang tải đơn hàng...</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center text-slate-500 bg-slate-900/60 border border-slate-800 rounded-2xl">
            Không tìm thấy đơn hàng nào trong tab này.
          </div>
        ) : (
          orders.map((order) => {
            const remainingDays = calculateRemainingDays(order);
            const prefixConfig = getOrderPrefixConfig(order.id_order);
            return (
              <div
                key={order.id}
                className={`bg-slate-900/70 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-lg border-l-4 ${prefixConfig.leftBorder}`}
              >
                <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                  <div>
                    <span className={`inline-block font-mono font-extrabold text-xs px-2.5 py-1 rounded-lg border ${prefixConfig.badgeBg} ${prefixConfig.badgeText} ${prefixConfig.badgeBorder}`}>
                      {order.id_order || `#${order.id}`}
                    </span>
                    {order.id_product && (
                      <span className="text-[10px] text-cyan-400 font-mono font-bold block mt-0.5" title={getDisplayProductName(order.id_product)}>
                        {getDisplayProductName(order.id_product)}
                      </span>
                    )}
                  </div>
                  {getStatusBadge(order.status)}
                </div>

                <div className="space-y-1.5 text-xs text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Khách hàng:</span>
                    <span className="font-semibold text-white">{order.customer || "—"}</span>
                  </div>
                  {order.contact && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Liên hệ:</span>
                      <span className="font-mono text-slate-300">{order.contact}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-400">Gói / Tài khoản:</span>
                    <span className="font-medium text-slate-200 truncate max-w-[180px]">
                      {order.information_order || "—"}
                    </span>
                  </div>
                  {order.slot && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Slot:</span>
                      <span className="font-mono text-cyan-300 truncate max-w-[180px]">
                        {order.slot}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-1 border-t border-slate-800/60">
                    <span className="text-slate-400">Thời hạn:</span>
                    <span className="font-mono text-[11px] text-slate-300">
                      {formatDateDisplay(order.order_date || order.created_at)} - {formatDateDisplay(order.expired_at)} ({remainingDays} ngày)
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-slate-800/60">
                    <span className="text-slate-400">Giá bán khách:</span>
                    <span className="font-bold text-sm text-white">
                      {Number(order.price || 0).toLocaleString("vi-VN")} ₫
                    </span>
                  </div>
                  {calculateRemainingValue(order) > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Giá trị còn lại:</span>
                      <span className="font-mono font-bold text-xs text-cyan-300">
                        {calculateRemainingValue(order).toLocaleString("vi-VN")} ₫
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/80 text-xs">
                  <button
                    onClick={() => handleOpenView(order)}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-cyan-500/20 text-cyan-400 rounded-lg text-xs font-medium border border-slate-700"
                  >
                    <Eye className="w-3.5 h-3.5" /> Xem
                  </button>
                  <button
                    onClick={() => handleOpenEdit(order)}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-amber-500/20 text-amber-400 rounded-lg text-xs font-medium border border-slate-700"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Sửa
                  </button>
                  <button
                    onClick={() => handleOpenDelete(order)}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-rose-500/20 text-rose-400 rounded-lg text-xs font-medium border border-slate-700"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Xóa
                  </button>
                </div>
              </div>
            );
          })
        )}

        {/* Mobile Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col items-center justify-between gap-3 p-4 bg-slate-900/60 border border-slate-800 rounded-2xl text-xs text-slate-400">
            <div>
              Trang <strong className="text-slate-200">{page}</strong> / {totalPages} (Tổng {totalOrders} đơn hàng)
            </div>
            <div className="flex items-center gap-1.5">
              <button
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Trước</span>
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pNum = page;
                  if (page <= 3) {
                    pNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pNum = totalPages - 4 + i;
                  } else {
                    pNum = page - 2 + i;
                  }
                  if (pNum < 1 || pNum > totalPages) return null;
                  return (
                    <button
                      key={pNum}
                      onClick={() => setPage(pNum)}
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                        pNum === page
                          ? "bg-cyan-500 text-slate-950 font-black shadow-md shadow-cyan-500/20"
                          : "bg-slate-900/60 border border-slate-800 text-slate-400"
                      }`}
                    >
                      {pNum}
                    </button>
                  );
                })}
              </div>
              <button
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 disabled:opacity-40"
              >
                <span>Sau</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Xem Chi Tiết Đơn Hàng */}
      {isViewModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 sm:p-6 relative space-y-4 animate-in fade-in zoom-in-95 duration-150 my-8">
            <button
              onClick={() => setIsViewModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
            
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 pr-8">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/10 text-cyan-400 border border-cyan-500/30">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    Chi Tiết Đơn Hàng #{selectedOrder.id_order || selectedOrder.id}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">
                    ID Hệ Thống: <strong className="text-cyan-300">#{selectedOrder.id}</strong>
                  </p>
                </div>
              </div>
              <div>{getStatusBadge(selectedOrder.status)}</div>
            </div>

            <div className="space-y-3.5 text-xs sm:text-sm">
              {/* 1. Thông Tin Khách Hàng & Liên Hệ */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div>
                  <span className="text-slate-400 text-xs font-semibold block uppercase tracking-wider">Khách hàng</span>
                  <span className="font-bold text-white text-sm block mt-1">{selectedOrder.customer || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-xs font-semibold block uppercase tracking-wider">Liên hệ (SĐT / Zalo / FB)</span>
                  <span className="font-mono text-cyan-300 font-medium block mt-1 break-all">{selectedOrder.contact || "—"}</span>
                </div>
              </div>

              {/* 2. Dịch Vụ, Sản Phẩm & Nhà Cung Cấp */}
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-400 text-xs font-semibold block uppercase tracking-wider">Tên / Mã Sản Phẩm</span>
                    <span className="font-mono text-cyan-300 font-semibold block mt-1 break-words">
                      {getDisplayProductName(selectedOrder.id_product) || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-xs font-semibold block uppercase tracking-wider">Nhà Cung Cấp / Nguồn Hàng</span>
                    <span className="font-mono text-purple-300 font-semibold block mt-1 break-words">
                      {selectedOrder.supply_id || "—"}
                    </span>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-slate-800/60">
                  <span className="text-slate-400 text-xs font-semibold block uppercase tracking-wider">Thông tin đơn / Dịch vụ đăng ký</span>
                  <span className="font-medium text-slate-100 block mt-1 select-all leading-relaxed">{selectedOrder.information_order || "—"}</span>
                </div>

                {selectedOrder.slot && (
                  <div className="pt-2.5 border-t border-slate-800/60">
                    <span className="text-slate-400 text-xs font-semibold block uppercase tracking-wider">Slot tài khoản cấp phát</span>
                    <span className="font-mono text-emerald-300 font-bold block mt-1 select-all break-all">{selectedOrder.slot}</span>
                  </div>
                )}
              </div>

              {/* 3. Thời Hạn & Đăng Ký */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div>
                  <span className="text-slate-400 text-xs font-semibold block uppercase tracking-wider">Ngày đăng ký</span>
                  <span className="font-mono text-slate-300 block mt-1">
                    {formatDateDisplay(selectedOrder.order_date || selectedOrder.created_at)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-xs font-semibold block uppercase tracking-wider">Ngày hết hạn</span>
                  <span className="font-mono text-cyan-300 block mt-1">
                    {formatDateDisplay(selectedOrder.expired_at)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-xs font-semibold block uppercase tracking-wider">Thời hạn còn lại</span>
                  <span className={`font-mono font-bold block mt-1 ${calculateRemainingDays(selectedOrder) <= 0 ? 'text-rose-400' : calculateRemainingDays(selectedOrder) <= 5 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {calculateRemainingDays(selectedOrder)} ngày
                  </span>
                </div>
              </div>

              {/* 4. Tài Chính, Giá Nhập, Giá Trị Còn Lại & Thanh Toán (Đầy đủ như V1) */}
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
                {/* Hàng 1: Nguồn, Giá Nhập, Giá Bán, Giá Trị Còn Lại (4 cột chuẩn V1) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
                    <span className="text-slate-400 text-[11px] font-semibold block uppercase tracking-wider">Nguồn / NCC</span>
                    <span className="font-mono font-bold text-xs sm:text-sm text-purple-300 block mt-1 truncate" title={String(selectedOrder.supply_id || "Mavryk")}>
                      {selectedOrder.supply_id || "Mavryk"}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
                    <span className="text-slate-400 text-[11px] font-semibold block uppercase tracking-wider">Giá Nhập (Vốn)</span>
                    <span className="font-mono font-bold text-xs sm:text-sm text-purple-300 block mt-1">
                      {Number(selectedOrder.cost || 0).toLocaleString("vi-VN")} ₫
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
                    <span className="text-slate-400 text-[11px] font-semibold block uppercase tracking-wider">Giá Bán</span>
                    <span className="font-mono font-bold text-xs sm:text-sm text-white block mt-1">
                      {Number(selectedOrder.price || 0).toLocaleString("vi-VN")} ₫
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
                    <span className="text-slate-400 text-[11px] font-semibold block uppercase tracking-wider">Giá Trị Còn Lại</span>
                    <span className="font-mono font-bold text-xs sm:text-sm text-cyan-300 block mt-1">
                      {calculateRemainingValue(selectedOrder).toLocaleString("vi-VN")} ₫
                    </span>
                  </div>
                </div>

                {/* Hàng 2: Lợi Nhuận, Webhook/Điều Chỉnh, Số Ngày, Thanh Toán */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2.5 border-t border-slate-800/60">
                  <div>
                    <span className="text-slate-400 text-[11px] font-semibold block uppercase tracking-wider">Lợi Nhuận Tạm Tính</span>
                    <span className="font-mono font-bold text-xs sm:text-sm text-emerald-400 block mt-1">
                      +{(Number(selectedOrder.price || 0) - Number(selectedOrder.cost || 0)).toLocaleString("vi-VN")} ₫
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] font-semibold block uppercase tracking-wider">Webhook / Chênh Lệch</span>
                    <span className="font-mono font-medium text-xs text-slate-300 block mt-1">
                      {Number((selectedOrder.gross_selling_price || selectedOrder.price || 0) - selectedOrder.price).toLocaleString("vi-VN")} ₫
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] font-semibold block uppercase tracking-wider">Số Ngày Tổng</span>
                    <span className="font-mono font-bold text-xs text-slate-200 block mt-1">
                      {selectedOrder.days || 365} ngày
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] font-semibold block uppercase tracking-wider">Thanh Toán</span>
                    <span className="font-medium text-xs text-slate-200 block mt-1">
                      {selectedOrder.payment_method === "usdt" ? "Ví USDT" : "Ngân Hàng"}
                    </span>
                  </div>
                </div>
              </div>

              {/* 5. Ghi Chú Nội Bộ (nếu có) */}
              {selectedOrder.note && (
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <span className="text-slate-400 text-xs font-semibold block uppercase tracking-wider">Ghi chú đơn hàng</span>
                  <p className="text-slate-300 text-xs mt-1 italic leading-relaxed">{selectedOrder.note}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <span className="text-[11px] text-slate-500 font-mono">ID Hệ Thống: #{selectedOrder.id}</span>
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs rounded-xl transition"
              >
                Đóng Chi Tiết
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tạo Đơn Hàng */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-[1350px] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 sm:p-6 relative space-y-4 animate-in fade-in zoom-in-95 duration-150 my-4 max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-cyan-400" /> Tạo Đơn Hàng Mới
            </h2>
            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* Cột Trái: Khách Hàng & Dịch Vụ */}
                <div className="space-y-3">
                  {/* 1. Khách hàng & Liên hệ */}
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2.5">
                    <div className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-800/60">
                      <User className="w-3.5 h-3.5" /> 1. Thông Tin Khách Hàng
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block font-semibold text-slate-400 mb-1">
                          Tên Khách Hàng <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.customer}
                          onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
                          placeholder="Ví dụ: Nguyễn Văn A"
                          className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:border-cyan-500/50"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-400 mb-1">Liên Hệ (SĐT/Zalo/FB)</label>
                        <input
                          type="text"
                          value={formData.contact}
                          onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                          placeholder="0987xxx hoặc link Facebook..."
                          className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:border-cyan-500/50"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 2. Sản phẩm & Dịch vụ */}
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2.5">
                    <div className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-800/60">
                      <ShoppingBag className="w-3.5 h-3.5" /> 2. Sản Phẩm & Dịch Vụ
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block font-semibold text-slate-400 mb-1">
                          Tên / Mã Sản Phẩm <span className="text-cyan-400 font-normal">({productsCatalog.length} sp)</span>
                        </label>
                        <SearchableProductDropdown
                          products={productsCatalog}
                          selectedProductId={selectedProductId}
                          onSelectProduct={handleProductChange}
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-400 mb-1">
                          Nhà Cung Cấp / Nguồn Hàng
                        </label>
                        <SearchableSupplierDropdown
                          productSuppliers={productSuppliersCatalog}
                          allSuppliers={allSuppliersCatalog}
                          selectedSupplierName={formData.supply_id}
                          onSelectSupplier={handleSupplierChange}
                          loadingSuppliers={loadingSuppliers}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-400 mb-1">Thông Tin Dịch Vụ</label>
                      <textarea
                        rows={2}
                        value={formData.information_order}
                        onChange={(e) => setFormData({ ...formData, information_order: e.target.value })}
                        placeholder="Ví dụ: Adobe Creative Cloud All Apps 12 Tháng..."
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:border-cyan-500/50"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-400 mb-1">Slot Cấp Phát (Email/TK)</label>
                      <input
                        type="text"
                        value={formData.slot}
                        onChange={(e) => setFormData({ ...formData, slot: e.target.value })}
                        placeholder="shghcm03@gmail.com..."
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-cyan-300 focus:border-cyan-500/50 font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Cột Phải: Thời Hạn & Giá Bán */}
                <div className="space-y-3">
                  {/* 3. Thời hạn & Ghi chú */}
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2.5">
                    <div className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-800/60">
                      <Calendar className="w-3.5 h-3.5" /> 3. Thời Hạn & Ghi Chú
                    </div>
                    <DateRangePicker
                      startDate={formData.order_date}
                      endDate={formData.expired_at}
                      onChange={(start, end) =>
                        setFormData({ ...formData, order_date: start, expired_at: end })
                      }
                      label="Thời Hạn Đơn Hàng (Bắt đầu — Hết hạn)"
                    />

                    <div>
                      <label className="block font-semibold text-slate-400 mb-1">Ghi Chú Đơn Hàng</label>
                      <textarea
                        rows={2}
                        value={formData.note}
                        onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                        placeholder="Ghi chú nội bộ..."
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:border-cyan-500/50"
                      />
                    </div>
                  </div>

                  {/* 4. Giá bán & Thanh toán */}
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2.5">
                    <div className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider flex items-center justify-between pb-1 border-b border-slate-800/60">
                      <span className="flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5" /> 4. Giá Bán & Thanh Toán
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsCustomPriceMode((prev) => !prev)}
                        className={`text-[10.5px] px-2.5 py-0.5 rounded-lg border font-bold transition-all flex items-center gap-1 cursor-pointer ${
                          isCustomPriceMode
                            ? "bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-sm"
                            : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                        }`}
                        title={isCustomPriceMode ? "Đang bật chế độ chỉnh sửa giá thủ công" : "Bấm để mở khóa chỉnh sửa giá thủ công"}
                      >
                        {isCustomPriceMode ? "🔓 Đang mở tùy chỉnh giá" : "🔒 Tùy chỉnh giá"}
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block font-semibold text-slate-400 mb-1">
                          Giá Bán (VNĐ) <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="number"
                          required
                          readOnly={!isCustomPriceMode}
                          value={formData.price}
                          onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                          title={!isCustomPriceMode ? "Giá tự động tính từ Sản Phẩm & NCC. Bấm 'Tùy chỉnh giá' để tự nhập." : undefined}
                          className={`w-full px-3 py-1.5 border rounded-xl font-bold transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                            !isCustomPriceMode
                              ? "bg-slate-950/80 border-slate-800/90 text-slate-300/80 cursor-not-allowed select-none opacity-85"
                              : "bg-slate-900 border-slate-700 text-white focus:border-cyan-500/50"
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-400 mb-1">Giá Vốn Nhập Kho (VNĐ)</label>
                        <input
                          type="number"
                          readOnly={!isCustomPriceMode}
                          value={formData.cost}
                          onChange={(e) => setFormData({ ...formData, cost: Number(e.target.value) })}
                          title={!isCustomPriceMode ? "Giá vốn tự động tính từ NCC. Bấm 'Tùy chỉnh giá' để tự nhập." : undefined}
                          className={`w-full px-3 py-1.5 border rounded-xl font-bold transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                            !isCustomPriceMode
                              ? "bg-slate-950/80 border-slate-800/90 text-purple-300/70 cursor-not-allowed select-none opacity-85"
                              : "bg-slate-900 border-slate-700 text-purple-300 focus:border-cyan-500/50"
                          }`}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-400 mb-1">Thanh Toán</label>
                      <select
                        value={formData.payment_method}
                        onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:border-cyan-500/50"
                      >
                        <option value="bank">Chuyển Khoản Ngân Hàng</option>
                        <option value="usdt">Ví USDT (Crypto)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 font-medium rounded-xl hover:bg-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold rounded-xl"
                >
                  Tạo Đơn
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Sửa Đơn Hàng */}
      {isEditModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-[1350px] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 sm:p-6 relative space-y-4 animate-in fade-in zoom-in-95 duration-150 my-4 max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-cyan-400" /> Sửa Đơn Hàng #{selectedOrder.id_order || selectedOrder.id}
            </h2>
            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* Cột Trái: Khách Hàng & Dịch Vụ */}
                <div className="space-y-3">
                  {/* 1. Khách hàng & Liên hệ */}
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2.5">
                    <div className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-800/60">
                      <User className="w-3.5 h-3.5" /> 1. Thông Tin Khách Hàng
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block font-semibold text-slate-400 mb-1">
                          Tên Khách Hàng <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.customer}
                          onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
                          className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:border-cyan-500/50"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-400 mb-1">Liên Hệ (SĐT/Zalo/FB)</label>
                        <input
                          type="text"
                          value={formData.contact}
                          onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                          className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:border-cyan-500/50"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 2. Sản phẩm & Dịch vụ */}
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2.5">
                    <div className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-800/60">
                      <ShoppingBag className="w-3.5 h-3.5" /> 2. Sản Phẩm & Dịch Vụ
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block font-semibold text-slate-400 mb-1">
                          Tên / Mã Sản Phẩm <span className="text-cyan-400 font-normal">({productsCatalog.length} sp)</span>
                        </label>
                        <SearchableProductDropdown
                          products={productsCatalog}
                          selectedProductId={selectedProductId}
                          onSelectProduct={handleProductChange}
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-400 mb-1">
                          Nhà Cung Cấp / Nguồn Hàng
                        </label>
                        <SearchableSupplierDropdown
                          productSuppliers={productSuppliersCatalog}
                          allSuppliers={allSuppliersCatalog}
                          selectedSupplierName={formData.supply_id}
                          onSelectSupplier={handleSupplierChange}
                          loadingSuppliers={loadingSuppliers}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-400 mb-1">Thông Tin Dịch Vụ</label>
                      <textarea
                        rows={2}
                        value={formData.information_order}
                        onChange={(e) => setFormData({ ...formData, information_order: e.target.value })}
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:border-cyan-500/50"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-400 mb-1">Slot Cấp Phát (Email/TK)</label>
                      <input
                        type="text"
                        value={formData.slot}
                        onChange={(e) => setFormData({ ...formData, slot: e.target.value })}
                        placeholder="shghcm03@gmail.com..."
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-cyan-300 focus:border-cyan-500/50 font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Cột Phải: Thời Hạn & Giá Bán */}
                <div className="space-y-3">
                  {/* 3. Thời hạn & Ghi chú */}
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2.5">
                    <div className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-800/60">
                      <Calendar className="w-3.5 h-3.5" /> 3. Thời Hạn & Ghi Chú
                    </div>
                    <DateRangePicker
                      startDate={formData.order_date}
                      endDate={formData.expired_at}
                      onChange={(start, end) =>
                        setFormData({ ...formData, order_date: start, expired_at: end })
                      }
                      label="Thời Hạn Đơn Hàng (Bắt đầu — Hết hạn)"
                    />

                    <div>
                      <label className="block font-semibold text-slate-400 mb-1">Ghi Chú Đơn Hàng</label>
                      <textarea
                        rows={2}
                        value={formData.note}
                        onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                        placeholder="Ghi chú nội bộ..."
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:border-cyan-500/50"
                      />
                    </div>
                  </div>

                  {/* 4. Giá bán & Thanh toán */}
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2.5">
                    <div className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider flex items-center justify-between pb-1 border-b border-slate-800/60">
                      <span className="flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5" /> 4. Giá Bán & Thanh Toán
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsCustomPriceMode((prev) => !prev)}
                        className={`text-[10.5px] px-2.5 py-0.5 rounded-lg border font-bold transition-all flex items-center gap-1 cursor-pointer ${
                          isCustomPriceMode
                            ? "bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-sm"
                            : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                        }`}
                        title={isCustomPriceMode ? "Đang bật chế độ chỉnh sửa giá thủ công" : "Bấm để mở khóa chỉnh sửa giá thủ công"}
                      >
                        {isCustomPriceMode ? "🔓 Đang mở tùy chỉnh giá" : "🔒 Tùy chỉnh giá"}
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block font-semibold text-slate-400 mb-1">
                          Giá Bán (VNĐ) <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="number"
                          required
                          readOnly={!isCustomPriceMode}
                          value={formData.price}
                          onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                          title={!isCustomPriceMode ? "Giá tự động tính từ Sản Phẩm & NCC. Bấm 'Tùy chỉnh giá' để tự nhập." : undefined}
                          className={`w-full px-3 py-1.5 border rounded-xl font-bold transition-colors ${
                            !isCustomPriceMode
                              ? "bg-slate-950/80 border-slate-800/90 text-slate-300/80 cursor-not-allowed select-none opacity-85"
                              : "bg-slate-900 border-slate-700 text-white focus:border-cyan-500/50"
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-400 mb-1">Giá Vốn Nhập Kho (VNĐ)</label>
                        <input
                          type="number"
                          readOnly={!isCustomPriceMode}
                          value={formData.cost}
                          onChange={(e) => setFormData({ ...formData, cost: Number(e.target.value) })}
                          title={!isCustomPriceMode ? "Giá vốn tự động tính từ NCC. Bấm 'Tùy chỉnh giá' để tự nhập." : undefined}
                          className={`w-full px-3 py-1.5 border rounded-xl font-bold transition-colors ${
                            !isCustomPriceMode
                              ? "bg-slate-950/80 border-slate-800/90 text-purple-300/70 cursor-not-allowed select-none opacity-85"
                              : "bg-slate-900 border-slate-700 text-purple-300 focus:border-cyan-500/50"
                          }`}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block font-semibold text-slate-400 mb-1">Trạng Thái Đơn</label>
                        <select
                          value={formData.status}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                          className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:border-cyan-500/50"
                        >
                          <option value="Đã Thanh Toán">Đã Thanh Toán</option>
                          <option value="Cần gia hạn">Cần gia hạn</option>
                          <option value="Chưa Thanh Toán">Chưa Thanh Toán</option>
                          <option value="Đã Hoàn">Đã Hoàn Tiền</option>
                          <option value="Chưa Hoàn">Chưa Hoàn Tiền</option>
                          <option value="Đã Hủy">Đã Hủy</option>
                        </select>
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-400 mb-1">Thanh Toán</label>
                        <select
                          value={formData.payment_method}
                          onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                          className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:border-cyan-500/50"
                        >
                          <option value="bank">Chuyển Khoản Ngân Hàng</option>
                          <option value="usdt">Ví USDT (Crypto)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 font-medium rounded-xl hover:bg-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold rounded-xl"
                >
                  Cập Nhật
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Xóa Đơn Hàng */}
      {isDeleteModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 sm:p-6 relative space-y-4">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-rose-400" /> Xác Nhận Xóa Đơn Hàng
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Bạn có chắc chắn muốn xóa đơn hàng{" "}
              <strong className="text-cyan-400 font-mono">#{selectedOrder.id_order || selectedOrder.id}</strong> của{" "}
              <strong className="text-white">{selectedOrder.customer}</strong>?
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 font-medium rounded-xl hover:bg-slate-700"
              >
                Hủy
              </button>
              <button
                onClick={handleDeleteSubmit}
                className="px-5 py-2 bg-rose-500 hover:bg-rose-400 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-lg shadow-rose-500/20"
              >
                Xóa Ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
