// CreateOrderModal.tsx - Mã dã du?c làm s?ch và d?ng b? v?i DB DATE/YMD

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  XMarkIcon,
  PlusCircleIcon,
  MinusCircleIcon,
} from "@heroicons/react/24/outline";
import { ORDER_FIELDS, API_ENDPOINTS, Order as ApiOrder } from "../constants";
import * as Helpers from "../lib/helpers";

type ViteEnv = { VITE_API_BASE_URL?: string };
type LooseProcessEnv = { env?: Record<string, string | undefined> };

const resolveApiBase = (): string => {
  try {
    const viteEnv =
      (globalThis as unknown as { import?: { meta?: { env?: ViteEnv } } }).import
        ?.meta?.env;
    if (viteEnv?.VITE_API_BASE_URL) return viteEnv.VITE_API_BASE_URL;
  } catch {
    // ignore
  }

  const nodeProcess =
    typeof globalThis !== "undefined" && "process" in globalThis
      ? (globalThis as unknown as { process?: LooseProcessEnv }).process
      : undefined;
  const fromProcess = nodeProcess?.env?.VITE_API_BASE_URL;
  if (fromProcess) return fromProcess;

  return "http://localhost:3001";
};

const API_BASE = resolveApiBase();

// =======================================================
// 1. INTERFACES (C?u trúc d? li?u)
// =======================================================
type Order = Omit<ApiOrder, "cost" | "price"> & {
  cost: number | string;
  price: number | string;
};
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
  cost: number;
  price: number;
  days: number;
  order_expired: string;
}
type RawCalculatedPriceResult = Partial<{
  gia_nhap: number;
  gia_ban: number;
  so_ngay_da_dang_ki: number;
  het_han: string;
  cost: number;
  price: number;
  days: number;
  order_expired: string;
}>;
type CustomerType = "MAVC" | "MAVL" | "MAVK";
interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newOrderData: Partial<Order> | Order) => void;
}

// =======================================================
// 2. HELPER FUNCTIONS & CONSTANTS
// =======================================================

/**
 * FIX: Chuy?n d?i d?nh d?ng DD/MM/YYYY sang YYYY-MM-DD cho Backend.
 * @param {string} dmyString - Ngày ? d?nh d?ng DD/MM/YYYY
 * @returns {string} Ngày ? d?nh d?ng YYYY-MM-DD
 */
const convertDMYToYMD = (dmyString: string): string => {
  if (!dmyString || dmyString.indexOf("/") === -1) return dmyString;
  const parts = dmyString.split("/");
  if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
  return dmyString;
};

// Hàm Helper d? tính Ngày H?t H?n (T?m th?i dùng trên Frontend cho ch? d? Custom)
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
  // -1 vì ngày dang ký là ngày d?u tiên
  date.setDate(date.getDate() + days - 1);

  const newDay = String(date.getDate()).padStart(2, "0");
  const newMonth = String(date.getMonth() + 1).padStart(2, "0");
  const newYear = date.getFullYear();

  return `${newDay}/${newMonth}/${newYear}`;
};
// ...

const INITIAL_FORM_DATA: Partial<Order> = {
  [ORDER_FIELDS.ID_ORDER]: "",
  [ORDER_FIELDS.ID_PRODUCT]: "",
  [ORDER_FIELDS.INFORMATION_ORDER]: "",
  [ORDER_FIELDS.CUSTOMER]: "",
  [ORDER_FIELDS.CONTACT]: "",
  [ORDER_FIELDS.SLOT]: "",
  [ORDER_FIELDS.ORDER_DATE]: "",
  [ORDER_FIELDS.DAYS]: "0",
  [ORDER_FIELDS.ORDER_EXPIRED]: "",
  [ORDER_FIELDS.SUPPLY]: "",
  [ORDER_FIELDS.COST]: 0,
  [ORDER_FIELDS.PRICE]: 0,
  [ORDER_FIELDS.NOTE]: "",
  [ORDER_FIELDS.STATUS]: "Chua Thanh Toán",
  [ORDER_FIELDS.CHECK_FLAG]: null,
};

const inputClass =
  "w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-all";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";
const readOnlyClass = "bg-gray-100 cursor-not-allowed";

interface UseCreateOrderLogicResult {
  // ... (Giao di?n gi? nguyên)
  formData: Partial<Order>;
  supplies: Supply[];
  allSupplies: Supply[];
  products: Product[];
  isLoading: boolean;
  isDataLoaded: boolean;
  selectedSupplyId: number | null;
  customerType: CustomerType;
  updateForm: (patch: Partial<Order>) => void;
  setIsDataLoaded: (v: boolean) => void;
  customProductTouched: boolean;
  setCustomProductTouched: React.Dispatch<React.SetStateAction<boolean>>;
  handleChange: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => void;
  handleProductSelect: (productName: string) => void;
  handleSourceSelect: (sourceId: number) => void;
  handleProductChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  handleCustomerTypeChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  handleSubmit: (e: React.FormEvent) => boolean;
}

