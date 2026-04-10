import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

const PageLoader = () => (
  <div className="flex items-center justify-center h-[60vh]">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
  </div>
);

const DashboardPage = lazy(() => import("@/features/dashboard/pages/DashboardPage"));
const Orders = lazy(() => import("@/features/orders/index.tsx"));
const PackageProduct = lazy(() => import("@/features/package-product/index.tsx"));
const ProductInfo = lazy(() => import("@/features/product-info/index.ts"));
const FormInfo = lazy(() => import("@/features/form-info/index.tsx"));
const Pricing = lazy(() => import("@/features/pricing/index.tsx"));
const Sources = lazy(() => import("@/features/supply/index.tsx"));
const ShowPrice = lazy(() => import("@/features/product-price"));
const BillOrder = lazy(() => import("@/features/bill-order/index.tsx"));
const Invoices = lazy(() => import("@/features/invoices/index.tsx"));
const Warehouse = lazy(() => import("@/features/warehouse/index.tsx"));
const CtvList = lazy(() => import("@/features/ctv-list/index.tsx"));
const PromoCodes = lazy(() => import("@/features/promo-codes/index.tsx"));
const AddMcoin = lazy(() => import("@/features/add-mcoin/index.tsx"));
const ActiveKeys = lazy(() => import("@/features/active-keys/index.tsx"));
const IpWhitelistPage = lazy(() => import("@/features/ip-whitelist/pages/IpWhitelistPage").then(m => ({ default: m.IpWhitelistPage })));
const RenewAdobeAdminPage = lazy(() => import("@/features/renew-adobe/pages/RenewAdobeAdminPage"));
const ProductSystem = lazy(() => import("@/features/product-system/index.tsx"));
const ArticlesPage = lazy(() => import("@/features/content/pages/ArticlesPage"));
const CreateArticlePage = lazy(() => import("@/features/content/pages/CreateArticlePage"));
const ArticleCategoriesPage = lazy(() => import("@/features/content/pages/ArticleCategoriesPage"));
const BannersPage = lazy(() => import("@/features/content/pages/BannersPage"));

export function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/package-products" element={<PackageProduct />} />
        <Route path="/product-info" element={<ProductInfo />} />
        <Route path="/form-info" element={<FormInfo />} />
        <Route path="/sources" element={<Sources />} />
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
        <Route path="/renew-adobe-admin" element={<RenewAdobeAdminPage />} />
        <Route path="/product-system" element={<ProductSystem />} />
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
