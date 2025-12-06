import React, { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Orders from "./pages/Product/Orders";
import PackageProduct from "./pages/Product/PackageProduct";
import ProductInfo from "./pages/Product/ProductInfo";
import Pricing from "./pages/Product/Pricing";
import RetroLogin from "./pages/RetroLogin";
import Stats from "./pages/Personal/Stats";
import Sources from "./pages/Personal/Sources";
import ShowPrice from "./pages/Personal/ShowPrice";
import BillOrder from "./pages/Personal/bill-order";
import Invoices from "./pages/Personal/Invoices";
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
          <Route path="/login" element={<RetroLogin />} />
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
                        <Route path="/stats" element={<Stats />} />
                        <Route path="/sources" element={<Sources />} />
                        <Route path="/pricing" element={<Pricing />} />
                        <Route path="/bill-order" element={<BillOrder />} />
                        <Route path="/show-price" element={<ShowPrice />} />
                        <Route path="/invoices" element={<Invoices />} />
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
