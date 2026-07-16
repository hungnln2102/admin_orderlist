import { useState, useCallback } from "react";
import {
  createImportPackage,
  getImportPackageRule,
  expireImportPackage,
  type ImportPackageRule,
  type ImportPackageResult,
} from "../api/importPackageApi";
import type { ImportPackageData } from "../components/ImportPackageBlock";

type UseImportPackageSubmitOptions = {
  onSuccess?: (result: ImportPackageResult) => void;
  onError?: (error: Error) => void;
};

const EMPTY_DATA: ImportPackageData = {
  account: "",
  password: "",
  backup_email: "",
  two_fa: "",
  expires_at: "",
  note: "",
};

export const useImportPackageSubmit = (
  options: UseImportPackageSubmitOptions = {}
) => {
  const [rule, setRule] = useState<ImportPackageRule | null>(null);
  const [ruleLoading, setRuleLoading] = useState(false);
  const [data, setData] = useState<ImportPackageData>(EMPTY_DATA);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Goi khi chon san pham: lay rule, hien block neu enabled */
  const loadRule = useCallback(async (productId: number | null) => {
    if (!productId) {
      setRule(null);
      setData(EMPTY_DATA);
      return;
    }
    setRuleLoading(true);
    try {
      const r = await getImportPackageRule(productId);
      setRule(r);
    } catch {
      setRule(null);
    } finally {
      setRuleLoading(false);
    }
  }, []);

  const updateField = useCallback(
    (field: keyof ImportPackageData, value: string) => {
      setData((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const reset = useCallback(() => {
    setData(EMPTY_DATA);
    setError(null);
  }, []);

  /**
   * Submit: tao stock + package.
   * Goi sau khi da tao don hang thanh cong.
   */
  const submit = useCallback(
    async (params: {
      productId: number;
      supplierId?: number | null;
      importPrice?: number | null;
      slotLimit?: number | null;
    }) => {
      setSubmitting(true);
      setError(null);
      try {
        const result = await createImportPackage({
          productId: params.productId,
          supplierId: params.supplierId,
          importPrice: params.importPrice,
          slotLimit: params.slotLimit ?? rule?.defaultSlotLimit ?? 1,
          matchMode: rule?.defaultMatchMode ?? "information_order",
          account: data.account || null,
          password: data.password || null,
          backup_email: data.backup_email || null,
          two_fa: data.two_fa || null,
          expires_at: data.expires_at || null,
          note: data.note || null,
        });
        options.onSuccess?.(result);
        reset();
        return result;
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e.message);
        options.onError?.(e);
        return null;
      } finally {
        setSubmitting(false);
      }
    },
    [rule, data, options, reset]
  );

  /** Xu ly het han: xoa package + tuy chon xoa stock */
  const expireStock = useCallback(
    async (stockId: number, deleteStock: boolean) => {
      setSubmitting(true);
      setError(null);
      try {
        const result = await expireImportPackage(stockId, deleteStock);
        return result;
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e.message);
        return null;
      } finally {
        setSubmitting(false);
      }
    },
    []
  );

  return {
    rule,
    ruleLoading,
    data,
    submitting,
    error,
    loadRule,
    updateField,
    submit,
    expireStock,
    reset,
  };
};
