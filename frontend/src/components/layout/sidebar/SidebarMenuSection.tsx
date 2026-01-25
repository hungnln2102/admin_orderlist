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
      className={`w-full rounded-2xl border border-white/5 bg-white/0 mb-3 transition-all duration-500 ${
        isSectionActive ? "ring-1 ring-indigo-500/30 bg-indigo-500/5 shadow-[0_20px_40px_-15px_rgba(79,70,229,0.15)]" : ""
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
                    group flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]
                    ${
                      isActive
                        ? "bg-indigo-500/20 text-white border border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.2)]"
                        : "text-indigo-100/70 hover:bg-white/5 hover:text-white border border-transparent"
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
                        group flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]
                        ${
                          isActive
                            ? "bg-indigo-500/20 text-white border border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.2)]"
                            : "text-indigo-100/70 hover:bg-white/5 hover:text-white border border-transparent"
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
