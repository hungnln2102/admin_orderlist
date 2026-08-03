/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from "react";
import { formatNumberOnTyping } from "@/shared/money";
import { fetchShopBankAccountBalances, recordShopBankAccountWithdrawal } from "@/features/wallet/shop-bank-accounts/api/shopBankAccountApi";
import type { ShopBankAccountBalanceItem } from "@/features/wallet/shop-bank-accounts/types";
import { fetchUsdtWalletBalances, recordUsdtWalletWithdrawal } from "@/features/wallet/usdt-wallets/api/usdtWalletApi";
import type { UsdtWalletBalanceItem } from "@/features/wallet/usdt-wallets/types";
import { formatUsdtMoney } from "@/features/wallet/usdt-wallets/helpers/formatUsdtMoney";
import { GenericFormModal, FormField } from "@/shared/components/GenericModal/GenericFormModal";

import type { WalletColumn } from "../../hooks/useWalletBalances";

type WithdrawMoneyModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  walletColumns: WalletColumn[];
  currencyFormatter?: Intl.NumberFormat;
};

const WithdrawMoneyModal: React.FC<WithdrawMoneyModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  walletColumns,
  currencyFormatter,
}) => {
  const [bankBalances, setBankBalances] = useState<ShopBankAccountBalanceItem[]>([]);
  const [usdtBalances, setUsdtBalances] = useState<UsdtWalletBalanceItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    Promise.all([
      fetchShopBankAccountBalances(),
      fetchUsdtWalletBalances()
    ])
      .then(([bankRes, usdtRes]) => {
        setBankBalances(bankRes.filter((acc) => acc.isActive));
        setUsdtBalances(usdtRes.filter((w) => w.isActive));
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

    const sourceVal = String(data.accountId || "");
    if (!sourceVal) {
      setError("Vui lòng chọn tài khoản nguồn");
      throw new Error("Validation");
    }

    try {
      const targetWalletId = data.targetWalletId ? Number(data.targetWalletId) : null;
      if (sourceVal.startsWith("bank-")) {
        const bankAccountId = Number(sourceVal.replace("bank-", ""));
        await recordShopBankAccountWithdrawal(
          bankAccountId,
          amountNum,
          data.reason || "",
          targetWalletId
        );
      } else if (sourceVal.startsWith("usdt-")) {
        const usdtWalletId = Number(sourceVal.replace("usdt-", ""));
        await recordUsdtWalletWithdrawal(
          usdtWalletId,
          amountNum,
          data.reason || "",
          targetWalletId
        );
      } else {
        throw new Error("Tài khoản nguồn không hợp lệ");
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi hệ thống");
      throw err;
    }
  };

  const fmt = currencyFormatter || new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" });

  const bankOptions = bankBalances.map((acc) => {
    const bankLabel = acc.bankShortCode || acc.bankBin || acc.bankDisplayName;
    const text = [acc.accountNumber, bankLabel, acc.accountHolder]
      .filter(Boolean)
      .join(" - ");
    return {
      value: `bank-${acc.id}`,
      label: `${text} (Số dư: ${fmt.format(acc.balanceRemaining)})`,
    };
  });

  const usdtOptions = usdtBalances.map((w) => {
    return {
      value: `usdt-${w.id}`,
      label: `${w.walletAddress} (${w.network}) (Số dư: ${formatUsdtMoney(w.balanceRemaining)} USDT)`,
    };
  });

  const fields: FormField[] = [
    {
      name: "accountId",
      label: "Chọn tài khoản nguồn",
      type: "select",
      required: true,
      colSpan: 2,
      options: [...bankOptions, ...usdtOptions],
    },
    {
      name: "targetWalletId",
      label: "Chọn tài khoản nhận",
      type: "select",
      required: true,
      colSpan: 2,
      options: walletColumns
        .filter((col) => col.balanceScope !== "column_total")
        .map((col) => ({
          value: col.id,
          label: col.name,
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
