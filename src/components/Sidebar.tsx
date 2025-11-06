import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ChartBarIcon,
  ShoppingBagIcon,
  CubeIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  DocumentIcon,
  XMarkIcon,
  Bars3Icon,
} from "@heroicons/react/24/outline";

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

type MenuItem = {
  name: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  children?: { name: string; href: string }[];
};

const menuItems: MenuItem[] = [
  { name: "T?ng quan", href: "/dashboard", icon: ChartBarIcon },
  { name: "Ðon hàng", href: "/orders", icon: ShoppingBagIcon },
  {
    name: "S?n ph?m Gói",
    href: "/packet-products",
    icon: CubeIcon,
    children: [
      { name: "T?t c? gói", href: "/packet-products" },
      { name: "Gói slot th?p", href: "/packet-products?view=low" },
      { name: "Gói h?t slot", href: "/packet-products?view=out" },
    ],
  },
  { name: "Ngu?n thông tin", href: "/sources", icon: DocumentTextIcon },
  { name: "B?ng giá", href: "/pricing", icon: CurrencyDollarIcon },
  { name: "Biên lai", href: "/invoices", icon: DocumentIcon },
];

const matchesHref = (currentPath: string, currentSearch: string, targetHref: string) => {
  const [path, query] = targetHref.split("?");
  const search = query ? `?${query}` : "";
  if (currentPath !== path) return false;
  return currentSearch === search;
};

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const location = useLocation();

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
          fixed top-0 left-0 z-40 w-64 h-full bg-white shadow-xl border-r border-gray-200
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-center h-16 px-4 bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg">
            <h1 className="text-xl font-bold text-white">Admin Orderlist</h1>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-4 overflow-y-auto">
            {menuItems.map((item) => {
              const childActive = item.children?.some((child) =>
                matchesHref(location.pathname, location.search, child.href)
              );
              const isActive =
                matchesHref(location.pathname, location.search, item.href) || childActive;

              return (
                <div key={item.name} className="space-y-2">
                  <Link
                    to={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`
                      flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200
                      group relative
                      ${
                        isActive
                          ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg transform scale-105"
                          : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                      }
                    `}
                  >
                    <item.icon
                      className={`mr-3 h-5 w-5 ${
                        isActive
                          ? "text-white"
                          : "text-gray-500 group-hover:text-gray-700"
                      }`}
                    />
                    {item.name}
                    {isActive && (
                      <div className="absolute right-2 w-2 h-2 bg-white rounded-full" />
                    )}
                  </Link>

                  {item.children && (
                    <div className="ml-11 space-y-1">
                      {item.children.map((child) => {
                        const childIsActive = matchesHref(
                          location.pathname,
                          location.search,
                          child.href
                        );
                        return (
                          <Link
                            key={child.name}
                            to={child.href}
                            onClick={() => setIsOpen(false)}
                            className={`block rounded-lg px-3 py-2 text-xs font-medium transition ${
                              childIsActive
                                ? "bg-blue-50 text-blue-600"
                                : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                            }`}
                          >
                            {child.name}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center shadow-md">
                <span className="text-white text-sm font-bold">A</span>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">
                  Mavryk Admin
                </p>
                <p className="text-xs text-gray-500 truncate">
                  admink@mavrykpremium.store
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
