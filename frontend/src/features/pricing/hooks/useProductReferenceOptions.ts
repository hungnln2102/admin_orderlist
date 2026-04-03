import { useCallback, useEffect, useState } from "react";
import { API_ENDPOINTS } from "@/constants";
import type { BankOption, SupplierOption } from "../types";
import {
  normalizeBankOptions,
  normalizeSupplierOptions,
} from "./productActionHelpers";

interface UseProductReferenceOptionsParams {
  apiBase: string;
  isCreateModalOpen: boolean;
}

export function useProductReferenceOptions({
  apiBase,
  isCreateModalOpen,
}: UseProductReferenceOptionsParams) {
  const [supplierOptions, setSupplierOptions] = useState<SupplierOption[]>([]);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false);
  const [bankOptions, setBankOptions] = useState<BankOption[]>([]);
  const [isLoadingBanks, setIsLoadingBanks] = useState(false);

  const loadBankOptions = useCallback(async () => {
    if (isLoadingBanks || bankOptions.length > 0) return;
    setIsLoadingBanks(true);

    try {
      const response = await fetch(`${apiBase}${API_ENDPOINTS.BANK_LIST}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Không thể tải danh sách ngân hàng.");
      }

      const payload = await response.json();
      setBankOptions(normalizeBankOptions(payload));
    } catch (err) {
      console.error("Lỗi khi tải danh sách ngân hàng:", err);
    } finally {
      setIsLoadingBanks(false);
    }
  }, [apiBase, bankOptions.length, isLoadingBanks]);

  const loadSupplierOptions = useCallback(async () => {
    if (isLoadingSuppliers || supplierOptions.length > 0) return;
    setIsLoadingSuppliers(true);

    try {
      const response = await fetch(`${apiBase}${API_ENDPOINTS.SUPPLIES}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Không thể tải danh sách NCC.");
      }

      const payload = await response.json().catch(() => null);
      setSupplierOptions(normalizeSupplierOptions(payload));
    } catch (err) {
      console.error("Lỗi khi tải danh sách NCC:", err);
    } finally {
      setIsLoadingSuppliers(false);
    }
  }, [apiBase, isLoadingSuppliers, supplierOptions.length]);

  useEffect(() => {
    if (!isLoadingSuppliers && supplierOptions.length === 0) {
      loadSupplierOptions();
    }
  }, [isLoadingSuppliers, supplierOptions.length, loadSupplierOptions]);

  useEffect(() => {
    if (isCreateModalOpen && bankOptions.length === 0 && !isLoadingBanks) {
      loadBankOptions();
    }
    if (
      isCreateModalOpen &&
      supplierOptions.length === 0 &&
      !isLoadingSuppliers
    ) {
      loadSupplierOptions();
    }
  }, [
    isCreateModalOpen,
    bankOptions.length,
    isLoadingBanks,
    loadBankOptions,
    supplierOptions.length,
    isLoadingSuppliers,
    loadSupplierOptions,
  ]);

  return {
    supplierOptions,
    isLoadingSuppliers,
    bankOptions,
    isLoadingBanks,
    loadBankOptions,
    loadSupplierOptions,
  };
}
