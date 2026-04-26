// CreateOrderModal.tsx - split for readability, keeping behavior unchanged.
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import {
  ORDER_CODE_PREFIXES,
  ORDER_FIELDS,
} from "../../../constants";
import {
  isImportOrderCodeOption,
  usePricingTiers,
} from "@/shared/hooks/usePricingTiers";
import * as Helpers from "../../../lib/helpers";
import {
  calculateExpirationDate,
} from "./helpers";
import useCreateOrderLogic from "./hooks/useCreateOrderLogic";
import { CreateOrderModalProps, Order } from "./types";
import { CreateOrderCustomerSection } from "./components/CreateOrderCustomerSection";
import { CreateOrderPricingSection } from "./components/CreateOrderPricingSection";
import { CreateOrderProductSection } from "./components/CreateOrderProductSection";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { isMavrykShopSupplierName } from "@/shared/utils/supply";
import { formatCurrency } from "@/features/orders/utils/ordersHelpers";

/** Chỉ coi là đủ khi đúng dd/mm/yyyy (tránh parse lệch khi đang gõ). */
const isCompleteDMY = (value: string): boolean =>
  /^\d{2}\/\d{2}\/\d{4}$/.test((value || "").trim());

const CreateOrderModal: React.FC<CreateOrderModalProps> = ({
  isOpen,
  onClose,
  prefillContext,
  onSave,
  orderCreationKind = "sales",
}) => {
  const [customMode, setCustomMode] = useState(false);
  const { orderCodeOptions } = usePricingTiers();
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
    creditMode,
    toggleCreditMode,
    availableCreditNotes,
    creditListLoading,
    selectedCreditNote,
    selectCreditNoteRow,
    clearSelectedCreditNote,
  } = useCreateOrderLogic(isOpen, onSave, customMode, prefillContext, orderCreationKind);

  const hasPrefillCredit = Boolean(
    prefillContext && Number(prefillContext.creditNoteId) > 0
  );
  const manualCreditMoney = useMemo(() => {
    if (!selectedCreditNote || hasPrefillCredit) return null;
    const avail = Math.max(0, Number(selectedCreditNote.available_amount) || 0);
    const refOld = Math.max(0, Number(selectedCreditNote.refund_amount) || 0);
    const priceNum = Math.max(0, Number(formData[ORDER_FIELDS.PRICE]) || 0);
    const apply = Math.min(avail, priceNum);
    const remaining = Math.max(0, priceNum - apply);
    return { avail, refOld, priceNum, apply, remaining };
  }, [selectedCreditNote, hasPrefillCredit, formData]);
  const creditNoteById = useMemo(
    () => new Map(availableCreditNotes.map((r) => [r.id, r])),
    [availableCreditNotes]
  );
  const availableCreditOptions = useMemo(
    () =>
      availableCreditNotes.map((r) => ({
        value: r.id,
        label: `${(r.customer_name || "—").trim()} - credit`,
      })),
    [availableCreditNotes]
  );

  const reservedOrderCode = String(prefillContext?.reservedOrderCode || "").trim();

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
  const selectedSupplyLabel = useMemo(() => {
    if (selectedSupplyId == null) return "";
    const opt = supplyOptions.find((o) => o.value === selectedSupplyId);
    return String(opt?.label ?? "");
  }, [selectedSupplyId, supplyOptions]);
  const isMavrykSupply = useMemo(
    () => isMavrykShopSupplierName(selectedSupplyLabel),
    [selectedSupplyLabel]
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
    const byKind = orderCodeOptions.filter((option) => {
      if (orderCreationKind === "import") {
        return isImportOrderCodeOption(option);
      }
      return !isImportOrderCodeOption(option);
    });
    return byKind.filter((option) => {
      const value = option.value;
      if (hasPromoPrice) {
        return value !== ORDER_CODE_PREFIXES.CUSTOMER;
      }
      return value !== ORDER_CODE_PREFIXES.PROMO;
    });
  }, [hasPromoPrice, orderCodeOptions, orderCreationKind]);

  useEffect(() => {
    if (hasPromoPrice && customerType === ORDER_CODE_PREFIXES.CUSTOMER) {
      handleCustomerTypeChange({
        target: { value: ORDER_CODE_PREFIXES.PROMO },
      } as unknown as React.ChangeEvent<HTMLSelectElement>);
      return;
    }

    if (!hasPromoPrice && customerType === ORDER_CODE_PREFIXES.PROMO) {
      handleCustomerTypeChange({
        target: { value: ORDER_CODE_PREFIXES.CUSTOMER },
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
    orderCreationKind,
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
    <ModalPortal>
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/92 backdrop-blur-sm p-3 sm:p-4">
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
            {reservedOrderCode ? (
              <p className="mt-2 text-[11px] font-semibold text-cyan-200/90">
                Mã đơn dự kiến: {reservedOrderCode}
              </p>
            ) : null}
          </div>
          <div className="mt-1 flex items-center gap-2 shrink-0">
            {orderCreationKind === "sales" && !hasPrefillCredit ? (
              <button
                type="button"
                onClick={toggleCreditMode}
                className={`inline-flex items-center justify-center h-11 px-3.5 rounded-xl border text-sm font-bold transition-colors ${
                  creditMode
                    ? "border-amber-400/60 bg-amber-500/20 text-amber-100 shadow-[0_0_0_1px_rgba(251,191,36,0.2)]"
                    : "border-slate-500/70 bg-slate-800/90 text-slate-200 hover:bg-slate-700 hover:text-white"
                }`}
                title="Chuyển đổi: chọn khách từ phiếu credit còn khả dụng"
              >
                Credit
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center h-11 w-11 rounded-xl border border-slate-500/70 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
              aria-label="Close"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
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
                creditMode={Boolean(creditMode && !hasPrefillCredit)}
                creditListLoading={creditListLoading}
                availableCreditOptions={availableCreditOptions}
                onSelectCreditRow={selectCreditNoteRow}
                onClearCreditSelection={clearSelectedCreditNote}
                creditNoteById={creditNoteById}
                selectedCreditNoteId={selectedCreditNote?.id ?? null}
              />

              <CreateOrderPricingSection
                customMode={customMode}
                customerType={customerType}
                formData={formData}
                registerDateDMY={registerDateDMY}
                isMavrykSupply={isMavrykSupply}
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

            {creditMode && !hasPrefillCredit && selectedCreditNote && manualCreditMoney ? (
              <div
                className="mt-4 rounded-2xl border border-amber-400/35 bg-amber-950/35 px-3.5 py-3 text-sm text-amber-50/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                role="status"
              >
                <p className="text-[11px] font-bold uppercase tracking-wider text-amber-200/90">
                  Thanh toán bằng credit — đơn nguồn{" "}
                  <span className="text-amber-50">
                    {selectedCreditNote.source_order_code || "—"}
                  </span>
                </p>
                <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-slate-200/95 [&_li]:flex [&_li]:justify-between [&_li]:gap-3">
                  <li>
                    <span className="text-slate-400">Giá bán tham chiếu (đơn cũ)</span>
                    <span className="shrink-0 font-semibold text-white">
                      {manualCreditMoney.refOld > 0
                        ? formatCurrency(manualCreditMoney.refOld)
                        : "—"}
                    </span>
                  </li>
                  <li>
                    <span className="text-slate-400">Credit trừ vào đơn này</span>
                    <span className="shrink-0 font-semibold text-emerald-200/90">
                      {formatCurrency(manualCreditMoney.apply)}
                    </span>
                  </li>
                  <li>
                    <span className="text-slate-400">
                      Credit khả dụng (phiếu, lúc mở form)
                    </span>
                    <span className="shrink-0 font-semibold text-slate-100">
                      {formatCurrency(manualCreditMoney.avail)}
                    </span>
                  </li>
                  <li className="!block border-t border-amber-500/25 pt-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-amber-100/95">
                        Khách còn thanh toán (giá bán)
                      </span>
                      <span className="shrink-0 text-base font-black text-amber-50">
                        {formatCurrency(manualCreditMoney.remaining)}
                      </span>
                    </div>
                    <p className="mt-1.5 text-[11px] text-slate-500/90">
                      Theo ô «Giá bán» sau khi bạn chọn sản phẩm — chọn gói mới, nhập giá, các dòng
                      credit cập nhật tương ứng. «Giá bán tham chiếu» lấy từ số liệu phiếu (hoàn gốc)
                      khi có.
                    </p>
                  </li>
                </ul>
              </div>
            ) : null}

            {prefillContext && Number(prefillContext.creditNoteId) > 0 ? (
              <div
                className="mt-4 rounded-2xl border border-amber-400/35 bg-amber-950/35 px-3.5 py-3 text-sm text-amber-50/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                role="status"
              >
                <p className="text-[11px] font-bold uppercase tracking-wider text-amber-200/90">
                  Thanh toán bằng credit — đơn nguồn{" "}
                  <span className="text-amber-50">
                    {prefillContext.creditSourceOrderCode || "—"}
                  </span>
                </p>
                <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-slate-200/95 [&_li]:flex [&_li]:justify-between [&_li]:gap-3">
                  <li>
                    <span className="text-slate-400">Giá bán tham chiếu (đơn cũ)</span>
                    <span className="shrink-0 font-semibold text-white">
                      {formatCurrency(
                        Number(prefillContext.sourceOrderListPrice) || 0
                      )}
                    </span>
                  </li>
                  <li>
                    <span className="text-slate-400">Credit trừ vào đơn này</span>
                    <span className="shrink-0 font-semibold text-emerald-200/90">
                      {formatCurrency(prefillContext.creditApplyAmount || 0)}
                    </span>
                  </li>
                  <li>
                    <span className="text-slate-400">
                      Credit khả dụng (phiếu, lúc mở form)
                    </span>
                    <span className="shrink-0 font-semibold text-slate-100">
                      {formatCurrency(prefillContext.creditAvailableAmount || 0)}
                    </span>
                  </li>
                  <li className="!block border-t border-amber-500/25 pt-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-amber-100/95">
                        Khách còn thanh toán (giá bán)
                      </span>
                      <span className="shrink-0 text-base font-black text-amber-50">
                        {formatCurrency(Number(formData[ORDER_FIELDS.PRICE]) || 0)}
                      </span>
                    </div>
                    <p className="mt-1.5 text-[11px] text-slate-500/90">
                      Theo ô «Giá bán» sau khi bạn chọn sản phẩm — chọn gói mới, nhập giá, số
                      dòng này cập nhật tương ứng.
                    </p>
                  </li>
                </ul>
              </div>
            ) : null}
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
    </ModalPortal>
  );
};

export default CreateOrderModal;

