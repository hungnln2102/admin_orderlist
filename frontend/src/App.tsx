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
import PackageProduct from "./pages/Product/PackageProduct";
import ProductInfo from "./pages/Product/ProductInfo";
import Pricing from "./pages/Product/PriceList";
import { LoginPage } from "@/features/auth";
import Sources from "./pages/Personal/Supply";
import ShowPrice from "./pages/Personal/ProductPrice";
import BillOrder from "./pages/Personal/BillOrder";
import Invoices from "./pages/Personal/Invoices/index";
import Warehouse from "./pages/Personal/Storage";
import { AuthProvider, useAuth } from "./AuthContext";
import ErrorBoundary from "./components/ErrorBoundary";
import AppNotification from "./components/modals/AppNotification";

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
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <>
            <AppNotification />
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <div className="min-h-screen app-aurora">
                      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
                      <div className="transition-all duration-500 ease-in-out lg:ml-72 min-h-screen flex flex-col">
                        {/* Mobile Floating Toggle (Only visible on small screens) */}
                        {!sidebarOpen && (
                          <div className="lg:hidden fixed top-6 left-6 z-40 animate-in fade-in duration-500">
                            <button
                              onClick={() => setSidebarOpen(true)}
                              className="p-3 rounded-2xl glass-panel-light border border-white/10 text-white shadow-2xl backdrop-blur-xl"
                            >
                              <span className="sr-only">Open sidebar</span>
                              <svg
                                className="w-6 h-6"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4 6h16M4 12h16m-7 6h7"
                                />
                              </svg>
                            </button>
                          </div>
                        )}

                        <main className="flex-1 px-6 pt-4 pb-12 overflow-x-hidden">
                          <div className="max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <Routes>
                              <Route
                                path="/"
                                element={<Navigate to="/dashboard" replace />}
                              />
                              <Route path="/dashboard" element={<Dashboard />} />
                              <Route path="/orders" element={<Orders />} />
                              <Route
                                path="/package-products"
                                element={<PackageProduct />}
                              />
                              <Route path="/product-info" element={<ProductInfo />} />
                              <Route path="/sources" element={<Sources />} />
                              <Route path="/pricing" element={<Pricing />} />
                              <Route path="/bill-order" element={<BillOrder />} />
                              <Route path="/show-price" element={<ShowPrice />} />
                              <Route path="/invoices" element={<Invoices />} />
                              <Route path="/warehouse" element={<Warehouse />} />
                              <Route
                                path="*"
                                element={<Navigate to="/dashboard" replace />}
                              />
                            </Routes>
                          </div>
                        </main>
                      </div>
                    </div>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
