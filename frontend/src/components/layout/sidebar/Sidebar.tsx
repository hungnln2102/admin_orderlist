import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import { XMarkIcon, Bars3Icon } from "@heroicons/react/24/outline";
import { useAuth } from "../../../AuthContext";
import { menuSections } from "./menuConfig";
import SidebarMenuSection from "./SidebarMenuSection";
import SidebarAccount from "./SidebarAccount";
import ChangePasswordModal from "./ChangePasswordModal";

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const location = useLocation();
  const { user, setUser } = useAuth();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    () =>
      Object.fromEntries(menuSections.map((section) => [section.title, true]))
  );
  const [showChangePassword, setShowChangePassword] = useState(false);

  const toggleSection = (title: string) => {
    setOpenSections((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      /* ignore */
    } finally {
      setUser(null);
      window.location.href = "/login";
    }
  };

  const openChangePassword = () => {
    setShowChangePassword(true);
  };

  const closeChangePassword = () => {
    setShowChangePassword(false);
  };

  return (
    <>
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-white p-2 rounded-lg shadow-lg border border-gray-200"
        >
          {isOpen ? (
            <XMarkIcon className="h-6 w-6 text-gray-600" />
          ) : (
            <Bars3Icon className="h-6 w-6 text-gray-600" />
          )}
        </button>
      </div>

      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div
        className={`
          fixed top-0 left-0 z-40 w-64 h-full bg-gradient-to-b from-[#0c1230] via-[#141a3c] to-[#0a0e24] shadow-2xl border-r border-white/10
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
      >
        <div className="flex flex-col h-full">
          <div className="px-4 pt-6 pb-4">
            <div className="rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-3 shadow-lg shadow-indigo-900/50 text-center border border-white/10">
              <h1 className="text-lg font-bold text-white tracking-wide">
                Admin Orderlist
              </h1>
              <p className="text-[11px] text-indigo-100/90 mt-1 font-medium uppercase tracking-[0.08em]">
                Control Panel
              </p>
            </div>
          </div>

          <nav className="flex-1 px-3 pb-6 overflow-y-auto space-y-2">
            {menuSections.map((section, index) => (
              <SidebarMenuSection
                key={section.title}
                section={section}
                isStaticSection={index === 0}
                isOpenSection={openSections[section.title] ?? true}
                currentPath={location.pathname}
                currentSearch={location.search}
                onToggle={toggleSection}
                onNavigate={() => setIsOpen(false)}
              />
            ))}
          </nav>

          <SidebarAccount
            user={user}
            onLogout={handleLogout}
            onChangePassword={openChangePassword}
          />
        </div>
      </div>

      <ChangePasswordModal
        isOpen={showChangePassword}
        onClose={closeChangePassword}
      />
    </>
  );
}
