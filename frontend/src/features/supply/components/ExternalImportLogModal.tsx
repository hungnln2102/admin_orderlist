/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from "react";
import { formatNumberOnTyping } from "@/shared/money";
import { fetchShopBankAccounts } from "@/features/wallet/shop-bank-accounts/api/shopBankAccountApi";
import type { ShopBankAccountItem } from "@/features/wallet/shop-bank-accounts/types";
import { apiPost } from "@/shared/api/client";

import { GenericFormModal, FormField } from "@/shared/components/GenericModal/GenericFormModal";

type ExternalImportLogModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

const formatShopBankAccountOption = (item: ShopBankAccountItem) => {
  const bankLabel = item.bankShortCode || item.bankBin || item.bankDisplayName;
  return [item.accountNumber, bankLabel, item.accountHolder]
    .filter(Boolean)
    .join(" - ");
};

const ExternalImportLogModal: React.FC<ExternalImportLogModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [accounts, setAccounts] = useState<ShopBankAccountItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    fetchShopBankAccounts()
      .then((items) => {
        setAccounts(items.filter((acc) => acc.isActive));
      })
      .catch(() => {
        // ignore
      });
  }, [isOpen]);

  const handleSubmit = async (data: Record<string, any>) => {
    setError(null);
    const amountNum = Number(String(data.amountInput || "").replace(/,/g, ""));
    if (!amountNum || amountNum <= 0) {
      setError("Số tiền không hợp lệ");
      throw new Error("Validation");
    }

    try {
      await apiPost("/api/store-profit-expenses", {
          expense_type: "external_import",
          shop_bank_account_id: Number(data.accountId),
          amount: amountNum,
          linked_order_code: (data.linkedOrderCode || "").trim() || null,
          reason: (data.reason || "").trim() || null,
      });


      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi hệ thống");
      throw err;
    }
  };

  const fields: FormField[] = [
    {
      name: "accountId",
      label: "Tài khoản ngân hàng nguồn",
      type: "select",
      required: true,
      colSpan: 2,
      options: accounts.map((acc) => ({
        value: acc.id,
        label: formatShopBankAccountOption(acc),
      })),
    },
    {
      name: "amountInput",
      label: "Số tiền nhập",
      type: "text",
      required: true,
      placeholder: "0",
      formatOnTyping: formatNumberOnTyping,
    },
    {
      name: "linkedOrderCode",
      label: "Mã đơn liên kết (Tuỳ chọn)",
      type: "text",
      placeholder: "Ví dụ: MAVN7JH42C1M",
    },
    {
      name: "reason",
      label: "Lý do",
      type: "textarea",
      placeholder: "Nhập lý do nhập hàng ngoài luồng...",
      colSpan: 2,
    },
  ];

  return (
    <GenericFormModal
      isOpen={isOpen}
      onClose={() => {
        setError(null);
        onClose();
      }}
      title="Tạo Log Nhập Ngoài Luồng"
      fields={fields}
      onSubmit={handleSubmit}
      submitText="Tạo log"
      errorMessage={error}
    />
  );
};

export default ExternalImportLogModal;
