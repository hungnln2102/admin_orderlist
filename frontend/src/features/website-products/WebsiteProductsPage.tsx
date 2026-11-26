import { useState } from "react";
import { FileText, Images, Package } from "lucide-react";
import { VariantDescriptionsTab } from "./components/VariantDescriptionsTab";
import { ProductImagesTab } from "./components/ProductImagesTab";
import type { WebsiteProductsTab } from "./types";

const TABS = [
  { id: "descriptions", label: "Nội dung biến thể", icon: FileText },
  { id: "images", label: "Quản lý ảnh", icon: Images },
] as const;

export function WebsiteProductsPage() {
  const [tab, setTab] = useState<WebsiteProductsTab>("descriptions");
  const [workspaceOpen, setWorkspaceOpen] = useState(false);

  return (
    <main className="mx-auto max-w-6xl space-y-5 p-4 text-slate-100 sm:p-6">
      {/* Header đồng bộ phân hệ Quản lý Website */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-cyan-900/30 shrink-0">
            <Package aria-hidden="true" className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-white">
              Thông tin sản phẩm
            </h1>
            <p className="text-xs text-slate-400">
              Quản lý mô tả hiển thị của các biến thể gói và thư viện ảnh sản phẩm trên website
            </p>
          </div>
        </div>

        {/* Segmented Control chuyển tab */}
        <div
          role="group"
          aria-label="Thông tin sản phẩm"
          className={workspaceOpen ? "hidden" : "inline-flex self-start sm:self-auto p-1 rounded-xl bg-slate-900/90 border border-slate-800 gap-1"}
        >
          {TABS.map(({ id, label, icon: Icon }) => {
            const isActive = tab === id;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={isActive}
                onClick={() => setTab(id)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? "bg-gradient-to-r from-cyan-500 to-indigo-500 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Icon aria-hidden="true" className="w-3.5 h-3.5" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {tab === "descriptions" ? <VariantDescriptionsTab onWorkspaceChange={setWorkspaceOpen} /> : <ProductImagesTab />}
    </main>
  );
}
