// CreateOrderModal.tsx - Mã đã được làm sạch và đồng bộ với DB DATE/YMD

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { ORDER_FIELDS, API_ENDPOINTS } from "../constants";
import * as Helpers from "../lib/helpers";

const API_BASE =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_BASE_URL) ||
  (process.env.VITE_API_BASE_URL as string) ||
  "http://localhost:3001";

// =======================================================
// 1. INTERFACES (Cấu trúc dữ liệu)
// =======================================================
interface Order {
  id: number;
  id_don_hang: string;
  san_pham: string;
  thong_tin_san_pham: string;
  khach_hang: string;
  link_lien_he: string;
  slot: string;
  ngay_dang_ki: string;
  so_ngay_da_dang_ki: string;
  het_han: string;
  nguon: string;
  gia_nhap: number;
  gia_ban: number;
  note: string;
  tinh_trang: string;
  check_flag: boolean | null;
}
interface Supply {
  id: number;
  source_name: string;
}
interface Product {
  id: number;
  san_pham: string;
}
interface SupplyPrice {
  source_id: number;
  price: number;
}
interface CalculatedPriceResult {
  gia_nhap: number;
  gia_ban: number;
  so_ngay_da_dang_ki: number;
  het_han: string;
}
interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newOrderData: Partial<Order> | Order) => void;
}

// =======================================================
// 2. HELPER FUNCTIONS & CONSTANTS
// =======================================================

/**
 * FIX: Chuyển đổi định dạng DD/MM/YYYY sang YYYY-MM-DD cho Backend.
 * @param {string} dmyString - Ngày ở định dạng DD/MM/YYYY
 * @returns {string} Ngày ở định dạng YYYY-MM-DD
 */
const convertDMYToYMD = (dmyString: string): string => {
  if (!dmyString || dmyString.indexOf("/") === -1) return dmyString;
  const parts = dmyString.split("/");
  if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
  return dmyString;
};

// Hàm Helper để tính Ngày Hết Hạn (Tạm thời dùng trên Frontend cho chế độ Custom)
const calculateExpirationDate = (
  registerDateStr: string,
  days: number
): string => {
  if (!registerDateStr || days <= 0) return "N/A";

  const parts = registerDateStr.split("/");
  if (parts.length !== 3) return "N/A";

  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);

  const date = new Date(year, month - 1, day);
  // -1 vì ngày đăng ký là ngày đầu tiên
  date.setDate(date.getDate() + days - 1);

  const newDay = String(date.getDate()).padStart(2, "0");
  const newMonth = String(date.getMonth() + 1).padStart(2, "0");
  const newYear = date.getFullYear();

  return `${newDay}/${newMonth}/${newYear}`;
};

const formatCurrency = (value: number) => {
  return (Number(value) || 0).toLocaleString("vi-VN") + " đ";
};

const generateRandomId = (length: number) => {
  return Math.random()
    .toString(36)
    .substring(2, 2 + length)
    .toUpperCase();
};

const formatCurrencyPlain = (value: number) => {
  const n = Number(value) || 0;
  return n > 0 ? n.toLocaleString("vi-VN") : "";
};

const getTodayDMY = () => {
  const date = new Date();
  return `${String(date.getDate()).padStart(2, "0")}/${String(
    date.getMonth() + 1
  ).padStart(2, "0")}/${date.getFullYear()}`;
};

// ... (Các hàm parseMonthsFromInfo, daysFromMonths, addMonthsMinusOneDay, inclusiveDaysBetween giữ nguyên)
const parseMonthsFromInfo = (info?: string): number => {
  if (!info) return 0;
  const m = info.match(/--(\d+)m/i);
  if (!m) return 0;
  const months = Number(m[1] || 0);
  return Number.isFinite(months) && months > 0 ? months : 0;
};
const daysFromMonths = (months: number): number => {
  if (!Number.isFinite(months) || months <= 0) return 0;
  return months === 12 ? 365 : months * 30;
};
const addMonthsMinusOneDay = (startDMY: string, months: number): string => {
  if (!startDMY || !Number.isFinite(months) || months <= 0) return startDMY;
  const [d, m, y] = startDMY.split("/").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setMonth(dt.getMonth() + months);
  dt.setDate(dt.getDate() - 1);
  return `${String(dt.getDate()).padStart(2, "0")}/${String(
    dt.getMonth() + 1
  ).padStart(2, "0")}/${dt.getFullYear()}`;
};
const inclusiveDaysBetween = (startDMY: string, endDMY: string): number => {
  const [sd, sm, sy] = startDMY.split("/").map(Number);
  const [ed, em, ey] = endDMY.split("/").map(Number);
  const s = new Date(sy, sm - 1, sd);
  const e = new Date(ey, em - 1, ed);
  const msPerDay = 24 * 60 * 60 * 1000;
  const diff = Math.floor((e.getTime() - s.getTime()) / msPerDay);
  return diff + 1;
};
// ...

