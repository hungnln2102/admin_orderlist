import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Boxes,
  Plus,
  RefreshCw,
  Search,
  Check,
  Ban,
  Trash2,
  Sparkles,
  Loader2,
  Sliders,
  Warehouse,
  Building2,
  Package,
  Layers,
  X,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { useNotification } from "@/shared/context/NotificationContext";
import { ActivationKeyRule, CatalogProductOption, SaveActivationKeyRulePayload } from "../types";

interface Props {
  warehouseProducts: CatalogProductOption[];
}

interface VariantOption {
  id: number;
  name: string;
  packageName: string;
}

interface SupplierOption {
  id: number;
  name: string;
}

export const ActivationKeyRulesTab: React.FC<Props> = ({ warehouseProducts }) => {
  const notify = useNotification();
  const [rules, setRules] = useState<ActivationKeyRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  // Modal thêm quy tắc
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [variantOptions, setVariantOptions] = useState<VariantOption[]>([]);
  const [supplierOptions, setSupplierOptions] = useState<SupplierOption[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  // Form state
  const [formData, setFormData] = useState<SaveActivationKeyRulePayload>({
    variant_id: 0,
    supplier_id: 0,
    product_name_id: warehouseProducts[0]?.id || 0,
    is_active: true,
    note: "",
  });
  const [variantSearch, setVariantSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch danh sách quy tắc
  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/products/activation-key-rules");
      const json = await res.json();
      if (res.ok && json.success) {
        setRules(json.data || []);
      } else {
        notify.error(json.message || "Không thể tải danh sách quy tắc cấp key", "Lỗi Dữ Liệu");
      }
    } catch (err: any) {
      notify.error(err.message || "Lỗi kết nối máy chủ", "Lỗi Hệ Thống");
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  // Fetch variants và suppliers cho modal
  const fetchCatalogData = useCallback(async () => {
    if (variantOptions.length > 0 && supplierOptions.length > 0) return;
    setLoadingCatalog(true);
    try {
      const [pricesRes, suppliersRes] = await Promise.all([
        fetch("/api/products/prices?limit=1000"),
        fetch("/api/products/all-suppliers"),
      ]);

      const [pricesJson, suppliersJson] = await Promise.all([
        pricesRes.json().catch(() => ({})),
        suppliersRes.json().catch(() => []),
      ]);

      if (pricesRes.ok && pricesJson.data) {
        const vList: VariantOption[] = (pricesJson.data || []).map((row: any) => ({
          id: Number(row.id),
          name: row.package_product || row.variant_name || row.display_name || `Variant #${row.id}`,
          packageName: row.san_pham || row.package_name || "Chung",
        }));
        setVariantOptions(vList);
      }

      const rawSuppliers = Array.isArray(suppliersJson) ? suppliersJson : suppliersJson.data || [];
      const sList: SupplierOption[] = rawSuppliers.map((s: any) => ({
        id: Number(s.id),
        name: s.supplier_name || s.ncc_name || `NCC #${s.id}`,
      }));
      setSupplierOptions(sList);
    } catch (err: any) {
      console.error("Lỗi tải catalog options cho rule modal:", err);
    } finally {
      setLoadingCatalog(false);
    }
  }, [variantOptions.length, supplierOptions.length]);

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setFormError(null);
    setVariantSearch("");
    setFormData({
      variant_id: 0,
      supplier_id: supplierOptions[0]?.id || 0,
      product_name_id: warehouseProducts[0]?.id || 0,
      is_active: true,
      note: "",
    });
    fetchCatalogData();
  };

  const handleToggleRule = async (rule: ActivationKeyRule) => {
    try {
      const res = await fetch(`/api/products/activation-key-rules/${rule.id}/toggle`, {
        method: "PUT",
      });
      const json = await res.json();
      if (res.ok && json.success) {
        notify.success(
          `Đã ${rule.is_active ? "tạm dừng" : "kích hoạt"} quy tắc cho ${rule.variant_name || "Variant"}!`,
          "Cập Nhật Thành Công"
        );
        setRules((prev) =>
          prev.map((r) => (r.id === rule.id ? { ...r, is_active: !r.is_active } : r))
        );
      } else {
        notify.error(json.message || "Không thể cập nhật trạng thái quy tắc", "Lỗi");
      }
    } catch (err: any) {
      notify.error(err.message || "Lỗi kết nối", "Lỗi");
    }
  };

  const handleDeleteRule = async (rule: ActivationKeyRule) => {
    if (
      !window.confirm(
        `Xác nhận xóa quy tắc tự động cấp key cho [${rule.variant_name}] + [${rule.supplier_name}]?`
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/products/activation-key-rules/${rule.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (res.ok && json.success) {
        notify.success("Đã xóa quy tắc thành công!", "Thành Công");
        setRules((prev) => prev.filter((r) => r.id !== rule.id));
      } else {
        notify.error(json.message || "Xóa quy tắc thất bại", "Lỗi");
      }
    } catch (err: any) {
      notify.error(err.message || "Lỗi kết nối", "Lỗi");
    }
  };

  const handleSubmitRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.variant_id) {
      setFormError("Vui lòng chọn Sản phẩm (Variant) áp dụng!");
      return;
    }
    if (!formData.supplier_id) {
      setFormError("Vui lòng chọn Nhà cung cấp (NCC)!");
      return;
    }
    if (!formData.product_name_id) {
      setFormError("Vui lòng chọn Kho slot đích!");
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);
      const res = await fetch("/api/products/activation-key-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Không thể lưu quy tắc cấp key.");
      }
      notify.success("Đã lưu quy tắc cấp key tự động thành công!", "Thành Công");
      setIsModalOpen(false);
      fetchRules();
    } catch (err: any) {
      setFormError(err.message || "Lỗi xử lý.");
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered rules
  const filteredRules = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rules;
    return rules.filter(
      (r) =>
        (r.variant_name && r.variant_name.toLowerCase().includes(q)) ||
        (r.variant_display_name && r.variant_display_name.toLowerCase().includes(q)) ||
        (r.product_name && r.product_name.toLowerCase().includes(q)) ||
        (r.supplier_name && r.supplier_name.toLowerCase().includes(q)) ||
        (r.target_warehouse_name && r.target_warehouse_name.toLowerCase().includes(q)) ||
        (r.note && r.note.toLowerCase().includes(q))
    );
  }, [rules, search]);

  // Filtered variant options in modal
  const filteredVariantOptions = useMemo(() => {
    const q = variantSearch.trim().toLowerCase();
    if (!q) return variantOptions.slice(0, 50);
    return variantOptions
      .filter(
        (v) =>
          v.name.toLowerCase().includes(q) ||
          v.packageName.toLowerCase().includes(q) ||
          String(v.id).includes(q)
      )
      .slice(0, 50);
  }, [variantOptions, variantSearch]);

  const activeRulesCount = rules.filter((r) => r.is_active).length;

  return (
    <div className="space-y-6">
      {/* KPI Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 backdrop-blur-xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Tổng Số Quy Tắc
            </span>
            <div className="text-2xl font-black text-white">{rules.length}</div>
          </div>
          <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Boxes className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 backdrop-blur-xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Đang Hoạt Động (Active)
            </span>
            <div className="text-2xl font-black text-emerald-400">{activeRulesCount}</div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Check className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 backdrop-blur-xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Đang Tạm Dừng
            </span>
            <div className="text-2xl font-black text-amber-400">
              {rules.length - activeRulesCount}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Ban className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Toolbar & Filter Bar */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 backdrop-blur-xl flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo Variant, NCC, Kho Slot đích..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          <button
            type="button"
            onClick={fetchRules}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Làm mới danh sách"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-cyan-400" : ""}`} />
          </button>

          <button
            type="button"
            onClick={handleOpenModal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-cyan-500/20 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Cấu Hình Cấp Key</span>
          </button>
        </div>
      </div>

      {/* Rules Table */}
      {loading && rules.length === 0 ? (
        <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-12 text-center text-slate-400 backdrop-blur-xl">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-500 mx-auto mb-3" />
          <p className="text-sm">Đang tải danh sách quy tắc cấp key...</p>
        </div>
      ) : filteredRules.length === 0 ? (
        <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-12 text-center text-slate-400 backdrop-blur-xl">
          <Sliders className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-base font-medium text-slate-300">
            {search ? "Không tìm thấy quy tắc khớp với từ khóa" : "Chưa có quy tắc cấp key nào"}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Bấm nút "+ Thêm Cấu Hình Cấp Key" phía trên để cấu hình Variant + NCC tự động sinh mã key khi tạo đơn.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-slate-900/60 rounded-2xl border border-slate-800 backdrop-blur-xl">
          <table className="w-full text-left text-xs sm:text-sm text-slate-300">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase text-[11px] tracking-wider font-semibold">
              <tr>
                <th className="py-3.5 px-4 w-12 text-center">STT</th>
                <th className="py-3.5 px-4">Sản Phẩm (Variant)</th>
                <th className="py-3.5 px-4">Nhà Cung Cấp (NCC)</th>
                <th className="py-3.5 px-4">Kho Slot Đích</th>
                <th className="py-3.5 px-4 text-center">Slot Khả Dụng</th>
                <th className="py-3.5 px-4 text-center">Trạng Thái</th>
                <th className="py-3.5 px-4">Ghi Chú</th>
                <th className="py-3.5 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredRules.map((rule, idx) => {
                const availableCount = Number(rule.available_slots_count || 0);

                return (
                  <tr key={rule.id} className="hover:bg-slate-800/40 transition-colors group">
                    {/* STT */}
                    <td className="py-3 px-4 text-center font-mono text-slate-500 text-xs">
                      {idx + 1}
                    </td>

                    {/* Sản Phẩm (Variant) */}
                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Package className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          <span className="font-semibold text-white">
                            {rule.variant_name || rule.variant_display_name || `Variant #${rule.variant_id}`}
                          </span>
                        </div>
                        {rule.product_name && (
                          <span className="inline-block text-[11px] font-medium text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                            {rule.product_name}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Nhà Cung Cấp */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-medium text-slate-200">
                        <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span>{rule.supplier_name || `NCC #${rule.supplier_id}`}</span>
                      </div>
                    </td>

                    {/* Kho Slot Đích */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-cyan-300 font-semibold">
                        <Warehouse className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>{rule.target_warehouse_name || `Kho #${rule.product_name_id}`}</span>
                      </div>
                    </td>

                    {/* Slot Khả Dụng */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {availableCount > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Còn {availableCount} slot
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                          <AlertCircle className="w-3 h-3" />
                          Hết slot!
                        </span>
                      )}
                    </td>

                    {/* Trạng Thái (Toggle Active) */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleToggleRule(rule)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                          rule.is_active
                            ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/25"
                            : "bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700/60"
                        }`}
                        title={rule.is_active ? "Bấm để tạm dừng" : "Bấm để kích hoạt"}
                      >
                        {rule.is_active ? (
                          <>
                            <ToggleRight className="w-4 h-4 text-cyan-400" />
                            <span>Bật</span>
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="w-4 h-4 text-slate-500" />
                            <span>Tắt</span>
                          </>
                        )}
                      </button>
                    </td>

                    {/* Ghi Chú */}
                    <td className="py-3 px-4 text-slate-400 text-xs max-w-[200px] truncate" title={rule.note || ""}>
                      {rule.note || "—"}
                    </td>

                    {/* Thao Tác */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleDeleteRule(rule)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Xóa cấu hình này"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Thêm Quy Tắc Mới */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-800/80 bg-slate-950/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Cấu Hình Cấp Key Tự Động</h3>
                  <p className="text-xs text-slate-400">
                    Ánh xạ cặp (Variant + NCC) vào Kho Slot đích
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitRule} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Chọn Variant */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  1. Chọn Sản Phẩm (Variant) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={variantSearch}
                  onChange={(e) => setVariantSearch(e.target.value)}
                  placeholder="Gõ để lọc variant..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-1.5 text-xs text-slate-200 mb-1.5 focus:outline-none focus:border-cyan-500 transition-colors"
                />
                <select
                  value={formData.variant_id}
                  onChange={(e) => setFormData({ ...formData, variant_id: Number(e.target.value) })}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
                >
                  <option value={0} disabled>
                    {loadingCatalog ? "-- Đang tải danh sách variant... --" : "-- Chọn Variant --"}
                  </option>
                  {filteredVariantOptions.map((v) => (
                    <option key={v.id} value={v.id}>
                      [{v.packageName}] {v.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Chọn NCC */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  2. Chọn Nhà Cung Cấp (NCC) <span className="text-rose-400">*</span>
                </label>
                <select
                  value={formData.supplier_id}
                  onChange={(e) => setFormData({ ...formData, supplier_id: Number(e.target.value) })}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
                >
                  <option value={0} disabled>-- Chọn Nhà Cung Cấp --</option>
                  {supplierOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Chọn Kho Slot Đích */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  3. Kho Slot Đích (Nơi Khách Kích Hoạt Lấy Tài Khoản) <span className="text-rose-400">*</span>
                </label>
                <select
                  value={formData.product_name_id}
                  onChange={(e) =>
                    setFormData({ ...formData, product_name_id: Number(e.target.value) })
                  }
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
                >
                  <option value={0} disabled>-- Chọn Kho Slot Đích --</option>
                  {warehouseProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Ghi Chú */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Ghi Chú (Tùy chọn)
                </label>
                <input
                  type="text"
                  value={formData.note || ""}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  placeholder="VD: Cấp key tự động cho gói ChatGPT Plus..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              {/* Trạng thái Kích Hoạt */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs font-medium text-slate-300">
                  Kích hoạt quy tắc ngay sau khi lưu
                </span>
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded text-cyan-500 bg-slate-900 border-slate-700 focus:ring-0 cursor-pointer"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-cyan-500/20 active:scale-95 transition-all disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Lưu Cấu Hình</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
