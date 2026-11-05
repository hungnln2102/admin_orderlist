import React, { useState, useEffect, useCallback, useMemo } from "react";
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
import { useNotification } from "@/shared/context/NotificationContext";

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

function getValueByPathFrontend(obj: any, path: string): any {
  if (!obj || !path) return undefined;
  const normalized = String(path).trim().replace(/\[(\w+)\]/g, ".$1").replace(/^\./, "");
  const keys = normalized.split(".");
  let curr = obj;
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (curr == null) return undefined;
    if (Array.isArray(curr) && !/^\d+$/.test(key)) {
      curr = curr[0]?.[key];
    } else {
      curr = curr[key];
    }
  }
  return curr;
}

function extractJsonPathsFrontend(value: any, path = "", depth = 0): DetectedField[] {
  if (depth > 5 || value === null || value === undefined) return [];
  if (Array.isArray(value)) {
    if (value.length === 0) return [{ path, value: [], type: "array (empty)", sample: "[]", is_potential_otp: false }];
    return value.slice(0, 3).flatMap((item, index) => extractJsonPathsFrontend(item, `${path}[${index}]`, depth + 1));
  }
  if (typeof value !== "object") {
    return [{
      path,
      value,
      type: typeof value,
      sample: String(value).slice(0, 100),
      is_potential_otp: /otp|code|verify/i.test(path),
    }];
  }
  return Object.entries(value).flatMap(([key, entry]) =>
    extractJsonPathsFrontend(entry, path ? `${path}.${key}` : key, depth + 1)
  );
}

