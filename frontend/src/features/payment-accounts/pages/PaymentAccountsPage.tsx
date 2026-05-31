import { BanknotesIcon } from "@heroicons/react/24/outline";
import { useSearchParams } from "react-router-dom";
import { ShopBankAccountsPanel } from "@/features/shop-bank-accounts/components/ShopBankAccountsPanel";
import { UsdtWalletsPanel } from "@/features/usdt-wallets/components/UsdtWalletsPanel";
import { PaymentAccountsTabs } from "../components/PaymentAccountsTabs";
import type { PaymentAccountTab } from "../types";

function parseTab(value: string | null): PaymentAccountTab {
  return value === "usdt" ? "usdt" : "bank";
}

export function PaymentAccountsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = parseTab(searchParams.get("tab"));

  const handleTabChange = (tab: PaymentAccountTab) => {
    setSearchParams({ tab }, { replace: true });
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <BanknotesIcon className="h-8 w-8 text-amber-300" />
          <h1 className="text-2xl font-bold text-white">Quản lý thanh toán</h1>
        </div>
        <p className="mt-2 text-sm text-white/55">
          STK ngân hàng và ví USDT shop dùng để nhận thanh toán đơn hàng.
        </p>
      </div>

      <PaymentAccountsTabs activeTab={activeTab} onChange={handleTabChange} />

      {activeTab === "bank" ? <ShopBankAccountsPanel /> : <UsdtWalletsPanel />}
    </div>
  );
}
