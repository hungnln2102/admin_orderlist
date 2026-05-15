import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { LoginPage } from "@/features/auth";
import { AuthProvider } from "./AuthContext";
import ErrorBoundary from "./components/ErrorBoundary";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { MainLayout } from "./components/layout/MainLayout";
import { AppRoutes } from "./routes/AppRoutes";
import AppNotification from "./components/modals/AppNotification";
import PricingSellerPage from "@/features/pricing-seller";

function AdminApp() {
  return (
    <AuthProvider>
      <AppNotification />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <MainLayout>
                <AppRoutes />
              </MainLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route path="/pricing-seller" element={<PricingSellerPage />} />
          <Route path="/*" element={<AdminApp />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
