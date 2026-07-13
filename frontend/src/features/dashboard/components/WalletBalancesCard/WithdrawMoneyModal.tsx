import React, { useEffect, useState } from "react";
import { formatNumberOnTyping } from "@/shared/money";
import { fetchShopBankAccounts, recordShopBankAccountWithdrawal } from "@/features/shop-bank-accounts/api/shopBankAccountApi";
import type { ShopBankAccountItem } from "@/features/shop-bank-accounts/types";
import { GenericFormModal, FormField } from "@/shared/components/GenericModal/GenericFormModal";

type WithdrawMoneyModalProps = {
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

const WithdrawMoneyModal: React.FC<WithdrawMoneyModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [accounts, setAccounts] = useState<ShopBankAccountItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    fetchShopBankAccounts()
      .then((res) => {
        setAccounts(res.filter((acc) => acc.isActive));
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
      await recordShopBankAccountWithdrawal(
        Number(data.accountId),
        amountNum,
        data.reason || ""
      );

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
      label: "Chọn tài khoản nguồn",
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
      label: "Số tiền cần rút",
      type: "text",
      required: true,
      placeholder: "0",
      formatOnTyping: formatNumberOnTyping,
    },
    {
      name: "reason",
      label: "Lý do (Không bắt buộc)",
      type: "textarea",
      placeholder: "Nhập lý do rút tiền (chuyển đi đâu, tiêu việc gì)...",
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
      title="Rút Tiền Khỏi Quỹ"
      fields={fields}
      onSubmit={handleSubmit}
      submitText="Rút tiền"
      errorMessage={error}
    />
  );
};

export default WithdrawMoneyModal;
