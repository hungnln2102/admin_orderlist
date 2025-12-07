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
import { API_BASE_URL } from "../lib/api";

const API_BASE = API_BASE_URL;

type Order = Omit<ApiOrder, "cost" | "price"> & {
  cost: number | string;
  price: number | string;
};

interface Supply extends Helpers.SupplyLike {
  id?: number;
  source_name?: string;
  name?: string;
}

interface SupplyPrice extends Helpers.SupplyPriceLike {
  id?: number;
  source_id?: number;
  price?: number;
  source_name?: string;
}

interface EditOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onSave: (updatedOrder: Order) => Promise<void> | void;
}

const inputClass =
  "w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-all";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";
const readOnlyClass = "bg-gray-100 cursor-not-allowed text-gray-500";

const formatCurrency = (value: number | string) => {
  const num = Number(value) || 0;
  return num.toLocaleString("vi-VN") + " d";
};

const normalizeDateLike = (
  value: unknown
): string | number | Date | null => {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    value instanceof Date
  ) {
    return value;
  }
  return null;
};

const useEditOrderLogic = (order: Order | null, isOpen: boolean) => {
  const [formData, setFormData] = useState<Order | null>(null);
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [supplyPrices, setSupplyPrices] = useState<SupplyPrice[]>([]);
  const baseOrderRef = useRef<Order | null>(order);
  const [isCustomSupply, setIsCustomSupply] = useState(false);

  const getCurrentSupplyOption = useCallback((): Supply | null => {
    const currentSupplyName =
      (baseOrderRef.current?.[ORDER_FIELDS.SUPPLY as keyof Order] as string) ||
      "";
    if (!currentSupplyName.trim()) return null;
    return { id: -1, source_name: currentSupplyName };
  }, []);

  const mergeCurrentSupply = useCallback(
    (list: Supply[]): Supply[] => {
      const currentSupply = getCurrentSupplyOption();
      if (currentSupply) {
        const exists = list.some(
          (item) => item.source_name === currentSupply.source_name
        );
        if (!exists) {
          return [currentSupply, ...list];
        }
      }
      return list;
    },
    [getCurrentSupplyOption]
  );

  const fetchSuppliesForProduct = useCallback(async (productName: string) => {
    if (!productName) {
      const merged = mergeCurrentSupply([]);
      setSupplies(merged);
      return merged;
    }
    try {
      const response = await fetch(
        `${API_BASE}${API_ENDPOINTS.SUPPLIES_BY_PRODUCT(productName)}`,
        { credentials: "include" }
      );
      if (!response.ok) throw new Error("Lỗi tải danh sách nguồn.");
      const data: Supply[] = await response.json();
      const merged = mergeCurrentSupply(data);
      setSupplies(merged);
      return merged;
    } catch (error) {
      console.error("Lỗi khi fetch supplies cho sản phẩm:", error);
      const merged = mergeCurrentSupply([]);
      setSupplies(merged);
      return merged;
    }
  }, [mergeCurrentSupply]);

  const fetchSupplyPricesForProduct = useCallback(
    async (productName: string) => {
      if (!productName) {
        setSupplyPrices([]);
        return [];
      }
      try {
        const response = await fetch(
          `${API_BASE}${API_ENDPOINTS.SUPPLY_PRICES_BY_PRODUCT_NAME(
            productName
          )}`,
          { credentials: "include" }
        );
        if (!response.ok) throw new Error("Lỗi tải danh sách giá nguồn.");
        const data: SupplyPrice[] = await response.json();
        setSupplyPrices(data);
        return data;
      } catch (error) {
        console.error("Lỗi khi fetch giá nguồn cho sản phẩm:", error);
        setSupplyPrices([]);
        return [];
      }
    },
    []
  );

  useEffect(() => {
    if (isOpen && order) {
      const normalized: Order = {
        ...order,
        cost: Number(order.cost ?? 0),
        price: Number(order.price ?? 0),
      };
      setFormData(normalized);
      baseOrderRef.current = normalized;
      setSupplies((prev) => mergeCurrentSupply(prev));
      const productName = order.id_product as string;
      if (productName) {
        fetchSuppliesForProduct(productName);
        fetchSupplyPricesForProduct(productName);
      }
      setIsCustomSupply(false);
    } else if (!isOpen) {
      setFormData(null);
      setSupplies([]);
      setSupplyPrices([]);
      setIsCustomSupply(false);
    }
  }, [
    isOpen,
    order,
    fetchSuppliesForProduct,
    fetchSupplyPricesForProduct,
    mergeCurrentSupply,
  ]);

  useEffect(() => {
    if (!isOpen || !formData?.id_product) return;
    const productName = formData.id_product as string;
    fetchSuppliesForProduct(productName);
    fetchSupplyPricesForProduct(productName);
  }, [
    isOpen,
    formData?.id_product,
    fetchSuppliesForProduct,
    fetchSupplyPricesForProduct,
  ]);

  const setFieldValue = useCallback(
    <K extends keyof Order>(key: K, value: Order[K]) => {
      setFormData((prev) => (prev ? { ...prev, [key]: value } : prev));
    },
    []
  );

  const handleSupplySelect = useCallback(
    (supplyId: number) => {
      const selected = supplies.find((s) => s.id === supplyId);
      const supplyName =
        selected?.source_name ||
        (formData?.[ORDER_FIELDS.SUPPLY as keyof Order] as string) ||
        "";
      setIsCustomSupply(false);
      setFieldValue(
        ORDER_FIELDS.SUPPLY as keyof Order,
        (supplyName || "") as Order[keyof Order]
      );
      const matchedPrice =
        Helpers.getImportPriceBySupplyName(
          supplyName,
          supplyPrices,
          supplies
        ) ??
        supplyPrices.find((p) => p.source_id === supplyId)?.price ??
        null;
      const normalizedPrice = Number(matchedPrice);
      if (Number.isFinite(normalizedPrice)) {
        setFieldValue(
          ORDER_FIELDS.COST as keyof Order,
          normalizedPrice as Order[typeof ORDER_FIELDS.COST]
        );
      } else if (baseOrderRef.current) {
        const fallbackCost = Number(
          baseOrderRef.current[ORDER_FIELDS.COST as keyof Order] || 0
        );
        setFieldValue(
          ORDER_FIELDS.COST as keyof Order,
          fallbackCost as Order[typeof ORDER_FIELDS.COST]
        );
      }
    },
    [formData, setFieldValue, supplies, supplyPrices]
  );

  const handleCustomSupplyChange = useCallback(
    (value: string) => {
      setIsCustomSupply(true);
      setFieldValue(
        ORDER_FIELDS.SUPPLY as keyof Order,
        value as Order[keyof Order]
      );
    },
    [setFieldValue]
  );

  const toggleCustomSupply = useCallback(() => {
    setIsCustomSupply((prev) => {
      const next = !prev;
      if (!next) {
        setFieldValue(
          ORDER_FIELDS.SUPPLY as keyof Order,
          "" as Order[typeof ORDER_FIELDS.SUPPLY]
        );
      }
      return next;
    });
  }, [setFieldValue]);

  const resetForm = useCallback(() => {
    setFormData(baseOrderRef.current);
    const productName = baseOrderRef.current?.id_product as string | undefined;
    if (productName) {
      fetchSuppliesForProduct(productName);
      fetchSupplyPricesForProduct(productName);
    }
  }, [fetchSuppliesForProduct, fetchSupplyPricesForProduct]);

  return {
    formData,
    supplies,
    isCustomSupply,
    supplyPrices,
    handleSupplySelect,
    resetForm,
    setFieldValue,
    handleCustomSupplyChange,
    toggleCustomSupply,
  };
};

