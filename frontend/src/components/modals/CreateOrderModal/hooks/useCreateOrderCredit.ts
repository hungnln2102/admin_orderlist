import { useCallback, useEffect, useMemo, useState } from "react";
import { ORDER_FIELDS } from "../../../../constants";
import { fetchAvailableRefundCredits, type AvailableRefundCredit } from "@/lib/refundCreditsApi";
import type { CreateOrderPrefillContext, Order } from "../types";

type UseCreateOrderCreditParams = {
  isOpen: boolean;
  prefillContext?: CreateOrderPrefillContext | null;
  setFormData: React.Dispatch<React.SetStateAction<Partial<Order>>>;
};

export function useCreateOrderCredit({
  isOpen,
  prefillContext,
  setFormData,
}: UseCreateOrderCreditParams) {
  const [creditMode, setCreditMode] = useState(false);
  const [availableCreditNotes, setAvailableCreditNotes] = useState<AvailableRefundCredit[]>([]);
  const [creditListLoading, setCreditListLoading] = useState(false);
  const [selectedCreditNote, setSelectedCreditNote] = useState<AvailableRefundCredit | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setCreditMode(false);
      setSelectedCreditNote(null);
      setAvailableCreditNotes([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !creditMode) return;
    let cancelled = false;
    (async () => {
      setCreditListLoading(true);
      try {
        const rows = await fetchAvailableRefundCredits();
        if (!cancelled) {
          setAvailableCreditNotes(rows);
        }
      } catch {
        if (!cancelled) {
          setAvailableCreditNotes([]);
        }
      } finally {
        if (!cancelled) {
          setCreditListLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, creditMode]);

  const selectCreditNoteRow = useCallback(
    (row: AvailableRefundCredit) => {
      setSelectedCreditNote(row);
      setFormData((prev) => ({
        ...prev,
        [ORDER_FIELDS.CUSTOMER]: String(row.customer_name || "").trim(),
      }));
    },
    [setFormData]
  );

  const clearSelectedCreditNote = useCallback(() => {
    setSelectedCreditNote(null);
    setFormData((prev) => ({
      ...prev,
      [ORDER_FIELDS.CUSTOMER]: "",
    }));
  }, [setFormData]);

  const toggleCreditMode = useCallback(() => {
    setCreditMode((prev) => {
      if (prev) {
        setSelectedCreditNote(null);
        setFormData((form) => ({
          ...form,
          [ORDER_FIELDS.CUSTOMER]: "",
        }));
      }
      return !prev;
    });
  }, [setFormData]);

  const creditOrderSelection = useMemo(() => {
    if (prefillContext?.creditNoteId) {
      return null;
    }
    if (!creditMode || !selectedCreditNote) {
      return null;
    }
    return {
      id: Number(selectedCreditNote.id),
      availableAmount: Math.max(0, Number(selectedCreditNote.available_amount) || 0),
      sourceOrderCode: String(selectedCreditNote.source_order_code || "").trim(),
      sourceOrderId: Number(selectedCreditNote.source_order_list_id || 0),
      creditCode: String(selectedCreditNote.credit_code || "").trim(),
    };
  }, [prefillContext?.creditNoteId, creditMode, selectedCreditNote]);

  return {
    creditMode,
    toggleCreditMode,
    availableCreditNotes,
    creditListLoading,
    selectedCreditNote,
    selectCreditNoteRow,
    clearSelectedCreditNote,
    creditOrderSelection,
  };
}
