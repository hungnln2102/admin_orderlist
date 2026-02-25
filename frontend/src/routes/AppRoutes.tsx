import { Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "@/pages/Dashboard/index";
import Orders from "@/pages/Product/Orders";
import PackageProduct from "@/pages/Product/PackageProduct";
import ProductInfo from "@/pages/Product/ProductInfo";
import FormInfo from "@/pages/Product/FormInfo";
import Pricing from "@/pages/Product/PriceList";
import Sources from "@/pages/Personal/Supply";
import ShowPrice from "@/pages/Personal/ProductPrice";
import BillOrder from "@/pages/Personal/BillOrder";
import Invoices from "@/pages/Personal/Invoices/index";
import Warehouse from "@/pages/Personal/Storage";
import CtvList from "@/pages/CustomerCtv/CtvList";
import PromoCodes from "@/pages/CustomerCtv/PromoCodes";
import CustomerStatus from "@/pages/CustomerCtv/CustomerStatus";
import AddMcoin from "@/pages/CustomerCtv/AddMcoin";
import ActiveKeys from "@/pages/CustomerCtv/ActiveKeys";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<Dashboard />} />
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
      <Route path="/ctv" element={<CtvList />} />
      <Route path="/promo-codes" element={<PromoCodes />} />
      <Route path="/customer-status" element={<CustomerStatus />} />
      <Route path="/add-mcoin" element={<AddMcoin />} />
      <Route path="/active-keys" element={<ActiveKeys />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