const EditOrderModal: React.FC<EditOrderModalProps> = ({
  isOpen,
  onClose,
  order,
  onSave,
}) => {
  const {
    formData,
    supplies,
    isCustomSupply,
    handleSupplySelect,
    resetForm,
    setFieldValue,
    handleCustomSupplyChange,
    toggleCustomSupply,
  } = useEditOrderLogic(order, isOpen);
  const [isSaving, setIsSaving] = useState(false);

  const stringField = (key: keyof Order): string =>
    formData ? String(formData[key] ?? "") : "";
  const numericField = (key: keyof Order): number =>
    formData ? Number(formData[key] ?? 0) || 0 : 0;

  const handleInputChange = useCallback(
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >
    ) => {
      const target = e.target;
      const { name, value } = target;
      const nextValue =
        target instanceof HTMLInputElement && target.type === "checkbox"
          ? (target.checked as unknown as Order[keyof Order])
          : (value as unknown as Order[keyof Order]);
      setFieldValue(name as keyof Order, nextValue);
    },
    [setFieldValue]
  );

  const supplySelectValue = useMemo(() => {
    if (!formData) return "";
    const found = supplies.find(
      (s) => s.source_name === formData[ORDER_FIELDS.SUPPLY]
    );
    return found ? String(found.id) : "";
  }, [formData, supplies]);

  const orderDateDisplay = useMemo(() => {
    if (!formData) return "";
    const raw = normalizeDateLike(
      formData.registration_date_display ||
        formData.registration_date ||
        formData[ORDER_FIELDS.ORDER_DATE]
    );
    return Helpers.formatDateToDMY(raw) || String(raw || "");
  }, [formData]);

  const orderExpiredDisplay = useMemo(() => {
    if (!formData) return "";
    const raw = normalizeDateLike(
      formData.expiry_date_display ||
        formData.expiry_date ||
        formData[ORDER_FIELDS.ORDER_EXPIRED]
    );
    return Helpers.formatDateToDMY(raw) || String(raw || "");
  }, [formData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;
    setIsSaving(true);
    try {
      await onSave(formData);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !formData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900/90 border border-white/10 text-slate-100 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-700 px-6 py-4 sticky top-0 bg-slate-800/80 z-10">
          <h3 className="text-lg font-semibold text-white">
            Chỉnh sửa đơn hàng
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-300 hover:text-white"
            aria-label="Đóng"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Mã đơn hàng</label>
              <input
                type="text"
                name={ORDER_FIELDS.ID_ORDER}
                value={stringField(ORDER_FIELDS.ID_ORDER as keyof Order)}
                readOnly
                disabled
                className={`${inputClass} ${readOnlyClass}`}
              />
            </div>
            <div>
              <label className={labelClass}>Khách hàng</label>
              <input
                type="text"
                name={ORDER_FIELDS.CUSTOMER}
                value={stringField(ORDER_FIELDS.CUSTOMER as keyof Order)}
                readOnly
                disabled
                className={`${inputClass} ${readOnlyClass}`}
              />
            </div>
            <div>
              <label className={labelClass}>Liên hệ</label>
              <input
                type="text"
                name={ORDER_FIELDS.CONTACT}
                value={stringField(ORDER_FIELDS.CONTACT as keyof Order)}
                readOnly
                disabled
                className={`${inputClass} ${readOnlyClass}`}
              />
            </div>
            <div>
              <label className={labelClass}>Slot</label>
              <input
                type="text"
                name={ORDER_FIELDS.SLOT}
                value={stringField(ORDER_FIELDS.SLOT as keyof Order)}
                onChange={handleInputChange}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Sản phẩm</label>
              <input
                type="text"
                name={ORDER_FIELDS.ID_PRODUCT}
                value={stringField(ORDER_FIELDS.ID_PRODUCT as keyof Order)}
                readOnly
                disabled
                className={`${inputClass} ${readOnlyClass}`}
              />
            </div>
            <div>
              <label className={labelClass}>Nguồn</label>
              <div className="flex items-center gap-2">
                {isCustomSupply ? (
                  <input
                    type="text"
                    name={ORDER_FIELDS.SUPPLY}
                    value={stringField(ORDER_FIELDS.SUPPLY as keyof Order)}
                    onChange={(e) => handleCustomSupplyChange(e.target.value)}
                    className={inputClass}
                    placeholder="Nhập nguồn mới"
                  />
                ) : (
                  <select
                    name={ORDER_FIELDS.SUPPLY}
                    value={supplySelectValue}
                    onChange={(e) => handleSupplySelect(Number(e.target.value))}
                    className={inputClass}
                  >
                    <option value="">-- Giữ nguyên hoặc chọn --</option>
                    {supplies.map((supply) => (
                      <option key={supply.id} value={supply.id}>
                        {supply.source_name}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  type="button"
                  onClick={toggleCustomSupply}
                  className={`inline-flex items-center justify-center w-10 h-10 rounded-md text-white ${
                    isCustomSupply
                      ? "bg-red-500 hover:bg-red-600"
                      : "bg-green-500 hover:bg-green-600"
                  }`}
                  aria-label={isCustomSupply ? "Tắt nhập nguồn mới" : "Nhập nguồn mới"}
                >
                  {isCustomSupply ? (
                    <MinusCircleIcon className="h-6 w-6" aria-hidden="true" />
                  ) : (
                    <PlusCircleIcon className="h-6 w-6" aria-hidden="true" />
                  )}
                </button>
              </div>
              {!supplies.length && !isCustomSupply && (
                <p className="mt-1 text-xs text-gray-500">
                  Không có danh sách nguồn cho sản phẩm hiện tại.
                </p>
              )}
            </div>
          </div>

          <div>
            <label className={labelClass}>Thông tin đơn hàng</label>
            <input
              type="text"
              name={ORDER_FIELDS.INFORMATION_ORDER}
              value={stringField(ORDER_FIELDS.INFORMATION_ORDER as keyof Order)}
              onChange={handleInputChange}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Ngày đăng ký</label>
              <input
                type="text"
                name={ORDER_FIELDS.ORDER_DATE}
                value={orderDateDisplay}
                readOnly
                disabled
                className={`${inputClass} ${readOnlyClass}`}
              />
            </div>
            <div>
              <label className={labelClass}>Số ngày</label>
              <input
                type="text"
                name={ORDER_FIELDS.DAYS}
                value={stringField(ORDER_FIELDS.DAYS as keyof Order)}
                readOnly
                disabled
                className={`${inputClass} ${readOnlyClass}`}
              />
            </div>
            <div>
              <label className={labelClass}>Ngày hết hạn</label>
              <input
                type="text"
                name={ORDER_FIELDS.ORDER_EXPIRED}
                value={orderExpiredDisplay}
                readOnly
                disabled
                className={`${inputClass} ${readOnlyClass}`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Giá nhập</label>
              <input
                type="text"
                name={ORDER_FIELDS.COST}
                value={formatCurrency(
                  numericField(ORDER_FIELDS.COST as keyof Order)
                )}
                readOnly
                disabled
                className={`${inputClass} ${readOnlyClass} font-semibold`}
              />
            </div>
            <div>
              <label className={labelClass}>Giá bán</label>
              <input
                type="text"
                name={ORDER_FIELDS.PRICE}
                value={formatCurrency(
                  numericField(ORDER_FIELDS.PRICE as keyof Order)
                )}
                readOnly
                disabled
                className={`${inputClass} ${readOnlyClass} font-semibold text-green-700`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div>
              <label className={labelClass}>Trạng thái</label>
              <input
                type="text"
                name={ORDER_FIELDS.STATUS}
                value={stringField(ORDER_FIELDS.STATUS as keyof Order)}
                readOnly
                disabled
                className={`${inputClass} ${readOnlyClass}`}
              />
            </div>
            <div className="flex items-center gap-3 mt-6 md:mt-8">
              <label className="text-sm font-medium text-gray-700 mb-0">
                Kiểm tra
              </label>
              <input
                type="checkbox"
                className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                checked={Boolean(formData[ORDER_FIELDS.CHECK_FLAG])}
                disabled
                readOnly
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Ghi chú</label>
            <textarea
              name={ORDER_FIELDS.NOTE}
              value={stringField(ORDER_FIELDS.NOTE as keyof Order)}
              rows={4}
              onChange={handleInputChange}
              className={inputClass}
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
            >
              Hoàn tác
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
            >
              Đóng
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className={`px-5 py-2 rounded-lg text-white font-medium transition-colors ${
                isSaving
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditOrderModal;