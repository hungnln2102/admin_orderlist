import { useState } from "react";
import { useLocation } from "react-router-dom";
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

      {isOpen && (
        <div
          className="sidebar__backdrop lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div
        className={`sidebar ${isOpen ? "sidebar--open" : "sidebar--closed"}
          fixed top-4 left-4 bottom-4 z-40 w-64 glass-panel rounded-[32px] 
          transform transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
          ${isOpen ? "translate-x-0 opacity-100" : "-translate-x-[110%] lg:translate-x-0 opacity-0 lg:opacity-100"}
          border border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)]
        `}
      >
        <div className="sidebar__inner flex flex-col h-full">
          <div className="sidebar__brand px-5 pt-6 pb-2">
            <div className="group relative overflow-hidden rounded-xl bg-gradient-to-tr from-indigo-500/10 to-purple-500/10 p-[1px] transition-all hover:scale-[1.02]">
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-600 to-purple-600 opacity-10 group-hover:opacity-20 transition-opacity"></div>
              <div className="relative rounded-[11px] bg-[#0c1222]/80 py-3 backdrop-blur-md border border-white/5 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_20%,black_80%,transparent)]">
                <div className="animate-marquee-seamless" style={{ animationDuration: '25s' }}>
                  <h1 className="text-[11px] font-bold text-white uppercase tracking-[0.2em] whitespace-nowrap px-6">
                    Mavryk <span className="text-indigo-400">Store</span>
                  </h1>
                  {/* Duplicate for seamless loop */}
                  <h1 className="text-[11px] font-bold text-white uppercase tracking-[0.2em] whitespace-nowrap px-6">
                    Mavryk <span className="text-indigo-400">Store</span>
                  </h1>
                </div>
              </div>
            </div>
          </div>

          <nav className="sidebar__nav flex-1 px-3 pb-6 overflow-y-auto space-y-2">
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
