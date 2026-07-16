import { useCallback, useEffect, useMemo } from "react";
import { ORDER_CODE_PREFIXES, ORDER_FIELDS } from "../../../../constants";
import type { OrderCodeSelectOption } from "@/shared/hooks/usePricingTiers";
import type { CreateOrderCreationKind, CustomerType, Order, Product, Supply } from "../types";
import { isMavrykShopSupplierName } from "@/features/supply/utils/supplierRules";
import type { AvailableRefundCredit } from "@/lib/refundCreditsApi";
import {
  buildAvailableCreditOptions,
  buildCreditNoteMap,
  buildCustomerTypeOptions,
  buildProductOptions,
  buildSupplyOptions,
  getManualCreditMoney,
  getPrefillCreditNoteRemaining,
  getProductPctPromo,
  hasPositivePromoValue,
  isCreateOrderDraftReady,
} from "./createOrderDerivedRules";
import { useCreateOrderDateInputs } from "./useCreateOrderDateInputs";

type Params = {
  formData: Partial<Order>;
  products: Product[];
  supplies: Supply[];
  selectedSupplyId: number | null;
  customerType: CustomerType;
  updateForm: (patch: Partial<Order>) => void;
  setIsDataLoaded: (v: boolean) => void;
  customMode: boolean;
  customProductTouched: boolean;
  setCustomProductTouched: (v: boolean) => void;
  handleCustomerTypeChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  availableCreditNotes: AvailableRefundCredit[];
  selectedCreditNote: AvailableRefundCredit | null;
  hasPrefillCredit: boolean;
  orderCodeOptions: OrderCodeSelectOption[];
  orderCreationKind: CreateOrderCreationKind;
  prefillContext?: {
    creditNoteId?: number;
    creditAvailableAmount?: number;
    creditApplyAmount?: number;
    reservedOrderCode?: string | null;
  } | null;
};

export const useCreateOrderModalDerived = ({
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
}: Params) => {
  const prefillCreditNoteRemaining = useMemo(
    () => getPrefillCreditNoteRemaining(prefillContext),
    [prefillContext]
  );

  const manualCreditMoney = useMemo(
    () => getManualCreditMoney(selectedCreditNote, hasPrefillCredit, formData),
    [selectedCreditNote, hasPrefillCredit, formData]
  );

  const creditNoteById = useMemo(
    () => buildCreditNoteMap(availableCreditNotes),
    [availableCreditNotes]
  );

  const availableCreditOptions = useMemo(
    () => buildAvailableCreditOptions(availableCreditNotes),
    [availableCreditNotes]
  );

  const reservedOrderCode = String(prefillContext?.reservedOrderCode || "").trim();

  const costValue = formData[ORDER_FIELDS.COST] as string | number | undefined;
  const priceValue = formData[ORDER_FIELDS.PRICE] as string | number | undefined;


  const productOptions = useMemo(() => buildProductOptions(products), [products]);

  const supplyOptions = useMemo(() => buildSupplyOptions(supplies), [supplies]);

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
    return hasProduct;
  }, [formData]);

  const currentProductPctPromo = useMemo(() => {
    const productName = (formData[ORDER_FIELDS.ID_PRODUCT] as string) || "";
    return getProductPctPromo(products, productName);
  }, [products, formData]);

  const hasPromoPrice = useMemo(
    () => hasPositivePromoValue(currentProductPctPromo),
    [currentProductPctPromo]
  );

  const filteredCustomerTypeOptions = useMemo(
    () =>
      buildCustomerTypeOptions({
        orderCodeOptions,
        orderCreationKind,
        hasPromoPrice,
      }),
    [hasPromoPrice, orderCodeOptions, orderCreationKind]
  );

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
    (field: typeof ORDER_FIELDS.COST | typeof ORDER_FIELDS.PRICE) =>
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value || "";
        const digits = raw.replace(/\D/g, "");
        const num = digits ? parseInt(digits, 10) : 0;
        updateForm({ [field]: num } as Partial<Order>);
      },
    [updateForm]
  );

  const {
    registerDateDMY,
    handleExpiryDateChange,
    handleExpiryDateBlur,
    handleRegisterDateChange,
    handleRegisterDateBlur,
  } = useCreateOrderDateInputs({
    formData,
    updateForm,
    customMode,
    customProductTouched,
  });

  const readyToLoad = useMemo(
    () => isCreateOrderDraftReady(formData),
    [formData]
  );

  useEffect(() => {
    setIsDataLoaded(readyToLoad);
  }, [readyToLoad, setIsDataLoaded]);

  return {
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
    markCustomProductTouched: () => setCustomProductTouched(true),
  };
};
