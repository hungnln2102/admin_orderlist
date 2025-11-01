// CreateOrderModal.tsx - M  c chun ha li ng Ting Vit

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { ORDER_FIELDS, API_ENDPOINTS } from "../constants";

// =======================================================
// 1. INTERFACES (Cu trc d liu)
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

const calculateDate = (startDate: string, days: number): string => {
  if (!startDate || days <= 0) return startDate;
  const [d, m, y] = startDate.split("/").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days - 1);
  return `${String(date.getDate()).padStart(2, "0")}/${String(
    date.getMonth() + 1
  ).padStart(2, "0")}/${date.getFullYear()}`;
};

const formatCurrency = (value: number) => {
  return (Number(value) || 0).toLocaleString("vi-VN") + " VN";
};

const generateRandomId = (length: number) => {
  return Math.random()
    .toString(36)
    .substring(2, 2 + length)
    .toUpperCase();
};

const getTodayDMY = () => {
  const date = new Date();
  return `${String(date.getDate()).padStart(2, "0")}/${String(
    date.getMonth() + 1
  ).padStart(2, "0")}/${date.getFullYear()}`;
};

// Parse pattern "--{x}m" from Thng Tin Sn Phm to months
const parseMonthsFromInfo = (info?: string): number => {
  if (!info) return 0;
  const m = info.match(/--(\d+)m/i);
  if (!m) return 0;
  const months = Number(m[1] || 0);
  return Number.isFinite(months) && months > 0 ? months : 0;
};

// Convert months to days per spec: 1m=30, 2m=60, 12m=365
const daysFromMonths = (months: number): number => {
  if (!Number.isFinite(months) || months <= 0) return 0;
  return months === 12 ? 365 : months * 30;
};

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
  [ORDER_FIELDS.TINH_TRANG]: "Cha Thanh Ton",
  [ORDER_FIELDS.CHECK_FLAG]: null,
};

const inputClass =
  "w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-all";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";
const readOnlyClass = "bg-gray-100 cursor-not-allowed";