const useCreateOrderLogic = (
  isOpen: boolean,
  onSave: (newOrderData: Partial<Order> | Order) => void,
  customMode: boolean
): UseCreateOrderLogicResult => {
  const [formData, setFormData] = useState<Partial<Order>>(INITIAL_FORM_DATA);
  const [customerType, setCustomerType] = useState<CustomerType>("MAVC");

  const [allSupplies, setAllSupplies] = useState<Supply[]>([]);
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [supplyPrices, setSupplyPrices] = useState<SupplyPrice[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [selectedSupplyId, setSelectedSupplyId] = useState<number | null>(null);
  const [customProductTouched, setCustomProductTouched] = useState(false);

  const currentOrderId = useMemo(
    () => customerType + Helpers.generateRandomId(5),
    [customerType]
  );
  const todayDate = useMemo(() => Helpers.getTodayDMY(), []);
  const productName = formData[ORDER_FIELDS.ID_PRODUCT] as string;
  const orderId = formData[ORDER_FIELDS.ID_ORDER] as string;
  const registerDate = formData[ORDER_FIELDS.ORDER_DATE] as string;

  const updateForm = (patch: Partial<Order>) => {
    setFormData((prev) => ({ ...prev, ...patch }));
  };

  const fetchProducts = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}${API_ENDPOINTS.PRODUCTS_ALL}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("L?i t?i danh sách s?n ph?m.");
      const data: Product[] = await response.json();
      setProducts(data);
    } catch (error) {
      console.error("L?i khi fetch products:", error);
    }
  }, []);

  const fetchAllSupplies = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}${API_ENDPOINTS.SUPPLIES}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("L?i t?i danh sách ngu?n.");
      const data: Supply[] = await response.json();
      setAllSupplies(data);
      setSupplies((prev) => (prev.length ? prev : data));
    } catch (error) {
      console.error("L?i khi fetch all supplies:", error);
      setAllSupplies([]);
    }
  }, []);

  const fetchSuppliesByProduct = useCallback(async (productName: string) => {
    if (!productName) {
      setSupplies((prev) => (prev.length ? prev : allSupplies));
      return;
    }
    try {
      const response = await fetch(
        `${API_BASE}${API_ENDPOINTS.SUPPLIES_BY_PRODUCT(productName)}`,
        { credentials: "include" }
      );
      if (!response.ok) throw new Error("L?i t?i danh sách ngu?n.");
      const data: Supply[] = await response.json();
      setSupplies(data);
    } catch (error) {
      console.error("L?i khi fetch supplies:", error);
      setSupplies(allSupplies);
    }
  }, [allSupplies]);

  const fetchAllSupplyPrices = useCallback(async (productName: string) => {
    try {
      const response = await fetch(
        `${API_BASE}${API_ENDPOINTS.SUPPLY_PRICES_BY_PRODUCT_NAME(
          productName
        )}`,
        { credentials: "include" }
      );
      if (!response.ok) throw new Error("L?i tính giá nh?p c?a ngu?n.");
      const data: SupplyPrice[] = await response.json();
      setSupplyPrices(data);
    } catch (error) {
      console.error("L?i khi fetch all supply prices:", error);
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
        const normalizedOrderDate =
          convertDMYToYMD(registerDateStr) || registerDateStr || null;
        const response = await fetch(
          `${API_BASE}${API_ENDPOINTS.CALCULATE_PRICE}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              // Backend chi can cac thong so nay de tinh gia ban va ngay het han
              supply_id: supplyId,
              san_pham_name: productName,
              id_product: productName,
              id_order: orderId,
              order_date: normalizedOrderDate,
              customer_type: customerType,
            }),
          }
        );

        const { data, rawText } =
          await Helpers.readJsonOrText<RawCalculatedPriceResult>(response);

        if (!response.ok) {
          const message =
            (data as { error?: string } | null)?.error ||
            rawText ||
            "L?i tính giá t?i Server.";
          throw new Error(message);
        }

        if (!data) {
          throw new Error("Ph?n h?i không h?p l? t? server.");
        }

        const raw = (data || {}) as RawCalculatedPriceResult;
        const normalizedRegisterDMY =
          Helpers.formatDateToDMY(registerDateStr) ||
          registerDateStr ||
          Helpers.getTodayDMY();

        const mapped: CalculatedPriceResult = {
          cost: Math.max(0, Number(raw.gia_nhap ?? raw.cost ?? 0) || 0),
          price: Math.max(0, Number(raw.gia_ban ?? raw.price ?? 0) || 0),
          days: Number(raw.so_ngay_da_dang_ki ?? raw.days ?? 0) || 0,
          order_expired: "",
        };

        const expiryRaw = (raw.order_expired ?? raw.het_han ?? "").trim();
        const expiryDMY =
          Helpers.formatDateToDMY(expiryRaw) ||
          expiryRaw ||
          (mapped.days > 0
            ? calculateExpirationDate(normalizedRegisterDMY, mapped.days)
            : "");

        mapped.order_expired = expiryDMY;

        return mapped;
      } catch (error) {
        console.error("L?i khi tính giá:", error);
        setIsDataLoaded(false);
        alert(
          `Tính giá th?t b?i: ${
            error instanceof Error ? error.message : "L?i không xác nh?n"
          }`
        );
        return undefined;
      } finally {
        setIsLoading(false);
      }
    },
    [customerType]
  );

  const applyCalculationResult = useCallback(
    (
      result: CalculatedPriceResult | undefined,
      registerDMY: string,
      fallbackImport?: number,
      options?: { updateCost?: boolean }
    ) => {
      if (!result) return;

      const safeRegister =
        Helpers.formatDateToDMY(registerDMY) ||
        registerDMY ||
        Helpers.getTodayDMY();
      const days = Number(result.days || 0) || 0;
      const expiry =
        result.order_expired ||
        (days > 0 ? calculateExpirationDate(safeRegister, days) : "");

      setFormData((prev) => {
        const prevGiaNhap = Number(prev[ORDER_FIELDS.COST] || 0);
        const giaNhapFromResult =
          Number.isFinite(result.cost) && result.cost > 0
            ? result.cost
            : undefined;
        const shouldUpdateCost = options?.updateCost ?? true;
        const giaNhap = shouldUpdateCost
          ? giaNhapFromResult ??
            Number(fallbackImport ?? prevGiaNhap ?? 0)
          : prevGiaNhap;

        const prevGiaBan = Number(prev[ORDER_FIELDS.PRICE] || 0);
        const giaBanFromResult =
          Number.isFinite(result.price) && result.price > 0
            ? result.price
            : undefined;
        const giaBan =
          customerType === "MAVK"
            ? giaNhap
            : giaBanFromResult ?? prevGiaBan ?? 0;

        return {
          ...prev,
          [ORDER_FIELDS.COST]: giaNhap,
          [ORDER_FIELDS.PRICE]: giaBan,
          [ORDER_FIELDS.DAYS]:
            days > 0
              ? String(days)
              : String(prev[ORDER_FIELDS.DAYS] || "0"),
          [ORDER_FIELDS.ORDER_EXPIRED]:
            expiry || (prev[ORDER_FIELDS.ORDER_EXPIRED] as string) || "",
        };
      });

      setIsDataLoaded(true);
    },
    [customerType]
  );

  const recalcPrice = useCallback(
    (
      supplyId: number,
      productName: string,
      orderId: string,
      registerDate: string,
      fallbackImport?: number,
      options?: { updateCost?: boolean }
    ) => {
      if (!productName || !orderId || !registerDate) return;
      calculatePrice(supplyId, productName, orderId, registerDate).then(
        (result) =>
          applyCalculationResult(result, registerDate, fallbackImport, options)
      );
    },
    [calculatePrice, applyCalculationResult]
  );

  useEffect(() => {
    if (isOpen) {
      const initialType: CustomerType = "MAVC";
      const initialID = initialType + Helpers.generateRandomId(5);
      const initialDate = Helpers.getTodayDMY();

      setCustomerType(initialType);
      setFormData({
        ...INITIAL_FORM_DATA,
        [ORDER_FIELDS.ID_ORDER]: initialID,
        [ORDER_FIELDS.ORDER_DATE]: initialDate,
        [ORDER_FIELDS.ORDER_EXPIRED]: initialDate,
      });
      setIsDataLoaded(false);
      setSelectedSupplyId(null);
      setSupplies([]);
      setSupplyPrices([]);
      fetchProducts();
      fetchAllSupplies();
    }
  }, [isOpen, fetchProducts, fetchAllSupplies]);

  useEffect(() => {
    if (isOpen) {
      setFormData((prev) => ({
        ...prev,
        [ORDER_FIELDS.ID_ORDER]: currentOrderId,
      }));
    }
  }, [currentOrderId, isOpen]);

  useEffect(() => {
    if (!productName || !orderId || !registerDate) return;
    if (customMode) return;

    if (customerType === "MAVK") {
      setFormData((prev) => ({
        ...prev,
        [ORDER_FIELDS.PRICE]: prev[ORDER_FIELDS.COST] || 0,
      }));
      return;
    }

    // Trigger tinh gia lai khi loai khach hang thay doi
    const supplyId = selectedSupplyId ?? 0;
    recalcPrice(supplyId, productName, orderId, registerDate, undefined, {
      updateCost: Boolean(supplyId),
    });
  }, [
    customerType,
    recalcPrice,
    productName,
    orderId,
    registerDate,
    selectedSupplyId,
    customMode,
  ]);

  const handleProductSelect = (productName: string) => {
    // ... (logic gi? nguyên)
    setSelectedSupplyId(null);
    setCustomProductTouched(false);

    setFormData((prev) => ({
      ...prev,
      [ORDER_FIELDS.ID_PRODUCT]: productName,
      [ORDER_FIELDS.SUPPLY]: "",
      [ORDER_FIELDS.COST]: 0,
      [ORDER_FIELDS.PRICE]: 0,
      [ORDER_FIELDS.DAYS]: "0",
      [ORDER_FIELDS.ORDER_EXPIRED]: prev[ORDER_FIELDS.ORDER_DATE] || todayDate,
    }));
    setSupplies([]);
    setSupplyPrices([]);

    if (productName) {
      fetchSuppliesByProduct(productName);
      fetchAllSupplyPrices(productName);

      const orderId = formData[ORDER_FIELDS.ID_ORDER] as string;
      const registerDate = formData[ORDER_FIELDS.ORDER_DATE] as string;

      if (orderId && registerDate) {
        if (!customMode) {
          const supplyId = selectedSupplyId ?? 0;
          recalcPrice(supplyId, productName, orderId, registerDate, undefined, {
            updateCost: Boolean(supplyId),
          });
        }
      }
    } else {
      setSupplies(allSupplies);
      setIsDataLoaded(false);
    }
  };

  const getSupplyImportPrice = useCallback(
    (sourceId: number, supplyName: string, fallbackCost: number) => {
      const supplyPriceLikeList: Helpers.SupplyPriceLike[] = supplyPrices.map(
        (p) => ({
          source_id: p.source_id,
          price: p.price,
        })
      );
      const supplyLikeList: Helpers.SupplyLike[] = supplies.map((s) => ({
        id: s.id,
        source_name: s.source_name,
      }));

      const priceByName = Helpers.getImportPriceBySupplyName(
        supplyName,
        supplyPriceLikeList,
        supplyLikeList
      );
      const normalizedByName = Number(priceByName);
      if (Number.isFinite(normalizedByName)) {
        return normalizedByName;
      }
      if (sourceId !== 0) {
        const byId = supplyPrices.find((p) => p.source_id === sourceId)?.price;
        const normalizedById = Number(byId);
        if (Number.isFinite(normalizedById)) {
          return normalizedById;
        }
      }
      return fallbackCost;
    },
    [supplies, supplyPrices]
  );

  const handleSourceSelect = (sourceId: number) => {
    const selectedSupply = supplies.find((s) => s.id === sourceId);
    const fallbackCost = Number(formData[ORDER_FIELDS.COST] || 0);
    const supplyName = selectedSupply?.source_name || "";
    const newBasePrice = getSupplyImportPrice(
      sourceId,
      supplyName,
      fallbackCost
    );
    setSelectedSupplyId(sourceId === 0 ? null : sourceId);
    setFormData((prev) => {
      const updated: Partial<Order> = {
        ...prev,
        [ORDER_FIELDS.SUPPLY]: selectedSupply ? selectedSupply.source_name : "",
        [ORDER_FIELDS.COST]: newBasePrice,
      };
      if (customerType === "MAVK") {
        updated[ORDER_FIELDS.PRICE] = newBasePrice;
      }
      return updated;
    });

    const productName = formData[ORDER_FIELDS.ID_PRODUCT] as string;
    const orderId = formData[ORDER_FIELDS.ID_ORDER] as string;
    const registerDate = formData[ORDER_FIELDS.ORDER_DATE] as string;
    if (!productName || !orderId || !registerDate) {
      setIsDataLoaded(false);
      return;
    }

    recalcPrice(sourceId, productName, orderId, registerDate, newBasePrice, {
      updateCost: true,
    });
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
    setSelectedSupplyId(null);
    setCustomProductTouched(false);

    setFormData((prev) => ({
      ...prev,
      [ORDER_FIELDS.ID_PRODUCT]: productName,
      [ORDER_FIELDS.SUPPLY]: "",
      [ORDER_FIELDS.COST]: 0,
      [ORDER_FIELDS.PRICE]: 0,
      [ORDER_FIELDS.DAYS]: "0",
      [ORDER_FIELDS.ORDER_EXPIRED]: prev[ORDER_FIELDS.ORDER_DATE] || todayDate,
    }));
    setSupplies([]);
    setSupplyPrices([]);

    if (productName) {
      fetchSuppliesByProduct(productName);
      fetchAllSupplyPrices(productName);

      const orderId = (formData[ORDER_FIELDS.ID_ORDER] as string) || "";
      const registerDate = (formData[ORDER_FIELDS.ORDER_DATE] as string) || "";

      if (orderId && registerDate) {
        if (!customMode) {
          const supplyId = selectedSupplyId ?? 0;
          recalcPrice(supplyId, productName, orderId, registerDate, undefined, {
            updateCost: Boolean(supplyId),
          });
        }
      }
    } else {
      setIsDataLoaded(false);
    }
  };

  const handleCustomerTypeChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const newType = e.target.value as CustomerType;
    setCustomerType(newType);
    setSelectedSupplyId(null);
    setSupplies([]);
    setSupplyPrices([]);
    setIsDataLoaded(false);
    setFormData((prev) => ({
      ...prev,
      [ORDER_FIELDS.ID_PRODUCT]: "",
      [ORDER_FIELDS.SUPPLY]: "",
      [ORDER_FIELDS.COST]: 0,
      [ORDER_FIELDS.PRICE]: 0,
      [ORDER_FIELDS.DAYS]: "0",
      [ORDER_FIELDS.ORDER_EXPIRED]: prev[ORDER_FIELDS.ORDER_DATE] || Helpers.getTodayDMY(),
    }));
  };

  const handleSubmit = (e: React.FormEvent): boolean => {
    e.preventDefault();

    const requiredFieldsFilled =
      formData &&
      formData[ORDER_FIELDS.ID_PRODUCT] &&
      formData[ORDER_FIELDS.SUPPLY] &&
      formData[ORDER_FIELDS.CUSTOMER] &&
      formData[ORDER_FIELDS.INFORMATION_ORDER];

    if (requiredFieldsFilled && !isLoading) {
      const registerDMY =
        Helpers.formatDateToDMY(
          formData[ORDER_FIELDS.ORDER_DATE] as string
        ) ||
        (formData[ORDER_FIELDS.ORDER_DATE] as string) ||
        Helpers.getTodayDMY();

      const currentExpiryDMY =
        Helpers.formatDateToDMY(formData[ORDER_FIELDS.ORDER_EXPIRED] as string) ||
        (formData[ORDER_FIELDS.ORDER_EXPIRED] as string) ||
        "";

      const totalDays =
        Number(formData[ORDER_FIELDS.DAYS] || 0) || 0;

      let expiryDMY = currentExpiryDMY;
      if (!expiryDMY && registerDMY && totalDays > 0) {
        const computed = calculateExpirationDate(registerDMY, totalDays);
          if (computed && computed !== "N/A") {
            expiryDMY = computed;
            updateForm({
              [ORDER_FIELDS.ORDER_EXPIRED]: expiryDMY,
            } as Partial<Order>);
          }
      }

      const normalizedRegister = Helpers.convertDMYToYMD(registerDMY);
      const normalizedExpiry = expiryDMY
        ? Helpers.convertDMYToYMD(expiryDMY)
        : normalizedRegister;

      const dataToSave = {
        ...formData,
        [ORDER_FIELDS.COST]: Number(formData[ORDER_FIELDS.COST]),
        [ORDER_FIELDS.PRICE]: Number(formData[ORDER_FIELDS.PRICE]),
        [ORDER_FIELDS.ORDER_DATE]: normalizedRegister,
        [ORDER_FIELDS.ORDER_EXPIRED]: normalizedExpiry,
        [ORDER_FIELDS.CONTACT]:
          formData[ORDER_FIELDS.CONTACT] || null,
        [ORDER_FIELDS.SLOT]: formData[ORDER_FIELDS.SLOT] || null,
        [ORDER_FIELDS.NOTE]: formData[ORDER_FIELDS.NOTE] || null,
      };

      onSave(dataToSave as Order);
      return true;
    } else {
      alert("Vui lòng di?n d?y d? các thông tin");
      return false;
    }
  };

  return {
    formData,
    supplies,
    allSupplies,
    products,
    isLoading,
    isDataLoaded,
    selectedSupplyId,
    customerType,
    updateForm,
    setIsDataLoaded,
    customProductTouched,
    setCustomProductTouched,
    handleChange,
    handleProductSelect,
    handleSourceSelect,
    handleProductChange,
    handleCustomerTypeChange,
    handleSubmit,
  };
};

type SSOption = { value: string | number; label: string };

interface SearchableSelectProps {
  // ... (Giao di?n gi? nguyên)
  name?: string;
  value: string | number | null | undefined;
  options: SSOption[];
  placeholder?: string;
  disabled?: boolean;
  onChange: (value: SSOption["value"], option: SSOption) => void;
  onClear?: () => void;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  // ... (Component gi? nguyên)
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
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-white"
          aria-label="Clear"
        >
          ×
        </button>
      )}

      {/* Dropdown */}
      {open && !disabled && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">Không có k?t qu?</div>
          ) : (
            filtered.map((opt) => (
              <div
                key={`${String(opt.value)}-${opt.label}`}
                className={`px-3 py-2 text-sm cursor-pointer hover:bg-indigo-500/15 ${
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
  const [customMode, setCustomMode] = useState(false);
  const {
    formData,
    updateForm,
    supplies,
    products,
    isLoading,
    selectedSupplyId,
    customerType,
    setIsDataLoaded,
    customProductTouched,
    setCustomProductTouched,
    handleChange,
    handleProductSelect,
    handleSourceSelect,
    handleCustomerTypeChange,
    handleSubmit,
  } = useCreateOrderLogic(isOpen, onSave, customMode);

  const infoAValue = (formData[ORDER_FIELDS.INFORMATION_ORDER] as string) || "";
  const infoBValue = (formData[ORDER_FIELDS.ID_PRODUCT] as string) || "";
  const registerDateValue =
    (formData[ORDER_FIELDS.ORDER_DATE] as string) || Helpers.getTodayDMY();

  const handlePriceInput = useCallback(
    (
      field: typeof ORDER_FIELDS.COST | typeof ORDER_FIELDS.PRICE
    ) =>
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value || "";
        const digits = raw.replace(/\D/g, "");
        const num = digits ? parseInt(digits, 10) : 0;
        updateForm({ [field]: num } as Partial<Order>);
      },
    [updateForm]
  );

  

  // When custom mode is on, compute expiry using --xm by adding months then -1 day.
  // Only run after user leaves the custom product input (onBlur).
  useEffect(() => {
    if (!customMode || !customProductTouched) return;
    const months =
      Helpers.parseMonthsFromInfo(infoAValue) || Helpers.parseMonthsFromInfo(infoBValue);
    const registerDate = registerDateValue;

    if (months > 0) {
      const end = Helpers.addMonthsMinusOneDay(registerDate, months);
      const days = Helpers.inclusiveDaysBetween(registerDate, end);
      updateForm({
        [ORDER_FIELDS.DAYS]: String(days),
        [ORDER_FIELDS.ORDER_EXPIRED]: end,
      } as Partial<Order>);
    }
  }, [
    customMode,
    customProductTouched,
    infoAValue,
    infoBValue,
    registerDateValue,
    updateForm,
  ]);

  const rawExpiryValue = (formData[ORDER_FIELDS.ORDER_EXPIRED] as string) || "";
  const registerDateDMY =
    (formData[ORDER_FIELDS.ORDER_DATE] as string) || Helpers.getTodayDMY();
  const totalDays = Number(formData[ORDER_FIELDS.DAYS] || 0) || 0;

  // Ensure expiry date is populated and formatted.
  // If backend doesn't return it, compute from register date + days.
  useEffect(() => {
    const normalized = Helpers.formatDateToDMY(rawExpiryValue);

    if (!normalized && registerDateDMY && totalDays > 0) {
      const computed = calculateExpirationDate(registerDateDMY, totalDays);
      if (computed && computed !== "N/A") {
        updateForm({
          [ORDER_FIELDS.ORDER_EXPIRED]: computed,
        } as Partial<Order>);
      }
    } else if (normalized && normalized !== rawExpiryValue) {
      updateForm({
        [ORDER_FIELDS.ORDER_EXPIRED]: normalized,
      } as Partial<Order>);
    }
  }, [
    rawExpiryValue,
    registerDateDMY,
    totalDays,
    updateForm,
  ]);

  const readyToLoad = (() => {
    const prod = (formData[ORDER_FIELDS.ID_PRODUCT] as string) || "";
    const src = (formData[ORDER_FIELDS.SUPPLY] as string) || "";
    const info = (formData[ORDER_FIELDS.INFORMATION_ORDER] as string) || "";
    const customer = (formData[ORDER_FIELDS.CUSTOMER] as string) || "";
    return !!prod && !!src && !!info && !!customer;
  })();

  // Mark data as ready when 4 required fields are filled
  useEffect(() => {
    setIsDataLoaded(readyToLoad);
  }, [readyToLoad, setIsDataLoaded]);

  if (!isOpen) return null;

  const isFormComplete = Boolean(
    formData[ORDER_FIELDS.CUSTOMER] &&
    formData[ORDER_FIELDS.ID_PRODUCT] &&
    formData[ORDER_FIELDS.SUPPLY] &&
    formData[ORDER_FIELDS.INFORMATION_ORDER]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm transition-opacity duration-300">
      <div className="bg-slate-900/90 border border-white/10 rounded-lg shadow-[0_18px_48px_-28px_rgba(0,0,0,0.8)] w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col text-slate-100">
        {/* Header Modal */}
        <div className="p-5 border-b border-slate-700 sticky top-0 bg-slate-800/80 z-10 flex justify-between items-center">
          <h3 className="text-xl font-semibold text-white">
            T?o Ðon Hàng M?i
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-300 hover:text-white transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* Ph?n 1: Mã don & Khách Hàng */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border p-4 rounded-lg bg-gray-50">
                {/* Lo?i Khách Hàng */}
                <div>
                  <label className={labelClass}>Lo?i Khách Hàng</label>
                  <select
                    name="customer_type"
                    value={customerType}
                    onChange={handleCustomerTypeChange}
                    className={inputClass}
                  >
                    <option value="MAVC">C?ng Tác Viên</option>
                    <option value="MAVL">Khách L?</option>
                    <option value="MAVK">Khuy?n Mãi</option>
                  </select>
                </div>
                {/* Mã Ðon Hàng */}
                <div>
                  <label className={labelClass}>Mã Ðon Hàng</label>
                  <input
                    type="text"
                    name={ORDER_FIELDS.ID_ORDER}
                    value={(formData[ORDER_FIELDS.ID_ORDER] as string) || ""}
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
                    name={ORDER_FIELDS.CUSTOMER}
                    value={(formData[ORDER_FIELDS.CUSTOMER] as string) || ""}
                    onChange={handleChange}
                    className={inputClass}
                    required
                  />
                </div>
                {/* Link Liên H? */}
                <div>
                  <label className={labelClass}>Link Liên H?</label>
                  <input
                    type="url"
                    name={ORDER_FIELDS.CONTACT}
                    value={(formData[ORDER_FIELDS.CONTACT] as string) || ""}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Ph?n 2: S?n Ph?m & Ngu?n */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 border p-4 rounded-lg items-end">
                {/* 1. S?N PH?M */}
                <div className="md:col-span-5">
                  <label className={labelClass}>
                    S?n Ph?m <span className="text-red-500">*</span>
                  </label>
                  <SearchableSelect
                    name={ORDER_FIELDS.ID_PRODUCT}
                    value={(formData[ORDER_FIELDS.ID_PRODUCT] as string) || ""}
                    options={products.map((p) => ({
                      value: p.san_pham,
                      label: p.san_pham,
                    }))}
                    placeholder="-- Ch?n --"
                    onChange={(val) => handleProductSelect(String(val))}
                    onClear={() => handleProductSelect("")}
                    disabled={customMode}
                  />
                </div>

                {/* 2. NGU?N */}
                <div className="md:col-span-5">
                  <label className={labelClass}>
                    Ngu?n <span className="text-red-500">*</span>
                  </label>
                  <SearchableSelect
                    name={ORDER_FIELDS.SUPPLY}
                    value={selectedSupplyId ?? ""}
                    options={supplies.map((s) => ({
                      value: s.id,
                      label: s.source_name,
                    }))}
                    placeholder="-- Ch?n --"
                    disabled={
                      customMode || !formData[ORDER_FIELDS.ID_PRODUCT]
                    }
                    onChange={(val) => handleSourceSelect(Number(val))}
                    onClear={() => handleSourceSelect(0)}
                  />
                </div>

                {/* 3. Nút Thêm (+) ? cu?i hàng */}
                <div className="md:col-span-2 flex items-end md:justify-end">
                  <button
                    type="button"
                    aria-label="Toggle"
                    onClick={() => {
                      setCustomProductTouched(false);
                      setCustomMode((v) => !v);
                    }}
                    className={`mt-6 md:mt-0 inline-flex items-center justify-center w-10 h-10 rounded-md text-white ${
                      customMode
                        ? "bg-red-500 hover:bg-red-600"
                        : "bg-green-500 hover:bg-green-600"
                    }`}
                  >
                    {customMode ? (
                      <MinusCircleIcon className="h-6 w-6" aria-hidden="true" />
                    ) : (
                      <PlusCircleIcon className="h-6 w-6" aria-hidden="true" />
                    )}
                  </button>
                </div>

                {/* 4a. Inputs for custom new entries */}
                {customMode && (
                  <div className="md:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className={labelClass}>S?n Ph?m M?i</label>
                      <input
                        type="text"
                        name={ORDER_FIELDS.ID_PRODUCT}
                        value={(formData[ORDER_FIELDS.ID_PRODUCT] as string) || ""}
                        onChange={handleChange}
                        onBlur={() => setCustomProductTouched(true)}
                        className={inputClass}
                        placeholder="Nh?p Tên S?n Ph?m M?i"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Ngu?n M?i</label>
                      <input
                        type="text"
                        name={ORDER_FIELDS.SUPPLY}
                        value={(formData[ORDER_FIELDS.SUPPLY] as string) || ""}
                        onChange={handleChange}
                        className={inputClass}
                        placeholder="Nh?p Tên Ngu?n M?i"
                      />
                    </div>
                  </div>
                )}

                {/* 4b. Thông Tin S?n Ph?m: next row but same block */}
                <div className="md:col-span-12">
                  <label className={labelClass}>
                    Thông Tin S?n Ph?m <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name={ORDER_FIELDS.INFORMATION_ORDER}
                    value={formData[ORDER_FIELDS.INFORMATION_ORDER] || ""}
                    onChange={handleChange}
                    className={inputClass}
                    required
                  />
                </div>
              </div>
              {/* Ph?n 3: Th?i Gian & Giá Ti?n */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-6">
                  {/* Ngày Ðang Ký */}
                  <div>
                    <label className={labelClass}>Ngày Ðang Ký</label>
                    <input
                      type="text"
                      name={ORDER_FIELDS.ORDER_DATE}
                      value={(formData[ORDER_FIELDS.ORDER_DATE] as string) || ""}
                      readOnly
                      className={`${inputClass} ${readOnlyClass}`}
                    />
                  </div>
                  {/* S? Ngày Ðang Ký */}
                  <div>
                    <label className={labelClass}>S? Ngày Ðang Ký</label>
                    <input
                      type="text"
                      name={ORDER_FIELDS.DAYS}
                      value={(formData[ORDER_FIELDS.DAYS] as string) || ""}
                      readOnly
                      className={`${inputClass} ${readOnlyClass}`}
                    />
                  </div>
                  {/* Ngày H?t H?n */}
                  <div>
                    <label className={labelClass}>Ngày H?t H?n</label>
                  <input
                    type="text"
                    name={ORDER_FIELDS.ORDER_EXPIRED}
                    value={(formData[ORDER_FIELDS.ORDER_EXPIRED] as string) || ""}
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
                    value={(formData[ORDER_FIELDS.SLOT] as string) || ""}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>
                </div>

                <div className="space-y-6">
                  {/* Giá Nh?p (S? hi?n th? giá c?a Ngu?n du?c ch?n) */}
                  <div>
                    <label className={labelClass}>Giá Nh?p</label>
                    {customMode ? (
                      <input
                        type="text"
                        inputMode="numeric"
                        name={ORDER_FIELDS.COST}
                        value={Helpers.formatCurrencyPlain(
                          Number(formData[ORDER_FIELDS.COST] || 0)
                        )}
                        onChange={handlePriceInput(ORDER_FIELDS.COST)}
                        className={`${inputClass} font-semibold`}
                      />
                    ) : (
                      <input
                        type="text"
                        name={ORDER_FIELDS.COST}
                        value={Helpers.formatCurrency(
                          formData[ORDER_FIELDS.COST] || 0
                        )}
                        readOnly
                        className={`${inputClass} font-semibold ${readOnlyClass}`}
                      />
                    )}
                  </div>
                  {/* Giá Bán (S? hi?n th? giá tính toán t? giá nh?p cao nh?t) */}
                  <div>
                    <label className={labelClass}>Giá Bán</label>
                    {customMode ? (
                      <input
                        type="text"
                        inputMode="numeric"
                        name={ORDER_FIELDS.PRICE}
                        value={Helpers.formatCurrencyPlain(
                          Number(formData[ORDER_FIELDS.PRICE] || 0)
                        )}
                        onChange={handlePriceInput(ORDER_FIELDS.PRICE)}
                        className={`${inputClass} font-semibold text-green-700`}
                      />
                    ) : (
                      <input
                        type="text"
                        name={ORDER_FIELDS.PRICE}
                        value={
                          customerType === "MAVK" && !selectedSupplyId
                            ? ""
                            : Helpers.formatCurrency(
                                formData[ORDER_FIELDS.PRICE] || 0
                              )
                        }
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
                      value={formData[ORDER_FIELDS.NOTE] || ""}
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

        {/* Footer Modal - Nút hành d?ng */}
        <div className="p-5 border-t border-gray-200 bg-gray-50 flex justify-end sticky bottom-0 z-10">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-indigo-500/15 transition-colors shadow-sm mr-3"
          >
            H?y
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
            {isLoading ? "Ðang Tính Giá..." : "T?o Ðon Hàng"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateOrderModal;



