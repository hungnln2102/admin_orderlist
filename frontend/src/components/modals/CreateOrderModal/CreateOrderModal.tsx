// CreateOrderModal.tsx - split for readability, keeping behavior unchanged.
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  XMarkIcon,
  PlusCircleIcon,
  MinusCircleIcon,
} from "@heroicons/react/24/outline";
import { ORDER_CODE_OPTIONS, ORDER_FIELDS } from "../../../constants";
import * as Helpers from "../../../lib/helpers";
import SearchableSelect from "./SearchableSelect";
import {
  labelClass,
  inputClass,
  readOnlyClass,
  calculateExpirationDate,
} from "./helpers";
import useCreateOrderLogic from "./hooks/useCreateOrderLogic";
import { CreateOrderModalProps, Order } from "./types";

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
  const costValue = formData[ORDER_FIELDS.COST] as string | number | undefined;
  const priceValue = formData[ORDER_FIELDS.PRICE] as
    | string
    | number
    | undefined;
  const rawExpiryValue = useMemo(
    () => (formData[ORDER_FIELDS.ORDER_EXPIRED] as string) || "",
    [formData]
  );
  const registerDateDMY = useMemo(
    () => (formData[ORDER_FIELDS.ORDER_DATE] as string) || Helpers.getTodayDMY(),
    [formData]
  );
  const totalDays = useMemo(
    () => Number(formData[ORDER_FIELDS.DAYS] || 0) || 0,
    [formData]
  );
  const productOptions = useMemo(
    () =>
      products.map((p) => ({
        value: p.san_pham,
        label: p.san_pham,
      })),
    [products]
  );
  const supplyOptions = useMemo(
    () =>
      supplies.map((s) => ({
        value: s.id,
        label: s.supplier_name ?? s.source_name,
      })),
    [supplies]
  );

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

  const handleRegisterDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const nextDMY =
        Helpers.formatDateToDMY(e.target.value) || e.target.value || "";
      const computedExpiry =
        totalDays > 0 ? calculateExpirationDate(nextDMY, totalDays) : nextDMY;

      const patch: Partial<Order> = {
        [ORDER_FIELDS.ORDER_DATE]: nextDMY,
      };

      if (computedExpiry && computedExpiry !== "N/A") {
        patch[ORDER_FIELDS.ORDER_EXPIRED] = computedExpiry;
      } else if (totalDays <= 0 && nextDMY) {
        patch[ORDER_FIELDS.ORDER_EXPIRED] = nextDMY;
      }

      updateForm(patch);
    },
    [totalDays, updateForm]
  );

  useEffect(() => {
    if (!customMode || !customProductTouched) return;
    const months =
      Helpers.parseMonthsFromInfo(infoAValue) ||
      Helpers.parseMonthsFromInfo(infoBValue);
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

  useEffect(() => {
    if (!rawExpiryValue) return;

    const normalized = Helpers.formatDateToDMY(rawExpiryValue);

    if (!normalized && registerDateDMY && totalDays > 0) {
      const computed = calculateExpirationDate(registerDateDMY, totalDays);
      if (computed && computed !== "N/A" && computed !== rawExpiryValue) {
        updateForm({
          [ORDER_FIELDS.ORDER_EXPIRED]: computed,
        } as Partial<Order>);
      }
    } else if (normalized && normalized !== rawExpiryValue) {
      updateForm({
        [ORDER_FIELDS.ORDER_EXPIRED]: normalized,
      } as Partial<Order>);
    }
  }, [rawExpiryValue, registerDateDMY, totalDays, updateForm]);

  const readyToLoad = useMemo(() => {
    const prod = (formData[ORDER_FIELDS.ID_PRODUCT] as string) || "";
    const src = (formData[ORDER_FIELDS.SUPPLY] as string) || "";
    const info = (formData[ORDER_FIELDS.INFORMATION_ORDER] as string) || "";
    const customer = (formData[ORDER_FIELDS.CUSTOMER] as string) || "";
    return !!prod && !!src && !!info && !!customer;
  }, [formData]);

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
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/70 backdrop-blur-sm transition-opacity duration-300 p-2 sm:p-4">
      <div className="glass-panel border-white/10 rounded-[32px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] flex flex-col text-slate-100 overflow-hidden">
        <div className="p-6 sm:p-8 border-b border-white/5 sticky top-0 bg-[#0c1222]/80 backdrop-blur-xl z-20 flex justify-between items-center">
          <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Tạo Đơn Hàng Mới</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-300 hover:text-white transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <form onSubmit={handleSubmit}>
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-2xl bg-white/5 border border-white/5">
                <div>
                  <label className={labelClass}>Loại Khách Hàng</label>
                  <select
                    name="customer_type"
                    value={customerType}
                    onChange={handleCustomerTypeChange}
                    className={inputClass}
                  >
                    {ORDER_CODE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Mã Đơn Hàng</label>
                  <input
                    type="text"
                    name={ORDER_FIELDS.ID_ORDER}
                    value={(formData[ORDER_FIELDS.ID_ORDER] as string) || ""}
                    readOnly
                    className={`${inputClass} font-semibold ${readOnlyClass}`}
                  />
                </div>

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
                <div>
                  <label className={labelClass}>Link Liên Hệ</label>
                  <input
                    type="url"
                    name={ORDER_FIELDS.CONTACT}
                    value={(formData[ORDER_FIELDS.CONTACT] as string) || ""}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 border p-4 rounded-lg items-end">
                <div className="md:col-span-5">
                  <label className={labelClass}>
                    Sản Phẩm <span className="text-red-500">*</span>
                  </label>
                  <SearchableSelect
                    name={ORDER_FIELDS.ID_PRODUCT}
                    value={(formData[ORDER_FIELDS.ID_PRODUCT] as string) || ""}
                    options={productOptions}
                    placeholder="-- Chọn --"
                    onChange={(val) => handleProductSelect(String(val))}
                    onClear={() => handleProductSelect("")}
                    disabled={customMode}
                  />
                </div>

                <div className="md:col-span-5">
                  <label className={labelClass}>
                    Nguồn <span className="text-red-500">*</span>
                  </label>
                  <SearchableSelect
                    name={ORDER_FIELDS.SUPPLY}
                    value={selectedSupplyId ?? ""}
                    options={supplyOptions}
                    placeholder="-- Chọn --"
                    disabled={
                      customMode || !formData[ORDER_FIELDS.ID_PRODUCT]
                    }
                    onChange={(val) => handleSourceSelect(Number(val))}
                    onClear={() => handleSourceSelect(0)}
                  />
                </div>

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

                {customMode && (
                  <div className="md:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className={labelClass}>Sản Phẩm Mới</label>
                      <input
                        type="text"
                        name={ORDER_FIELDS.ID_PRODUCT}
                        value={(formData[ORDER_FIELDS.ID_PRODUCT] as string) || ""}
                        onChange={handleChange}
                        onBlur={() => setCustomProductTouched(true)}
                        className={inputClass}
                        placeholder="Nhập Tên Sản Phẩm Mới"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Nguồn Mới</label>
                      <input
                        type="text"
                        name={ORDER_FIELDS.SUPPLY}
                        value={(formData[ORDER_FIELDS.SUPPLY] as string) || ""}
                        onChange={handleChange}
                        className={inputClass}
                        placeholder="Nhập Tên Nguồn Mới"
                      />
                    </div>
                  </div>
                )}

                <div className="md:col-span-12">
                  <label className={labelClass}>
                    Thông Tin Sản Phẩm <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name={ORDER_FIELDS.INFORMATION_ORDER}
                    value={
                      (formData[ORDER_FIELDS.INFORMATION_ORDER] as string) || ""
                    }
                    onChange={handleChange}
                    className={inputClass}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <div>
                    <label className={labelClass}>Ngày Đăng Ký (dd/mm/yyyy)</label>
                    <input
                      type="text"
                      name={ORDER_FIELDS.ORDER_DATE}
                      value={registerDateDMY}
                      placeholder="dd/mm/yyyy"
                      onChange={handleRegisterDateChange}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Số Ngày Đăng Ký</label>
                    <input
                      type="text"
                      name={ORDER_FIELDS.DAYS}
                      value={(formData[ORDER_FIELDS.DAYS] as string) || ""}
                      readOnly
                      className={`${inputClass} ${readOnlyClass}`}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Ngày Hết Hạn</label>
                    <input
                      type="text"
                      name={ORDER_FIELDS.ORDER_EXPIRED}
                      value={(formData[ORDER_FIELDS.ORDER_EXPIRED] as string) || ""}
                      readOnly
                      className={`${inputClass} font-bold text-rose-400 ${readOnlyClass}`}
                    />
                  </div>
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
                  <div>
                    <label className={labelClass}>Giá Nhập</label>
                    {customMode ? (
                      <input
                        type="text"
                        inputMode="numeric"
                        name={ORDER_FIELDS.COST}
                        value={Helpers.formatCurrencyPlain(
                          Number(costValue ?? 0)
                        )}
                        onChange={handlePriceInput(ORDER_FIELDS.COST)}
                        className={`${inputClass} font-semibold`}
                      />
                    ) : (
                      <input
                        type="text"
                        name={ORDER_FIELDS.COST}
                        value={Helpers.formatCurrency(costValue ?? 0)}
                        readOnly
                        className={`${inputClass} font-semibold ${readOnlyClass}`}
                      />
                    )}
                  </div>
                  <div>
                    <label className={labelClass}>Giá Bán</label>
                    {customMode ? (
                      <input
                        type="text"
                        inputMode="numeric"
                        name={ORDER_FIELDS.PRICE}
                        value={Helpers.formatCurrencyPlain(
                          Number(priceValue ?? 0)
                        )}
                        onChange={handlePriceInput(ORDER_FIELDS.PRICE)}
                        className={`${inputClass} font-bold text-emerald-400`}
                      />
                    ) : (
                      <input
                        type="text"
                        name={ORDER_FIELDS.PRICE}
                        value={Helpers.formatCurrency(priceValue ?? 0)}
                        readOnly
                        className={`${inputClass} font-bold text-emerald-400 ${readOnlyClass}`}
                      />
                    )}
                  </div>

                  <div>
                    <label className={labelClass}>Ghi Chú</label>
                    <textarea
                      name={ORDER_FIELDS.NOTE}
                      value={(formData[ORDER_FIELDS.NOTE] as string) || ""}
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

        <div className="p-6 sm:p-8 border-t border-white/5 bg-[#0c1222]/50 backdrop-blur-xl flex justify-end sticky bottom-0 z-20">
          <button
            type="button"
            onClick={onClose}
            className="px-8 py-2.5 text-sm font-bold text-slate-300 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all shadow-lg mr-4"
          >
            Hủy
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            className={`px-8 py-2.5 text-sm font-bold text-white rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] ${
              isFormComplete && !isLoading
                ? "bg-emerald-500 hover:bg-emerald-600 hover:scale-[1.02] active:scale-[0.98]"
                : "bg-slate-700 opacity-50 cursor-not-allowed"
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