const INITIAL_FORM_DATA: Partial<Order> = {
  [ORDER_FIELDS.ID_DON_HANG]: "",
  [ORDER_FIELDS.SAN_PHAM]: "",
  [ORDER_FIELDS.THONG_TIN_SAN_PHAM]: "",
  [ORDER_FIELDS.KHACH_HANG]: "",
  [ORDER_FIELDS.LINK_LIEN_HE]: "",
  [ORDER_FIELDS.SLOT]: "",
  [ORDER_FIELDS.NGAY_DANG_KI]: "",
  [ORDER_FIELDS.SO_NGAY_DA_DANG_KI]: "0",
  [ORDER_FIELDS.HET_HAN]: "",
  [ORDER_FIELDS.NGUON]: "",
  [ORDER_FIELDS.GIA_NHAP]: 0,
  [ORDER_FIELDS.GIA_BAN]: 0,
  [ORDER_FIELDS.NOTE]: "",
  [ORDER_FIELDS.TINH_TRANG]: "Chưa Thanh Toán",
  [ORDER_FIELDS.CHECK_FLAG]: null,
};

const inputClass =
  "w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-all";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";
const readOnlyClass = "bg-gray-100 cursor-not-allowed";

interface UseCreateOrderLogicResult {
  // ... (Giao diện giữ nguyên)
  formData: Partial<Order>;
  supplies: Supply[];
  products: Product[];
  isLoading: boolean;
  isDataLoaded: boolean;
  selectedSupplyId: number | null;
  customerType: "MAVC" | "MAVL";
  updateForm: (patch: Partial<Order>) => void;
  setIsDataLoaded: (v: boolean) => void;
  handleChange: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => void;
  handleProductSelect: (productName: string) => void;
  handleSourceSelect: (sourceId: number) => void;
  handleSourceChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  handleProductChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  handleCustomerTypeChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  handleSubmit: (e: React.FormEvent) => boolean;
}

const useCreateOrderLogic = (
  isOpen: boolean,
  onSave: (newOrderData: Partial<Order> | Order) => void
): UseCreateOrderLogicResult => {
  const [formData, setFormData] = useState<Partial<Order>>(INITIAL_FORM_DATA);
  const [customerType, setCustomerType] = useState<"MAVC" | "MAVL">("MAVC");

  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [supplyPrices, setSupplyPrices] = useState<SupplyPrice[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(
    null
  );
  const [selectedSupplyId, setSelectedSupplyId] = useState<number | null>(null);

  const currentOrderId = useMemo(
    () => customerType + Helpers.generateRandomId(5),
    [customerType]
  );
  const todayDate = useMemo(() => Helpers.getTodayDMY(), []);

  const updateForm = (patch: Partial<Order>) => {
    setFormData((prev) => ({ ...prev, ...patch }));
  };

  const fetchProducts = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}${API_ENDPOINTS.PRODUCTS_ALL}`);
      if (!response.ok) throw new Error("Lỗi tải danh sách sản phẩm.");
      const data: Product[] = await response.json();
      setProducts(data);
    } catch (error) {
      console.error("Lỗi khi fetch products:", error);
    }
  }, []);

  const fetchSuppliesByProduct = useCallback(async (productName: string) => {
    try {
      const response = await fetch(
        `${API_BASE}${API_ENDPOINTS.SUPPLIES_BY_PRODUCT(productName)}`
      );
      if (!response.ok) throw new Error("Lỗi tải danh sách nguồn.");
      const data: Supply[] = await response.json();
      setSupplies(data);
    } catch (error) {
      console.error("Lỗi khi fetch supplies:", error);
      setSupplies([]);
    }
  }, []);

  const fetchAllSupplyPrices = useCallback(async (productName: string) => {
    try {
      const response = await fetch(
        `${API_BASE}/api/products/all-prices-by-name/${encodeURIComponent(
          productName
        )}`
      );
      if (!response.ok) throw new Error("Lỗi tính giá nhập của nguồn.");
      const data: SupplyPrice[] = await response.json();
      setSupplyPrices(data);
    } catch (error) {
      console.error("Lỗi khi fetch all supply prices:", error);
      setSupplyPrices([]);
    }
  }, []);

  const calculatePrice = useCallback(
    async (
      supplyId: number,
      productName: string,
      orderId: string,
      registerDateStr: string
    ): Promise<CalculatedPriceResult | undefined> => {
      setIsLoading(true);
      setIsDataLoaded(false);
      try {
        const response = await fetch(
          `${API_BASE}${API_ENDPOINTS.CALCULATE_PRICE}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              // Backend chỉ cần các thông số này để tính giá bán và ngày hết hạn
              supply_id: supplyId,
              san_pham_name: productName,
              id_don_hang: orderId,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Lỗi tính giá tại Server.");
        }

        const result: CalculatedPriceResult = await response.json();

        // FIX: Xóa logic tính ngày hết hạn ở Frontend
        // Ngày hết hạn đã được tính và trả về từ Backend (dạng YYYY-MM-DD hoặc tương tự)

        return {
          gia_nhap: result.gia_nhap,
          gia_ban: result.gia_ban,
          so_ngay_da_dang_ki: result.so_ngay_da_dang_ki,
          het_han: result.het_han, // Lấy trực tiếp từ Backend
        } as CalculatedPriceResult;
      } catch (error) {
        console.error("Lỗi khi tính giá:", error);
        setIsDataLoaded(false);
        alert(
          `Tính giá thất bại: ${
            error instanceof Error ? error.message : "Lỗi không xác nhận"
          }`
        );
        return undefined;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (isOpen) {
      const initialType = "MAVC";
      const initialID = initialType + Helpers.generateRandomId(5);
      const initialDate = Helpers.getTodayDMY();

      setCustomerType(initialType);
      setFormData({
        ...INITIAL_FORM_DATA,
        [ORDER_FIELDS.ID_DON_HANG]: initialID,
        [ORDER_FIELDS.NGAY_DANG_KI]: initialDate,
        [ORDER_FIELDS.HET_HAN]: initialDate,
      });
      setIsDataLoaded(false);
      setSelectedProductId(null);
      setSelectedSupplyId(null);
      setSupplies([]);
      setSupplyPrices([]);
      fetchProducts();
    }
  }, [isOpen, fetchProducts]);

  useEffect(() => {
    if (isOpen) {
      setFormData((prev) => ({
        ...prev,
        [ORDER_FIELDS.ID_DON_HANG]: currentOrderId,
      }));
    }
  }, [currentOrderId, isOpen]);

  useEffect(() => {
    const productName = formData[ORDER_FIELDS.SAN_PHAM];
    const orderId = formData[ORDER_FIELDS.ID_DON_HANG];
    const registerDate = formData[ORDER_FIELDS.NGAY_DANG_KI];

    if (!productName || !orderId || !registerDate) {
      setIsDataLoaded(false);
    }
  }, [
    formData[ORDER_FIELDS.SAN_PHAM],
    formData[ORDER_FIELDS.ID_DON_HANG],
    formData[ORDER_FIELDS.NGAY_DANG_KI],
  ]);

  useEffect(() => {
    const productName = formData[ORDER_FIELDS.SAN_PHAM] as string;
    const orderId = formData[ORDER_FIELDS.ID_DON_HANG] as string;
    const registerDate = formData[ORDER_FIELDS.NGAY_DANG_KI] as string;
    if (!productName || !orderId || !registerDate) return;

    // Trigger tính giá lại khi loại khách hàng thay đổi
    calculatePrice(0, productName, orderId, registerDate).then((result) => {
      if (result) {
        setFormData((prev) => ({
          ...prev,
          [ORDER_FIELDS.GIA_BAN]: result.gia_ban,
        }));
      }
    });
  }, [customerType, calculatePrice]);

  const handleProductSelect = (productName: string) => {
    // ... (logic giữ nguyên)
    const selectedProduct = products.find((p) => p.san_pham === productName);

    setSelectedProductId(selectedProduct?.id || null);
    setSelectedSupplyId(null);

    setFormData((prev) => ({
      ...prev,
      [ORDER_FIELDS.SAN_PHAM]: productName,
      [ORDER_FIELDS.NGUON]: "",
      [ORDER_FIELDS.GIA_NHAP]: 0,
      [ORDER_FIELDS.GIA_BAN]: 0,
      [ORDER_FIELDS.SO_NGAY_DA_DANG_KI]: "0",
      [ORDER_FIELDS.HET_HAN]: prev[ORDER_FIELDS.NGAY_DANG_KI] || todayDate,
    }));
    setSupplies([]);
    setSupplyPrices([]);

    if (productName) {
      fetchSuppliesByProduct(productName);
      fetchAllSupplyPrices(productName);

      const orderId = formData[ORDER_FIELDS.ID_DON_HANG] as string;
      const registerDate = formData[ORDER_FIELDS.NGAY_DANG_KI] as string;

      if (orderId && registerDate) {
        calculatePrice(0, productName, orderId, registerDate).then((result) => {
          if (result) {
            setFormData((prev) => ({
              ...prev,
              [ORDER_FIELDS.GIA_BAN]: result.gia_ban,
              [ORDER_FIELDS.SO_NGAY_DA_DANG_KI]: String(
                result.so_ngay_da_dang_ki
              ),
              [ORDER_FIELDS.HET_HAN]: result.het_han, // Lấy Hết Hạn từ Backend
            }));
            // readiness now derived from required fields only
          }
        });
      }
    } else {
      setIsDataLoaded(false);
    }
  };

  const handleSourceSelect = (sourceId: number) => {
    const selectedSupply = supplies.find((s) => s.id === sourceId);
    let newBasePrice = 0;
    if (sourceId !== 0 && selectedSupply) {
      newBasePrice =
        supplyPrices.find((p) => p.source_id === sourceId)?.price || 0;
    }
    setSelectedSupplyId(sourceId === 0 ? null : sourceId);
    setFormData((prev) => ({
      ...prev,
      [ORDER_FIELDS.NGUON]: selectedSupply ? selectedSupply.source_name : "",
      [ORDER_FIELDS.GIA_NHAP]: newBasePrice,
    }));
    if (!selectedSupply || sourceId === 0) {
      setIsDataLoaded(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const productName = e.target.value;
    const selectedProduct = products.find((p) => p.san_pham === productName);

    setSelectedProductId(selectedProduct?.id || null);
    setSelectedSupplyId(null);

    setFormData((prev) => ({
      ...prev,
      [ORDER_FIELDS.SAN_PHAM]: productName,
      [ORDER_FIELDS.NGUON]: "",
      [ORDER_FIELDS.GIA_NHAP]: 0,
      [ORDER_FIELDS.GIA_BAN]: 0,
      [ORDER_FIELDS.SO_NGAY_DA_DANG_KI]: "0",
      [ORDER_FIELDS.HET_HAN]: prev[ORDER_FIELDS.NGAY_DANG_KI] || todayDate,
    }));
    setSupplies([]);
    setSupplyPrices([]);

    if (productName) {
      fetchSuppliesByProduct(productName);
      fetchAllSupplyPrices(productName);

      const orderId = formData[ORDER_FIELDS.ID_DON_HANG];
      const registerDate = formData[ORDER_FIELDS.NGAY_DANG_KI];

      if (orderId && registerDate) {
        calculatePrice(0, productName, orderId, registerDate).then((result) => {
          if (result) {
            setFormData((prev) => ({
              ...prev,
              [ORDER_FIELDS.GIA_BAN]: result.gia_ban,
              [ORDER_FIELDS.SO_NGAY_DA_DANG_KI]: String(
                result.so_ngay_da_dang_ki
              ),
              [ORDER_FIELDS.HET_HAN]: result.het_han, // Lấy Hết Hạn từ Backend
            }));
            // readiness now derived from required fields only
          }
        });
      }
    } else {
      setIsDataLoaded(false);
    }
  };

  const handleSourceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sourceId = Number(e.target.value);
    const selectedSupply = supplies.find((s) => s.id === sourceId);

    let newBasePrice = 0;
    if (sourceId !== 0 && selectedSupply) {
      newBasePrice =
        supplyPrices.find((p) => p.source_id === sourceId)?.price || 0;
    }

    setSelectedSupplyId(sourceId);

    setFormData((prev) => ({
      ...prev,
      [ORDER_FIELDS.NGUON]: selectedSupply ? selectedSupply.source_name : "",
      [ORDER_FIELDS.GIA_NHAP]: newBasePrice,
    }));
  };

  const handleCustomerTypeChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const newType = e.target.value as "MAVC" | "MAVL";
    setCustomerType(newType);
    setSelectedProductId(null);
    setSelectedSupplyId(null);
    setSupplies([]);
    setSupplyPrices([]);
    setIsDataLoaded(false);
    setFormData((prev) => ({
      ...prev,
      [ORDER_FIELDS.SAN_PHAM]: "",
      [ORDER_FIELDS.NGUON]: "",
      [ORDER_FIELDS.GIA_NHAP]: 0,
      [ORDER_FIELDS.GIA_BAN]: 0,
      [ORDER_FIELDS.SO_NGAY_DA_DANG_KI]: "0",
      [ORDER_FIELDS.HET_HAN]: prev[ORDER_FIELDS.NGAY_DANG_KI] || Helpers.getTodayDMY(),
    }));
  };

  const handleSubmit = (e: React.FormEvent): boolean => {
    e.preventDefault();

    const requiredFieldsFilled =
      formData &&
      formData[ORDER_FIELDS.SAN_PHAM] &&
      formData[ORDER_FIELDS.NGUON] &&
      formData[ORDER_FIELDS.KHACH_HANG] &&
      formData[ORDER_FIELDS.THONG_TIN_SAN_PHAM];

    if (requiredFieldsFilled && !isLoading) {
      const registerDMY =
        Helpers.formatDateToDMY(
          formData[ORDER_FIELDS.NGAY_DANG_KI] as string
        ) ||
        (formData[ORDER_FIELDS.NGAY_DANG_KI] as string) ||
        Helpers.getTodayDMY();

      const currentExpiryDMY =
        Helpers.formatDateToDMY(formData[ORDER_FIELDS.HET_HAN] as string) ||
        (formData[ORDER_FIELDS.HET_HAN] as string) ||
        "";

      const totalDays =
        Number(formData[ORDER_FIELDS.SO_NGAY_DA_DANG_KI] || 0) || 0;

      let expiryDMY = currentExpiryDMY;
      if (!expiryDMY && registerDMY && totalDays > 0) {
        const computed = calculateExpirationDate(registerDMY, totalDays);
        if (computed && computed !== "N/A") {
          expiryDMY = computed;
          updateForm({ [ORDER_FIELDS.HET_HAN]: expiryDMY } as any);
        }
      }

      const normalizedRegister = Helpers.convertDMYToYMD(registerDMY);
      const normalizedExpiry = expiryDMY
        ? Helpers.convertDMYToYMD(expiryDMY)
        : normalizedRegister;

      const dataToSave = {
        ...formData,
        [ORDER_FIELDS.GIA_NHAP]: Number(formData[ORDER_FIELDS.GIA_NHAP]),
        [ORDER_FIELDS.GIA_BAN]: Number(formData[ORDER_FIELDS.GIA_BAN]),
        [ORDER_FIELDS.NGAY_DANG_KI]: normalizedRegister,
        [ORDER_FIELDS.HET_HAN]: normalizedExpiry,
        [ORDER_FIELDS.LINK_LIEN_HE]:
          formData[ORDER_FIELDS.LINK_LIEN_HE] || null,
        [ORDER_FIELDS.SLOT]: formData[ORDER_FIELDS.SLOT] || null,
        [ORDER_FIELDS.NOTE]: formData[ORDER_FIELDS.NOTE] || null,
      };

      onSave(dataToSave as Order);
      return true;
    } else {
      alert("Vui lòng điền đầy đủ các thông tin");
      return false;
    }
  };

  return {
    formData,
    supplies,
    products,
    isLoading,
    isDataLoaded,
    selectedSupplyId,
    customerType,
    updateForm,
    setIsDataLoaded,
    handleChange,
    handleProductSelect,
    handleSourceSelect,
    handleSourceChange,
    handleProductChange,
    handleCustomerTypeChange,
    handleSubmit,
  };
};

