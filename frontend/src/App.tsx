import React, { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import Sidebar from "./components/layout/sidebar/Sidebar";
import Dashboard from "./pages/Dashboard/index";
import Orders from "./pages/Product/Orders";
import PackageProduct from "./pages/Product/PackageProduct/PackageProduct";
import ProductInfo from "./pages/Product/ProductInfo/ProductInfo";
import Pricing from "./pages/Product/priceList";
import { LoginPage } from "@/features/auth";
import Sources from "./pages/Personal/Supply";
import ShowPrice from "./pages/Personal/ProductPrice";
import BillOrder from "./pages/Personal/BillOrder";
import Invoices from "./pages/Personal/Invoices/index";
import Warehouse from "./pages/Personal/Storage";
import { AuthProvider, useAuth } from "./AuthContext";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return null;
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <div className="min-h-screen app-aurora">
                  <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
                  <div className="transition-all duration-300 ease-in-out lg:ml-64 print-shell">
                    <div className="h-16 lg:hidden"></div>
                    <main className="p-0 pt-[10px] pl-[10px] max-w-none">
                      <Routes>
                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/orders" element={<Orders />} />
                        <Route path="/package-products" element={<PackageProduct />} />
                        <Route path="/product-info" element={<ProductInfo />} />
                        <Route path="/sources" element={<Sources />} />
                        <Route path="/pricing" element={<Pricing />} />
                        <Route path="/bill-order" element={<BillOrder />} />
                        <Route path="/show-price" element={<ShowPrice />} />
                        <Route path="/invoices" element={<Invoices />} />
                        <Route path="/warehouse" element={<Warehouse />} />
                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
                      </Routes>
                    </main>
                  </div>
                </div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
