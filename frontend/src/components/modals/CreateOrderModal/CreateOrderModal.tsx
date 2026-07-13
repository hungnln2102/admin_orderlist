import React, { useState } from "react";
import { ORDER_FIELDS } from "../../../constants";
import { usePricingTiers } from "@/shared/hooks/usePricingTiers";
import { useCreateOrderLogic } from "./hooks/useCreateOrderLogic";
import type { CreateOrderModalProps } from "./types";
import { CreateOrderModalFooter } from "./components/CreateOrderModalFooter";
import { CreateOrderModalHeader } from "./components/CreateOrderModalHeader";
import { CreateOrderModalBody } from "./components/CreateOrderModalBody";
import { useCreateOrderModalDerived } from "./hooks/useCreateOrderModalDerived";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { useCreateOrderImportPackageFlow } from "./hooks/useCreateOrderImportPackageFlow";
import { useCreateOrderImportPackageSave } from "./hooks/useCreateOrderImportPackageSave";
import { getCreateOrderSubmitState } from "./hooks/createOrderSubmitState";
const CreateOrderModal: React.FC<CreateOrderModalProps> = ({
  isOpen,
  onClose,
  prefillContext,
  onSave,
  orderCreationKind = "sales",
}) => {
  const [customMode, setCustomMode] = useState(false);
  const { pendingImportPackageRef, handleSaveWithImportPackage } =
    useCreateOrderImportPackageSave(onSave);
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

  const {
    isImportOrder,
    importRule,
    importRuleLoading,
    importPackageData,
    updateImportField,
    handleSubmitWithPackage,
  } = useCreateOrderImportPackageFlow({
    isOpen,
    orderCreationKind,
    products,
    formData,
    selectedSupplyId,
    pendingImportPackageRef,
    handleSubmit,
  });
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
  const { canSubmit, submitLabel } = getCreateOrderSubmitState({
    formData,
    multiOrderEnabled,
    isMultiReady,
    isDraftComplete,
    isLoading,
    totalOrdersToCreate,
  });
  const unitPrice = Number(formData[ORDER_FIELDS.PRICE]) || 0;
  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/92 backdrop-blur-sm p-3 sm:p-4">
        <div className="relative w-full max-w-5xl max-h-[84vh] overflow-hidden rounded-[24px] border border-slate-600/70 bg-slate-900 text-slate-100 shadow-[0_28px_70px_-25px_rgba(2,6,23,0.95)] flex flex-col">
          <CreateOrderModalHeader
            multiOrderEnabled={multiOrderEnabled}
            reservedOrderCode={reservedOrderCode}
            orderCreationKind={orderCreationKind}
            hasPrefillCredit={hasPrefillCredit}
            creditMode={creditMode}
            onToggleCreditMode={toggleCreditMode}
            onClose={onClose}
          />
          <CreateOrderModalBody
            onSubmit={handleSubmitWithPackage}
            customer={{
              formData,
              onFieldChange: handleChange,
              creditMode: Boolean(creditMode && !hasPrefillCredit),
              creditListLoading,
              availableCreditOptions,
              onSelectCreditRow: selectCreditNoteRow,
              onClearCreditSelection: clearSelectedCreditNote,
              creditNoteById,
              selectedCreditNoteId:
                selectedCreditNote?.id != null &&
                Number.isFinite(Number(selectedCreditNote.id))
                  ? Number(selectedCreditNote.id)
                  : null,
              multiOrderEnabled,
              detailLineCount: completeLineCount,
            }}
            product={{
              customMode,
              formData,
              selectedSupplyId,
              productOptions,
              supplyOptions,
              customerType,
              canSelectCustomerType,
              filteredCustomerTypeOptions,
              onToggleCustomMode: () => {
                setCustomProductTouched(false);
                setCustomMode((value) => {
                  const next = !value;
                  if (next) {
                    clearSelectedSupplySelection();
                  }
                  return next;
                });
              },
              onFieldChange: handleChange,
              onProductSelect: handleProductSelect,
              onSourceSelect: handleSourceSelect,
              onCustomerTypeChange: handleCustomerTypeChange,
              onClearSelectedSupplySelection: clearSelectedSupplySelection,
              onCustomProductBlur: markCustomProductTouched,
            }}
            detailLines={{
              lines: detailLines,
              multiOrderEnabled,
              completeLineCount,
              estimatedTotalPrice,
              unitPrice,
              onAddLine: addDetailLine,
              onRemoveLine: removeDetailLine,
              onUpdateLine: updateDetailLine,
              singleMode: !multiOrderEnabled
                ? {
                    slot: (formData[ORDER_FIELDS.SLOT] as string) || "",
                    informationOrder:
                      (formData[ORDER_FIELDS.INFORMATION_ORDER] as string) || "",
                    onFieldChange: handleChange,
                  }
                : undefined,
            }}
            pricing={{
              customMode,
              customerType,
              formData,
              registerDateDMY,
              isMavrykSupply,
              costValue,
              priceValue,
              onRegisterDateChange: handleRegisterDateChange,
              onRegisterDateBlur: handleRegisterDateBlur,
              onExpiryDateChange: handleExpiryDateChange,
              onExpiryDateBlur: handleExpiryDateBlur,
              onCostChange: handlePriceInput(ORDER_FIELDS.COST),
              onPriceChange: handlePriceInput(ORDER_FIELDS.PRICE),
            }}
            paymentMethod={{
              customerType,
              orderCreationKind,
              priceValue,
              paymentMethod,
              onPaymentMethodChange: setPaymentMethod,
            }}
            importPackage={{
              visible: isImportOrder && !importRuleLoading,
              rule: importRule,
              data: importPackageData,
              onChange: updateImportField,
            }}
            creditPanels={{
              creditMode,
              hasPrefillCredit,
              selectedCreditNote,
              manualCreditMoney,
              prefillContext,
              prefillCreditNoteRemaining,
              formDataPrice: formData[ORDER_FIELDS.PRICE],
            }}
          />
          <CreateOrderModalFooter
            canSubmit={canSubmit}
            submitLabel={submitLabel}
            onClose={onClose}
          />
        </div>
      </div>
    </ModalPortal>
  );
};
export default CreateOrderModal;
