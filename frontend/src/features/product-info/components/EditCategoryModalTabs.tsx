import React from "react";

type EditCategoryModalTabsProps = {
  activeTab: "edit" | "manage";
  onTabChange: (tab: "edit" | "manage") => void;
};

type TabButtonProps = {
  active: boolean;
  label: string;
  iconPath: string;
  onClick: () => void;
};

const TabButton: React.FC<TabButtonProps> = ({ active, label, iconPath, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-6 py-4 text-sm font-semibold transition-all relative ${
      active ? "text-indigo-400" : "text-slate-400 hover:text-slate-300"
    }`}
  >
    <span className="flex items-center gap-2">
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPath} />
      </svg>
      {label}
    </span>
    {active && (
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-500" />
    )}
  </button>
);

export const EditCategoryModalTabs: React.FC<EditCategoryModalTabsProps> = ({
  activeTab,
  onTabChange,
}) => (
  <div className="flex border-b border-white/10 px-8 bg-slate-900/50">
    <TabButton
      active={activeTab === "edit"}
      label="Chỉnh Sửa Gói"
      iconPath="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
      onClick={() => onTabChange("edit")}
    />
    <TabButton
      active={activeTab === "manage"}
      label="Quản Lý Danh Mục"
      iconPath="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
      onClick={() => onTabChange("manage")}
    />
  </div>
);
