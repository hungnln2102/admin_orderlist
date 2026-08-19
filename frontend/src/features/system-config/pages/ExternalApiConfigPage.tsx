/* eslint-disable max-lines */
import { useState, useEffect, useCallback } from "react";
import { API_ENDPOINTS } from "@/constants";
import { apiFetch } from "@/shared/api/client";
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  SignalIcon,
  XMarkIcon,
  GlobeAltIcon,
  ServerStackIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

/* ── Types ──────────────────────────────────────────────────── */
interface FieldMapping {
  key: string;
  label: string;
  path: string;
}

interface EndpointEntry {
  key: string;
  value: string;
}

interface ExternalApiConfig {
  id: number;
  service_key: string;
  service_name: string;
  description: string;
  base_url: string;
  endpoints: Record<string, string>;
  auth_config: Record<string, unknown>;
  field_mapping: FieldMapping[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const EMPTY_FORM: Omit<ExternalApiConfig, "id" | "created_at" | "updated_at"> = {
  service_key: "",
  service_name: "",
  description: "",
  base_url: "",
  endpoints: {},
  auth_config: {},
  field_mapping: [],
  is_active: true,
};

/* ── Page Component ─────────────────────────────────────────── */
export default function ExternalApiConfigPage() {
  const [configs, setConfigs] = useState<ExternalApiConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [endpointRows, setEndpointRows] = useState<EndpointEntry[]>([]);
  const [fieldMappingRows, setFieldMappingRows] = useState<FieldMapping[]>([]);
  const [authConfigJson, setAuthConfigJson] = useState("{}");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Test
  const [testingId, setTestingId] = useState<number | null>(null);
  const [testResults, setTestResults] = useState<Record<number, { reachable: boolean; status: number; responseTimeMs: number | null; statusText: string } | null>>({});

  // Delete confirm
  const [deletingId, setDeletingId] = useState<number | null>(null);

  /* ── Fetch all configs ──────────────────────────────────── */
  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(API_ENDPOINTS.SYSTEM_CONFIG_EXTERNAL_APIS);
      const data = await res.json();
      if (data.success) {
        setConfigs(data.configs || []);
      } else {
        setError(data.error || "Không tải được danh sách cấu hình.");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  /* ── Open modal ─────────────────────────────────────────── */
  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setEndpointRows([]);
    setFieldMappingRows([]);
    setAuthConfigJson("{}");
    setFormError(null);
    setShowModal(true);
  };

  const openEdit = (config: ExternalApiConfig) => {
    setEditingId(config.id);
    setForm({
      service_key: config.service_key,
      service_name: config.service_name,
      description: config.description || "",
      base_url: config.base_url,
      endpoints: config.endpoints || {},
      auth_config: config.auth_config || {},
      field_mapping: config.field_mapping || [],
      is_active: config.is_active,
    });
    setEndpointRows(
      Object.entries(config.endpoints || {}).map(([key, value]) => ({ key, value }))
    );
    setFieldMappingRows(config.field_mapping || []);
    setAuthConfigJson(JSON.stringify(config.auth_config || {}, null, 2));
    setFormError(null);
    setShowModal(true);
  };

  /* ── Save ────────────────────────────────────────────────── */
  const handleSave = async () => {
    setSaving(true);
    setFormError(null);
    setSuccessMsg(null);

    // Build endpoints object
    const endpoints: Record<string, string> = {};
    for (const row of endpointRows) {
      if (row.key.trim()) endpoints[row.key.trim()] = row.value.trim();
    }

    // Parse auth_config
    let authConfig: Record<string, unknown> = {};
    try {
      authConfig = JSON.parse(authConfigJson);
    } catch {
      setFormError("Auth Config JSON không hợp lệ.");
      setSaving(false);
      return;
    }

    const payload = {
      ...form,
      endpoints,
      auth_config: authConfig,
      field_mapping: fieldMappingRows.filter((f) => f.key.trim()),
    };

    try {
      const url = editingId
        ? API_ENDPOINTS.SYSTEM_CONFIG_EXTERNAL_API_BY_ID(editingId)
        : API_ENDPOINTS.SYSTEM_CONFIG_EXTERNAL_APIS;
      const method = editingId ? "PUT" : "POST";

      const res = await apiFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(data.message || "Đã lưu thành công.");
        setShowModal(false);
        fetchConfigs();
      } else {
        setFormError(data.error || "Lỗi khi lưu.");
      }
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  /* ── Delete ──────────────────────────────────────────────── */
  const handleDelete = async (id: number) => {
    setSuccessMsg(null);
    try {
      const res = await apiFetch(API_ENDPOINTS.SYSTEM_CONFIG_EXTERNAL_API_BY_ID(id), {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg("Đã xóa cấu hình.");
        fetchConfigs();
      } else {
        setError(data.error || "Lỗi khi xóa.");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDeletingId(null);
    }
  };

  /* ── Test connection ─────────────────────────────────────── */
  const handleTest = async (id: number) => {
    setTestingId(id);
    setTestResults((prev) => ({ ...prev, [id]: null }));
    try {
      const res = await apiFetch(API_ENDPOINTS.SYSTEM_CONFIG_EXTERNAL_API_TEST(id), {
        method: "POST",
      });
      const data = await res.json();
      if (data.success && data.test) {
        setTestResults((prev) => ({ ...prev, [id]: data.test }));
      }
    } catch {
      setTestResults((prev) => ({
        ...prev,
        [id]: { reachable: false, status: 0, responseTimeMs: null, statusText: "Lỗi kết nối" },
      }));
    } finally {
      setTestingId(null);
    }
  };

  /* ── Endpoint row helpers ────────────────────────────────── */
  const addEndpointRow = () =>
    setEndpointRows((prev) => [...prev, { key: "", value: "" }]);
  const removeEndpointRow = (idx: number) =>
    setEndpointRows((prev) => prev.filter((_, i) => i !== idx));
  const updateEndpointRow = (idx: number, field: "key" | "value", val: string) =>
    setEndpointRows((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, [field]: val } : row))
    );

  /* ── Field mapping helpers ───────────────────────────────── */
  const addFieldMapping = () =>
    setFieldMappingRows((prev) => [...prev, { key: "", label: "", path: "" }]);
  const removeFieldMapping = (idx: number) =>
    setFieldMappingRows((prev) => prev.filter((_, i) => i !== idx));
  const updateFieldMapping = (idx: number, field: keyof FieldMapping, val: string) =>
    setFieldMappingRows((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, [field]: val } : row))
    );

  /* ── Render ──────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 p-3 border border-violet-500/20">
              <ServerStackIcon className="h-8 w-8 text-violet-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-200 to-fuchsia-200">
                Cấu hình API bên ngoài
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Quản lý domain, endpoint và xác thực cho các dịch vụ API bên ngoài
              </p>
            </div>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold px-5 py-2.5 text-sm transition-all shadow-lg shadow-violet-500/20"
          >
            <PlusIcon className="h-5 w-5" />
            Thêm dịch vụ
          </button>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 p-3 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-300 text-sm">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-300 text-sm">
            {successMsg}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-violet-500/30 border-t-violet-400" />
            <p className="mt-4 text-sm text-slate-400">Đang tải danh sách cấu hình...</p>
          </div>
        ) : configs.length === 0 ? (
          <div className="text-center py-20">
            <GlobeAltIcon className="h-16 w-16 text-slate-600 mx-auto" />
            <p className="mt-4 text-slate-400">Chưa có cấu hình nào. Nhấn "Thêm dịch vụ" để bắt đầu.</p>
          </div>
        ) : (
          /* ── Config cards grid ──────────────────────────── */
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {configs.map((cfg) => (
              <div
                key={cfg.id}
                className={`rounded-2xl border backdrop-blur-sm p-5 transition-all hover:shadow-lg ${
                  cfg.is_active
                    ? "bg-gradient-to-br from-slate-900/80 via-slate-800/50 to-slate-900/80 border-white/10 hover:border-violet-500/30"
                    : "bg-slate-900/40 border-slate-700/30 opacity-60"
                }`}
              >
                {/* Card header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-100 truncate">
                        {cfg.service_name}
                      </h3>
                      {cfg.is_active ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 font-mono mt-1">{cfg.service_key}</p>
                  </div>
                </div>

                {/* Description */}
                {cfg.description && (
                  <p className="text-xs text-slate-400 mb-3 line-clamp-2">{cfg.description}</p>
                )}

                {/* Base URL */}
                <div className="mb-3">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Base URL</span>
                  <p className="text-xs font-mono text-violet-300 mt-0.5 truncate">{cfg.base_url}</p>
                </div>

                {/* Endpoints count */}
                {cfg.endpoints && Object.keys(cfg.endpoints).length > 0 && (
                  <div className="mb-3">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Endpoints</span>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {Object.keys(cfg.endpoints).map((ep) => (
                        <span
                          key={ep}
                          className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 border border-white/5 font-mono"
                        >
                          {ep}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Test result */}
                {testResults[cfg.id] && (
                  <div
                    className={`mb-3 p-2.5 rounded-xl text-xs border ${
                      testResults[cfg.id]!.reachable
                        ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-300"
                        : "border-rose-500/20 bg-rose-500/5 text-rose-300"
                    }`}
                  >
                    {testResults[cfg.id]!.reachable ? (
                      <span className="flex items-center gap-1.5">
                        <CheckCircleIcon className="h-4 w-4" />
                        Kết nối OK — Status {testResults[cfg.id]!.status} ({testResults[cfg.id]!.responseTimeMs}ms)
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5">
                        <ExclamationTriangleIcon className="h-4 w-4" />
                        Lỗi: {testResults[cfg.id]!.statusText}
                      </span>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-3 border-t border-white/5">
                  <button
                    onClick={() => openEdit(cfg)}
                    className="flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-violet-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-violet-500/10"
                  >
                    <PencilSquareIcon className="h-4 w-4" />
                    Sửa
                  </button>
                  <button
                    onClick={() => handleTest(cfg.id)}
                    disabled={testingId === cfg.id}
                    className="flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-sky-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-sky-500/10 disabled:opacity-50"
                  >
                    <SignalIcon className="h-4 w-4" />
                    {testingId === cfg.id ? "Testing..." : "Test"}
                  </button>
                  {deletingId === cfg.id ? (
                    <div className="flex items-center gap-1.5 ml-auto">
                      <span className="text-xs text-rose-300">Xóa?</span>
                      <button
                        onClick={() => handleDelete(cfg.id)}
                        className="text-xs font-bold text-rose-400 hover:text-rose-300 px-2 py-1 rounded-lg hover:bg-rose-500/10"
                      >
                        Đồng ý
                      </button>
                      <button
                        onClick={() => setDeletingId(null)}
                        className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1 rounded-lg hover:bg-slate-500/10"
                      >
                        Hủy
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeletingId(cfg.id)}
                      className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-rose-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-rose-500/10 ml-auto"
                    >
                      <TrashIcon className="h-4 w-4" />
                      Xóa
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Modal ──────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-white/5">
              <h2 className="text-lg font-bold text-slate-100">
                {editingId ? "Sửa cấu hình" : "Thêm cấu hình mới"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Service Key */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Service Key <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.service_key}
                  onChange={(e) => setForm((p) => ({ ...p, service_key: e.target.value }))}
                  placeholder="vd: yuna_2fa"
                  disabled={!!editingId}
                  className="w-full px-4 py-2.5 border border-white/10 rounded-xl bg-slate-950/40 text-sm text-slate-200 placeholder:text-slate-500 focus:ring-2 focus:ring-violet-500/50 focus:border-violet-400 outline-none transition-all font-mono disabled:opacity-50"
                />
              </div>

              {/* Service Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Tên dịch vụ <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.service_name}
                  onChange={(e) => setForm((p) => ({ ...p, service_name: e.target.value }))}
                  placeholder="vd: Yuna 2FA Center"
                  className="w-full px-4 py-2.5 border border-white/10 rounded-xl bg-slate-950/40 text-sm text-slate-200 placeholder:text-slate-500 focus:ring-2 focus:ring-violet-500/50 focus:border-violet-400 outline-none transition-all"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Mô tả
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Mô tả mục đích sử dụng..."
                  rows={2}
                  className="w-full px-4 py-2.5 border border-white/10 rounded-xl bg-slate-950/40 text-sm text-slate-200 placeholder:text-slate-500 focus:ring-2 focus:ring-violet-500/50 focus:border-violet-400 outline-none transition-all resize-none"
                />
              </div>

              {/* Base URL */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Base URL <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.base_url}
                  onChange={(e) => setForm((p) => ({ ...p, base_url: e.target.value }))}
                  placeholder="https://example.com/api"
                  className="w-full px-4 py-2.5 border border-white/10 rounded-xl bg-slate-950/40 text-sm text-slate-200 placeholder:text-slate-500 focus:ring-2 focus:ring-violet-500/50 focus:border-violet-400 outline-none transition-all font-mono"
                />
              </div>

              {/* Endpoints (dynamic key-value) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Endpoints
                  </label>
                  <button
                    type="button"
                    onClick={addEndpointRow}
                    className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                  >
                    + Thêm endpoint
                  </button>
                </div>
                <div className="space-y-2">
                  {endpointRows.map((row, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="text"
                        value={row.key}
                        onChange={(e) => updateEndpointRow(idx, "key", e.target.value)}
                        placeholder="key"
                        className="w-1/3 px-3 py-2 border border-white/10 rounded-lg bg-slate-950/40 text-xs text-slate-200 placeholder:text-slate-500 focus:ring-1 focus:ring-violet-500/50 outline-none font-mono"
                      />
                      <input
                        type="text"
                        value={row.value}
                        onChange={(e) => updateEndpointRow(idx, "value", e.target.value)}
                        placeholder="URL hoặc path"
                        className="flex-1 px-3 py-2 border border-white/10 rounded-lg bg-slate-950/40 text-xs text-slate-200 placeholder:text-slate-500 focus:ring-1 focus:ring-violet-500/50 outline-none font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => removeEndpointRow(idx)}
                        className="px-2 py-2 text-slate-400 hover:text-rose-400 transition-colors"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  {endpointRows.length === 0 && (
                    <p className="text-xs text-slate-500 italic">Chưa có endpoint phụ nào.</p>
                  )}
                </div>
              </div>

              {/* Auth Config (JSON editor) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Auth Config (JSON)
                </label>
                <textarea
                  value={authConfigJson}
                  onChange={(e) => setAuthConfigJson(e.target.value)}
                  rows={4}
                  spellCheck={false}
                  className="w-full px-4 py-2.5 border border-white/10 rounded-xl bg-slate-950/40 text-xs text-slate-200 placeholder:text-slate-500 focus:ring-2 focus:ring-violet-500/50 focus:border-violet-400 outline-none transition-all font-mono resize-none"
                />
              </div>

              {/* Field Mapping (dynamic) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Field Mapping
                  </label>
                  <button
                    type="button"
                    onClick={addFieldMapping}
                    className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                  >
                    + Thêm field
                  </button>
                </div>
                <div className="space-y-2">
                  {fieldMappingRows.map((row, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="text"
                        value={row.key}
                        onChange={(e) => updateFieldMapping(idx, "key", e.target.value)}
                        placeholder="key"
                        className="w-1/4 px-3 py-2 border border-white/10 rounded-lg bg-slate-950/40 text-xs text-slate-200 placeholder:text-slate-500 focus:ring-1 focus:ring-violet-500/50 outline-none font-mono"
                      />
                      <input
                        type="text"
                        value={row.label}
                        onChange={(e) => updateFieldMapping(idx, "label", e.target.value)}
                        placeholder="Label hiển thị"
                        className="w-1/4 px-3 py-2 border border-white/10 rounded-lg bg-slate-950/40 text-xs text-slate-200 placeholder:text-slate-500 focus:ring-1 focus:ring-violet-500/50 outline-none"
                      />
                      <input
                        type="text"
                        value={row.path}
                        onChange={(e) => updateFieldMapping(idx, "path", e.target.value)}
                        placeholder="JSON path (vd: data.code)"
                        className="flex-1 px-3 py-2 border border-white/10 rounded-lg bg-slate-950/40 text-xs text-slate-200 placeholder:text-slate-500 focus:ring-1 focus:ring-violet-500/50 outline-none font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => removeFieldMapping(idx)}
                        className="px-2 py-2 text-slate-400 hover:text-rose-400 transition-colors"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  {fieldMappingRows.length === 0 && (
                    <p className="text-xs text-slate-500 italic">Chưa có field mapping nào.</p>
                  )}
                </div>
              </div>

              {/* Active toggle */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, is_active: !p.is_active }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    form.is_active ? "bg-violet-600" : "bg-slate-700"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white shadow-lg transition-transform ${
                      form.is_active ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
                <span className="text-sm text-slate-300">
                  {form.is_active ? "Đang hoạt động" : "Đã tắt"}
                </span>
              </div>

              {/* Form error */}
              {formError && (
                <div className="p-3 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-300 text-xs">
                  {formError}
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-white/5">
              <button
                onClick={() => setShowModal(false)}
                className="px-5 py-2.5 text-sm font-medium text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 text-sm transition-colors shadow-lg shadow-violet-500/20"
              >
                {saving ? "Đang lưu..." : editingId ? "💾 Cập nhật" : "✨ Tạo mới"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
