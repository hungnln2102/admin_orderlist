import React, { useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import {
  ORDER_FIELDS,
} from "../../../constants";
import {
  usePricingTiers,
} from "@/shared/hooks/usePricingTiers";
import useCreateOrderLogic from "./hooks/useCreateOrderLogic";
import { CreateOrderModalProps } from "./types";
import { CreateOrderCustomerSection } from "./components/CreateOrderCustomerSection";
import { CreateOrderPricingSection } from "./components/CreateOrderPricingSection";
import { CreateOrderProductSection } from "./components/CreateOrderProductSection";
import { CreateOrderCreditPanels } from "./components/CreateOrderCreditPanels";
import { CreateOrderPaymentMethodSection } from "./components/CreateOrderPaymentMethodSection";
import { useCreateOrderModalDerived } from "./hooks/useCreateOrderModalDerived";
import { ModalPortal } from "@/components/ui/ModalPortal";

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
    paymentMethod,
    setPaymentMethod,
  } = useCreateOrderLogic(isOpen, onSave, customMode, prefillContext, orderCreationKind);

  const hasPrefillCredit = Boolean(
    prefillContext && Number(prefillContext.creditNoteId) > 0
  );
  const {
    prefillCreditNoteRemaining,
    manualCreditMoney,
    creditNoteById,
    availableCreditOptions,
    reservedOrderCode,
    registerDateDMY,
    costValue,
    priceValue,
    productOptions,
    supplyOptions,
    isMavrykSupply,
    canSelectCustomerType,
    filteredCustomerTypeOptions,
    handlePriceInput,
    handleExpiryDateChange,
    handleExpiryDateBlur,
    handleRegisterDateChange,
    handleRegisterDateBlur,
    markCustomProductTouched,
  } = useCreateOrderModalDerived({
    formData,
    products,
    supplies,
    selectedSupplyId,
    customerType,
    updateForm,
    setIsDataLoaded,
    customMode,
    customProductTouched,
    setCustomProductTouched,
    handleCustomerTypeChange,
    availableCreditNotes,
    selectedCreditNote,
    hasPrefillCredit,
    orderCodeOptions,
    orderCreationKind,
    prefillContext,
  });

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
                onCustomProductBlur={markCustomProductTouched}
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
                selectedCreditNoteId={
                  selectedCreditNote?.id != null &&
                  Number.isFinite(Number(selectedCreditNote.id))
                    ? Number(selectedCreditNote.id)
                    : null
                }
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

              <CreateOrderPaymentMethodSection
                customerType={customerType}
                orderCreationKind={orderCreationKind}
                priceValue={priceValue}
                paymentMethod={paymentMethod}
                onPaymentMethodChange={setPaymentMethod}
              />
            </div>

            <CreateOrderCreditPanels
              creditMode={creditMode}
              hasPrefillCredit={hasPrefillCredit}
              selectedCreditNote={selectedCreditNote}
              manualCreditMoney={manualCreditMoney}
              prefillContext={prefillContext}
              prefillCreditNoteRemaining={prefillCreditNoteRemaining}
              formDataPrice={formData[ORDER_FIELDS.PRICE]}
            />
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

