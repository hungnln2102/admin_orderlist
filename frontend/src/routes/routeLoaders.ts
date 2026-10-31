import type { ComponentType } from "react";

type RouteModule = { default: ComponentType };
type RouteImporter = () => Promise<RouteModule>;

export const routeLoaders: Record<string, RouteImporter> = {
  "/dashboard": () => import("@/features/dashboard/DashboardPage").then((module) => ({ default: module.DashboardPage })),
  "/finance": () => import("@/features/finance/FinanceHubPage").then((module) => ({ default: module.FinanceHubPage })),
  "/traffic": () => import("@/features/traffic/TrafficPage").then((module) => ({ default: module.TrafficPage })),
  "/orders": () => import("@/pages/OrdersPage").then((module) => ({ default: module.OrdersPage })),
  "/credit": () => import("@/pages/CreditPage").then((module) => ({ default: module.CreditPage })),
  "/invoices": () => import("@/pages/ReceiptsPage").then((module) => ({ default: module.ReceiptsPage })),
  "/package-products": () => import("@/features/packages/PackageManagementPage").then((module) => ({ default: module.PackageManagementPage })),
  "/pricing": () => import("@/pages/PricingPage").then((module) => ({ default: module.PricingPage })),
  "/sources": () => import("@/pages/SuppliersPage").then((module) => ({ default: module.SuppliersPage })),
  "/external-imports": () => import("@/pages/ExternalImportsPage").then((module) => ({ default: module.ExternalImportsPage })),
  "/warehouse": () => import("@/pages/WarehousePage").then((module) => ({ default: module.WarehousePage })),
  "/system-config": () => import("@/pages/SystemPage").then((module) => ({ default: module.SystemPage })),
  "/system-logs": () => import("@/pages/SystemLogsPage").then((module) => ({ default: module.SystemLogsPage })),
  "/shop-bank-accounts": () => import("@/pages/PaymentWalletsPage").then((module) => ({ default: module.PaymentWalletsPage })),
  "/external-api-config": () => import("@/pages/ExternalApiConfigPage").then((module) => ({ default: module.ExternalApiConfigPage })),
};

const preloadedPaths = new Set<string>();

export function preloadRoute(path: string) {
  if (preloadedPaths.has(path)) return;
  const loader = routeLoaders[path];
  if (!loader) return;

  preloadedPaths.add(path);
  void loader().catch(() => preloadedPaths.delete(path));
}
