import React, { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Orders from "./pages/Orders";
import Inventory from "./pages/Inventory";
import Sources from "./pages/Sources";
import Pricing from "./pages/Pricing";
import Invoices from "./pages/Invoices";

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

        {/* Main content với responsive margin */}
        <div className="transition-all duration-300 ease-in-out lg:ml-64">
          {/* Mobile header space */}
          <div className="h-16 lg:hidden"></div>

          <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/sources" element={<Sources />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/invoices" element={<Invoices />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;