export const ExternalApiConfigPage: React.FC = () => {
  const notify = useNotification();
  const [configs, setConfigs] = useState<ExternalApiConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"otp" | "payment" | "notify" | "all">("otp");
  const [searchQuery, setSearchQuery] = useState("");

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
  const [mappingMode, setMappingMode] = useState<"api" | "paste">("api");
  const [analyzerUrl, setAnalyzerUrl] = useState("");
  const [analyzerMethod, setAnalyzerMethod] = useState<"GET" | "POST">("GET");
  const [analyzerBody, setAnalyzerBody] = useState("");
  const [mockJsonText, setMockJsonText] = useState("");
  const [customPathInput, setCustomPathInput] = useState("data.code");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    status: number;
    statusText: string;
    latency_ms: number;
    is_json: boolean;
    data: any;
    raw_body: string;
    detected_fields: DetectedField[];
    target_url?: string;
  } | null>(null);
  const [currentFields, setCurrentFields] = useState<FieldMappingItem[]>([]);
  const [savingMapping, setSavingMapping] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  const previewExtractedValue = useMemo(() => {
    if (!analysisResult?.is_json || !analysisResult?.data) return undefined;
    return getValueByPathFrontend(analysisResult.data, customPathInput);
  }, [analysisResult, customPathInput]);

  const showToast = (type: "success" | "error", text: string) => {
    if (type === "success") {
      notify.success(text);
    } else {
      notify.error(text);
    }
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

  // 7. Xóa cấu hình qua Modal xác nhận hệ thống
  const handleDeleteConfig = (id: number, name: string) => {
    notify.confirm({
      title: "Xác Nhận Xóa Cấu Hình API",
      message: `Bạn có chắc chắn muốn xóa cấu hình API [${name}] không? Thao tác này sẽ xóa vĩnh viễn cấu hình này khỏi cơ sở dữ liệu.`,
      confirmText: "Xóa Cấu Hình",
      cancelText: "Hủy Bỏ",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/system/external-apis/${id}`, { method: "DELETE" });
          const data = await res.json();
          if (!res.ok || !data.success) throw new Error(data.error || "Lỗi khi xóa.");
          notify.success(`Đã xóa cấu hình [${name}] thành công!`);
          await fetchConfigs();
        } catch (err: any) {
          notify.error(err.message || "Lỗi xóa cấu hình");
        }
      },
    });
  };

  // 8. Mở modal Cấu hình trường (Dynamic Field Mapping)
  const openFieldMappingModal = (config: ExternalApiConfig) => {
    setMappingConfigId(config.id);
    setMappingServiceName(config.service_name);
    const endpoint = config.endpoints?.get_otp || config.endpoints?.read_otp || config.endpoints?.path || "";
    const fullUrl = config.base_url + (endpoint ? `/${endpoint.replace(/^\/+/, "")}` : "");
    setAnalyzerUrl(fullUrl);
    const isPost = config.endpoints?.method === "POST" || config.auth_config?.method === "POST" || /get_otp_api/i.test(endpoint);
    setAnalyzerMethod(isPost ? "POST" : "GET");
    setAnalyzerBody(JSON.stringify({ email: "demo_probe@example.com" }, null, 2));
    setCurrentFields(config.field_mapping || []);
    setAnalysisResult(null);
    setMappingMode("api");
    setMockJsonText(`{\n  "status": "success",\n  "data": [\n    {\n      "code": "849201",\n      "otp": "849201",\n      "date": "2026-11-05 20:20:00",\n      "content": "Your Adobe verification code is 849201"\n    }\n  ]\n}`);
    const existingOtp = config.field_mapping?.find((f) => f.is_primary || f.key === "otp")?.path || "data.code";
    setCustomPathInput(existingOtp);
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
      let parsedBody = undefined;
      if (analyzerMethod === "POST" && analyzerBody.trim()) {
        try {
          parsedBody = JSON.parse(analyzerBody);
        } catch {
          showToast("error", "Request Body không phải JSON hợp lệ. Vui lòng kiểm tra lại cú pháp!");
          setAnalyzing(false);
          return;
        }
      }

      const res = await fetch("/api/system/external-apis/analyze-endpoint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config_id: mappingConfigId,
          method: analyzerMethod,
          body: parsedBody,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setAnalysisResult({
          status: data.status || res.status,
          statusText: data.error || data.statusText || "Lỗi gọi API",
          latency_ms: data.latency_ms || 0,
          is_json: false,
          data: null,
          raw_body: data.raw_body || data.error || "Không có phản hồi từ máy chủ.",
          detected_fields: [],
          target_url: data.target_url || analyzerUrl,
        });
        showToast("error", data.error || data.statusText || "API trả về mã lỗi.");
      } else {
        setAnalysisResult({
          status: data.status,
          statusText: data.statusText,
          latency_ms: data.latency_ms,
          is_json: Boolean(data.is_json),
          data: data.parsed_data,
          raw_body: data.raw_body || "",
          detected_fields: data.detected_fields || [],
          target_url: data.target_url || analyzerUrl,
        });
        if (data.is_json) {
          showToast("success", `Đã nhận phản hồi JSON (${data.latency_ms}ms) với ${data.detected_fields?.length || 0} trường dữ liệu!`);
        } else {
          showToast("error", `Phản hồi HTTP ${data.status} là HTML / Văn bản, không phải JSON!`);
        }
      }
    } catch (err: any) {
      showToast("error", err.message || "Lỗi kết nối khi phân tích API.");
    } finally {
      setAnalyzing(false);
    }
  };

  // 10. Phân tích JSON mẫu tự dán
  const handleAnalyzeMockJson = () => {
    try {
      const parsed = JSON.parse(mockJsonText);
      const fields = extractJsonPathsFrontend(parsed);
      setAnalysisResult({
        status: 200,
        statusText: "Mock JSON OK",
        latency_ms: 1,
        is_json: true,
        data: parsed,
        raw_body: mockJsonText,
        detected_fields: fields,
      });
      showToast("success", `Đã phân tích JSON mẫu thành công (${fields.length} trường)!`);
    } catch (err: any) {
      showToast("error", "Chuỗi JSON dán vào không hợp lệ: " + err.message);
    }
  };

  // 10.2. Nạp dữ liệu JSON mẫu chuẩn (khi API ngoài trả về mảng rỗng data: [])
  const handleLoadPresetSample = () => {
    const sample = {
      status: "success",
      data: [
        {
          code: "849201",
          otp: "849201",
          date: "2026-11-05 20:20:00",
          content: "Your Adobe verification code is 849201",
        },
      ],
    };
    const fields = extractJsonPathsFrontend(sample);
    setAnalysisResult({
      status: 200,
      statusText: "Dữ Liệu Mẫu Chuẩn",
      latency_ms: 1,
      is_json: true,
      data: sample,
      raw_body: JSON.stringify(sample, null, 2),
      detected_fields: fields,
    });
    setCustomPathInput("data.code");
    showToast("success", "Đã nạp mẫu dữ liệu chuẩn của HDSD (mã OTP: 849201)!");
  };

  const handleCopyJson = () => {
    if (!analysisResult?.raw_body && !analysisResult?.data) return;
    const str = analysisResult.raw_body || JSON.stringify(analysisResult.data, null, 2);
    navigator.clipboard.writeText(str);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
    showToast("success", "Đã sao chép nội dung JSON vào clipboard!");
  };

  // 11. Áp dụng JSON Path (Đặt làm OTP hoặc thêm hiển thị)
  const handleApplyPath = (path: string, isOtp: boolean) => {
    const targetPath = path.trim();
    if (!targetPath) {
      showToast("error", "Vui lòng nhập hoặc click chọn một đường dẫn JSON Path!");
      return;
    }

    if (isOtp) {
      setCurrentFields((prev) => {
        const filtered = prev.filter((f) => f.key !== "otp" && !f.is_primary);
        return [
          {
            key: "otp",
            label: "Mã Xác Thực (OTP)",
            path: targetPath,
            is_primary: true,
            color: "cyan",
          },
          ...filtered,
        ];
      });
      showToast("success", `Đã gán [${targetPath}] làm Mã OTP chính!`);
    } else {
      if (currentFields.some((f) => f.path === targetPath)) {
        showToast("error", `Trường [${targetPath}] đã có trong danh sách!`);
        return;
      }

      const parts = targetPath.replace(/\[\d+\]/g, "").split(".");
      const rawKey = parts[parts.length - 1] || "field";
      let autoLabel = rawKey;
      if (/code|otp/i.test(rawKey)) autoLabel = "Mã OTP";
      else if (/time|date|created|at/i.test(rawKey)) autoLabel = "Thời Gian";
      else if (/subject|title/i.test(rawKey)) autoLabel = "Tiêu Đề Thư";
      else if (/from|sender/i.test(rawKey)) autoLabel = "Người Gửi";
      else if (/status/i.test(rawKey)) autoLabel = "Trạng Thái";

      setCurrentFields((prev) => [
        ...prev,
        {
          key: rawKey,
          label: autoLabel,
          path: targetPath,
          is_primary: false,
          color: "emerald",
        },
      ]);
      showToast("success", `Đã thêm [${targetPath}] vào danh sách hiển thị!`);
    }
  };

  // 12. Chọn trường gán làm Mã OTP chính từ chip
  const handleSelectAsOtpField = (detected: DetectedField) => {
    setCustomPathInput(detected.path);
    handleApplyPath(detected.path, true);
  };

  // 13. Thêm trường hiển thị thông thường từ chip
  const handleAddDisplayField = (detected: DetectedField) => {
    setCustomPathInput(detected.path);
    handleApplyPath(detected.path, false);
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
                className={`bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-xl transition-all duration-200 flex flex-col justify-between backdrop-blur-md ${borderHover}`}
              >
                <div className="space-y-4">
                  {/* Card Header: Icon + Name + Service Key + Online Toggle + Delete Button */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className={`p-3 rounded-2xl border ${iconBg} shadow-inner shrink-0`}>
                        {isOtpType ? (
                          <Key className="w-5 h-5" />
                        ) : config.category === "PAYMENT" ? (
                          <CreditCard className="w-5 h-5" />
                        ) : (
                          <Send className="w-5 h-5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-bold text-white tracking-tight truncate">{config.service_name}</h3>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                            {config.service_key}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{config.description || "Chưa có mô tả"}</p>
                      </div>
                    </div>

                    {/* Right: Toggle Online/Offline + Delete Button */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          const newActive = !formData.is_active;
                          handleFieldChange(config.id, "is_active", newActive);
                        }}
                        className="focus:outline-none transition-transform active:scale-95"
                        title={formData.is_active ? "Đang bật (Nhấn để tắt)" : "Đang tắt (Nhấn để bật)"}
                      >
                        {formData.is_active ? (
                          <div className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 rounded-xl text-[11px] font-bold">
                            <ToggleRight className="w-4 h-4 text-emerald-400" />
                            <span>ONLINE</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 border border-slate-700 text-slate-400 rounded-xl text-[11px] font-bold">
                            <ToggleLeft className="w-4 h-4 text-slate-500" />
                            <span>OFFLINE</span>
                          </div>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteConfig(config.id, config.service_name)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
                        title={`Xóa cấu hình [${config.service_name}]`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Form Inputs inside the Block */}
                  <div className="space-y-3 pt-1">
                    {/* Base URL */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                        <span>Base URL / Endpoint Host</span>
                        <a
                          href={formData.base_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 text-[10px] font-normal"
                        >
                          Mở trang <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <input
                        type="text"
                        value={formData.base_url || ""}
                        onChange={(e) => handleFieldChange(config.id, "base_url", e.target.value)}
                        placeholder="https://..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono transition-all"
                      />
                    </div>

                    {/* API Token / Secret (Nếu có) */}
                    {formData.auth_config && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                          <span>API Token / Secret Key / Fallback Token</span>
                          <span className="text-[10px] text-slate-500 font-mono">Loại: {formData.auth_config.type || "mặc định"}</span>
                        </div>
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
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3.5 pr-10 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono transition-all"
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

                    {/* Khu Vực Bóc Tách Trường Dữ Liệu (Field Mapping Hub) */}
                    <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                          Trường Dữ Liệu Bóc Tách ({config.field_mapping?.length || 0})
                        </span>
                        <button
                          type="button"
                          onClick={() => openFieldMappingModal(config)}
                          className="px-2.5 py-1 bg-cyan-600/15 hover:bg-cyan-600/25 text-cyan-300 border border-cyan-500/30 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all active:scale-95"
                          title="Mở bộ chọn bóc tách JSON cho API này"
                        >
                          <Sliders className="w-3 h-3 text-cyan-400" />
                          Cấu Hình Trường
                        </button>
                      </div>

                      {config.field_mapping && config.field_mapping.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {config.field_mapping.map((fm, idx) => (
                            <span
                              key={idx}
                              className={`text-[10px] font-mono px-2 py-0.5 rounded-lg border flex items-center gap-1 ${
                                fm.is_primary
                                  ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300 font-bold"
                                  : "bg-slate-900 border-slate-800 text-slate-300"
                              }`}
                              title={`JSON Path: ${fm.path}`}
                            >
                              <Tag className="w-2.5 h-2.5 opacity-70" />
                              <span className="font-sans font-semibold">{fm.label}:</span>
                              <span className="text-slate-400 font-mono">{fm.path}</span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-500 italic">
                          Chưa có trường nào được bóc tách. Bấm nút <b>"Cấu Hình Trường"</b> ở trên để phân tích và chọn trường tự động.
                        </p>
                      )}
                    </div>

                    {/* Timeout & Sender Filter (2 cột) */}
                    <div className="grid grid-cols-2 gap-3 pt-0.5">
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-400">Timeout (ms)</label>
                        <input
                          type="number"
                          step="1000"
                          value={formData.auth_config?.timeoutMs ?? 10000}
                          onChange={(e) => handleAuthConfigChange(config.id, "timeoutMs", Number(e.target.value))}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-400">Sender Filter (Tiêu chí lọc)</label>
                        <input
                          type="text"
                          placeholder="adobe / all"
                          value={formData.auth_config?.senderFilter ?? "adobe"}
                          onChange={(e) => handleAuthConfigChange(config.id, "senderFilter", e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Block Footer Actions */}
                <div className="pt-3.5 mt-2 border-t border-slate-800/80 flex items-center justify-between gap-3">
                  {/* Ping Result Badge */}
                  <div className="flex items-center gap-2">
                    {ping ? (
                      <div
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1.5 ${
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

                  {/* Main Action Buttons: Chỉ còn 3 nút tối giản, thẳng hàng tuyệt đối */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Live Test OTP Button (cho dịch vụ OTP) */}
                    {isOtpType && (
                      <button
                        type="button"
                        onClick={() => openOtpProbeModal(config.service_key)}
                        className="px-3 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95"
                        title="Mở popup thử cào OTP từ email"
                      >
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        Thử Lấy OTP
                      </button>
                    )}

                    {/* Ping Test Button */}
                    <button
                      type="button"
                      onClick={() => handlePingTest(config.id)}
                      disabled={isPinging}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50"
                    >
                      <Wifi className={`w-3.5 h-3.5 text-cyan-400 ${isPinging ? "animate-pulse text-cyan-300" : ""}`} />
                      {isPinging ? "Đang ping..." : "Ping"}
                    </button>

                    {/* Save Button */}
                    <button
                      type="button"
                      onClick={() => handleSaveCard(config.id)}
                      disabled={isSaving}
                      className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg shadow-cyan-600/20 active:scale-95 disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {isSaving ? "Lưu..." : "Lưu"}
                    </button>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-6xl w-full h-[88vh] p-5 sm:p-6 shadow-2xl relative flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl text-cyan-400">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Bộ Chọn Trường JSON & Bóc Tách Dữ Liệu
                    <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-medium">
                      {mappingServiceName}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Gửi request thử để phân tích cây JSON trả về, sau đó click chọn trường muốn bóc tách và hiển thị ra giao diện.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowMappingModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Split-View 2 Cột */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-0 pt-3.5 pb-2 overflow-hidden">
              {/* CỘT TRÁI (7 COLS / 58%): Request & Response JSON Explorer */}
              <div className="lg:col-span-7 flex flex-col gap-3 min-h-0 overflow-y-auto pr-1">
                {/* Thanh chuyển chế độ (Mode Tabs) & Quick Preset */}
                <div className="flex items-center justify-between bg-slate-950/80 p-1.5 rounded-xl border border-slate-800/80 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setMappingMode("api")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        mappingMode === "api"
                          ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <Filter className="w-3.5 h-3.5" />
                      1. Gửi Thử API Thực Tế
                    </button>
                    <button
                      type="button"
                      onClick={() => setMappingMode("paste")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        mappingMode === "paste"
                          ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <Copy className="w-3.5 h-3.5" />
                      2. Dán JSON Mẫu (Tùy Chọn)
                    </button>
                  </div>

                  {/* Nút nạp nhanh mẫu chuẩn HDSD */}
                  <button
                    type="button"
                    onClick={handleLoadPresetSample}
                    className="px-2.5 py-1 text-[11px] font-semibold text-cyan-300 hover:text-cyan-200 bg-cyan-950/50 hover:bg-cyan-900/50 border border-cyan-500/30 rounded-lg flex items-center gap-1 transition-all"
                    title="Nạp cấu trúc mẫu chuẩn { status: 'success', data: [{ code, otp, date, content }] }"
                  >
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    <span>Nạp Dữ Liệu Mẫu</span>
                  </button>
                </div>

                {/* Form gửi request API thực tế */}
                {mappingMode === "api" ? (
                  <div className="bg-slate-950/60 rounded-2xl border border-slate-800/80 p-3 space-y-2.5 shrink-0">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-300 flex items-center gap-1.5">
                        <Code2 className="w-3.5 h-3.5 text-cyan-400" />
                        Gửi Request Thử Đến Endpoint
                      </span>
                      {analysisResult && (
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold flex items-center gap-1 ${
                            analysisResult.status >= 200 && analysisResult.status < 300
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                          }`}
                        >
                          HTTP {analysisResult.status} ({analysisResult.latency_ms}ms)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={analyzerMethod}
                        onChange={(e) => setAnalyzerMethod(e.target.value as "GET" | "POST")}
                        className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-cyan-300 font-bold focus:outline-none focus:border-cyan-500"
                      >
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                      </select>

                      <input
                        type="text"
                        value={analyzerUrl}
                        readOnly
                        placeholder="https://api.example.com/..."
                        className="flex-1 bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 font-mono select-all focus:outline-none"
                      />

                      <button
                        type="button"
                        onClick={handleAnalyzeEndpoint}
                        disabled={analyzing}
                        className="px-3.5 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-cyan-600/25 active:scale-95 disabled:opacity-50 shrink-0"
                      >
                        <Sparkles className={`w-3.5 h-3.5 ${analyzing ? "animate-spin" : ""}`} />
                        <span>{analyzing ? "Đang gửi..." : "Gửi Thử & Phân Tích"}</span>
                      </button>
                    </div>

                    {analyzerMethod === "POST" && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>Request Body (JSON gửi kèm POST):</span>
                          <span className="text-[10px] text-slate-500">Ví dụ: {"{\"email\": \"demo_probe@example.com\"}"}</span>
                        </div>
                        <textarea
                          value={analyzerBody}
                          onChange={(e) => setAnalyzerBody(e.target.value)}
                          rows={2}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 font-mono text-xs text-slate-200 focus:outline-none focus:border-cyan-500 leading-snug"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  /* Tab Dán JSON Mẫu */
                  <div className="bg-slate-950/60 rounded-2xl border border-slate-800/80 p-3 space-y-2 shrink-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        <Copy className="w-3.5 h-3.5 text-cyan-400" />
                        Dán Cấu Trúc JSON Mẫu Để Bóc Tách Trực Tiếp
                      </span>
                      <button
                        type="button"
                        onClick={handleAnalyzeMockJson}
                        className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow"
                      >
                        <Sparkles className="w-3.5 h-3.5" /> Phân Tích JSON Này
                      </button>
                    </div>
                    <textarea
                      value={mockJsonText}
                      onChange={(e) => setMockJsonText(e.target.value)}
                      rows={4}
                      className="w-full bg-slate-900/80 border border-slate-800 rounded-xl p-2.5 font-mono text-xs text-cyan-300 focus:outline-none focus:border-cyan-500 leading-relaxed"
                      placeholder='{\n  "status": "success",\n  "data": [\n    {\n      "code": "849201",\n      "otp": "849201"\n    }\n  ]\n}'
                    />
                  </div>
                )}

                {/* Kết quả phản hồi Raw JSON Viewer */}
                <div className="flex-1 flex flex-col min-h-0 bg-slate-950 rounded-2xl border border-slate-800/90 overflow-hidden">
                  <div className="flex items-center justify-between px-3.5 py-2 bg-slate-900/80 border-b border-slate-800/80 shrink-0 text-xs">
                    <span className="font-bold flex items-center gap-1.5 text-slate-300">
                      <Braces className="w-3.5 h-3.5 text-cyan-400" />
                      Cây Dữ Liệu JSON Phản Hồi (Raw JSON)
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCopyJson}
                        disabled={!analysisResult}
                        className="px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center gap-1 transition-all disabled:opacity-40"
                      >
                        {copiedJson ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedJson ? "Đã chép" : "Sao chép JSON"}</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-3.5">
                    {analysisResult ? (
                      !analysisResult.is_json ? (
                        <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/30 space-y-2 text-xs">
                          <div className="flex items-start gap-2 text-rose-300 font-bold">
                            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                            <span>Máy chủ phản hồi HTML / Văn bản (HTTP {analysisResult.status} {analysisResult.statusText})</span>
                          </div>
                          <p className="text-slate-400 text-[11px]">
                            💡 Gợi ý: Hãy bấm nút <b>"Nạp Dữ Liệu Mẫu"</b> ở trên hoặc thử chuyển phương thức sang <b>POST</b> với email hợp lệ.
                          </p>
                          {analysisResult.raw_body && (
                            <pre className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-[11px] text-slate-400 font-mono max-h-48 overflow-y-auto whitespace-pre-wrap select-text">
                              {analysisResult.raw_body}
                            </pre>
                          )}
                        </div>
                      ) : (
                        <pre className="text-xs text-cyan-300/95 font-mono whitespace-pre leading-relaxed select-text">
                          {JSON.stringify(analysisResult.data, null, 2)}
                        </pre>
                      )
                    ) : (
                      <div className="h-full min-h-[160px] flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2">
                        <Braces className="w-8 h-8 text-slate-600" />
                        <p className="text-xs">
                          Chưa có dữ liệu phản hồi. Hãy bấm <b>"Gửi Thử & Phân Tích"</b> hoặc bấm <b>"Nạp Dữ Liệu Mẫu"</b> để xem cấu trúc JSON.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* CỘT PHẢI (5 COLS / 42%): Field Picker, Configured Fields & Live Preview */}
              <div className="lg:col-span-5 flex flex-col gap-3 min-h-0 overflow-y-auto pr-1">
                {/* KHỐI 1: BỘ CHỌN TRƯỜNG DỮ LIỆU */}
                <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 space-y-3 shrink-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5" />
                      Chọn Trường Dữ Liệu Bóc Tách
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Gõ JSON Path hoặc click chip gợi ý:
                    </span>
                  </div>

                  {/* Input JSON Path & nút hành động */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={customPathInput}
                        onChange={(e) => setCustomPathInput(e.target.value)}
                        placeholder="VD: data.code hoặc data.otp"
                        className="flex-1 bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none shadow-inner"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleApplyPath(customPathInput, true)}
                        className="flex-1 px-3 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-amber-600/20 active:scale-95 transition-all"
                      >
                        <span>🎯 Đặt làm OTP</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyPath(customPathInput, false)}
                        className="flex-1 px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-cyan-600/20 active:scale-95 transition-all"
                      >
                        <span>➕ Thêm hiển thị</span>
                      </button>
                    </div>
                  </div>

                  {/* Live Value Preview Badge */}
                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs gap-2">
                    <span className="text-slate-400 text-[11px] shrink-0">Giá trị bóc tách:</span>
                    {previewExtractedValue !== undefined ? (
                      <span className="font-mono px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold truncate max-w-[200px]" title={String(previewExtractedValue)}>
                        {typeof previewExtractedValue === "object"
                          ? JSON.stringify(previewExtractedValue)
                          : String(previewExtractedValue)}
                      </span>
                    ) : (
                      <span className="text-slate-500 italic text-[11px] truncate">
                        (Chưa tìm thấy giá trị cho "{customPathInput}")
                      </span>
                    )}
                  </div>

                  {/* Quick Preset Chips khi data rỗng hoặc gợi ý thông dụng */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Các trường thông dụng (HDSD / Webmail):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { path: "data.code", label: "data.code 🎯", isOtp: true },
                        { path: "data.otp", label: "data.otp", isOtp: true },
                        { path: "data.date", label: "data.date", isOtp: false },
                        { path: "data.content", label: "data.content", isOtp: false },
                        { path: "status", label: "status", isOtp: false },
                      ].map((chip, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setCustomPathInput(chip.path);
                          }}
                          className={`px-2 py-0.5 rounded-lg text-[11px] font-mono border transition-all ${
                            customPathInput === chip.path
                              ? "bg-cyan-500/30 text-cyan-200 border-cyan-400 shadow"
                              : chip.isOtp
                              ? "bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20"
                              : "bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700"
                          }`}
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Chips phát hiện được từ phản hồi */}
                  {analysisResult?.detected_fields && analysisResult.detected_fields.length > 0 && (
                    <div className="space-y-1.5 pt-1 border-t border-cyan-500/20">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Các trường phát hiện được từ JSON:
                      </span>
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                        {analysisResult.detected_fields.map((f, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setCustomPathInput(f.path)}
                            className={`px-2 py-0.5 rounded-lg text-[11px] font-mono border transition-all flex items-center gap-1 ${
                              customPathInput === f.path
                                ? "bg-cyan-500/30 text-cyan-200 border-cyan-400 shadow"
                                : f.is_potential_otp
                                ? "bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20"
                                : "bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700"
                            }`}
                            title={`Bấm để chọn: ${f.path} = ${f.sample}`}
                          >
                            <span>{f.path}</span>
                            {f.is_potential_otp && (
                              <span className="text-amber-400 text-[10px] font-bold">🎯 OTP</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* KHỐI 2: DANH SÁCH TRƯỜNG ĐÃ CẤU HÌNH */}
                <div className="space-y-2 flex-1 flex flex-col min-h-0">
                  <div className="flex items-center justify-between text-xs text-slate-400 shrink-0">
                    <span className="font-bold flex items-center gap-1.5 text-slate-200">
                      <Tag className="w-3.5 h-3.5 text-cyan-400" />
                      Danh Sách Trường Hiển Thị ({currentFields.length})
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Có thể chỉnh nhãn tiếng Việt
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 min-h-[120px]">
                    {currentFields.length === 0 ? (
                      <div className="p-4 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500">
                        Chưa có trường nào được chọn. Hãy nhập JSON Path ở trên và bấm <b>[🎯 Đặt làm OTP]</b> hoặc <b>[➕ Thêm hiển thị]</b>.
                      </div>
                    ) : (
                      currentFields.map((field, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/90 flex items-center justify-between gap-2.5 hover:border-slate-700 transition-all"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {field.is_primary ? (
                              <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold shrink-0">
                                OTP
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold shrink-0">
                                Phụ
                              </span>
                            )}

                            <div className="space-y-1 flex-1 min-w-0">
                              <input
                                type="text"
                                value={field.label}
                                onChange={(e) => {
                                  const newLabel = e.target.value;
                                  setCurrentFields((prev) =>
                                    prev.map((f, i) => (i === idx ? { ...f, label: newLabel } : f))
                                  );
                                }}
                                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-500"
                                placeholder="Nhãn tiếng Việt..."
                              />
                              <div className="font-mono text-[10px] text-cyan-400/90 truncate">
                                {field.path}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setCurrentFields((prev) => prev.filter((_, i) => i !== idx));
                            }}
                            className="p-1.5 text-rose-400 hover:bg-rose-950/40 rounded-lg border border-transparent hover:border-rose-800 shrink-0 transition-colors"
                            title="Xóa trường này"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* KHỐI 3: XEM TRƯỚC HIỂN THỊ (LIVE CARD PREVIEW) */}
                {currentFields.length > 0 && (
                  <div className="p-3 rounded-2xl bg-slate-950/90 border border-cyan-500/20 space-y-1.5 shrink-0">
                    <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3" />
                      Xem trước trên Thẻ API & Popup Probe:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {currentFields.map((f, idx) => (
                        <div
                          key={idx}
                          className={`px-2.5 py-1 rounded-lg border text-xs flex items-center gap-1.5 ${
                            f.is_primary
                              ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-200 font-bold"
                              : "bg-slate-900 border-slate-700 text-slate-300 font-medium"
                          }`}
                        >
                          <span className="opacity-75 text-[11px]">{f.label}:</span>
                          <span className="font-mono text-white text-[11px]">
                            {f.is_primary ? "849201" : "Giá trị mẫu"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-3.5 border-t border-slate-800 shrink-0">
              <span className="text-xs text-slate-400">
                Đã cấu hình <b className="text-white">{currentFields.length}</b> trường dữ liệu
              </span>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowMappingModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={handleSaveFieldMapping}
                  disabled={savingMapping}
                  className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-cyan-600/20 active:scale-95 disabled:opacity-50 transition-all"
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
