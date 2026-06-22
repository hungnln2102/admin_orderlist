import React, { useCallback, useRef, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { ORDER_FIELDS } from "../../../constants";
import { usePricingTiers } from "@/shared/hooks/usePricingTiers";
import useCreateOrderLogic from "./hooks/useCreateOrderLogic";
import type { CreateOrderModalProps, Order } from "./types";
import { CreateOrderSharedCustomerSection } from "./components/CreateOrderSharedCustomerSection";
import { CreateOrderDetailLinesSection } from "./components/CreateOrderDetailLinesSection";
import { CreateOrderPricingSection } from "./components/CreateOrderPricingSection";
import { CreateOrderProductSection } from "./components/CreateOrderProductSection";
import { CreateOrderCreditPanels } from "./components/CreateOrderCreditPanels";
import { CreateOrderPaymentMethodSection } from "./components/CreateOrderPaymentMethodSection";
import { useCreateOrderModalDerived } from "./hooks/useCreateOrderModalDerived";
import { ModalPortal } from "@/components/ui/ModalPortal";
import ImportPackageBlock from "@/features/warehouse/components/ImportPackageBlock";
import { useImportPackageSubmit } from "@/features/warehouse/hooks/useImportPackageSubmit";
const CreateOrderModal: React.FC<CreateOrderModalProps> = ({
  isOpen,
  onClose,
  prefillContext,
  onSave,
  orderCreationKind = "sales",
}) => {
  const [customMode, setCustomMode] = useState(false);
  const pendingImportPackageRef = useRef<Record<string, unknown> | null>(null);
  const handleSaveWithImportPackage = useCallback(
    (newOrderData: Parameters<CreateOrderModalProps["onSave"]>[0]) => {
      const meta = pendingImportPackageRef.current;
      pendingImportPackageRef.current = null;
      if (!meta) {
        onSave(newOrderData);
        return;
      }

      type NewOrderData = Parameters<CreateOrderModalProps["onSave"]>[0];
      type OrderSavePayload = Partial<Order> | Order;

      const attachMeta = (payload: OrderSavePayload) => ({
        ...(payload as Record<string, unknown>),
        __import_package: meta,
      });

      const payloadWithImport = (
        Array.isArray(newOrderData)
          ? newOrderData.map(attachMeta)
          : attachMeta(newOrderData)
      ) as unknown as NewOrderData;

      onSave(payloadWithImport);
    },
    [onSave]
  );
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
    multiOrderEnabled,
    detailLines,
    addDetailLine,
    removeDetailLine,
    updateDetailLine,
    isDraftComplete,
    totalOrdersToCreate,
    estimatedTotalPrice,
    completeLineCount,
    isMultiReady,
  } = useCreateOrderLogic(isOpen, handleSaveWithImportPackage, customMode, prefillContext, orderCreationKind);
  const hasPrefillCredit = Boolean(prefillContext && Number(prefillContext.creditNoteId) > 0);

  // Import-package block: hiá»ƒn thá»‹ khi orderCreationKind = "import"
  const isImportOrder = orderCreationKind === "import";
  const {
    rule: importRule,
    ruleLoading: importRuleLoading,
    data: importPackageData,
    updateField: updateImportField,
    loadRule: loadImportRule,
  } = useImportPackageSubmit();

  // Khi sáº£n pháº©m thay Ä‘á»•i trong Ä‘Æ¡n nháº­p hÃ ng -> táº£i rule
  const selectedProductId = products.find(
    (p) => p.san_pham === (formData[ORDER_FIELDS.ID_PRODUCT] as string)
  )?.id ?? null;

  React.useEffect(() => {
    if (isImportOrder && isOpen) {
      void loadImportRule(typeof selectedProductId === "number" ? selectedProductId : null);
    }
  }, [isImportOrder, isOpen, selectedProductId, loadImportRule]);

  // Override handleSubmit Ä‘á»ƒ sau khi táº¡o Ä‘Æ¡n -> táº¡o import package
  const originalHandleSubmit = handleSubmit;
  const handleSubmitWithPackage = (e: React.FormEvent) => {
    if (isImportOrder && importRule?.enabled && selectedProductId) {
      pendingImportPackageRef.current = {
        productId: selectedProductId,
        supplierId: selectedSupplyId,
        importPrice: Number(formData[ORDER_FIELDS.COST]) || null,
        data: importPackageData,
      };
    } else {
      pendingImportPackageRef.current = null;
    }
    originalHandleSubmit(e);
  };
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
  const hasCustomer = Boolean(String(formData[ORDER_FIELDS.CUSTOMER] || "").trim());
  const canSubmitMulti = multiOrderEnabled && isMultiReady && hasCustomer && !isLoading;
  const canSubmitSingle = !multiOrderEnabled && isDraftComplete && !isLoading;
  const canSubmit = multiOrderEnabled ? canSubmitMulti : canSubmitSingle;
  const submitLabel = multiOrderEnabled
    ? isLoading
      ? "Äang tÃ­nh giÃ¡..."
      : totalOrdersToCreate > 1
        ? `Táº¡o Ä‘Æ¡n hÃ ng gá»™p (${totalOrdersToCreate} Ä‘Æ¡n)`
        : "Táº¡o Ä‘Æ¡n hÃ ng gá»™p"
    : isLoading
      ? "Äang tÃ­nh giÃ¡..."
      : "Táº¡o Ä‘Æ¡n hÃ ng";
  const unitPrice = Number(formData[ORDER_FIELDS.PRICE]) || 0;
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
                {multiOrderEnabled ? "Táº¡o Ä‘Æ¡n hÃ ng gá»™p" : "Táº¡o Ä‘Æ¡n hÃ ng má»›i"}
              </h3>
              <p className="mt-2 text-xs text-slate-300/75">
                {multiOrderEnabled
                  ? "Nháº­p nhiá»u dÃ²ng chi tiáº¿t cho cÃ¹ng má»™t khÃ¡ch; há»‡ thá»‘ng sáº½ táº¡o cÃ¡c Ä‘Æ¡n thÃ nh pháº§n rá»“i tá»± gá»™p theo Ä‘Ãºng luá»“ng gá»™p biÃªn nháº­n."
                  : "HoÃ n thiá»‡n thÃ´ng tin khÃ¡ch hÃ ng, sáº£n pháº©m vÃ  chi phÃ­ trong má»™t form duy nháº¥t."}
              </p>
              {reservedOrderCode ? (
                <p className="mt-2 text-[11px] font-semibold text-cyan-200/90">
                  MÃ£ Ä‘Æ¡n dá»± kiáº¿n: {reservedOrderCode}
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
                  title="Chuyá»ƒn Ä‘á»•i: chá»n khÃ¡ch tá»« phiáº¿u credit cÃ²n kháº£ dá»¥ng"
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
            <form id="create-order-form" onSubmit={handleSubmitWithPackage}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
                <CreateOrderSharedCustomerSection
                  formData={formData}
                  onFieldChange={handleChange}
                  creditMode={Boolean(creditMode && !hasPrefillCredit)}
                  creditListLoading={creditListLoading}
                  availableCreditOptions={availableCreditOptions}
                  onSelectCreditRow={selectCreditNoteRow}
                  onClearCreditSelection={clearSelectedCreditNote}
                  creditNoteById={creditNoteById}
                  selectedCreditNoteId={
                    selectedCreditNote?.id != null && Number.isFinite(Number(selectedCreditNote.id))
                      ? Number(selectedCreditNote.id)
                      : null
                  }
                  multiOrderEnabled={multiOrderEnabled}
                  detailLineCount={completeLineCount}
                />
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
                <CreateOrderDetailLinesSection
                  lines={detailLines}
                  multiOrderEnabled={multiOrderEnabled}
                  completeLineCount={completeLineCount}
                  estimatedTotalPrice={estimatedTotalPrice}
                  unitPrice={unitPrice}
                  onAddLine={addDetailLine}
                  onRemoveLine={removeDetailLine}
                  onUpdateLine={updateDetailLine}
                  singleMode={
                    !multiOrderEnabled
                      ? {
                          slot: (formData[ORDER_FIELDS.SLOT] as string) || "",
                          informationOrder:
                            (formData[ORDER_FIELDS.INFORMATION_ORDER] as string) || "",
                          onFieldChange: handleChange,
                        }
                      : undefined
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
              {/* Import Package Block: chá»‰ hiá»ƒn thá»‹ vá»›i Ä‘Æ¡n nháº­p hÃ ng vÃ  sáº£n pháº©m cÃ³ rule */}
              {isImportOrder && !importRuleLoading && (
                <ImportPackageBlock
                  rule={importRule}
                  data={importPackageData}
                  onChange={updateImportField}
                />
              )}
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
          <div className="shrink-0 px-4 sm:px-6 lg:px-8 py-3 border-t border-slate-700/70 bg-slate-900 flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 text-sm font-bold text-slate-100 bg-slate-800 border border-slate-600 rounded-xl hover:bg-slate-700 transition-colors"
            >
              Há»§y
            </button>
            <button
              type="submit"
              form="create-order-form"
              className={`px-7 py-2.5 text-sm font-black text-white rounded-xl transition-all ${
                canSubmit
                  ? "bg-emerald-500 hover:bg-emerald-400 shadow-[0_14px_30px_-14px_rgba(16,185,129,0.75)] hover:-translate-y-0.5"
                  : "bg-slate-700/80 opacity-60 cursor-not-allowed"
              }`}
              disabled={!canSubmit}
            >
              {submitLabel}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};
export default CreateOrderModal;

