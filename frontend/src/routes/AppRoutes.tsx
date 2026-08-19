import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

const PageLoader = () => (
  <div className="flex items-center justify-center h-[60vh]">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
  </div>
);

const DashboardPage = lazy(() => import("@/features/dashboard/pages/DashboardPage"));
const TaxPage = lazy(() => import("@/features/tax/pages/TaxPage"));
const TrafficPage = lazy(() => import("@/features/traffic/pages/TrafficPage"));
const Orders = lazy(() => import("@/features/orders/index.tsx"));
const CreditLogsPage = lazy(() => import("@/features/credit/index.tsx"));
const PackageProduct = lazy(() => import("@/features/products/package-product/index.tsx"));
const ProductInfo = lazy(() => import("@/features/products/product-info/index.ts"));
const FormInfo = lazy(() => import("@/features/form-info/index.tsx"));
const Pricing = lazy(() => import("@/features/products/pricing/index.tsx"));
const Sources = lazy(() => import("@/features/supply/index.tsx"));
const ExternalImportsPage = lazy(() => import("@/features/supply/pages/ExternalImportsPage.tsx"));
const ShowPrice = lazy(() => import("@/features/products/product-price"));
const BillOrder = lazy(() => import("@/features/bill-order/index.tsx"));
const Invoices = lazy(() => import("@/features/invoices/index.tsx"));
const Warehouse = lazy(() => import("@/features/warehouse/index.tsx"));
const CtvList = lazy(() => import("@/features/ctv-list/index.tsx"));
const PromoCodes = lazy(() => import("@/features/promo-codes/index.tsx"));
const AddMcoin = lazy(() => import("@/features/add-mcoin/index.tsx"));
const ActiveKeys = lazy(() => import("@/features/active-keys/index.tsx"));
const IpWhitelistPage = lazy(() => import("@/features/ip-whitelist/pages/IpWhitelistPage").then(m => ({ default: m.IpWhitelistPage })));
const PaymentAccountsPage = lazy(() =>
  import("@/features/wallet/payment-accounts/pages/PaymentAccountsPage").then((m) => ({
    default: m.PaymentAccountsPage,
  }))
);
const ShopBankAccountsPage = lazy(() =>
  import("@/features/wallet/shop-bank-accounts/pages/ShopBankAccountsPage").then((m) => ({
    default: m.ShopBankAccountsPage,
  }))
);
const UsdtWalletsPage = lazy(() =>
  import("@/features/wallet/usdt-wallets/pages/UsdtWalletsPage").then((m) => ({
    default: m.UsdtWalletsPage,
  }))
);
const RenewAdobeAdminPage = lazy(() => import("@/features/renew-adobe/pages/RenewAdobeAdminPage"));
const RenewSystemLogsPage = lazy(() => import("@/features/renew-adobe/pages/RenewSystemLogsPage"));
const RenewOrdersDeskPage = lazy(() => import("@/features/renew-adobe/desk/RenewOrdersDeskPage"));
const RenewProfileCheckDeskPage = lazy(
  () => import("@/features/renew-adobe/storefront-check/RenewProfileCheckDeskPage"),
);
const ExternalApiConfigPage = lazy(
  () => import("@/features/system-config/pages/ExternalApiConfigPage"),
);
const ArticlesPage = lazy(() => import("@/features/content/pages/ArticlesPage"));
const CreateArticlePage = lazy(() => import("@/features/content/pages/CreateArticlePage"));
const ArticleCategoriesPage = lazy(() => import("@/features/content/pages/ArticleCategoriesPage"));
const BannersPage = lazy(() => import("@/features/content/pages/BannersPage"));
const NetflixAdminPage = lazy(() => import("@/features/netflix/pages/NetflixAdminPage"));

export function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/traffic" element={<TrafficPage />} />
        <Route path="/tax" element={<TaxPage />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/credit" element={<CreditLogsPage />} />
        <Route path="/package-products" element={<PackageProduct />} />
        <Route path="/product-info" element={<ProductInfo />} />
        <Route path="/form-info" element={<FormInfo />} />
        <Route path="/sources" element={<Sources />} />
        <Route path="/external-imports" element={<ExternalImportsPage />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/bill-order" element={<BillOrder />} />
        <Route path="/show-price" element={<ShowPrice />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/warehouse" element={<Warehouse />} />
        <Route path="/customer-list" element={<CtvList />} />
        <Route path="/promo-codes" element={<PromoCodes />} />
        <Route path="/add-mcoin" element={<AddMcoin />} />
        <Route path="/active-keys" element={<ActiveKeys />} />
        <Route path="/ip-whitelist" element={<IpWhitelistPage />} />
        <Route path="/payment-accounts" element={<PaymentAccountsPage />} />
        <Route path="/shop-bank-accounts" element={<ShopBankAccountsPage />} />
        <Route path="/usdt-wallets" element={<UsdtWalletsPage />} />
        <Route path="/renew-adobe-admin" element={<RenewAdobeAdminPage />} />
        <Route path="/renew-adobe-system-logs" element={<RenewSystemLogsPage />} />
        <Route path="/renew-orders" element={<RenewOrdersDeskPage />} />
        <Route path="/renew-adobe-check" element={<RenewProfileCheckDeskPage />} />
        <Route path="/external-api-config" element={<ExternalApiConfigPage />} />
        <Route path="/netflix" element={<NetflixAdminPage />} />
        <Route path="/content/articles" element={<ArticlesPage />} />
        <Route path="/content/create" element={<CreateArticlePage />} />
        <Route path="/content/edit/:id" element={<CreateArticlePage />} />
        <Route path="/content/categories" element={<ArticleCategoriesPage />} />
        <Route path="/content/banners" element={<BannersPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
