import { Routes, Route, Navigate } from "react-router-dom";
import DashboardPage from "@/features/dashboard/pages/DashboardPage";
import Orders from "@/features/orders/index.tsx";
import PackageProduct from "@/features/package-product/index.tsx";
import ProductInfo from "@/features/product-info/index.ts";
import FormInfo from "@/features/form-info/index.tsx";
import Pricing from "@/features/pricing/index.tsx";
import Sources from "@/features/supply/index.tsx";
import ShowPrice from "@/features/product-price";
import BillOrder from "@/features/bill-order/index.tsx";
import Invoices from "@/features/invoices/index.tsx";
import Warehouse from "@/features/warehouse/index.tsx";
import CtvList from "@/features/ctv-list/index.tsx";
import PromoCodes from "@/features/promo-codes/index.tsx";
import AddMcoin from "@/features/add-mcoin/index.tsx";
import ActiveKeys from "@/features/active-keys/index.tsx";
import { IpWhitelistPage } from "@/features/ip-whitelist/pages/IpWhitelistPage";
import RenewAdobeAdminPage from "@/features/renew-adobe/pages/RenewAdobeAdminPage";
import ProductSystem from "@/features/product-system/index.tsx";
import ArticlesPage from "@/features/content/pages/ArticlesPage";
import CreateArticlePage from "@/features/content/pages/CreateArticlePage";
import ArticleCategoriesPage from "@/features/content/pages/ArticleCategoriesPage";
import BannersPage from "@/features/content/pages/BannersPage";

export function AppRoutes() {
  return (
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
      <Route path="/content/categories" element={<ArticleCategoriesPage />} />
      <Route path="/content/banners" element={<BannersPage />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