type SSOption = { value: string | number; label: string };

interface SearchableSelectProps {
  // ... (Giao diện giữ nguyên)
  name?: string;
  value: string | number | null | undefined;
  options: SSOption[];
  placeholder?: string;
  disabled?: boolean;
  onChange: (value: SSOption["value"], option: SSOption) => void;
  onClear?: () => void;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  // ... (Component giữ nguyên)
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
      {/* Clear button */}
      {Boolean(query) && onClear && !disabled && (
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            setQuery("");
            onClear();
            setOpen(false);
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          aria-label="Clear"
        >
          ×
        </button>
      )}

      {/* Dropdown */}
      {open && !disabled && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">Không có kết quả</div>
          ) : (
            filtered.map((opt) => (
              <div
                key={`${String(opt.value)}-${opt.label}`}
                className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 ${
                  opt.value === value ? "bg-gray-50" : ""
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

const CreateOrderModal: React.FC<CreateOrderModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const {
    formData,
    updateForm,
    supplies,
    products,
    isLoading,
    isDataLoaded,
    selectedSupplyId,
    customerType,
    setIsDataLoaded,
    handleChange,
    handleProductSelect,
    handleSourceSelect,
    handleSourceChange,
    handleProductChange,
    handleCustomerTypeChange,
    handleSubmit,
  } = useCreateOrderLogic(isOpen, onSave);
  // Toggle nhập mới: phải khai báo trước early-return
  const [customMode, setCustomMode] = useState(false);

  const handlePriceInput = useCallback(
    (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value || "";
      const digits = raw.replace(/\D/g, "");
      const num = digits ? parseInt(digits, 10) : 0;
      updateForm({ [field]: num } as any);
    },
    [updateForm]
  );

  // When custom mode is on, compute expiry using --xm by adding months then -1 day.
  // Also compute exact day count inclusively between start and end.
  useEffect(() => {
    if (!customMode) return;
    const infoA = (formData[ORDER_FIELDS.THONG_TIN_SAN_PHAM] as string) || "";
    const infoB = (formData[ORDER_FIELDS.SAN_PHAM] as string) || "";
    const months = Helpers.parseMonthsFromInfo(infoA) || Helpers.parseMonthsFromInfo(infoB);
    const registerDate =
      (formData[ORDER_FIELDS.NGAY_DANG_KI] as string) || Helpers.getTodayDMY();

    if (months > 0) {
      const end = Helpers.addMonthsMinusOneDay(registerDate, months, 3);
      const days = Helpers.inclusiveDaysBetween(registerDate, end);
      updateForm({
        [ORDER_FIELDS.SO_NGAY_DA_DANG_KI]: String(days),
        [ORDER_FIELDS.HET_HAN]: end,
      } as any);
    }
  }, [
    customMode,
    formData[ORDER_FIELDS.THONG_TIN_SAN_PHAM],
    formData[ORDER_FIELDS.SAN_PHAM],
    formData[ORDER_FIELDS.NGAY_DANG_KI],
  ]);

  // Ensure expiry date is populated and formatted.
  // If backend doesn't return it, compute from register date + days.
  useEffect(() => {
    const rawExpiry = (formData[ORDER_FIELDS.HET_HAN] as string) || "";
    const registerDMY =
      (formData[ORDER_FIELDS.NGAY_DANG_KI] as string) || Helpers.getTodayDMY();
    const days = Number(formData[ORDER_FIELDS.SO_NGAY_DA_DANG_KI] || 0) || 0;

    const normalized = Helpers.formatDateToDMY(rawExpiry);

    if (!normalized && registerDMY && days > 0) {
      const computed = calculateExpirationDate(registerDMY, days, 3);
      if (computed && computed !== "N/A") {
        updateForm({ [ORDER_FIELDS.HET_HAN]: computed } as any);
      }
    } else if (normalized && normalized !== rawExpiry) {
      updateForm({ [ORDER_FIELDS.HET_HAN]: normalized } as any);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    formData[ORDER_FIELDS.HET_HAN],
    formData[ORDER_FIELDS.NGAY_DANG_KI],
    formData[ORDER_FIELDS.SO_NGAY_DA_DANG_KI],
  ]);

  // Mark data as ready when 4 required fields are filled
  useEffect(() => {
    const prod = (formData[ORDER_FIELDS.SAN_PHAM] as string) || "";
    const src = (formData[ORDER_FIELDS.NGUON] as string) || "";
    const info = (formData[ORDER_FIELDS.THONG_TIN_SAN_PHAM] as string) || "";
    const customer = (formData[ORDER_FIELDS.KHACH_HANG] as string) || "";
    const ready = !!prod && !!src && !!info && !!customer;
    setIsDataLoaded(ready);
  }, [
    formData[ORDER_FIELDS.SAN_PHAM],
    formData[ORDER_FIELDS.NGUON],
    formData[ORDER_FIELDS.THONG_TIN_SAN_PHAM],
    formData[ORDER_FIELDS.KHACH_HANG],
  ]);

  if (!isOpen) return null;

  const isFormComplete = Boolean(
    formData[ORDER_FIELDS.KHACH_HANG] &&
    formData[ORDER_FIELDS.SAN_PHAM] &&
    formData[ORDER_FIELDS.NGUON] &&
    formData[ORDER_FIELDS.THONG_TIN_SAN_PHAM]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 transition-opacity duration-300">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header Modal */}
        <div className="p-5 border-b border-gray-200 sticky top-0 bg-white z-10 flex justify-between items-center">
          <h3 className="text-xl font-semibold text-gray-900">
            Tạo Đơn Hàng Mới
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* Phần 1: Mã đơn & Khách Hàng */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border p-4 rounded-lg bg-gray-50">
                {/* Loại Khách Hàng */}
                <div>
                  <label className={labelClass}>Loại Khách Hàng</label>
                  <select
                    name="customer_type"
                    value={customerType}
                    onChange={handleCustomerTypeChange}
                    className={inputClass}
                  >
                    <option value="MAVC">Cộng Tác Viên</option>
                    <option value="MAVL">Khách Lẻ</option>
                  </select>
                </div>
                {/* Mã Đơn Hàng */}
                <div>
                  <label className={labelClass}>Mã Đơn Hàng</label>
                  <input
                    type="text"
                    name={ORDER_FIELDS.ID_DON_HANG}
                    value={formData[ORDER_FIELDS.ID_DON_HANG]}
                    readOnly
                    className={`${inputClass} font-semibold ${readOnlyClass}`}
                  />
                </div>

                {/* Tên Khách Hàng */}
                <div>
                  <label className={labelClass}>
                    Tên Khách Hàng <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name={ORDER_FIELDS.KHACH_HANG}
                    value={formData[ORDER_FIELDS.KHACH_HANG]}
                    onChange={handleChange}
                    className={inputClass}
                    required
                  />
                </div>
                {/* Link Liên Hệ */}
                <div>
                  <label className={labelClass}>Link Liên Hệ</label>
                  <input
                    type="url"
                    name={ORDER_FIELDS.LINK_LIEN_HE}
                    value={formData[ORDER_FIELDS.LINK_LIEN_HE]}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Phần 2: Sản Phẩm & Nguồn */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 border p-4 rounded-lg items-end">
                {/* 1. SẢN PHẨM */}
                <div className="md:col-span-5">
                  <label className={labelClass}>
                    Sản Phẩm <span className="text-red-500">*</span>
                  </label>
                  <SearchableSelect
                    name={ORDER_FIELDS.SAN_PHAM}
                    value={formData[ORDER_FIELDS.SAN_PHAM] as string}
                    options={products.map((p) => ({
                      value: p.san_pham,
                      label: p.san_pham,
                    }))}
                    placeholder="-- Chọn --"
                    onChange={(val) => handleProductSelect(String(val))}
                    onClear={() => handleProductSelect("")}
                    disabled={customMode}
                  />
                </div>

                {/* 2. NGUỒN */}
                <div className="md:col-span-5">
                  <label className={labelClass}>
                    Nguồn <span className="text-red-500">*</span>
                  </label>
                  <SearchableSelect
                    name={ORDER_FIELDS.NGUON}
                    value={selectedSupplyId ?? ""}
                    options={supplies.map((s) => ({
                      value: s.id,
                      label: s.source_name,
                    }))}
                    placeholder="-- Chọn --"
                    disabled={customMode || !formData[ORDER_FIELDS.SAN_PHAM]}
                    onChange={(val) => handleSourceSelect(Number(val))}
                    onClear={() => handleSourceSelect(0)}
                  />
                </div>

                {/* 3. Nút Thêm (+) ở cuối hàng */}
                <div className="md:col-span-2 flex md:justify-end">
                  <button
                    type="button"
                    aria-label="Toggle"
                    onClick={() => setCustomMode((v) => !v)}
                    className={`mt-6 md:mt-0 inline-flex items-center justify-center w-10 h-10 rounded-md text-white text-2xl leading-none ${
                      customMode
                        ? "bg-red-500 hover:bg-red-600"
                        : "bg-green-500 hover:bg-green-600"
                    }`}
                  >
                    {customMode ? "-" : "+"}
                  </button>
                </div>

                {/* 4a. Inputs for custom new entries */}
                {customMode && (
                  <div className="md:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className={labelClass}>Sản Phẩm Mới</label>
                      <input
                        type="text"
                        name={ORDER_FIELDS.SAN_PHAM}
                        value={
                          (formData[ORDER_FIELDS.SAN_PHAM] as string) || ""
                        }
                        onChange={handleChange}
                        className={inputClass}
                        placeholder="Nhập Tên Sản Phẩm Mới"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Nguồn Mới</label>
                      <input
                        type="text"
                        name={ORDER_FIELDS.NGUON}
                        value={(formData[ORDER_FIELDS.NGUON] as string) || ""}
                        onChange={handleChange}
                        className={inputClass}
                        placeholder="Nhập Tên Nguồn Mới"
                      />
                    </div>
                  </div>
                )}

                {/* 4b. Thông Tin Sản Phẩm: next row but same block */}
                <div className="md:col-span-12">
                  <label className={labelClass}>
                    Thông Tin Sản Phẩm <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name={ORDER_FIELDS.THONG_TIN_SAN_PHAM}
                    value={formData[ORDER_FIELDS.THONG_TIN_SAN_PHAM]}
                    onChange={handleChange}
                    className={inputClass}
                    required
                  />
                </div>
              </div>
              {/* Phần 3: Thời Gian & Giá Tiền */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-6">
                  {/* Ngày Đăng Ký */}
                  <div>
                    <label className={labelClass}>Ngày Đăng Ký</label>
                    <input
                      type="text"
                      name={ORDER_FIELDS.NGAY_DANG_KI}
                      value={formData[ORDER_FIELDS.NGAY_DANG_KI]}
                      readOnly
                      className={`${inputClass} ${readOnlyClass}`}
                    />
                  </div>
                  {/* Số Ngày Đăng Ký */}
                  <div>
                    <label className={labelClass}>Số Ngày Đăng Ký</label>
                    <input
                      type="text"
                      name={ORDER_FIELDS.SO_NGAY_DA_DANG_KI}
                      value={formData[ORDER_FIELDS.SO_NGAY_DA_DANG_KI]}
                      readOnly
                      className={`${inputClass} ${readOnlyClass}`}
                    />
                  </div>
                  {/* Ngày Hết Hạn */}
                  <div>
                    <label className={labelClass}>Ngày Hết Hạn</label>
                    <input
                      type="text"
                      name={ORDER_FIELDS.HET_HAN}
                      value={formData[ORDER_FIELDS.HET_HAN]}
                      readOnly
                      className={`${inputClass} font-medium text-red-600 ${readOnlyClass}`}
                    />
                  </div>
                  {/* Slot */}
                  <div>
                    <label className={labelClass}>Slot</label>
                    <input
                      type="text"
                      name={ORDER_FIELDS.SLOT}
                      value={formData[ORDER_FIELDS.SLOT]}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Giá Nhập (Sẽ hiển thị giá của Nguồn được chọn) */}
                  <div>
                    <label className={labelClass}>Giá Nhập</label>
                    {customMode ? (
                      <input
                        type="text"
                        inputMode="numeric"
                        name={ORDER_FIELDS.GIA_NHAP}
                        value={Helpers.formatCurrencyPlain(
                          Number(formData[ORDER_FIELDS.GIA_NHAP] || 0)
                        )}
                        onChange={handlePriceInput(ORDER_FIELDS.GIA_NHAP)}
                        className={`${inputClass} font-semibold`}
                      />
                    ) : (
                      <input
                        type="text"
                        name={ORDER_FIELDS.GIA_NHAP}
                        value={Helpers.formatCurrency(
                          formData[ORDER_FIELDS.GIA_NHAP] || 0
                        )}
                        readOnly
                        className={`${inputClass} font-semibold ${readOnlyClass}`}
                      />
                    )}
                  </div>
                  {/* Giá Bán (Sẽ hiển thị giá tính toán từ giá nhập cao nhất) */}
                  <div>
                    <label className={labelClass}>Giá Bán</label>
                    {customMode ? (
                      <input
                        type="text"
                        inputMode="numeric"
                        name={ORDER_FIELDS.GIA_BAN}
                        value={Helpers.formatCurrencyPlain(
                          Number(formData[ORDER_FIELDS.GIA_BAN] || 0)
                        )}
                        onChange={handlePriceInput(ORDER_FIELDS.GIA_BAN)}
                        className={`${inputClass} font-semibold text-green-700`}
                      />
                    ) : (
                      <input
                        type="text"
                        name={ORDER_FIELDS.GIA_BAN}
                        value={Helpers.formatCurrency(
                          formData[ORDER_FIELDS.GIA_BAN] || 0
                        )}
                        readOnly
                        className={`${inputClass} font-semibold text-green-700 ${readOnlyClass}`}
                      />
                    )}
                  </div>

                  {/* Ghi Chú */}
                  <div>
                    <label className={labelClass}>Ghi Chú</label>
                    <textarea
                      name={ORDER_FIELDS.NOTE}
                      value={formData[ORDER_FIELDS.NOTE]}
                      onChange={handleChange}
                      rows={8}
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer Modal - Nút hành động */}
        <div className="p-5 border-t border-gray-200 bg-gray-50 flex justify-end sticky bottom-0 z-10">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors shadow-sm mr-3"
          >
            Hủy
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            className={`px-6 py-2 text-base font-medium text-white rounded-lg transition-colors shadow-md ${
              isFormComplete && !isLoading
                ? "bg-green-600 hover:bg-green-700"
                : "bg-gray-400 cursor-not-allowed"
            }`}
            disabled={!isFormComplete || isLoading}
          >
            {isLoading ? "Đang Tính Giá..." : "Tạo Đơn Hàng"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateOrderModal;