interface UseCreateOrderLogicResult {
  formData: Partial<Order>;
  supplies: Supply[];
  products: Product[];
  isLoading: boolean;
  isDataLoaded: boolean;
  selectedSupplyId: number | null;
  customerType: "MAVC" | "MAVL";
  updateForm: (patch: Partial<Order>) => void;
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
    () => customerType + generateRandomId(5),
    [customerType]
  );
  const todayDate = useMemo(() => getTodayDMY(), []);

  const updateForm = (patch: Partial<Order>) => {
    setFormData((prev) => ({ ...prev, ...patch }));
  };

  const fetchProducts = useCallback(async () => {
    try {
      const response = await fetch(
        `http://localhost:3001${API_ENDPOINTS.PRODUCTS_ALL}`
      );
      if (!response.ok) throw new Error("Li ti danh sch sn phm.");
      const data: Product[] = await response.json();
      setProducts(data);
    } catch (error) {
      console.error("Li khi fetch products:", error);
    }
  }, []);

  const fetchSuppliesByProduct = useCallback(async (productName: string) => {
    try {
      const response = await fetch(
        `http://localhost:3001${API_ENDPOINTS.SUPPLIES_BY_PRODUCT(productName)}`
      );
      if (!response.ok) throw new Error("Li ti danh sch ngun.");
      const data: Supply[] = await response.json();
      setSupplies(data);
    } catch (error) {
      console.error("Li khi fetch supplies:", error);
      setSupplies([]);
    }
  }, []);

  const fetchAllSupplyPrices = useCallback(async (productName: string) => {
    try {
      const response = await fetch(
        `http://localhost:3001/api/products/all-prices-by-name/${encodeURIComponent(
          productName
        )}`
      );
      if (!response.ok) throw new Error("Li ti gi nhp cc ngun.");
      const data: SupplyPrice[] = await response.json();
      setSupplyPrices(data);
    } catch (error) {
      console.error("Li khi fetch all supply prices:", error);
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
          `http://localhost:3001${API_ENDPOINTS.CALCULATE_PRICE}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              supply_id: supplyId,
              san_pham_name: productName,
              id_don_hang: orderId,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Li tnh ton gi t server.");
        }

        const result: CalculatedPriceResult = await response.json();

        const newDays = result.so_ngay_da_dang_ki;
        const newHetHan = calculateDate(registerDateStr, newDays);

        // Thay v gi setFormData  y, chng ta tr v kt qu
        return {
          gia_nhap: result.gia_nhap,
          gia_ban: result.gia_ban,
          so_ngay_da_dang_ki: newDays,
          het_han: newHetHan,
        } as CalculatedPriceResult;
      } catch (error) {
        console.error("Li khi tnh gi:", error);
        setIsDataLoaded(false);
        alert(
          `Tnh gi tht bi: ${
            error instanceof Error ? error.message : "Li khng xc nh"
          }`
        );
        return undefined; // Tr v undefined khi c li
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // LOGIC 1, 2, 3 (Gi nguyn)
  useEffect(() => {
    if (isOpen) {
      const initialType = "MAVC";
      const initialID = initialType + generateRandomId(5);
      const initialDate = getTodayDMY();

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

  // Recalculate selling price when customer type (MAVC/MAVL) changes
  useEffect(() => {
    const productName = formData[ORDER_FIELDS.SAN_PHAM] as string;
    const orderId = formData[ORDER_FIELDS.ID_DON_HANG] as string;
    const registerDate = formData[ORDER_FIELDS.NGAY_DANG_KI] as string;
    if (!productName || !orderId || !registerDate) return;
    calculatePrice(0, productName, orderId, registerDate).then((result) => {
      if (result) {
        setFormData((prev) => ({
          ...prev,
          [ORDER_FIELDS.GIA_BAN]: result.gia_ban,
        }));
      }
    });
  }, [customerType]);

  // H tr chn sn phm trc tip (phc v   search)
  const handleProductSelect = (productName: string) => {
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
              [ORDER_FIELDS.HET_HAN]: result.het_han,
            }));
            setIsDataLoaded(true);
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

  // HM X L CHUNG CHO CC TRNG INPUT/SELECT C BN
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

  // HM  SA: handleProductChange (KCH HOT TNH GI BN, RESET GI NHP)
  const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const productName = e.target.value;
    const selectedProduct = products.find((p) => p.san_pham === productName);

    setSelectedProductId(selectedProduct?.id || null);
    setSelectedSupplyId(null);

    setFormData((prev) => ({
      ...prev,
      [ORDER_FIELDS.SAN_PHAM]: productName,
      [ORDER_FIELDS.NGUON]: "",
      [ORDER_FIELDS.GIA_NHAP]: 0, // M BO GI NHP = 0 KHI CHN SN PHM
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
              // Ghi  Gi Bn v Ngy, GI NHP KHNG C IN (vn gi 0)
              [ORDER_FIELDS.GIA_BAN]: result.gia_ban,
              [ORDER_FIELDS.SO_NGAY_DA_DANG_KI]: String(
                result.so_ngay_da_dang_ki
              ),
              [ORDER_FIELDS.HET_HAN]: result.het_han,
            }));
            setIsDataLoaded(true);
          }
        });
      }
    } else {
      setIsDataLoaded(false);
    }
  };

  // HM  SA: handleSourceChange (Cp nht gi nhp tham kho v x l RESET)
  const handleSourceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sourceId = Number(e.target.value);
    const selectedSupply = supplies.find((s) => s.id === sourceId);

    // 1. Logic tm gi
    let newBasePrice = 0;
    // Kim tra nu sourceId hp l (khc 0)
    if (sourceId !== 0 && selectedSupply) {
      newBasePrice =
        supplyPrices.find((p) => p.source_id === sourceId)?.price || 0;
    }
    // Nu sourceId l 0 (hoc khng tm thy), newBasePrice s l 0, tc l clear Gi Nhp.

    setSelectedSupplyId(sourceId);

    setFormData((prev) => ({
      ...prev,
      // m bo tn ngun l rng nu chn -- Chn Ngun -- (sourceId=0)
      [ORDER_FIELDS.NGUON]: selectedSupply ? selectedSupply.source_name : "",
      // 2. CP NHT GI NHP (BASE PRICE) THAM KHO
      [ORDER_FIELDS.GIA_NHAP]: newBasePrice,
    }));
  };

  const handleCustomerTypeChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const newType = e.target.value as "MAVC" | "MAVL";
    setCustomerType(newType);
    // Reset sản phẩm/nguồn và trạng thái tính khi đổi loại khách hàng
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
      [ORDER_FIELDS.HET_HAN]: prev[ORDER_FIELDS.NGAY_DANG_KI] || getTodayDMY(),
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

    if (requiredFieldsFilled && isDataLoaded && !isLoading) {
      const dataToSave = {
        ...formData,
        [ORDER_FIELDS.GIA_NHAP]: Number(formData[ORDER_FIELDS.GIA_NHAP]),
        [ORDER_FIELDS.GIA_BAN]: Number(formData[ORDER_FIELDS.GIA_BAN]),

        [ORDER_FIELDS.LINK_LIEN_HE]:
          formData[ORDER_FIELDS.LINK_LIEN_HE] || null,
        [ORDER_FIELDS.SLOT]: formData[ORDER_FIELDS.SLOT] || null,
        [ORDER_FIELDS.NOTE]: formData[ORDER_FIELDS.NOTE] || null,
      };

      onSave(dataToSave as Order);
      return true;
    } else {
      alert(
        "Vui lng in  Tn Khch Hng, Thng Tin Sn Phm v m bo  chn Ngun/Sn phm  tnh gi."
      );
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
    handleChange,
    handleProductSelect,
    handleSourceSelect,
    handleSourceChange,
    handleProductChange,
    handleCustomerTypeChange,
    handleSubmit,
  };
};

// =======================================================
// 4. COMPONENT CHNH
// =======================================================
// =======================================================
// SearchableSelect (local component)
// =======================================================
type SSOption = { value: string | number; label: string };

interface SearchableSelectProps {
  name?: string;
  value: string | number | null | undefined;
  options: SSOption[];
  placeholder?: string;
  disabled?: boolean;
  onChange: (value: SSOption["value"], option: SSOption) => void;
  onClear?: () => void;
}

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
      {!disabled && (query || value) ? (
        <button
          type="button"
          aria-label="Xa la chn"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setQuery("");
            onClear?.();
            setOpen(true);
          }}
        ></button>
      ) : null}
      {open && !disabled && (
        <div className="absolute z-20 mt-1 w-full max-h-60 overflow-auto rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">Khng c kt qu</div>
          ) : (
            filtered.map((opt) => (
              <div
                key={String(opt.value)}
                className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 ${
                  opt.value === value ? "bg-blue-100" : ""
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(opt.value, opt);
                  setOpen(false);
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
    handleChange,
    handleProductSelect,
    handleSourceSelect,
    handleSourceChange,
    handleProductChange,
    handleCustomerTypeChange,
    handleSubmit,
  } = useCreateOrderLogic(isOpen, onSave);
  // Toggle nhp mi: phi khai bo trc early-return  khng i th t hooks
  const [customMode, setCustomMode] = useState(false);

  // When custom mode is on, compute days from pattern --xm in either
  // "Thong Tin San Pham" OR product name (fallback)
  useEffect(() => {
    if (!customMode) return;
    const infoA = (formData[ORDER_FIELDS.THONG_TIN_SAN_PHAM] as string) || "";
    const infoB = (formData[ORDER_FIELDS.SAN_PHAM] as string) || "";
    const months = parseMonthsFromInfo(infoA) || parseMonthsFromInfo(infoB);
    const days = daysFromMonths(months);
    const registerDate =
      (formData[ORDER_FIELDS.NGAY_DANG_KI] as string) || getTodayDMY();
    updateForm({
      [ORDER_FIELDS.SO_NGAY_DA_DANG_KI]: String(days),
      [ORDER_FIELDS.HET_HAN]: calculateDate(registerDate, days || 0),
    } as any);
  }, [
    customMode,
    formData[ORDER_FIELDS.THONG_TIN_SAN_PHAM],
    formData[ORDER_FIELDS.SAN_PHAM],
    formData[ORDER_FIELDS.NGAY_DANG_KI],
  ]);

  if (!isOpen) return null;

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
              {/* Phn 1: M n & Khch Hng */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border p-4 rounded-lg bg-gray-50">
                {/* Loi Khch Hng */}
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
                {/* M n Hng */}
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

                {/* Tn Khch Hng */}
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
                {/* Link Lin H */}
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

              {/* Phn 2: Sn Phm & Ngun */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 border p-4 rounded-lg items-end">
                {/* 1. SN PHM */}
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
                    placeholder="-- Chon --"
                    onChange={(val) => handleProductSelect(String(val))}
                    onClear={() => handleProductSelect("")}
                    disabled={customMode}
                  />
                </div>

                {/* 2. NGUN */}
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
                    placeholder="-- Chon --"
                    disabled={customMode || !formData[ORDER_FIELDS.SAN_PHAM]}
                    onChange={(val) => handleSourceSelect(Number(val))}
                    onClear={() => handleSourceSelect(0)}
                  />
                </div>

                {/* 3. Nt Thm (+)  cui hng */}
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

                {/* 4b. Thong Tin San Pham: next row but same block */}
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
              {/* Phn 3: Thi Gian & Gi Tin */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-6">
                  {/* Ngy ng K */}
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
                  {/* S Ngy  ng K */}
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
                  {/* Ngy Ht Hn */}
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
                  {/* Gi Nhp (S hin th gi ca Ngun c chn) */}
                  <div>
                    <label className={labelClass}>Giá Nhập</label>
                    {customMode ? (
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        step={1}
                        name={ORDER_FIELDS.GIA_NHAP}
                        value={Number(formData[ORDER_FIELDS.GIA_NHAP] || 0)}
                        onChange={(e) =>
                          updateForm({
                            [ORDER_FIELDS.GIA_NHAP]:
                              Number(e.target.value) || 0,
                          } as any)
                        }
                        className={`${inputClass} font-semibold`}
                      />
                    ) : (
                      <input
                        type="text"
                        name={ORDER_FIELDS.GIA_NHAP}
                        value={formatCurrency(
                          formData[ORDER_FIELDS.GIA_NHAP] || 0
                        )}
                        readOnly
                        className={`${inputClass} font-semibold ${readOnlyClass}`}
                      />
                    )}
                  </div>
                  {/* Gi Bn (S hin th gi tnh ton t gi nhp cao nht) */}
                  <div>
                    <label className={labelClass}>Giá Bán</label>
                    {customMode ? (
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        step={1}
                        name={ORDER_FIELDS.GIA_BAN}
                        value={Number(formData[ORDER_FIELDS.GIA_BAN] || 0)}
                        onChange={(e) =>
                          updateForm({
                            [ORDER_FIELDS.GIA_BAN]: Number(e.target.value) || 0,
                          } as any)
                        }
                        className={`${inputClass} font-semibold text-green-700`}
                      />
                    ) : (
                      <input
                        type="text"
                        name={ORDER_FIELDS.GIA_BAN}
                        value={formatCurrency(
                          formData[ORDER_FIELDS.GIA_BAN] || 0
                        )}
                        readOnly
                        className={`${inputClass} font-semibold text-green-700 ${readOnlyClass}`}
                      />
                    )}
                  </div>

                  {/* Ghi Ch */}
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

        {/* Footer Modal - Nt hnh ng */}
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
              isDataLoaded && !isLoading
                ? "bg-green-600 hover:bg-green-700"
                : "bg-gray-400 cursor-not-allowed"
            }`}
            disabled={!isDataLoaded || isLoading}
          >
            {isLoading ? "Đang Tính Giá..." : "Tạo Đơn Hàng"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateOrderModal;
