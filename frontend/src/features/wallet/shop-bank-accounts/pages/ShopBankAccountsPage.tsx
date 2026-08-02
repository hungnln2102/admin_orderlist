import { Navigate } from "react-router-dom";

export function ShopBankAccountsPage() {
  return <Navigate to="/payment-accounts?tab=bank" replace />;
}
