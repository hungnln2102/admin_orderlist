import React, { useState, useEffect, useCallback } from "react";
import {
  Globe,
  Key,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Save,
  Plus,
  Trash2,
  Wifi,
  Zap,
  Eye,
  EyeOff,
  ToggleLeft,
  ToggleRight,
  Send,
  CreditCard,
  Server,
  ShieldCheck,
  Search,
  Copy,
  Clock,
  ExternalLink,
  X,
  Sliders,
  Sparkles,
  Code2,
  Tag,
  Layers,
  Check,
  Braces,
  ArrowRight,
  Filter,
} from "lucide-react";

export interface FieldMappingItem {
  key: string;
  label: string;
  path: string;
  is_primary?: boolean;
  color?: "cyan" | "emerald" | "amber" | "slate" | "purple";
}

export interface ExternalApiConfig {
  id: number;
  service_key: string;
  service_name: string;
  category: "OTP" | "PAYMENT" | "NOTIFY" | "SYSTEM";
  description: string;
  base_url: string;
  endpoints: Record<string, string>;
  auth_config: Record<string, any>;
  field_mapping: FieldMappingItem[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PingResult {
  status: number;
  statusText: string;
  responseTimeMs: number | null;
  contentType: string | null;
  reachable: boolean;
}

export interface DetectedField {
  path: string;
  value: any;
  sample: string;
  type: string;
  is_potential_otp: boolean;
}

export const ExternalApiConfigPage: React.FC = () => {
  const [configs, setConfigs] = useState<ExternalApiConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"otp" | "payment" | "notify" | "all">("otp");
  const [searchQuery, setSearchQuery] = useState("");
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Lưu trạng thái chỉnh sửa cục bộ cho từng card
  const [editForms, setEditForms] = useState<Record<number, ExternalApiConfig>>({});
  const [showTokens, setShowTokens] = useState<Record<number, boolean>>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [pingResults, setPingResults] = useState<Record<number, PingResult>>({});
  const [pingingId, setPingingId] = useState<number | null>(null);

  // Modal 1: Thử Lấy OTP (Live Probe)
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpTargetService, setOtpTargetService] = useState<string>("otp_hdsd");
  const [otpTestEmail, setOtpTestEmail] = useState<string>("");
  const [probingOtp, setProbingOtp] = useState(false);
  const [otpProbeResult, setOtpProbeResult] = useState<{
    success: boolean;
    otp?: string | null;
    found?: boolean;
    duration_ms?: number;
    extra_fields?: Array<{ key: string; label: string; value: string; path: string }>;
    message?: string;
  } | null>(null);

  // Modal 2: Thêm Cấu hình Mới
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newConfig, setNewConfig] = useState({
    service_key: "",
    service_name: "",
    category: "OTP" as const,
    description: "",
    base_url: "",
    token: "",
    timeoutMs: 10000,
  });

