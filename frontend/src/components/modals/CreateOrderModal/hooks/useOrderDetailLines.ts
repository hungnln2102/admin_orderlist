import { useCallback, useEffect, useMemo, useState } from "react";
import { ORDER_FIELDS } from "../../../../constants";
import {
  buildOrderPayload,
  isSharedOrderBaseComplete,
  type CreditOrderSelection,
} from "../buildOrderPayload";
import type { CreateOrderPrefillContext, Order, Product } from "../types";
import type { PaymentMethod } from "@/features/usdt-wallets/types";

export type OrderDetailLine = {
  id: string;
  slot: string;
  informationOrder: string;
};

type UseOrderDetailLinesParams = {
  isOpen: boolean;
  multiOrderEnabled: boolean;
  formData: Partial<Order>;
  selectedSupplyId: number | null;
  products: Product[];
  paymentMethod: PaymentMethod;
  prefillContext?: CreateOrderPrefillContext | null;
  creditOrderSelection: CreditOrderSelection;
  updateForm: (patch: Partial<Order>) => void;
};

const createLineId = (): string => `line-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createEmptyLine = (): OrderDetailLine => ({
  id: createLineId(),
  slot: "",
  informationOrder: "",
});

export const useOrderDetailLines = ({
  isOpen,
  multiOrderEnabled,
  formData,
  selectedSupplyId,
  products,
  paymentMethod,
  prefillContext,
  creditOrderSelection,
  updateForm,
}: UseOrderDetailLinesParams) => {
  const [detailLines, setDetailLines] = useState<OrderDetailLine[]>([createEmptyLine()]);

  useEffect(() => {
    if (!isOpen) {
      setDetailLines([createEmptyLine()]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!multiOrderEnabled || detailLines.length === 0) return;
    const primary = detailLines[0];
    updateForm({
      [ORDER_FIELDS.SLOT]: primary.slot,
      [ORDER_FIELDS.INFORMATION_ORDER]: primary.informationOrder,
    });
  }, [detailLines, multiOrderEnabled, updateForm]);

  const addDetailLine = useCallback(() => {
    setDetailLines((prev) => [...prev, createEmptyLine()]);
  }, []);

  const removeDetailLine = useCallback((id: string) => {
    setDetailLines((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((line) => line.id !== id);
    });
  }, []);

  const updateDetailLine = useCallback(
    (id: string, patch: Partial<Pick<OrderDetailLine, "slot" | "informationOrder">>) => {
      setDetailLines((prev) => prev.map((line) => (line.id === id ? { ...line, ...patch } : line)));
    },
    []
  );

  const sharedCustomer = useMemo(
    () => ({
      customer: String(formData[ORDER_FIELDS.CUSTOMER] || "").trim(),
      contact: (formData[ORDER_FIELDS.CONTACT] as string) || null,
    }),
    [formData]
  );

  const isSharedComplete = useMemo(
    () => isSharedOrderBaseComplete(formData, selectedSupplyId),
    [formData, selectedSupplyId]
  );

  const completeLines = useMemo(
    () => detailLines.filter((line) => line.informationOrder.trim()),
    [detailLines]
  );

  const totalOrdersToCreate = useMemo(() => {
    if (!multiOrderEnabled) return 0;
    return completeLines.length;
  }, [completeLines.length, multiOrderEnabled]);

  const sharedUnitPrice = Number(formData[ORDER_FIELDS.PRICE]) || 0;
  const estimatedTotalPrice = sharedUnitPrice * completeLines.length;

  const collectAllPayloads = useCallback((): Record<string, unknown>[] => {
    if (!multiOrderEnabled) return [];

    const payloads: Record<string, unknown>[] = [];
    for (const line of completeLines) {
      const lineFormData: Partial<Order> = {
        ...formData,
        [ORDER_FIELDS.SLOT]: line.slot.trim() || null,
        [ORDER_FIELDS.INFORMATION_ORDER]: line.informationOrder.trim(),
      };
      const result = buildOrderPayload({
        formData: lineFormData,
        selectedSupplyId,
        products,
        prefillContext,
        creditOrderSelection,
        paymentMethod,
        sharedCustomer,
      });
      if (result.ok) {
        payloads.push(result.payload);
      }
    }
    return payloads;
  }, [
    completeLines,
    creditOrderSelection,
    formData,
    multiOrderEnabled,
    paymentMethod,
    prefillContext,
    products,
    selectedSupplyId,
    sharedCustomer,
  ]);

  const isMultiReady = isSharedComplete && completeLines.length > 0;

  return {
    detailLines,
    addDetailLine,
    removeDetailLine,
    updateDetailLine,
    totalOrdersToCreate,
    estimatedTotalPrice,
    collectAllPayloads,
    isMultiReady,
    completeLineCount: completeLines.length,
  };
};

export type UseOrderDetailLinesReturn = ReturnType<typeof useOrderDetailLines>;
