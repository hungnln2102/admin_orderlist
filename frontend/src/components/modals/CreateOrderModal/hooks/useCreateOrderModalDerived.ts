import { useCallback, useEffect, useMemo } from "react";
import {
  ORDER_CODE_PREFIXES,
  ORDER_FIELDS,
} from "../../../../constants";
import {
  isImportOrderCodeOption,
} from "@/shared/hooks/usePricingTiers";
import * as Helpers from "../../../../shared/utils";
import { calculateExpirationDate } from "../helpers";
import type {
  CreateOrderCreationKind,
  Order,
  Product,
  Supply,
} from "../types";
import { isMavrykShopSupplierName } from "@/shared/utils/supply";
import { formatCurrency } from "@/features/orders/utils/ordersHelpers";

const isCompleteDMY = (value: string): boolean =>
  /^\d{2}\/\d{2}\/\d{4}$/.test((value || "").trim());

type CreditNoteRow = {
  id: number;
  customer_name?: string;
  available_amount?: number;
  refund_amount?: number;
  source_order_code?: string;
};

type Params = {
  formData: Partial<Order>;
  products: Product[];
  supplies: Supply[];
  selectedSupplyId: number | null;
  customerType: string;
  updateForm: (patch: Partial<Order>) => void;
  setIsDataLoaded: (v: boolean) => void;
  customMode: boolean;
  customProductTouched: boolean;
  setCustomProductTouched: (v: boolean) => void;
  handleCustomerTypeChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  availableCreditNotes: CreditNoteRow[];
  selectedCreditNote: CreditNoteRow | null;
  hasPrefillCredit: boolean;
  orderCodeOptions: Array<{ value: string; label: string }>;
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
  const prefillCreditNoteRemaining = useMemo(() => {
    if (!prefillContext || !Number(prefillContext.creditNoteId)) return null;
    const avail = Math.max(0, Number(prefillContext.creditAvailableAmount) || 0);
    const apply = Math.max(0, Number(prefillContext.creditApplyAmount) || 0);
    return Math.max(0, avail - apply);
  }, [prefillContext]);

  const manualCreditMoney = useMemo(() => {
    if (!selectedCreditNote || hasPrefillCredit) return null;
    const avail = Math.max(0, Number(selectedCreditNote.available_amount) || 0);
    const refOld = Math.max(0, Number(selectedCreditNote.refund_amount) || 0);
    const priceNum = Math.max(0, Number(formData[ORDER_FIELDS.PRICE]) || 0);
    const apply = Math.min(avail, priceNum);
    const remaining = Math.max(0, priceNum - apply);
    const noteRemainingAfter = Math.max(0, avail - apply);
    return { avail, refOld, priceNum, apply, remaining, noteRemainingAfter };
  }, [selectedCreditNote, hasPrefillCredit, formData]);

  const creditNoteById = useMemo(() => {
    const m = new Map<number, CreditNoteRow>();
    for (const r of availableCreditNotes) {
      const id = Number(r.id);
      if (Number.isFinite(id) && id > 0) {
        m.set(id, r);
      }
    }
    return m;
  }, [availableCreditNotes]);

  const availableCreditOptions = useMemo(
    () =>
      availableCreditNotes.map((r) => {
        const name = (r.customer_name || "—").trim();
        const avail = Math.max(0, Number(r.available_amount) || 0);
        return {
          value: Number(r.id),
          label: `${name} — ${formatCurrency(avail)}`,
        };
      }),
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
