import { Navigate } from "react-router-dom";

export function UsdtWalletsPage() {
  return <Navigate to="/payment-accounts?tab=usdt" replace />;
}
