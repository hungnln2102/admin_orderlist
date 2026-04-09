// CreateOrderModal.tsx - split for readability, keeping behavior unchanged.
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import {
  ORDER_CODE_OPTIONS,
  ORDER_CODE_PREFIXES,
  ORDER_FIELDS,
} from "../../../constants";
import * as Helpers from "../../../lib/helpers";
import {
  calculateExpirationDate,
} from "./helpers";
import useCreateOrderLogic from "./hooks/useCreateOrderLogic";
import { CreateOrderModalProps, Order } from "./types";
import { CreateOrderCustomerSection } from "./components/CreateOrderCustomerSection";
import { CreateOrderPricingSection } from "./components/CreateOrderPricingSection";
import { CreateOrderProductSection } from "./components/CreateOrderProductSection";

/** Chỉ coi là đủ khi đúng dd/mm/yyyy (tránh parse lệch khi đang gõ). */
const isCompleteDMY = (value: string): boolean =>
  /^\d{2}\/\d{2}\/\d{4}$/.test((value || "").trim());

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
      products
        .filter((p) => p.is_active !== false)
        .map((p) => ({
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

  const handleExpiryDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value || "";
      const patch: Partial<Order> = {
        [ORDER_FIELDS.EXPIRY_DATE]: raw,
      };

      const regRaw = (formData[ORDER_FIELDS.ORDER_DATE] as string) || "";
      if (isCompleteDMY(raw) && isCompleteDMY(regRaw)) {
        const normExpiry = Helpers.formatDateToDMY(raw) || raw;
        const normReg = Helpers.formatDateToDMY(regRaw) || regRaw;
        const days = Helpers.inclusiveDaysBetween(normReg, normExpiry);
        if (Number.isFinite(days) && days > 0) {
          patch[ORDER_FIELDS.EXPIRY_DATE] = normExpiry;
          patch[ORDER_FIELDS.DAYS] = String(days);
        }
      }

      updateForm(patch);
    },
    [formData, updateForm]
  );

  const handleExpiryDateBlur = useCallback(() => {
    const raw = (formData[ORDER_FIELDS.EXPIRY_DATE] as string) || "";
    const normalized = Helpers.formatDateToDMY(raw);
    const nextExpiry = normalized || raw;
    const patch: Partial<Order> = {
      [ORDER_FIELDS.EXPIRY_DATE]: nextExpiry,
    };
    const regRaw = (formData[ORDER_FIELDS.ORDER_DATE] as string) || "";
    const normReg = Helpers.formatDateToDMY(regRaw) || regRaw;
    if (nextExpiry && normReg) {
      const days = Helpers.inclusiveDaysBetween(normReg, nextExpiry);
      if (Number.isFinite(days) && days > 0) {
        patch[ORDER_FIELDS.DAYS] = String(days);
      }
    }
    updateForm(patch);
  }, [formData, updateForm]);

  const handleRegisterDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value || "";
      const patch: Partial<Order> = {
        [ORDER_FIELDS.ORDER_DATE]: raw,
      };

      if (isCompleteDMY(raw)) {
        const normalized = Helpers.formatDateToDMY(raw) || raw;
        if (totalDays > 0) {
          const computedExpiry = calculateExpirationDate(normalized, totalDays);
          if (computedExpiry && computedExpiry !== "N/A") {
            patch[ORDER_FIELDS.EXPIRY_DATE] = computedExpiry;
          }
        } else {
          patch[ORDER_FIELDS.EXPIRY_DATE] = normalized;
        }
      }

      updateForm(patch);
    },
    [totalDays, updateForm]
  );

  const handleRegisterDateBlur = useCallback(() => {
    const raw = (formData[ORDER_FIELDS.ORDER_DATE] as string) || "";
    const normalized = Helpers.formatDateToDMY(raw);
    if (!normalized || normalized === raw.trim()) return;
    updateForm({
      [ORDER_FIELDS.ORDER_DATE]: normalized,
    } as Partial<Order>);
  }, [formData, updateForm]);

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
              <CreateOrderProductSection
                customMode={customMode}
                formData={formData}
                selectedSupplyId={selectedSupplyId}
                productOptions={productOptions}
                supplyOptions={supplyOptions}
                customerType={customerType}
                canSelectCustomerType={canSelectCustomerType}
                filteredCustomerTypeOptions={filteredCustomerTypeOptions}
                onToggleCustomMode={() => {
                  setCustomProductTouched(false);
                  setCustomMode((value) => {
                    const next = !value;
                    if (next) {
                      clearSelectedSupplySelection();
                    }
                    return next;
                  });
                }}
                onFieldChange={handleChange}
                onProductSelect={handleProductSelect}
                onSourceSelect={handleSourceSelect}
                onCustomerTypeChange={handleCustomerTypeChange}
                onClearSelectedSupplySelection={clearSelectedSupplySelection}
                onCustomProductBlur={() => setCustomProductTouched(true)}
              />

              <CreateOrderCustomerSection
                formData={formData}
                onFieldChange={handleChange}
              />

              <CreateOrderPricingSection
                customMode={customMode}
                customerType={customerType}
                formData={formData}
                registerDateDMY={registerDateDMY}
                costValue={costValue}
                priceValue={priceValue}
                onRegisterDateChange={handleRegisterDateChange}
                onRegisterDateBlur={handleRegisterDateBlur}
                onExpiryDateChange={handleExpiryDateChange}
                onExpiryDateBlur={handleExpiryDateBlur}
                onCostChange={handlePriceInput(ORDER_FIELDS.COST)}
                onPriceChange={handlePriceInput(ORDER_FIELDS.PRICE)}
              />
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