  // Modal 3: Bộ Chọn Trường Dữ Liệu & Phân Tích Cây JSON (Dynamic Field Selector)
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [mappingConfigId, setMappingConfigId] = useState<number | null>(null);
  const [mappingServiceName, setMappingServiceName] = useState("");
  const [analyzerUrl, setAnalyzerUrl] = useState("");
  const [analyzerMethod, setAnalyzerMethod] = useState<"GET" | "POST">("GET");
  const [analyzerBody, setAnalyzerBody] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    status: number;
    statusText: string;
    latency_ms: number;
    data: any;
    detected_fields: DetectedField[];
  } | null>(null);
  const [currentFields, setCurrentFields] = useState<FieldMappingItem[]>([]);
  const [savingMapping, setSavingMapping] = useState(false);

  const showToast = (type: "success" | "error", text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 1. Tải danh sách cấu hình
  const fetchConfigs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/system/external-apis");
      if (!res.ok) throw new Error("Không thể tải cấu hình API bên thứ 3.");
      const data = await res.json();
      if (data.success) {
        setConfigs(data.configs || []);
        const initialEdits: Record<number, ExternalApiConfig> = {};
        data.configs.forEach((c: ExternalApiConfig) => {
          initialEdits[c.id] = { ...c };
        });
        setEditForms(initialEdits);
      }
    } catch (err: any) {
      showToast("error", err.message || "Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  // Handle thay đổi form cục bộ trên từng card
  const handleFieldChange = (id: number, field: string, value: any) => {
    setEditForms((prev) => {
      const current = prev[id];
      if (!current) return prev;
      return {
        ...prev,
        [id]: {
          ...current,
          [field]: value,
        },
      };
    });
  };

  const handleAuthConfigChange = (id: number, key: string, value: any) => {
    setEditForms((prev) => {
      const current = prev[id];
      if (!current) return prev;
      return {
        ...prev,
        [id]: {
          ...current,
          auth_config: {
            ...(current.auth_config || {}),
            [key]: value,
          },
        },
      };
    });
  };

  // 2. Lưu cấu hình của 1 card
  const handleSaveCard = async (id: number) => {
    const item = editForms[id];
    if (!item) return;
    try {
      setSavingId(id);
      const res = await fetch(`/api/system/external-apis/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_name: item.service_name,
          category: item.category,
          description: item.description,
          base_url: item.base_url,
          endpoints: item.endpoints,
          auth_config: item.auth_config,
          field_mapping: item.field_mapping,
          is_active: item.is_active,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Không thể cập nhật cấu hình.");

      showToast("success", `Đã lưu thành công cấu hình [${item.service_name}]!`);
      await fetchConfigs();
    } catch (err: any) {
      showToast("error", err.message || "Lỗi lưu cấu hình");
    } finally {
      setSavingId(null);
    }
  };

  // 3. Ping kiểm tra kết nối
  const handlePingTest = async (id: number) => {
    try {
      setPingingId(id);
      const res = await fetch(`/api/system/external-apis/${id}/test`, { method: "POST" });
      const data = await res.json();
      if (data.success && data.test) {
        setPingResults((prev) => ({ ...prev, [id]: data.test }));
      }
    } catch (err: any) {
      setPingResults((prev) => ({
        ...prev,
        [id]: {
          status: 0,
          statusText: err.message || "Lỗi kết nối",
          responseTimeMs: null,
          contentType: null,
          reachable: false,
        },
      }));
    } finally {
      setPingingId(null);
    }
  };

  // 4. Mở modal Live Test OTP
  const openOtpProbeModal = (serviceKey: string) => {
    setOtpTargetService(serviceKey);
    setOtpProbeResult(null);
    setShowOtpModal(true);
  };

  // 5. Chạy Live Probe lấy OTP
  const handleExecuteProbeOtp = async () => {
    if (!otpTestEmail || !otpTestEmail.includes("@")) {
      showToast("error", "Vui lòng nhập địa chỉ email hợp lệ!");
      return;
    }

    try {
      setProbingOtp(true);
      setOtpProbeResult(null);
      const res = await fetch("/api/system/external-apis/test-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: otpTestEmail.trim(),
          service_key: otpTargetService,
        }),
      });

      const data = await res.json();
      setOtpProbeResult(data);
      if (data.found) {
        showToast("success", `Đã lấy được mã OTP: ${data.otp}`);
      } else {
        showToast("error", data.message || "Không tìm thấy mã OTP.");
      }
    } catch (err: any) {
      setOtpProbeResult({
        success: false,
        message: err.message || "Lỗi kết nối khi gọi lấy OTP.",
      });
      showToast("error", err.message || "Lỗi gọi API");
    } finally {
      setProbingOtp(false);
    }
  };

  // 6. Tạo mới API tùy biến
  const handleCreateConfig = async () => {
    if (!newConfig.service_key || !newConfig.service_name || !newConfig.base_url) {
      showToast("error", "Vui lòng điền đầy đủ Mã dịch vụ, Tên dịch vụ và Base URL!");
      return;
    }

    try {
      setCreating(true);
      const res = await fetch("/api/system/external-apis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_key: newConfig.service_key.trim(),
          service_name: newConfig.service_name.trim(),
          category: newConfig.category,
          description: newConfig.description.trim(),
          base_url: newConfig.base_url.trim(),
          auth_config: {
            token: newConfig.token.trim(),
            timeoutMs: Number(newConfig.timeoutMs) || 10000,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Lỗi tạo cấu hình.");

      showToast("success", `Đã thêm dịch vụ [${newConfig.service_name}] thành công!`);
      setShowCreateModal(false);
      setNewConfig({
        service_key: "",
        service_name: "",
        category: "OTP",
        description: "",
        base_url: "",
        token: "",
        timeoutMs: 10000,
      });
      await fetchConfigs();
    } catch (err: any) {
      showToast("error", err.message || "Không thể tạo cấu hình mới");
    } finally {
      setCreating(false);
    }
  };

  // 7. Xóa cấu hình
  const handleDeleteConfig = async (id: number, name: string) => {
    if (!window.confirm(`Bạn có chắc muốn xóa cấu hình API [${name}] không?`)) return;
    try {
      const res = await fetch(`/api/system/external-apis/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Lỗi khi xóa.");
      showToast("success", `Đã xóa dịch vụ [${name}] thành công!`);
      await fetchConfigs();
    } catch (err: any) {
      showToast("error", err.message || "Lỗi xóa cấu hình");
    }
  };

  // 8. Mở modal Cấu hình trường (Dynamic Field Mapping)
  const openFieldMappingModal = (config: ExternalApiConfig) => {
    setMappingConfigId(config.id);
    setMappingServiceName(config.service_name);
    setAnalyzerUrl(config.base_url);
    setAnalyzerMethod(config.endpoints?.method === "POST" ? "POST" : "GET");
    setAnalyzerBody(JSON.stringify({ email: "demo_probe@example.com" }, null, 2));
    setCurrentFields(config.field_mapping || []);
    setAnalysisResult(null);
    setShowMappingModal(true);
  };

  // 9. Thực hiện Gửi thử & Phân tích Cây JSON
  const handleAnalyzeEndpoint = async () => {
    if (!mappingConfigId) {
      showToast("error", "Vui lòng chọn cấu hình API cần phân tích!");
      return;
    }

    try {
      setAnalyzing(true);
      setAnalysisResult(null);
      const res = await fetch("/api/system/external-apis/analyze-endpoint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config_id: mappingConfigId,
          method: analyzerMethod,
          body: analyzerMethod === "POST" ? analyzerBody : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast("error", data.error || data.statusText || "Không thể phân tích API.");
      } else {
        setAnalysisResult({
          status: data.status,
          statusText: data.statusText,
          latency_ms: data.latency_ms,
          data: data.data,
          detected_fields: data.detected_fields || [],
        });
        showToast("success", `Đã nhận kết nối (${data.latency_ms}ms) và phát hiện ${data.detected_fields?.length || 0} trường dữ liệu!`);
      }
    } catch (err: any) {
      showToast("error", err.message || "Lỗi kết nối khi phân tích API.");
    } finally {
      setAnalyzing(false);
    }
  };

  // 10. Chọn trường gán làm Mã OTP chính
  const handleSelectAsOtpField = (detected: DetectedField) => {
    setCurrentFields((prev) => {
      const filtered = prev.filter((f) => f.key !== "otp" && !f.is_primary);
      return [
        {
          key: "otp",
          label: "Mã Xác Thực (OTP)",
          path: detected.path,
          is_primary: true,
          color: "cyan",
        },
        ...filtered,
      ];
    });
    showToast("success", `Đã gán [${detected.path}] làm Mã OTP chính!`);
  };

  // 11. Thêm trường hiển thị thông thường
  const handleAddDisplayField = (detected: DetectedField) => {
    const parts = detected.path.replace(/\[\d+\]/g, "").split(".");
    const rawKey = parts[parts.length - 1] || "field";
    let autoLabel = rawKey;
    if (/code|otp/i.test(rawKey)) autoLabel = "Mã OTP";
    else if (/time|date|created|at/i.test(rawKey)) autoLabel = "Thời Gian";
    else if (/subject|title/i.test(rawKey)) autoLabel = "Tiêu Đề Thư";
    else if (/from|sender/i.test(rawKey)) autoLabel = "Người Gửi";
    else if (/status/i.test(rawKey)) autoLabel = "Trạng Thái";

    const exists = currentFields.some((f) => f.path === detected.path);
    if (exists) {
      showToast("error", `Trường [${detected.path}] đã có trong danh sách!`);
      return;
    }

    setCurrentFields((prev) => [
      ...prev,
      {
        key: rawKey,
        label: autoLabel,
        path: detected.path,
        is_primary: false,
        color: "emerald",
      },
    ]);
    showToast("success", `Đã thêm [${detected.path}] vào trường hiển thị!`);
  };

  // 12. Lưu cấu hình mapping trường vào DB
  const handleSaveFieldMapping = async () => {
    if (!mappingConfigId) return;
    try {
      setSavingMapping(true);
      const res = await fetch(`/api/system/external-apis/${mappingConfigId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field_mapping: currentFields,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Lỗi lưu cấu hình trường.");

      showToast("success", `Đã lưu cấu hình trường bóc tách cho [${mappingServiceName}] thành công!`);
      setShowMappingModal(false);
      await fetchConfigs();
    } catch (err: any) {
      showToast("error", err.message || "Lỗi lưu cấu hình");
    } finally {
      setSavingMapping(false);
    }
  };

  // Lọc danh sách theo tab và search
  const filteredConfigs = configs.filter((c) => {
    const matchesTab =
      activeTab === "all"
        ? true
        : activeTab === "otp"
        ? c.category === "OTP"
        : activeTab === "payment"
        ? c.category === "PAYMENT"
        : c.category === "NOTIFY";

    const matchesSearch =
      searchQuery.trim() === "" ||
      c.service_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.service_key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.base_url.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesTab && matchesSearch;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans text-slate-100">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-2xl border flex items-center gap-3 animate-in slide-in-from-top-4 duration-300 ${
            toastMessage.type === "success"
              ? "bg-emerald-950/95 border-emerald-500/50 text-emerald-200"
              : "bg-rose-950/95 border-rose-500/50 text-rose-200"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span className="text-sm font-semibold">{toastMessage.text}</span>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Server className="w-4 h-4" />
            <span>Hệ Thống & Tự Động Hóa V2</span>
            <span className="text-slate-500">•</span>
            <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
              Đa Cổng Kết Nối & Dynamic Mapping
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
            Cấu Hình API Bên Thứ 3 & Nhà Cung Cấp OTP
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Quản trị tập trung các API lấy mã xác thực OTP, Webhook thanh toán và Bot Telegram. Hỗ trợ gửi thử và chọn trường bóc tách dữ liệu JSON trực tiếp không cần sửa code.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Nút Thử Lấy OTP (Live Probe) */}
          <button
            onClick={() => openOtpProbeModal("otp_hdsd")}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-amber-600/25 active:scale-95 transition-all"
          >
            <Zap className="w-4 h-4 text-amber-200" />
            <span>Thử Lấy OTP (Probe)</span>
          </button>

          {/* Nút Tải lại */}
          <button
            onClick={fetchConfigs}
            disabled={loading}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50"
            title="Tải lại danh sách"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-cyan-400" : ""}`} />
          </button>

          {/* Nút Thêm Mới */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-cyan-600/25 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo Mới Cổng API</span>
          </button>
        </div>
      </div>

      {/* STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-center gap-3.5 backdrop-blur-sm">
          <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-xl">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-white">{configs.length}</div>
            <div className="text-xs text-slate-400 font-medium">Tổng Cổng Kết Nối</div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-center gap-3.5 backdrop-blur-sm">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-emerald-400">
              {configs.filter((c) => c.is_active).length}
            </div>
            <div className="text-xs text-slate-400 font-medium">Đang Kích Hoạt (Online)</div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-center gap-3.5 backdrop-blur-sm">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-amber-400">
              {configs.filter((c) => c.category === "OTP").length}
            </div>
            <div className="text-xs text-slate-400 font-medium">Cổng Dịch Vụ OTP</div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-center gap-3.5 backdrop-blur-sm">
          <div className="p-3 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-xl">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-purple-400">
              {configs.filter((c) => c.category === "PAYMENT").length}
            </div>
            <div className="text-xs text-slate-400 font-medium">Thanh Toán & Webhook</div>
          </div>
        </div>
      </div>

      {/* TABS & SEARCH BAR */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/80 border border-slate-800/80 rounded-2xl p-2.5">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setActiveTab("otp")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === "otp"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <Key className="w-3.5 h-3.5 text-amber-400" />
            <span>Dịch Vụ Lấy OTP</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
              {configs.filter((c) => c.category === "OTP").length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("payment")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === "payment"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 text-purple-400" />
            <span>Cổng Thanh Toán</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
              {configs.filter((c) => c.category === "PAYMENT").length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("notify")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === "notify"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <Send className="w-3.5 h-3.5 text-blue-400" />
            <span>Bot & Thông Báo</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
              {configs.filter((c) => c.category === "NOTIFY").length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("all")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === "all"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <span>Tất Cả</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
              {configs.length}
            </span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tên, key, URL..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-700/70 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-all font-mono"
          />
        </div>
      </div>

      {/* CARDS GRID (DẠNG KHỐI TƯƠNG TỰ CẤU HÌNH HỆ THỐNG) */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Đang tải danh sách các cổng kết nối API...</p>
        </div>
      ) : filteredConfigs.length === 0 ? (
        <div className="py-16 text-center bg-slate-900/40 border border-slate-800 rounded-3xl p-8 space-y-3">
          <Server className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-sm font-semibold text-slate-300">Không tìm thấy cổng API nào phù hợp.</p>
          <p className="text-xs text-slate-500">Hãy thử đổi từ khóa tìm kiếm hoặc bấm nút "Tạo Mới Cổng API".</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredConfigs.map((config) => {
            const formData = editForms[config.id] || config;
            const isSaving = savingId === config.id;
            const isPinging = pingingId === config.id;
            const ping = pingResults[config.id];
            const isTokenVisible = Boolean(showTokens[config.id]);
            const isOtpType = config.category === "OTP";

            // Border và Icon màu sắc theo category
            let borderHover = "hover:border-cyan-500/40";
            let iconBg = "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
            if (isOtpType) {
              borderHover = "hover:border-amber-500/40";
              iconBg = "bg-amber-500/10 text-amber-400 border-amber-500/20";
            } else if (config.category === "PAYMENT") {
              borderHover = "hover:border-purple-500/40";
              iconBg = "bg-purple-500/10 text-purple-400 border-purple-500/20";
            } else if (config.category === "NOTIFY") {
              borderHover = "hover:border-blue-500/40";
              iconBg = "bg-blue-500/10 text-blue-400 border-blue-500/20";
            }

            return (
              <div
                key={config.id}
                className={`bg-slate-900/70 border border-slate-800 rounded-3xl p-5 shadow-xl transition-all duration-200 flex flex-col justify-between backdrop-blur-md ${borderHover}`}
              >
                <div className="space-y-4">
                  {/* Card Header: Icon + Name + Service Key + Online Toggle */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                      <div className={`p-3 rounded-2xl border ${iconBg} shadow-inner shrink-0`}>
                        {isOtpType ? (
                          <Key className="w-5 h-5" />
                        ) : config.category === "PAYMENT" ? (
                          <CreditCard className="w-5 h-5" />
                        ) : (
                          <Send className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-white tracking-tight">{config.service_name}</h3>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                            {config.service_key}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{config.description || "Chưa có mô tả"}</p>
                      </div>
                    </div>

                    {/* Toggle Online/Offline */}
                    <button
                      onClick={() => {
                        const newActive = !formData.is_active;
                        handleFieldChange(config.id, "is_active", newActive);
                      }}
                      className="shrink-0 focus:outline-none transition-transform active:scale-95"
                      title={formData.is_active ? "Đang bật (Nhấn để tắt)" : "Đang tắt (Nhấn để bật)"}
                    >
                      {formData.is_active ? (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 rounded-xl text-[11px] font-bold">
                          <ToggleRight className="w-5 h-5 text-emerald-400" />
                          ONLINE
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 border border-slate-700 text-slate-400 rounded-xl text-[11px] font-bold">
                          <ToggleLeft className="w-5 h-5 text-slate-500" />
                          OFFLINE
                        </div>
                      )}
                    </button>
                  </div>

                  {/* Form Inputs inside the Block */}
                  <div className="space-y-3.5">
                    {/* Base URL */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                        <span>Base URL / Endpoint Host</span>
                        <a
                          href={formData.base_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 text-[10px] font-normal"
                        >
                          Mở trang <ExternalLink className="w-3 h-3" />
                        </a>
                      </label>
                      <input
                        type="text"
                        value={formData.base_url || ""}
                        onChange={(e) => handleFieldChange(config.id, "base_url", e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono transition-all"
                      />
                    </div>

                    {/* API Token / Secret (Nếu có) */}
                    {formData.auth_config && (
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                          <span>API Token / Secret Key / Fallback Token</span>
                          <span className="text-[10px] text-slate-500">Loại: {formData.auth_config.type || "mặc định"}</span>
                        </label>
                        <div className="relative">
                          <input
                            type={isTokenVisible ? "text" : "password"}
                            placeholder="Nhập API Token hoặc để trống nếu dùng mặc định"
                            value={formData.auth_config.token || formData.auth_config.defaultToken || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (formData.auth_config.token !== undefined) {
                                handleAuthConfigChange(config.id, "token", val);
                              } else {
                                handleAuthConfigChange(config.id, "defaultToken", val);
                              }
                            }}
                            className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-3.5 pr-10 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono transition-all"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowTokens((prev) => ({
                                ...prev,
                                [config.id]: !prev[config.id],
                              }))
                            }
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                          >
                            {isTokenVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Hiển thị Các Trường Đã Bóc Tách (Field Mapping Badges) */}
                    {config.field_mapping && config.field_mapping.length > 0 && (
                      <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <span className="flex items-center gap-1.5 text-cyan-400">
                            <Sparkles className="w-3 h-3" />
                            Trường Dữ Liệu Bóc Tách ({config.field_mapping.length})
                          </span>
                          <button
                            onClick={() => openFieldMappingModal(config)}
                            className="text-cyan-400 hover:text-cyan-300 font-normal hover:underline"
                          >
                            Chỉnh sửa
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {config.field_mapping.map((fm, idx) => (
                            <span
                              key={idx}
                              className={`text-[10px] font-mono px-2 py-0.5 rounded-lg border flex items-center gap-1 ${
                                fm.is_primary
                                  ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300 font-bold"
                                  : "bg-slate-900 border-slate-700 text-slate-300"
                              }`}
                              title={`Path: ${fm.path}`}
                            >
                              <Tag className="w-2.5 h-2.5 opacity-70" />
                              <span className="font-sans font-semibold">{fm.label}:</span>
                              <span className="text-slate-400 font-mono">{fm.path}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Timeout & Sender Filter */}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-400">Timeout (ms)</label>
                        <input
                          type="number"
                          step="1000"
                          value={formData.auth_config?.timeoutMs ?? 10000}
                          onChange={(e) => handleAuthConfigChange(config.id, "timeoutMs", Number(e.target.value))}
                          className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-400">Sender Filter (Tiêu chí lọc)</label>
                        <input
                          type="text"
                          placeholder="adobe / all"
                          value={formData.auth_config?.senderFilter ?? "adobe"}
                          onChange={(e) => handleAuthConfigChange(config.id, "senderFilter", e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Block Footer Actions */}
                <div className="pt-4 mt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Ping Result Badge */}
                  <div className="flex items-center gap-2">
                    {ping ? (
                      <div
                        className={`px-3 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1.5 ${
                          ping.reachable
                            ? "bg-emerald-950/80 border border-emerald-500/40 text-emerald-300"
                            : "bg-rose-950/80 border border-rose-500/40 text-rose-300"
                        }`}
                      >
                        <Wifi className="w-3.5 h-3.5" />
                        <span>
                          {ping.status ? `${ping.status} ${ping.statusText}` : ping.statusText}
                          {ping.responseTimeMs !== null ? ` (${ping.responseTimeMs}ms)` : ""}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-500 italic">Chưa kiểm tra kết nối</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
                    {/* Live Test OTP Button (cho dịch vụ OTP) */}
                    {isOtpType && (
                      <button
                        onClick={() => openOtpProbeModal(config.service_key)}
                        className="px-3 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95"
                        title="Mở popup thử cào OTP từ email"
                      >
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        Thử Lấy OTP
                      </button>
                    )}

                    {/* Nút Cấu Hình Trường Bóc Tách (Dynamic Field Selector) */}
                    <button
                      onClick={() => openFieldMappingModal(config)}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95"
                      title="Chọn các trường JSON muốn hiển thị từ API này"
                    >
                      <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                      Cấu Hình Trường
                    </button>

                    {/* Ping Test Button */}
                    <button
                      onClick={() => handlePingTest(config.id)}
                      disabled={isPinging}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50"
                    >
                      <Wifi className={`w-3.5 h-3.5 text-cyan-400 ${isPinging ? "animate-pulse text-cyan-300" : ""}`} />
                      {isPinging ? "Đang ping..." : "Ping"}
                    </button>

                    {/* Save Button */}
                    <button
                      onClick={() => handleSaveCard(config.id)}
                      disabled={isSaving}
                      className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg shadow-cyan-600/20 active:scale-95 disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {isSaving ? "Lưu..." : "Lưu"}
                    </button>

                    {/* Delete Custom API button */}
                    {config.id > 8 && (
                      <button
                        onClick={() => handleDeleteConfig(config.id, config.service_name)}
                        className="p-2 text-rose-400 hover:bg-rose-950/40 border border-transparent hover:border-rose-800 rounded-xl transition-all"
                        title="Xóa cấu hình tùy biến này"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: THỬ LẤY OTP TRỰC TIẾP (LIVE OTP PROBE) */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
                  <Zap className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Thử Lấy Mã OTP (Live Probe)</h3>
                  <p className="text-xs text-slate-400">Kiểm tra cào OTP thực tế từ hòm thư dịch vụ</p>
                </div>
              </div>

              <button
                onClick={() => setShowOtpModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Cổng Dịch Vụ Cào Thư</label>
                <select
                  value={otpTargetService}
                  onChange={(e) => setOtpTargetService(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  {configs
                    .filter((c) => c.category === "OTP")
                    .map((c) => (
                      <option key={c.id} value={c.service_key}>
                        {c.service_name} ({c.service_key})
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Nhập Địa Chỉ Email Cần Lấy OTP</label>
                <input
                  type="email"
                  placeholder="VD: user@tinyhost.shop, user@rilzz.store..."
                  value={otpTestEmail}
                  onChange={(e) => setOtpTestEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Kết quả Probe */}
              {otpProbeResult && (
                <div
                  className={`p-4 rounded-xl border text-xs space-y-2.5 animate-in zoom-in-95 duration-200 ${
                    otpProbeResult.found
                      ? "bg-emerald-950/70 border-emerald-500/50 text-emerald-200"
                      : "bg-slate-950 border-slate-800 text-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5">
                      {otpProbeResult.found ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Tìm thấy mã OTP thành công!</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-4 h-4 text-slate-400" />
                          <span>Thông báo quét hòm thư:</span>
                        </>
                      )}
                    </span>
                    {otpProbeResult.duration_ms !== undefined && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        {otpProbeResult.duration_ms}ms
                      </span>
                    )}
                  </div>

                  {otpProbeResult.otp ? (
                    <div className="bg-black/50 border border-emerald-500/40 rounded-xl p-3 text-center space-y-1">
                      <div className="text-[10px] text-emerald-400 uppercase tracking-widest font-semibold">MÃ OTP TRÍCH XUẤT</div>
                      <div className="text-3xl font-black text-emerald-300 tracking-widest font-mono">
                        {otpProbeResult.otp}
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-400 text-xs italic">{otpProbeResult.message}</p>
                  )}

                  {/* Hiển thị các trường dữ liệu kèm theo (Extra Fields) nếu có */}
                  {otpProbeResult.extra_fields && otpProbeResult.extra_fields.length > 0 && (
                    <div className="pt-2 border-t border-slate-800 space-y-1">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Các trường dữ liệu kèm theo:
                      </div>
                      <div className="space-y-1">
                        {otpProbeResult.extra_fields.map((ef, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-slate-900/80 px-2.5 py-1 rounded-lg text-[11px]">
                            <span className="text-slate-400 font-semibold">{ef.label}:</span>
                            <span className="text-cyan-300 font-mono">{ef.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowOtpModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Đóng
              </button>
              <button
                onClick={handleExecuteProbeOtp}
                disabled={probingOtp}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-amber-600/20 active:scale-95 disabled:opacity-50"
              >
                <Zap className={`w-4 h-4 ${probingOtp ? "animate-spin" : ""}`} />
                {probingOtp ? "Đang quét hòm thư..." : "Quét & Lấy OTP Ngay"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: THÊM CỔNG API MỚI */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400">
                  <Plus className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Thêm Cổng API Bên Thứ 3 Mới</h3>
                  <p className="text-xs text-slate-400">Cấu hình kết nối tới hệ thống hoặc webhook đối tác</p>
                </div>
              </div>

              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Mã Service Key</label>
                  <input
                    type="text"
                    placeholder="VD: custom_mail_api"
                    value={newConfig.service_key}
                    onChange={(e) => setNewConfig({ ...newConfig, service_key: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Phân Loại (Category)</label>
                  <select
                    value={newConfig.category}
                    onChange={(e) => setNewConfig({ ...newConfig, category: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="OTP">Lấy OTP (OTP)</option>
                    <option value="PAYMENT">Thanh Toán (PAYMENT)</option>
                    <option value="NOTIFY">Thông Báo (NOTIFY)</option>
                    <option value="SYSTEM">Hệ Thống (SYSTEM)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Tên Hiển Thị Của Dịch Vụ</label>
                <input
                  type="text"
                  placeholder="VD: MailTM Custom Mail Service"
                  value={newConfig.service_name}
                  onChange={(e) => setNewConfig({ ...newConfig, service_name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Base URL</label>
                <input
                  type="text"
                  placeholder="https://api.example.com"
                  value={newConfig.base_url}
                  onChange={(e) => setNewConfig({ ...newConfig, base_url: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">API Token / Secret Key (Tùy chọn)</label>
                <input
                  type="password"
                  placeholder="Nhập secret key hoặc token"
                  value={newConfig.token}
                  onChange={(e) => setNewConfig({ ...newConfig, token: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Mô Tả Nghiệp Vụ</label>
                <textarea
                  rows={2}
                  placeholder="Ghi chú mục đích sử dụng..."
                  value={newConfig.description}
                  onChange={(e) => setNewConfig({ ...newConfig, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Hủy
              </button>
              <button
                onClick={handleCreateConfig}
                disabled={creating}
                className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-cyan-600/20 active:scale-95 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                {creating ? "Đang thêm..." : "Thêm Cấu Hình"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: BỘ CHỌN TRƯỜNG DỮ LIỆU ĐỘNG & PHÂN TÍCH CÂY JSON (DYNAMIC FIELD SELECTOR) */}
      {showMappingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full p-6 space-y-5 shadow-2xl relative max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3.5">
                <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl text-cyan-400">
                  <Sliders className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Bộ Chọn Trường JSON & Bóc Tách Dữ Liệu
                    <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono">
                      {mappingServiceName}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Gửi request thử để phân tích cây JSON trả về, sau đó click chọn trường muốn bóc tách và hiển thị ra giao diện.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowMappingModal(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Scrollable */}
            <div className="overflow-y-auto pr-1 space-y-5 flex-1">
              {/* KHỐI 1: BỘ GỬI THỬ REQUEST TEST */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-cyan-400" />
                    1. Gửi Thử API Để Lấy Cấu Trúc JSON Thực Tế
                  </span>
                  {analysisResult && (
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      HTTP {analysisResult.status} ({analysisResult.latency_ms}ms)
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <select
                    value={analyzerMethod}
                    onChange={(e) => setAnalyzerMethod(e.target.value as any)}
                    className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono shrink-0"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                  </select>

                  <input
                    type="text"
                    aria-label="URL cấu hình đã lưu"
                    value={analyzerUrl}
                    readOnly
                    title="Để thay đổi URL, hãy lưu cấu hình API trước khi phân tích."
                    className="flex-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-400 font-mono cursor-not-allowed"
                  />

                  <button
                    onClick={handleAnalyzeEndpoint}
                    disabled={analyzing}
                    className="w-full sm:w-auto px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/20 shrink-0 disabled:opacity-50 active:scale-95"
                  >
                    <Sparkles className={`w-4 h-4 ${analyzing ? "animate-spin" : ""}`} />
                    {analyzing ? "Đang phân tích..." : "⚡ Gửi Thử & Phân Tích"}
                  </button>
                </div>
              </div>

              {/* KHỐI 2: KẾT QUẢ CÂY JSON & DANH SÁCH TRƯỜNG PHÁT HIỆN */}
              {analysisResult && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-300 uppercase tracking-wider">
                    <span className="flex items-center gap-2 text-amber-400">
                      <Braces className="w-4 h-4" />
                      2. Cây JSON & Các Trường Phát Hiện ({analysisResult.detected_fields.length})
                    </span>
                    <span className="text-[11px] text-slate-500 lowercase font-normal">
                      Click vào các nút bên phải để chọn trường hiển thị
                    </span>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 max-h-60 overflow-y-auto space-y-2 font-mono text-xs">
                    {analysisResult.detected_fields.length === 0 ? (
                      <p className="text-slate-500 italic p-3 text-center">Không phát hiện trường con nào trong response.</p>
                    ) : (
                      analysisResult.detected_fields.map((field, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-cyan-500/40 transition-colors gap-3"
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <span className="text-cyan-300 font-bold">{field.path}</span>
                            <span className="text-slate-500 text-[10px]">({field.type})</span>
                            <span className="text-slate-400 truncate max-w-xs text-[11px] bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                              = {field.sample}
                            </span>
                            {field.is_potential_otp && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-sans font-bold flex items-center gap-1 animate-pulse">
                                🎯 Gợi Ý OTP
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Nút gán làm OTP */}
                            <button
                              onClick={() => handleSelectAsOtpField(field)}
                              className="px-2.5 py-1 bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 border border-amber-500/30 rounded-lg text-[10px] font-sans font-bold flex items-center gap-1 transition-all"
                            >
                              🎯 Đặt làm OTP
                            </button>

                            {/* Nút thêm trường hiển thị */}
                            <button
                              onClick={() => handleAddDisplayField(field)}
                              className="px-2.5 py-1 bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300 border border-cyan-500/30 rounded-lg text-[10px] font-sans font-bold flex items-center gap-1 transition-all"
                            >
                              ➕ Chọn hiển thị
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* KHỐI 3: DANH SÁCH CÁC TRƯỜNG ĐÃ CHỌN ĐỂ HIỂN THỊ (SELECTED FIELDS) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300 uppercase tracking-wider">
                  <span className="flex items-center gap-2 text-emerald-400">
                    <Tag className="w-4 h-4" />
                    3. Danh Sách Trường Hiển Thị Ra Giao Diện ({currentFields.length})
                  </span>
                  <span className="text-[11px] text-slate-500 lowercase font-normal">
                    Bạn có thể sửa nhãn tiếng Việt theo ý muốn
                  </span>
                </div>

                {currentFields.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-dashed border-slate-800 text-center text-xs text-slate-500">
                    Chưa có trường nào được chọn. Hãy bấm nút <b>"⚡ Gửi Thử & Phân Tích"</b> ở trên rồi click chọn các trường mong muốn.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {currentFields.map((field, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
                          field.is_primary
                            ? "bg-cyan-950/40 border-cyan-500/40"
                            : "bg-slate-950 border-slate-800"
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          {field.is_primary ? (
                            <span className="px-2 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 text-[10px] font-bold shrink-0">
                              MÃ OTP CHÍNH
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300 text-[10px] font-bold shrink-0">
                              TRƯỜNG PHỤ
                            </span>
                          )}

                          {/* Nhãn tiếng Việt cho phép sửa */}
                          <div className="space-y-0.5 flex-1">
                            <label className="text-[10px] text-slate-400">Nhãn hiển thị tiếng Việt:</label>
                            <input
                              type="text"
                              value={field.label}
                              onChange={(e) => {
                                const newLabel = e.target.value;
                                setCurrentFields((prev) =>
                                  prev.map((f, i) => (i === idx ? { ...f, label: newLabel } : f))
                                );
                              }}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-cyan-500"
                            />
                          </div>

                          {/* Path JSON */}
                          <div className="space-y-0.5 flex-1">
                            <label className="text-[10px] text-slate-400">Đường dẫn JSON Path:</label>
                            <input
                              type="text"
                              value={field.path}
                              onChange={(e) => {
                                const newPath = e.target.value;
                                setCurrentFields((prev) =>
                                  prev.map((f, i) => (i === idx ? { ...f, path: newPath } : f))
                                );
                              }}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                            />
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setCurrentFields((prev) => prev.filter((_, i) => i !== idx));
                          }}
                          className="p-1.5 text-rose-400 hover:bg-rose-950/40 rounded-lg border border-transparent hover:border-rose-800"
                          title="Xóa trường này"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* KHỐI 4: XEM TRƯỚC GIAO DIỆN (LIVE PREVIEW) */}
              {currentFields.length > 0 && (
                <div className="p-4 rounded-2xl bg-slate-950/90 border border-cyan-500/20 space-y-2">
                  <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Xem trước hiển thị trên Thẻ và Popup Probe:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {currentFields.map((f, idx) => (
                      <div
                        key={idx}
                        className={`px-3 py-1.5 rounded-xl border text-xs flex items-center gap-2 ${
                          f.is_primary
                            ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-200 font-bold"
                            : "bg-slate-900 border-slate-700 text-slate-300 font-medium"
                        }`}
                      >
                        <span className="opacity-75">{f.label}:</span>
                        <span className="font-mono text-white">
                          {f.is_primary ? "492018" : "Giá trị mẫu"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800 shrink-0">
              <span className="text-xs text-slate-400">
                Đã cấu hình <b className="text-white">{currentFields.length}</b> trường dữ liệu
              </span>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setShowMappingModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Đóng
                </button>
                <button
                  onClick={handleSaveFieldMapping}
                  disabled={savingMapping}
                  className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-cyan-600/20 active:scale-95 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {savingMapping ? "Đang lưu cấu hình..." : "Lưu Cấu Hình Trường"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExternalApiConfigPage;
