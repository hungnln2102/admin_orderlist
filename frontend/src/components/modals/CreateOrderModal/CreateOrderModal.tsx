// CreateOrderModal.tsx - split for readability, keeping behavior unchanged.
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  XMarkIcon,
  PlusCircleIcon,
  MinusCircleIcon,
} from "@heroicons/react/24/outline";
import { ORDER_FIELDS } from "../../../constants";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm transition-opacity duration-300">
      <div className="bg-slate-900/90 border border-white/10 rounded-lg shadow-[0_18px_48px_-28px_rgba(0,0,0,0.8)] w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col text-slate-100">
        <div className="p-5 border-b border-slate-700 sticky top-0 bg-slate-800/80 z-10 flex justify-between items-center">
          <h3 className="text-xl font-semibold text-white">Tạo Đơn Hàng Mới</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-300 hover:text-white transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border p-4 rounded-lg bg-gray-50">
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
                    <option value="MAVK">Khuyến Mãi</option>
                    <option value="MAVT">Quà Tặng</option>
                    <option value="MAVN">Nhập Hàng</option>
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

                <div className="md:col-span-5">
                  <label className={labelClass}>
                    Nguồn <span className="text-red-500">*</span>
                  </label>
                  <SearchableSelect
                    name={ORDER_FIELDS.SUPPLY}
                    value={selectedSupplyId ?? ""}
                    options={supplies.map((s) => ({
                      value: s.id,
                      label: s.supplier_name ?? s.source_name,
                    }))}
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
                    <label className={labelClass}>Ngày Đăng Ký</label>
                    <input
                      type="text"
                      name={ORDER_FIELDS.ORDER_DATE}
                      value={(formData[ORDER_FIELDS.ORDER_DATE] as string) || ""}
                      readOnly
                      className={`${inputClass} ${readOnlyClass}`}
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
                      className={`${inputClass} font-medium text-red-600 ${readOnlyClass}`}
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
                        className={`${inputClass} font-semibold text-green-700`}
                      />
                    ) : (
                      <input
                        type="text"
                        name={ORDER_FIELDS.PRICE}
                        value={Helpers.formatCurrency(priceValue ?? 0)}
                        readOnly
                        className={`${inputClass} font-semibold text-green-700 ${readOnlyClass}`}
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

        <div className="p-5 border-t border-gray-200 bg-gray-50 flex justify-end sticky bottom-0 z-10">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-indigo-500/15 transition-colors shadow-sm mr-3"
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
