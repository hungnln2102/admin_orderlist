import React, { Suspense } from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/shared/context/AuthContext";

// Code-splitting bằng React.lazy giúp tối ưu tải trang và giảm bundle size ban đầu
const DashboardPage = React.lazy(() => import("@/features/dashboard/DashboardPage").then(m => ({ default: m.DashboardPage })));
const OrdersPage = React.lazy(() => import("@/pages/OrdersPage").then(m => ({ default: m.OrdersPage })));
const PricingPage = React.lazy(() => import("@/pages/PricingPage").then(m => ({ default: m.PricingPage })));
const SuppliersPage = React.lazy(() => import("@/pages/SuppliersPage").then(m => ({ default: m.SuppliersPage })));
const CreditPage = React.lazy(() => import("@/pages/CreditPage").then(m => ({ default: m.CreditPage })));
const PaymentWalletsPage = React.lazy(() => import("@/pages/PaymentWalletsPage").then(m => ({ default: m.PaymentWalletsPage })));
const PackageManagementPage = React.lazy(() => import("@/features/packages/PackageManagementPage").then(m => ({ default: m.PackageManagementPage })));
const LoginPage = React.lazy(() => import("@/features/auth/pages/LoginPage").then(m => ({ default: m.LoginPage })));
const WarehousePage = React.lazy(() => import("@/pages/WarehousePage").then(m => ({ default: m.WarehousePage })));
const ReceiptsPage = React.lazy(() => import("@/pages/ReceiptsPage").then(m => ({ default: m.ReceiptsPage })));
const SystemPage = React.lazy(() => import("@/pages/SystemPage").then(m => ({ default: m.SystemPage })));
const FinanceHubPage = React.lazy(() => import("@/features/finance/FinanceHubPage").then(m => ({ default: m.FinanceHubPage })));
const TrafficPage = React.lazy(() => import("@/features/traffic/TrafficPage").then(m => ({ default: m.TrafficPage })));
const ExternalImportsPage = React.lazy(() => import("@/pages/ExternalImportsPage").then(m => ({ default: m.ExternalImportsPage })));
const SystemLogsPage = React.lazy(() => import("@/pages/SystemLogsPage").then(m => ({ default: m.SystemLogsPage })));
const ExternalApiConfigPage = React.lazy(() => import("@/pages/ExternalApiConfigPage").then(m => ({ default: m.ExternalApiConfigPage })));

const PageLoadingSpinner = () => (
  <div className="min-h-[60vh] flex items-center justify-center text-slate-400">
    <div className="flex items-center gap-3">
      <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      <span className="text-sm font-medium">Đang tải trang...</span>
    </div>
  </div>
);

const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center text-slate-400 font-sans">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Đang kiểm tra quyền truy cập...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

const PublicOnlyRoute: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<PageLoadingSpinner />}>
      <Routes>
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />

          {/* 1. Tổng quan & Báo cáo */}
          <Route path="/finance" element={<FinanceHubPage />} />
          <Route path="/traffic" element={<TrafficPage />} />

          {/* 2. Bán hàng & Đơn hàng */}
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/credit" element={<CreditPage />} />
          <Route path="/invoices" element={<ReceiptsPage />} />

          {/* 3. Danh mục Sản phẩm & Giá */}
          <Route path="/package-products" element={<PackageManagementPage />} />
          <Route path="/pricing" element={<PricingPage />} />

          {/* 4. Nguồn hàng & Kho */}
          <Route path="/sources" element={<SuppliersPage />} />
          <Route path="/external-imports" element={<ExternalImportsPage />} />
          <Route path="/warehouse" element={<WarehousePage />} />

          {/* 5. Hệ thống & Ví */}
          <Route path="/system-config" element={<SystemPage />} />
          <Route path="/system-logs" element={<SystemLogsPage />} />
          <Route path="/shop-bank-accounts" element={<PaymentWalletsPage />} />
          <Route path="/payment-accounts" element={<Navigate to="/shop-bank-accounts" replace />} />
          <Route path="/usdt-wallets" element={<Navigate to="/shop-bank-accounts" replace />} />
          <Route path="/external-api-config" element={<ExternalApiConfigPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
};
