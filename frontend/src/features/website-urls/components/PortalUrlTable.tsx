import React, { useState } from "react";
import { Pencil, Check, X, AlertCircle } from "lucide-react";
import { GlassCard, ToggleSwitch } from "@/shared/components";
import { normalizeSlugInput } from "../hooks/usePortalUrlsConfig";
import type { PortalRouteItem, PortalRouteKey } from "../types";

interface PortalUrlTableProps {
  basePath: string;
  defaultRouteKey: PortalRouteKey;
  items: PortalRouteItem[];
  saving: boolean;
  validateRowSlug: (key: PortalRouteKey, slug: string) => string | null;
  onSaveRow: (
    key: PortalRouteKey,
    slug: string,
    setAsDefault: boolean
  ) => Promise<boolean>;
}

export const PortalUrlTable: React.FC<PortalUrlTableProps> = ({
  basePath,
  defaultRouteKey,
  items,
  saving,
  validateRowSlug,
  onSaveRow,
}) => {
  const cleanBase = basePath.replace(/\/+$/, "");
  const [editingKey, setEditingKey] = useState<PortalRouteKey | null>(null);
  const [draftSlug, setDraftSlug] = useState("");
  const [draftDefault, setDraftDefault] = useState(false);

  const startEdit = (item: PortalRouteItem) => {
    setEditingKey(item.key);
    setDraftSlug(item.slug);
    setDraftDefault(defaultRouteKey === item.key);
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setDraftSlug("");
    setDraftDefault(false);
  };

  const submitEdit = async (key: PortalRouteKey) => {
    const ok = await onSaveRow(key, draftSlug, draftDefault);
    if (ok) {
      cancelEdit();
    }
  };

  return (
    <GlassCard className="p-0 overflow-hidden border border-slate-800/90">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900/80 border-b border-slate-800 text-xs font-bold text-slate-300">
              <th className="py-3.5 px-4 border-r border-slate-800/70 w-[180px]">Key</th>
              <th className="py-3.5 px-4 border-r border-slate-800/70">Tab / Sub-tab</th>
              <th className="py-3.5 px-4 border-r border-slate-800/70">URL</th>
              <th className="py-3.5 px-4 text-right w-[160px]">Thao tác</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800/70 text-xs">
            {items.map((item) => {
              const isEditing = editingKey === item.key;
              const isDefault = defaultRouteKey === item.key;
              const rowError = isEditing ? validateRowSlug(item.key, draftSlug) : null;

              return (
                <tr
                  key={item.key}
                  className={`transition-colors ${
                    isEditing
                      ? "bg-slate-900/70"
                      : "hover:bg-slate-900/40"
                  }`}
                >
                  {/* 1. Key */}
                  <td className="py-3 px-4 border-r border-slate-800/60 align-middle">
                    <code className="inline-block px-2 py-0.5 rounded-md bg-slate-900/90 border border-slate-800 font-mono text-[11.5px] font-semibold text-amber-300">
                      {item.key}
                    </code>
                  </td>

                  {/* 2. Tab / Sub-tab */}
                  <td className="py-3 px-4 border-r border-slate-800/60 align-middle text-slate-200 font-medium">
                    <span>{item.label}</span>
                    {isDefault && (
                      <span className="ml-1.5 italic text-cyan-400 font-normal">
                        (mặc định)
                      </span>
                    )}
                  </td>

                  {/* 3. URL */}
                  <td className="py-3 px-4 border-r border-slate-800/60 align-middle">
                    {isEditing ? (
                      <div className="space-y-2">
                        <div className="flex items-center rounded-lg border border-slate-700 bg-slate-950 focus-within:border-cyan-500 focus-within:ring-1 focus-within:ring-cyan-500/30 overflow-hidden">
                          <span className="px-2.5 py-1.5 text-[11.5px] font-mono text-slate-400 bg-slate-900 border-r border-slate-800 select-none shrink-0">
                            {cleanBase}/
                          </span>
                          <input
                            type="text"
                            autoFocus
                            value={draftSlug}
                            disabled={saving}
                            onChange={(e) => setDraftSlug(normalizeSlugInput(e.target.value))}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !rowError && !saving) {
                                void submitEdit(item.key);
                              } else if (e.key === "Escape") {
                                cancelEdit();
                              }
                            }}
                            placeholder="nhap-slug"
                            spellCheck={false}
                            className="w-full min-w-[140px] bg-transparent px-2.5 py-1.5 font-mono text-[11.5px] font-semibold text-amber-300 placeholder-slate-500 focus:outline-none"
                          />
                        </div>

                        {!isDefault && (
                          <div className="pt-0.5">
                            <ToggleSwitch
                              checked={draftDefault}
                              onChange={setDraftDefault}
                              label="Đặt làm trang mặc định"
                              variant="cyan"
                              size="sm"
                            />
                          </div>
                        )}

                        {rowError && (
                          <div className="flex items-center gap-1.5 text-[11px] font-medium text-rose-400">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{rowError}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <code className="inline-block px-2 py-0.5 rounded-md bg-slate-900/90 border border-slate-800 font-mono text-[11.5px] font-semibold text-amber-300">
                        {cleanBase}/{item.slug}
                      </code>
                    )}
                  </td>

                  {/* 4. Thao tác */}
                  <td className="py-3 px-4 text-right align-middle">
                    {isEditing ? (
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          disabled={saving || Boolean(rowError)}
                          onClick={() => void submitEdit(item.key)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30 font-semibold text-xs transition-colors disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Lưu</span>
                        </button>
                        <button
                          type="button"
                          disabled={saving}
                          onClick={cancelEdit}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Hủy</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => startEdit(item)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700/80 bg-slate-900/70 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/50 font-semibold text-xs transition-colors cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Sửa</span>
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
};
