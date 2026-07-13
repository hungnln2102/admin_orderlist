import React, { useState } from "react";
import { GenericFormModal, FormField } from "@/shared/components/GenericModal/GenericFormModal";
import { apiPost, apiPatch } from "@/shared/api/client";

import type { BankOption, Supply } from "../types";

type SupplierFormModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mode: "create" | "edit";
  supply?: Supply | null;
  banks: BankOption[];
};

export function SupplierFormModal({
  isOpen,
  onClose,
  onSuccess,
  mode,
  supply,
  banks,
}: SupplierFormModalProps) {
  const [error, setError] = useState<string | null>(null);

  const fields: FormField[] = [
    {
      name: "sourceName",
      label: "Tên nhà cung cấp",
      type: "text",
      required: true,
      placeholder: "Nhập tên...",
      colSpan: 2,
    },
    {
      name: "numberBank",
      label: "Số tài khoản",
      type: "text",
      placeholder: "STK...",
    },
    {
      name: "accountHolder",
      label: "Chủ tài khoản",
      type: "text",
      placeholder: "Họ tên chủ STK",
    },
    {
      name: "bankBin",
      label: "Ngân hàng",
      type: "select",
      options: banks.map((b) => ({ value: b.bin, label: b.name || b.bin })),
    },
  ];

  const initialData = mode === "edit" && supply ? {
    sourceName: supply.sourceName || "",
    numberBank: supply.numberBank || "",
    accountHolder: supply.nameBank || "",
    bankBin: supply.binBank || banks[0]?.bin || "",
  } : {
    bankBin: banks[0]?.bin || "",
  };

  const handleSubmit = async (data: Record<string, any>) => {
    setError(null);
    if (!data.sourceName?.trim()) {
      setError("Tên không được để trống");
      throw new Error("Validation Error");
    }

    try {



      const payload = {
          supplier_name: data.sourceName,
          number_bank: data.numberBank,
          account_holder: data.accountHolder?.trim() || null,
          bin_bank: data.bankBin,
          status: mode === "create" ? "active" : undefined,
        };

      if (mode === "create") {
        await apiPost("/api/supplies", payload);
      } else {
        await apiPatch(`/api/supplies/${supply?.id}`, payload);
      }


      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi hệ thống");
      throw err;
    }
  };

  return (
    <GenericFormModal
      isOpen={isOpen}
      onClose={() => {
        setError(null);
        onClose();
      }}
      title={mode === "create" ? "Thêm nhà cung cấp mới" : "Chỉnh sửa thông tin NCC"}
      fields={fields}
      initialData={initialData}
      onSubmit={handleSubmit}
      submitText={mode === "create" ? "Thêm mới" : "Lưu thay đổi"}
      errorMessage={error}
    />
  );
}
