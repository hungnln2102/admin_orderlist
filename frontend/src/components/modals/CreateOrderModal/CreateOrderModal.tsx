// CreateOrderModal.tsx - split for readability, keeping behavior unchanged.
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ListBulletIcon,
  PencilSquareIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  ORDER_CODE_OPTIONS,
  ORDER_CODE_PREFIXES,
  ORDER_FIELDS,
} from "../../../constants";
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
    clearSelectedSupplySelection,
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
    () => (formData[ORDER_FIELDS.EXPIRY_DATE] as string) || "",
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
  const canSelectCustomerType = useMemo(() => {
    const hasProduct = Boolean(formData[ORDER_FIELDS.ID_PRODUCT]);
    const hasSupply = Boolean(
      selectedSupplyId !== null ||
        ((formData[ORDER_FIELDS.SUPPLY] as string) || "").trim()
    );
    return hasProduct && hasSupply;
  }, [formData, selectedSupplyId]);

  const currentProductPctPromo = useMemo(() => {
    const productName = (formData[ORDER_FIELDS.ID_PRODUCT] as string) || "";
    if (!productName) return null;
    const product = products.find(
      (p) => p.san_pham.toLowerCase() === productName.toLowerCase()
    );
    return product?.pct_promo ?? null;
  }, [products, formData]);

  const hasPromoPrice = useMemo(() => {
    if (currentProductPctPromo === null || currentProductPctPromo === undefined) {
      return false;
    }
    const promoValue = Number(currentProductPctPromo);
    return Number.isFinite(promoValue) && promoValue > 0;
  }, [currentProductPctPromo]);

  const filteredCustomerTypeOptions = useMemo(() => {
    return ORDER_CODE_OPTIONS.filter((option) => {
      const value = option.value;
      if (hasPromoPrice) {
        return value !== ORDER_CODE_PREFIXES.RETAIL;
      }
      return value !== ORDER_CODE_PREFIXES.PROMO;
    });
  }, [hasPromoPrice]);

  useEffect(() => {
    if (hasPromoPrice && customerType === ORDER_CODE_PREFIXES.RETAIL) {
      handleCustomerTypeChange({
        target: { value: ORDER_CODE_PREFIXES.PROMO },
      } as unknown as React.ChangeEvent<HTMLSelectElement>);
      return;
    }

    if (!hasPromoPrice && customerType === ORDER_CODE_PREFIXES.PROMO) {
      handleCustomerTypeChange({
        target: { value: ORDER_CODE_PREFIXES.RETAIL },
      } as unknown as React.ChangeEvent<HTMLSelectElement>);
      return;
    }

    const isCurrentTypeValid = filteredCustomerTypeOptions.some(
      (opt) => opt.value === customerType
    );
    if (!isCurrentTypeValid && filteredCustomerTypeOptions.length > 0) {
      handleCustomerTypeChange({
        target: { value: filteredCustomerTypeOptions[0].value },
      } as unknown as React.ChangeEvent<HTMLSelectElement>);
    }
  }, [
    filteredCustomerTypeOptions,
    customerType,
    handleCustomerTypeChange,
    hasPromoPrice,
  ]);

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
        patch[ORDER_FIELDS.EXPIRY_DATE] = computedExpiry;
      } else if (totalDays <= 0 && nextDMY) {
        patch[ORDER_FIELDS.EXPIRY_DATE] = nextDMY;
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
        [ORDER_FIELDS.EXPIRY_DATE]: end,
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
          [ORDER_FIELDS.EXPIRY_DATE]: computed,
        } as Partial<Order>);
      }
    } else if (normalized && normalized !== rawExpiryValue) {
      updateForm({
        [ORDER_FIELDS.EXPIRY_DATE]: normalized,
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

  const panelClass =
    "relative overflow-hidden rounded-[20px] border border-slate-700/80 bg-slate-900/96 p-4 sm:p-5 shadow-[0_12px_30px_-18px_rgba(0,0,0,0.9)]";

  const panelTitleClass = "text-lg sm:text-xl font-black text-slate-50 tracking-tight";
  const panelSubtitleClass = "mt-1 text-xs text-slate-300/90";

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-slate-950/92 backdrop-blur-sm p-3 sm:p-4">
      <div className="relative w-full max-w-5xl max-h-[84vh] overflow-hidden rounded-[24px] border border-slate-600/70 bg-slate-900 text-slate-100 shadow-[0_28px_70px_-25px_rgba(2,6,23,0.95)] flex flex-col">
        <div className="shrink-0 px-4 sm:px-5 py-3 border-b border-slate-700/70 bg-slate-900 flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.26em] text-cyan-200/70 font-bold">
              Order Builder
            </p>
            <h3 className="mt-1 text-base sm:text-lg font-black text-white tracking-tight">
              Tạo Đơn Hàng Mới
            </h3>
            <p className="mt-2 text-xs text-slate-300/75">
              Hoàn thiện thông tin khách hàng, sản phẩm và chi phí trong một
              form duy nhất.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="mt-1 inline-flex items-center justify-center h-11 w-11 rounded-xl border border-slate-500/70 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
            aria-label="Close"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 sm:px-4 lg:px-4 py-3">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
              <section className={panelClass}>
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <h4 className={panelTitleClass}>
                      Thông tin sản phẩm & nguồn cung cấp
                    </h4>
                    <p className={panelSubtitleClass}>
                      Chọn dữ liệu nền hoặc chuyển qua chế độ nhập tay.
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={
                      customMode ? "Switch to select mode" : "Switch to manual mode"
                    }
                    onClick={() => {
                      setCustomProductTouched(false);
                      setCustomMode((v) => {
                        const next = !v;
                        if (next) {
                          clearSelectedSupplySelection();
                        }
                        return next;
                      });
                    }}
                    className={`inline-flex items-center justify-center h-10 w-10 rounded-xl border transition-colors ${
                      customMode
                        ? "border-amber-400/45 bg-amber-500/20 text-amber-100 hover:bg-amber-500/30"
                        : "border-cyan-400/45 bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/25"
                    }`}
                    title={customMode ? "Chọn từ danh sách" : "Nhập tay"}
                  >
                    {customMode ? (
                      <ListBulletIcon className="h-5 w-5" aria-hidden="true" />
                    ) : (
                      <PencilSquareIcon className="h-5 w-5" aria-hidden="true" />
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className={labelClass}>Sản phẩm</label>
                    {customMode ? (
                      <input
                        type="text"
                        name={ORDER_FIELDS.ID_PRODUCT}
                        value={(formData[ORDER_FIELDS.ID_PRODUCT] as string) || ""}
                        onChange={(e) => {
                          clearSelectedSupplySelection();
                          handleChange(e);
                        }}
                        onBlur={() => setCustomProductTouched(true)}
                        className={inputClass}
                        placeholder="Nhập tên sản phẩm"
                      />
                    ) : (
                      <SearchableSelect
                        name={ORDER_FIELDS.ID_PRODUCT}
                        value={(formData[ORDER_FIELDS.ID_PRODUCT] as string) || ""}
                        options={productOptions}
                        placeholder="-- Chọn --"
                        onChange={(val) => handleProductSelect(String(val))}
                        onClear={() => handleProductSelect("")}
                      />
                    )}
                  </div>
                  <div>
                    <label className={labelClass}>Nguồn</label>
                    {customMode ? (
                      <input
                        type="text"
                        name={ORDER_FIELDS.SUPPLY}
                        value={(formData[ORDER_FIELDS.SUPPLY] as string) || ""}
                        onChange={(e) => {
                          clearSelectedSupplySelection();
                          handleChange(e);
                        }}
                        className={inputClass}
                        placeholder="Nhập nguồn"
                      />
                    ) : (
                      <SearchableSelect
                        name={ORDER_FIELDS.SUPPLY}
                        value={selectedSupplyId ?? ""}
                        options={supplyOptions}
                        placeholder="-- Chọn --"
                        disabled={!formData[ORDER_FIELDS.ID_PRODUCT]}
                        onChange={(val) => handleSourceSelect(Number(val))}
                        onClear={() => handleSourceSelect(0)}
                      />
                    )}
                  </div>
                  <div className="md:max-w-sm">
                    <label className={labelClass}>Loại khách hàng</label>
                    <select
                      name="customer_type"
                      value={customerType}
                      onChange={handleCustomerTypeChange}
                      className={inputClass}
                      disabled={!canSelectCustomerType}
                    >
                      {filteredCustomerTypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {!canSelectCustomerType && (
                      <p className="mt-2 text-xs text-slate-400">
                        Chọn sản phẩm và nguồn trước khi chọn loại khách.
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-white/10">
                  <label className={labelClass}>Ghi chú</label>
                  <textarea
                    name={ORDER_FIELDS.NOTE}
                    value={(formData[ORDER_FIELDS.NOTE] as string) || ""}
                    onChange={handleChange}
                    rows={4}
                    className={`${inputClass} min-h-[110px]`}
                  />
                </div>
              </section>

              <section className={panelClass}>
                <div className="mb-4">
                  <h4 className={panelTitleClass}>Thông tin khách hàng & đơn hàng</h4>
                  <p className={panelSubtitleClass}>
                    Nhập thông tin liên hệ và mô tả đơn hàng cần xử lý.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>
                      Tên khách hàng <span className="text-rose-400">*</span>
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
                    <label className={labelClass}>Link liên hệ</label>
                    <input
                      type="url"
                      name={ORDER_FIELDS.CONTACT}
                      value={(formData[ORDER_FIELDS.CONTACT] as string) || ""}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </div>
                  <div className="md:max-w-sm">
                    <label className={labelClass}>Slot</label>
                    <input
                      type="text"
                      name={ORDER_FIELDS.SLOT}
                      value={(formData[ORDER_FIELDS.SLOT] as string) || ""}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelClass}>
                      Thông tin sản phẩm <span className="text-rose-400">*</span>
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
              </section>

              <section className={`${panelClass} lg:col-span-2`}>
                <div className="mb-4">
                  <h4 className={panelTitleClass}>Chi phí & thời hạn đơn hàng</h4>
                  <p className={panelSubtitleClass}>
                    Theo dõi ngày hiệu lực và giá trị tài chính của đơn hàng.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  <div>
                    <label className={labelClass}>Ngày đăng ký (dd/mm/yyyy)</label>
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
                    <label className={labelClass}>Số ngày đăng ký</label>
                    <input
                      type="text"
                      name={ORDER_FIELDS.DAYS}
                      value={(formData[ORDER_FIELDS.DAYS] as string) || ""}
                      readOnly
                      className={`${inputClass} ${readOnlyClass}`}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Ngày hết hạn</label>
                    <input
                      type="text"
                      name={ORDER_FIELDS.EXPIRY_DATE}
                      value={(formData[ORDER_FIELDS.EXPIRY_DATE] as string) || ""}
                      readOnly
                      className={`${inputClass} font-black text-rose-300 ${readOnlyClass}`}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Giá nhập</label>
                    {customMode ? (
                      <input
                        type="text"
                        inputMode="numeric"
                        name={ORDER_FIELDS.COST}
                        value={Helpers.formatCurrencyPlain(Number(costValue ?? 0))}
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
                    <label className={labelClass}>Giá bán</label>
                    {customMode ? (
                      <input
                        type="text"
                        inputMode="numeric"
                        name={ORDER_FIELDS.PRICE}
                        value={Helpers.formatCurrencyPlain(Number(priceValue ?? 0))}
                        onChange={handlePriceInput(ORDER_FIELDS.PRICE)}
                        className={`${inputClass} font-black text-emerald-300`}
                      />
                    ) : (
                      <input
                        type="text"
                        name={ORDER_FIELDS.PRICE}
                        value={Helpers.formatCurrency(priceValue ?? 0)}
                        readOnly
                        className={`${inputClass} font-black text-emerald-300 ${readOnlyClass}`}
                      />
                    )}
                  </div>
                </div>
              </section>
            </div>
          </form>
        </div>

        <div className="shrink-0 px-4 sm:px-6 lg:px-8 py-3 border-t border-slate-700/70 bg-slate-900 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-bold text-slate-100 bg-slate-800 border border-slate-600 rounded-xl hover:bg-slate-700 transition-colors"
          >
            Hủy
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            className={`px-7 py-2.5 text-sm font-black text-white rounded-xl transition-all ${
              isFormComplete && !isLoading
                ? "bg-emerald-500 hover:bg-emerald-400 shadow-[0_14px_30px_-14px_rgba(16,185,129,0.75)] hover:-translate-y-0.5"
                : "bg-slate-700/80 opacity-60 cursor-not-allowed"
            }`}
            disabled={!isFormComplete || isLoading}
          >
            {isLoading ? "Đang tính giá..." : "Tạo Đơn Hàng"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateOrderModal;

