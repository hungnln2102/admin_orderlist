import React from "react";
import { BrowserRouter } from "react-router-dom";
import { AppLayout } from "@/layout/AppLayout";
import { AppRoutes } from "@/routes/AppRoutes";
import { NotificationProvider } from "@/shared/context/NotificationContext";

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <NotificationProvider>
        <AppLayout>
          <AppRoutes />
        </AppLayout>
      </NotificationProvider>
    </BrowserRouter>
  );
};

export default App;
