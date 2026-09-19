import React, { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return localStorage.getItem("v2_sidebar_collapsed") === "true";
  });

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("v2_sidebar_collapsed", String(next));
      return next;
    });
  };

  return (
    <div className="flex min-h-screen bg-[#0b0f19] text-slate-100 font-sans antialiased overflow-x-hidden">
      {/* Sidebar for Desktop & Mobile Overlay */}
      <Sidebar
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        isCollapsed={isCollapsed}
        onToggleCollapse={handleToggleCollapse}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 min-h-screen transition-all duration-300 ${
          isCollapsed ? "lg:ml-20" : "lg:ml-72"
        }`}
      >
        <Header
          onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
          isCollapsed={isCollapsed}
          onToggleCollapse={handleToggleCollapse}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
