import React from "react";
import { BrowserRouter } from "react-router-dom";
import { AppLayout } from "@/layout/AppLayout";
import { AppRoutes } from "@/routes/AppRoutes";
import { NotificationProvider } from "@/shared/context/NotificationContext";
import { AuthProvider } from "@/shared/context/AuthContext";

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <AppLayout>
            <AppRoutes />
          </AppLayout>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
