import React from "react";
import { Link } from "react-router-dom";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { MenuSection } from "./menuConfig";
import { matchesHref } from "./sidebarUtils";

type SidebarMenuSectionProps = {
  section: MenuSection;
  isStaticSection: boolean;
  isOpenSection: boolean;
  currentPath: string;
  currentSearch: string;
  onToggle: (title: string) => void;
  onNavigate: () => void;
};

const SidebarMenuSection: React.FC<SidebarMenuSectionProps> = ({
  section,
  isStaticSection,
  isOpenSection,
  currentPath,
  currentSearch,
  onToggle,
  onNavigate,
}) => {
  const isSectionActive = section.items.some(
    (item) =>
      currentPath === item.href ||
      matchesHref(currentPath, currentSearch, item.href)
  );

  return (
    <div
      className={`w-full rounded-2xl border border-white/10 bg-white/5 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.45)] backdrop-blur-sm mb-3 ${
        isSectionActive ? "ring-2 ring-indigo-500/40" : ""
      }`}
    >
      {isStaticSection ? (
        <div className="space-y-1 px-2 py-1">
          {section.items.map((item) => {
            const isActive =
              currentPath === item.href ||
              matchesHref(currentPath, currentSearch, item.href);
            return (
              <div key={item.name} className="space-y-2">
                <Link
                  to={item.href}
                  onClick={onNavigate}
                  className={`
                    group flex items-center gap-3 px-3 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200
                    ${
                      isActive
                        ? "bg-gradient-to-r from-indigo-500 to-blue-500 text-white shadow-lg shadow-indigo-900/40"
                        : "text-indigo-100/90 hover:bg-white/10 hover:text-white"
                    }
                  `}
                >
                  <item.icon
                    className={`h-5 w-5 transition-colors ${
                      isActive
                        ? "text-white"
                        : "text-indigo-200 group-hover:text-white"
                    }`}
                  />
                  {item.name}
                </Link>
              </div>
            );
          })}
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => onToggle(section.title)}
            className="w-full px-4 py-2.5 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-100 hover:text-white transition bg-white/5 rounded-lg"
          >
            <span>{section.title}</span>
            <ChevronDownIcon
              className={`h-4 w-4 transition-transform ${
                isOpenSection ? "rotate-180" : ""
              }`}
            />
          </button>
          {isOpenSection && (
            <div className="space-y-1 px-2.5 py-2">
              {section.items.map((item) => {
                const isActive =
                  currentPath === item.href ||
                  matchesHref(currentPath, currentSearch, item.href);
                return (
                  <div key={item.name} className="space-y-2">
                    <Link
                      to={item.href}
                      onClick={onNavigate}
                      className={`
                        group flex items-center gap-3 px-3 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200
                        ${
                          isActive
                            ? "bg-gradient-to-r from-indigo-500 to-blue-500 text-white shadow-lg shadow-indigo-900/40"
                            : "text-indigo-100/90 hover:bg-white/10 hover:text-white"
                        }
                      `}
                    >
                      <item.icon
                        className={`h-5 w-5 transition-colors ${
                          isActive
                            ? "text-white"
                            : "text-indigo-200 group-hover:text-white"
                        }`}
                      />
                      {item.name}
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SidebarMenuSection;
