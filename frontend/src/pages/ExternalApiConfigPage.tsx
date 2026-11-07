import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  ChevronDown,
  ChevronUp,
  Mail,
  CheckCheck,
  MessageSquare,
  Smartphone,
  Monitor,
  Bold,
  Italic,
  Link2,
  RotateCcw,
  Film,
  KeyRound,
  ArrowLeft,
  User,
  Lock,
} from "lucide-react";
import { useNotification } from "@/shared/context/NotificationContext";

export interface MessageTemplateItem {
  id: string;
  name: string;
  title: string;
  content: string;
}

export interface TemplateVariable {
  key: string;
  tag: string;
  label: string;
  sample: string;
  color?: string;
}

export const DEFAULT_MESSAGE_TEMPLATES: MessageTemplateItem[] = [
  {
    id: "template_1",
    name: "Mẫu tin 1 (Telegram Bot)",
    title: "Telegram Bot Alert",
    content: `🔐 <b>MÃ XÁC THỰC {{service_name}}</b>\n------------------------\n- Mã OTP: <code>{{otp}}</code>\n- Tài khoản: <code>{{email}}</code>\n- Tiêu đề: {{email_subject}}\n- Nhận lúc: <code>{{email_date}}</code>\n- Nguồn gửi: {{sender}}\n------------------------\n⚠️ <i>Mã có hiệu lực trong 5 phút. Vui lòng không chia sẻ cho bất kỳ ai!</i>`,
  },
  {
    id: "template_2",
    name: "Mẫu tin 2 (Giao Diện Web / Khách)",
    title: "Web Customer Notification",
    content: `Chào bạn!\nMã xác thực đăng nhập tài khoản của bạn là: {{otp}}\n\n- Hòm thư nhận mã: {{email}}\n- Tiêu đề thư: {{email_subject}}\n- Thời gian: {{email_date}}\n\nVui lòng nhập mã để hoàn tất phiên đăng nhập của bạn.`,
  },
  {
    id: "template_3",
    name: "Mẫu tin 3 (Ghi Chú Đơn Hàng)",
    title: "Order Internal Log",
    content: `[OTP-LOG] {{service_name}} | OTP: {{otp}} | Account: {{email}} | Date: {{email_date}} | Sender: {{sender}}`,
  },
];

export const TEMPLATE_VARIABLES: TemplateVariable[] = [
  { key: "otp", tag: "{{otp}}", label: "Mã xác thực OTP (6 số)", sample: "699211", color: "text-rose-400" },
  { key: "email", tag: "{{email}}", label: "Địa chỉ email nhận mã", sample: "netlink.port.8315@colegiomontealto.us", color: "text-amber-400" },
  { key: "email_subject", tag: "{{email_subject}}", label: "Tiêu đề email nhận mã", sample: "Verification code", color: "text-cyan-400" },
  { key: "email_date", tag: "{{email_date}}", label: "Thời gian nhận thư", sample: "2026-11-04 14:55:51", color: "text-emerald-400" },
  { key: "service_name", tag: "{{service_name}}", label: "Tên nhà cung cấp / Cổng", sample: "Fix Ades Support", color: "text-purple-400" },
  { key: "sender", tag: "{{sender}}", label: "Người gửi (Sender)", sample: "Adobe (account.adobe.com)", color: "text-blue-400" },
  { key: "content", tag: "{{content}}", label: "Toàn văn nội dung thư", sample: "Your Adobe verification code is 699211", color: "text-slate-300" },
];

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

export interface AvailableFieldPreset {
  key: string;
  label: string;
  path: string;
  is_primary?: boolean;
  description: string;
  icon?: string;
  sampleValue?: string;
}

export const PRESET_AVAILABLE_FIELDS: Record<string, AvailableFieldPreset[]> = {
  fix_ades: [
    { key: "otp", label: "Mã xác thực OTP", path: "data.otp", is_primary: true, description: "Mã 6 số từ Adobe", icon: "🎯", sampleValue: "699211" },
    { key: "email_date", label: "Thời gian nhận thư", path: "data.emailDate", is_primary: false, description: "Thời điểm email gửi về hòm thư", icon: "🕒", sampleValue: "2026-11-04T07:55:51.004Z" },
    { key: "email_subject", label: "Tiêu đề email", path: "data.emailSubject", is_primary: false, description: "Tiêu đề email xác nhận", icon: "📩", sampleValue: "Verification code" },
  ],
  otp_hdsd: [
    { key: "otp", label: "Mã xác thực OTP", path: "data.code", is_primary: true, description: "Mã 6 số từ Adobe", icon: "🎯", sampleValue: "849201" },
    { key: "email_date", label: "Thời gian nhận thư", path: "data.date", is_primary: false, description: "Thời điểm nhận thư", icon: "🕒", sampleValue: "2026-11-06 09:30:00" },
    { key: "content", label: "Nội dung thư", path: "data.content", is_primary: false, description: "Toàn văn nội dung thư", icon: "📝", sampleValue: "Your Adobe verification code is 849201" },
  ],
  yuna_mail: [
    { key: "otp", label: "Mã xác thực OTP", path: "data.latest.value", is_primary: true, description: "Mã 6 số từ Adobe", icon: "🎯", sampleValue: "849201" },
    { key: "email_date", label: "Thời gian nhận thư", path: "data.latest.date", is_primary: false, description: "Thời điểm nhận thư", icon: "🕒", sampleValue: "2026-11-06 09:30:00" },
    { key: "subject", label: "Tiêu đề email", path: "data.latest.subject", is_primary: false, description: "Tiêu đề thư", icon: "📩", sampleValue: "Your Adobe verification code is 849201" },
    { key: "sender", label: "Người gửi", path: "data.latest.from_name", is_primary: false, description: "Nguồn gửi thư", icon: "👤", sampleValue: "Adobe (account.adobe.com)" },
  ],
  tinyhost: [
    { key: "otp", label: "Mã xác thực OTP", path: "emails[0].subject", is_primary: true, description: "Mã 6 số từ Adobe", icon: "🎯", sampleValue: "928314" },
    { key: "email_date", label: "Thời gian nhận thư", path: "emails[0].created_at", is_primary: false, description: "Thời điểm nhận thư", icon: "🕒", sampleValue: "2026-11-06T09:30:00Z" },
    { key: "sender", label: "Người gửi", path: "emails[0].from", is_primary: false, description: "Người gửi", icon: "👤", sampleValue: "account.adobe.com" },
  ],
  yuna_2fa: [
    { key: "otp", label: "Mã 2FA / OTP", path: "code", is_primary: true, description: "Mã 2FA 6 số", icon: "🎯", sampleValue: "419205" },
    { key: "time_left", label: "Thời gian còn lại (s)", path: "time_left", is_primary: false, description: "Số giây còn hiệu lực", icon: "⏳", sampleValue: "28" },
    { key: "account_email", label: "Email tài khoản", path: "items[0].name", is_primary: false, description: "Email tài khoản đơn hàng", icon: "📧", sampleValue: "user@domain.com" },
    { key: "product_plan", label: "Gói dịch vụ", path: "items[0].group", is_primary: false, description: "Gói đăng ký", icon: "📦", sampleValue: "Adobe Creative Cloud All Apps" },
    { key: "expires_at", label: "Hạn sử dụng", path: "items[0].expires_at_str", is_primary: false, description: "Ngày hết hạn", icon: "📅", sampleValue: "2026-12-31" },
  ],
};

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
  const [typeFilter, setTypeFilter] = useState<"all" | "direct_otp" | "webmail">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "online" | "offline">("all");
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
  const [mappingServiceKey, setMappingServiceKey] = useState<string>("");
  const [showAdvancedMapping, setShowAdvancedMapping] = useState<boolean>(false);
  const [mappingMode, setMappingMode] = useState<"api" | "paste">("api");
  const [analyzerUrl, setAnalyzerUrl] = useState("");
  const [analyzerMethod, setAnalyzerMethod] = useState<"GET" | "POST">("GET");
  const [analyzerEmail, setAnalyzerEmail] = useState("netlink.port.8315@colegiomontealto.us");
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

  // SUB-PAGE CHÍNH: Cấu Hình Cổng (configs) vs Mẫu Thông Báo (templates)
  const [activeMainTab, setActiveMainTab] = useState<"configs" | "templates">("configs");

  // State cho Sub-Page 2: Cấu Hình Mẫu Tin Nhắn & Nội Dung Hiển Thị
  const [templateMode, setTemplateMode] = useState<"default" | "custom">("custom");
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState<number>(0);
  const [previewDevice, setPreviewDevice] = useState<"web" | "mobile">("web");
  const [webPreviewTab, setWebPreviewTab] = useState<"adobe" | "netflix">("adobe");
  const [webPreviewSubForm, setWebPreviewSubForm] = useState<0 | 1>(1); // 0: Lấy Tài Khoản, 1: Nhận OTP
  const [webPreviewNetflixSubTab, setWebPreviewNetflixSubTab] = useState<0 | 1 | 2>(0); // 0: Link TV, 1: Mã 6 số, 2: OTP Login
  const [copiedPreviewKey, setCopiedPreviewKey] = useState<string | null>(null);
  const [showVariableDropdown, setShowVariableDropdown] = useState(false);
  const [messageTemplates, setMessageTemplates] = useState<MessageTemplateItem[]>(() => {
    try {
      const saved = localStorage.getItem("mavryk_otp_message_templates");
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_MESSAGE_TEMPLATES;
  });
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const handleUpdateTemplateContent = (newContent: string) => {
    setMessageTemplates((prev) => {
      const updated = [...prev];
      updated[selectedTemplateIndex] = {
        ...updated[selectedTemplateIndex],
        content: newContent,
      };
      return updated;
    });
  };

  const handleInsertVariable = (varTag: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      handleUpdateTemplateContent(messageTemplates[selectedTemplateIndex].content + varTag);
      setShowVariableDropdown(false);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = messageTemplates[selectedTemplateIndex].content;
    const updated = current.substring(0, start) + varTag + current.substring(end);
    handleUpdateTemplateContent(updated);
    setShowVariableDropdown(false);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + varTag.length, start + varTag.length);
    }, 50);
  };

  const handleFormatText = (prefix: string, suffix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = messageTemplates[selectedTemplateIndex].content;
    const selected = current.substring(start, end);
    const replacement = `${prefix}${selected || "văn_bản"}${suffix}`;
    const updated = current.substring(0, start) + replacement + current.substring(end);
    handleUpdateTemplateContent(updated);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selected ? selected.length : 7));
    }, 50);
  };

  const handleSaveTemplates = () => {
    try {
      localStorage.setItem("mavryk_otp_message_templates", JSON.stringify(messageTemplates));
      showToast("success", "Đã lưu cấu hình mẫu tin nhắn thành công!");
    } catch (err: any) {
      showToast("error", "Lỗi khi lưu cấu hình mẫu: " + err.message);
    }
  };

  const handleResetTemplates = () => {
    setMessageTemplates(DEFAULT_MESSAGE_TEMPLATES);
    localStorage.removeItem("mavryk_otp_message_templates");
    showToast("success", "Đã khôi phục về các mẫu tin nhắn mặc định!");
  };

  // Helper render text thay thế biến cho live preview
  const previewRenderedText = useMemo(() => {
    const raw = messageTemplates[selectedTemplateIndex]?.content || "";
    let res = raw;
    TEMPLATE_VARIABLES.forEach((v) => {
      res = res.split(v.tag).join(v.sample);
    });
    return res;
  }, [messageTemplates, selectedTemplateIndex]);

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

  const handleCopyPreviewText = (text: string, keyName: string, successMsg: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPreviewKey(keyName);
    showToast("success", successMsg);
    setTimeout(() => {
      setCopiedPreviewKey((prev) => (prev === keyName ? null : prev));
    }, 2000);
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
    setMappingServiceKey(config.service_key);
    setShowAdvancedMapping(false);
    const endpoint = config.endpoints?.only_otp || config.endpoints?.get_otp || config.endpoints?.read_otp || config.endpoints?.path || "";
    const fullUrl = config.base_url + (endpoint ? `/${endpoint.replace(/^\/+/, "")}` : "");
    setAnalyzerUrl(fullUrl);

    // Smart Preset nhận diện Method và Tham số theo nhà cung cấp
    if (config.service_key === "fix_ades") {
      setAnalyzerMethod("GET");
      setAnalyzerEmail("netlink.port.8315@colegiomontealto.us");
      setAnalyzerBody(JSON.stringify({ email: "netlink.port.8315@colegiomontealto.us" }, null, 2));
    } else if (config.service_key === "yuna_mail") {
      setAnalyzerMethod("POST");
      setAnalyzerEmail("demo_probe@example.com");
      setAnalyzerBody(JSON.stringify({ email: "demo_probe@example.com" }, null, 2));
    } else {
      const isPost = config.endpoints?.method === "POST" || config.auth_config?.method === "POST" || /get_otp_api/i.test(endpoint);
      setAnalyzerMethod(isPost ? "POST" : "GET");
      setAnalyzerEmail("demo_probe@example.com");
      setAnalyzerBody(JSON.stringify({ email: "demo_probe@example.com" }, null, 2));
    }

    setCurrentFields(config.field_mapping || []);
    setAnalysisResult(null);
    setMappingMode("api");
    const existingOtp = config.field_mapping?.find((f) => f.is_primary || f.key === "otp")?.path || (config.service_key === "fix_ades" ? "data.otp" : "data.code");
    setCustomPathInput(existingOtp);
    setShowMappingModal(true);
  };

  // 9. Thực hiện Gửi thử & Phân tích Cây JSON (Chuẩn Postman GET/POST)
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

      const activeConfig = configs.find((c) => c.id === mappingConfigId);
      const targetEndpoint = activeConfig?.endpoints?.only_otp || activeConfig?.endpoints?.get_otp || activeConfig?.endpoints?.read_otp || undefined;

      const res = await fetch("/api/system/external-apis/analyze-endpoint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config_id: mappingConfigId,
          method: analyzerMethod,
          endpoint: targetEndpoint,
          email: analyzerMethod === "GET" ? analyzerEmail.trim() : (parsedBody?.email || undefined),
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

  // 10.2. Nạp dữ liệu JSON mẫu chuẩn theo từng nhà cung cấp
  const handleLoadPresetSample = (customKey?: string) => {
    const key = customKey || mappingServiceKey;
    let sample: any = null;
    let defaultOtpPath = "data.code";
    let providerName = "HDSD";

    if (key === "fix_ades") {
      providerName = "Ades Support";
      defaultOtpPath = "data.otp";
      sample = {
        status: 200,
        success: true,
        message: "Fetched successfully",
        data: {
          success: true,
          otp: "699211",
          emailSubject: "Verification code",
          emailDate: "2026-11-04T07:55:51.004Z",
        },
        metadata: {
          timestamp: "2026-11-06T03:00:31.987Z",
        },
      };
    } else if (key === "yuna_mail") {
      providerName = "Yuna Mail";
      defaultOtpPath = "data.latest.value";
      sample = {
        status: true,
        data: {
          inbox: "demo@graphhub.one",
          latest: {
            value: "849201",
            extracted_code: "849201",
            date: "2026-11-06 09:30:00",
            subject: "Your Adobe verification code is 849201",
            from_name: "Adobe",
            from_address: "account.adobe.com",
            is_read: false,
          },
          history: [],
          source: "getadobe",
        },
      };
    } else if (key === "yuna_2fa") {
      providerName = "Yuna 2FA Center";
      defaultOtpPath = "code";
      sample = {
        code: "419205",
        time_left: 28,
        items: [
          {
            name: "user@domain.com",
            group: "Adobe Creative Cloud All Apps",
            expires_at_str: "2026-12-31",
            code: "419205",
          },
        ],
      };
    } else if (key === "tinyhost") {
      providerName = "TinyHost Temp Mail";
      defaultOtpPath = "emails[0].subject";
      sample = {
        emails: [
          {
            id: "10492",
            subject: "Your Adobe verification code: 928314",
            created_at: "2026-11-06T09:30:00Z",
            from: "account.adobe.com",
          },
        ],
      };
    } else {
      sample = {
        status: "success",
        data: [
          {
            code: "849201",
            otp: "849201",
            date: "2026-11-06 09:30:00",
            content: "Your Adobe verification code is 849201",
          },
        ],
      };
    }

    const fields = extractJsonPathsFrontend(sample);
    setAnalysisResult({
      status: 200,
      statusText: `Dữ Liệu Mẫu Chuẩn (${providerName})`,
      latency_ms: 1,
      is_json: true,
      data: sample,
      raw_body: JSON.stringify(sample, null, 2),
      detected_fields: fields,
    });
    setCustomPathInput(defaultOtpPath);
    showToast("success", `Đã nạp mẫu dữ liệu chuẩn của ${providerName}!`);
  };

  const handleCopyJson = () => {
    if (!analysisResult?.raw_body && !analysisResult?.data) return;
    const str = analysisResult.raw_body || JSON.stringify(analysisResult.data, null, 2);
    navigator.clipboard.writeText(str);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
    showToast("success", "Đã sao chép nội dung JSON vào clipboard!");
  };

  // Thêm nhanh một trường có sẵn từ Preset Catalog
  const handleAddPresetField = (preset: AvailableFieldPreset) => {
    if (currentFields.some((f) => f.path === preset.path || f.key === preset.key)) {
      showToast("error", `Trường [${preset.label}] đã có trong danh sách.`);
      return;
    }
    setCurrentFields((prev) => [
      ...prev,
      {
        key: preset.key,
        label: preset.label,
        path: preset.path,
        is_primary: preset.is_primary || false,
      },
    ]);
    showToast("success", `Đã bật trường [${preset.label}]!`);
  };

  // Bỏ chọn trường có sẵn
  const handleRemovePresetField = (path: string) => {
    setCurrentFields((prev) => prev.filter((f) => f.path !== path));
    showToast("success", "Đã bỏ chọn trường này.");
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
  // Helper phân loại dịch vụ OTP
  const isDirectOtpService = (c: ExternalApiConfig) =>
    ["fix_ades", "otp_hdsd", "yuna_2fa"].includes(c.service_key) ||
    /otp|2fa/i.test(c.service_key);

  const isWebmailService = (c: ExternalApiConfig) =>
    ["yuna_mail", "tinyhost", "tmail_webmail", "generator_email", "mail_imap"].includes(c.service_key) ||
    /mail|temp/i.test(c.service_key);

  const isZeroAuthService = (key: string) =>
    ["fix_ades", "yuna_mail", "yuna_2fa"].includes(key);

  const directOtpCount = useMemo(() => configs.filter(isDirectOtpService).length, [configs]);
  const webmailCount = useMemo(() => configs.filter(isWebmailService).length, [configs]);
  const onlineCount = useMemo(() => configs.filter((c) => c.is_active).length, [configs]);
  const offlineCount = useMemo(() => configs.filter((c) => !c.is_active).length, [configs]);
  const presetCount = useMemo(
    () => configs.filter((c) => ["fix_ades", "otp_hdsd", "yuna_mail", "tinyhost", "yuna_2fa"].includes(c.service_key)).length,
    [configs]
  );
  const mappedCount = useMemo(
    () => configs.filter((c) => c.field_mapping && c.field_mapping.length > 0).length,
    [configs]
  );

  // Lọc danh sách theo loại cổng, trạng thái hoạt động và ô tìm kiếm
  const filteredConfigs = configs.filter((c) => {
    const matchesType =
      typeFilter === "all"
        ? true
        : typeFilter === "direct_otp"
          ? isDirectOtpService(c)
          : isWebmailService(c);

    const matchesStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "online"
          ? c.is_active
          : !c.is_active;

    const matchesSearch =
      searchQuery.trim() === "" ||
      c.service_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.service_key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.base_url.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesType && matchesStatus && matchesSearch;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans text-slate-100">
      {/* HEADER SECTION - 100% CHUYÊN BIỆT CHO OTP */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
            Cấu Hình Nhà Cung Cấp & Máy Chủ Đọc OTP
          </h1>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {/* Nút Thử Lấy OTP (Live Probe) */}
          <button
            onClick={() => openOtpProbeModal("fix_ades")}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-400 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-amber-600/25 active:scale-95 transition-all"
            title="Mở bảng điều khiển quét và cào mã OTP trực tiếp"
          >
            <Zap className="w-4 h-4 text-amber-200" />
            <span>Thử Lấy OTP (Live Probe)</span>
          </button>

          {/* Nút Tải lại */}
          <button
            onClick={fetchConfigs}
            disabled={loading}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50"
            title="Tải lại danh sách cổng kết nối"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-cyan-400" : ""}`} />
          </button>

          {/* Nút Thêm Mới Cổng Dịch Vụ */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-cyan-600/25 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Cổng OTP</span>
          </button>
        </div>
      </div>

      {/* TOP SUB-PAGE SWITCHER: 2 TABS CHÍNH */}
      <div className="flex items-center gap-2 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800/80 w-fit shadow-lg">
        <button
          type="button"
          onClick={() => setActiveMainTab("configs")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${activeMainTab === "configs"
            ? "bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow-md shadow-amber-600/25"
            : "text-slate-400 hover:text-white"
            }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Cấu Hình Cổng & Bóc Tách Trường</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/30 font-mono">
            {configs.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab("templates")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${activeMainTab === "templates"
            ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-600/25"
            : "text-slate-400 hover:text-white"
            }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Cấu Hình Mẫu Tin Nhắn (Nội Dung Hiển Thị)</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-cyan-400/20 text-cyan-200 font-mono">
            Web & Mobile
          </span>
        </button>
      </div>

      {activeMainTab === "configs" ? (
        <>
          {/* 4 STATS OVERVIEW CARDS - 100% CHUYÊN BIỆT CHO OTP */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1: Tổng Cổng Dịch Vụ OTP */}
        <div className="bg-slate-900/60 border border-slate-800/80 hover:border-amber-500/30 rounded-2xl p-4 flex items-center gap-3.5 backdrop-blur-sm transition-all">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-amber-300">{configs.length}</div>
            <div className="text-xs text-slate-300 font-bold">Tổng Dịch Vụ OTP</div>
          </div>
        </div>

        {/* Card 2: Đang Hoạt Động (Online) */}
        <div className="bg-slate-900/60 border border-slate-800/80 hover:border-emerald-500/30 rounded-2xl p-4 flex items-center gap-3.5 backdrop-blur-sm transition-all">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl relative">
            <ShieldCheck className="w-5 h-5" />
            <span className="w-2 h-2 rounded-full bg-emerald-400 absolute top-2 right-2 animate-pulse" />
          </div>
          <div>
            <div className="text-xl font-black text-emerald-400">{onlineCount}</div>
            <div className="text-xs text-slate-300 font-bold">Đang Hoạt Động (Online)</div>
          </div>
        </div>

        {/* Card 3: Cổng Tự Động Hóa (Preset) */}
        <div className="bg-slate-900/60 border border-slate-800/80 hover:border-purple-500/30 rounded-2xl p-4 flex items-center gap-3.5 backdrop-blur-sm transition-all">
          <div className="p-3 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-xl">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-purple-400">{presetCount}</div>
            <div className="text-xs text-slate-300 font-bold">Tự Động Hóa (Preset)</div>
          </div>
        </div>

        {/* Card 4: Đã Ghép Trường Dữ Liệu */}
        <div className="bg-slate-900/60 border border-slate-800/80 hover:border-cyan-500/30 rounded-2xl p-4 flex items-center gap-3.5 backdrop-blur-sm transition-all">
          <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-xl">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-cyan-300">{mappedCount}</div>
            <div className="text-xs text-slate-300 font-bold">Bóc Tách Trường Động</div>
          </div>
        </div>
      </div>

      {/* TOOLBAR ĐIỀU KHIỂN & BỘ LỌC - ZERO SCROLLBAR & MODERN SEGMENTED */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-2.5 flex flex-wrap items-center justify-between gap-3 shadow-md">
        {/* Khối Trái: Segmented Inset Pill Loại Cổng + Dropdown Trạng Thái */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Segmented Control 3 nút gọn gàng */}
          <div className="bg-slate-950/90 p-1 rounded-xl border border-slate-800/80 flex items-center gap-1 shadow-inner">
            <button
              type="button"
              onClick={() => setTypeFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${typeFilter === "all"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm"
                : "text-slate-400 hover:text-white"
                }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Tất Cả</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 font-mono">
                {configs.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setTypeFilter("direct_otp")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${typeFilter === "direct_otp"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm"
                : "text-slate-400 hover:text-white"
                }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Only-OTP & 2FA</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 font-mono">
                {directOtpCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setTypeFilter("webmail")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${typeFilter === "webmail"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm"
                : "text-slate-400 hover:text-white"
                }`}
            >
              <Mail className="w-3.5 h-3.5 text-cyan-400" />
              <span>Webmail</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 font-mono">
                {webmailCount}
              </span>
            </button>
          </div>

          {/* Dropdown Trạng Thái Hoạt Động */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-slate-950/90 border border-slate-800/90 hover:border-slate-700 text-slate-300 text-xs font-semibold rounded-xl px-3 py-2 pr-8 focus:outline-none focus:border-amber-500 appearance-none cursor-pointer transition-all shadow-inner"
            >
              <option value="all">⚡ Mọi trạng thái ({configs.length})</option>
              <option value="online">🟢 Đang hoạt động ({onlineCount})</option>
              <option value="offline">⚪ Tạm tắt ({offlineCount})</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Khối Phải: Ô Tìm Kiếm Co Giãn + Bộ Đếm */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tên, key, URL host..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950/90 border border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all font-mono"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                title="Xóa từ khóa tìm kiếm"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <span className="text-xs text-slate-400 bg-slate-950/90 border border-slate-800 px-3 py-2 rounded-xl font-mono whitespace-nowrap shadow-inner">
            {filteredConfigs.length} / {configs.length} Cổng
          </span>
        </div>
      </div>

      {/* DANH SÁCH CÁC CỔNG DỊCH VỤ OTP (GRID 2 CỘT HIỆN ĐẠI) */}
      {loading ? (
        <div className="py-20 text-center space-y-3 bg-slate-900/40 border border-slate-800/80 rounded-3xl backdrop-blur-sm">
          <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Đang tải danh sách các cổng kết nối OTP & Mail Server...</p>
        </div>
      ) : filteredConfigs.length === 0 ? (
        <div className="py-16 text-center bg-slate-900/40 border border-slate-800 rounded-3xl p-8 space-y-3">
          <Key className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-sm font-semibold text-slate-300">Không tìm thấy cổng OTP nào phù hợp bộ lọc.</p>
          <p className="text-xs text-slate-500">Hãy thử đổi từ khóa tìm kiếm hoặc bấm nút "Thêm Cổng OTP".</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredConfigs.map((config) => {
            const formData = editForms[config.id] || config;
            const isSaving = savingId === config.id;
            const isPinging = pingingId === config.id;
            const ping = pingResults[config.id];
            const isTokenVisible = Boolean(showTokens[config.id]);
            const isDirect = isDirectOtpService(config);
            const isZeroAuth = isZeroAuthService(config.service_key);

            // Card Style
            const borderHover = isDirect ? "hover:border-amber-500/40" : "hover:border-cyan-500/40";
            const iconBg = isDirect
              ? "bg-amber-500/10 text-amber-400 border-amber-500/25"
              : "bg-cyan-500/10 text-cyan-400 border-cyan-500/25";

            return (
              <div
                key={config.id}
                className={`bg-slate-900/80 border border-slate-800/80 rounded-3xl p-5 shadow-xl transition-all duration-200 flex flex-col justify-between backdrop-blur-md relative overflow-hidden ${borderHover}`}
              >
                <div className="space-y-4">
                  {/* Card Header: Service Tag + Title + Online Toggle + Delete */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`p-3 rounded-2xl border ${iconBg} shadow-inner shrink-0 mt-0.5`}>
                        {isDirect ? <Key className="w-5 h-5" /> : <Mail className="w-5 h-5" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          {isDirect ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                              <Zap className="w-3 h-3 text-amber-400" />
                              ONLY-OTP & 2FA
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                              <Mail className="w-3 h-3 text-cyan-400" />
                              HỘP THƯ WEBMAIL
                            </span>
                          )}
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                            {config.service_key}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-white tracking-tight truncate">{config.service_name}</h3>
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{config.description || "Dịch vụ cào mã xác thực OTP"}</p>
                      </div>
                    </div>

                    {/* Right: Online / Offline Toggle + Delete */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          const newActive = !formData.is_active;
                          handleFieldChange(config.id, "is_active", newActive);
                        }}
                        className="focus:outline-none transition-transform active:scale-95"
                        title={formData.is_active ? "Đang bật (Nhấn để tạm tắt)" : "Đang tắt (Nhấn để bật)"}
                      >
                        {formData.is_active ? (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 rounded-xl text-[11px] font-bold">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span>ONLINE</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 border border-slate-700 text-slate-400 rounded-xl text-[11px] font-bold">
                            <span className="w-2 h-2 rounded-full bg-slate-500" />
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

                  {/* Form Inputs inside Card */}
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

                    {/* Zero-Auth Banner OR Token Input */}
                    {isZeroAuth ? (
                      <div className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/30 text-purple-200 text-[11px] flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0" />
                        <span>
                          <b>Zero-Auth:</b> Hệ thống tự động cấp Bearer Token / Session Cache, không cần nhập API Token thủ công.
                        </span>
                      </div>
                    ) : formData.auth_config ? (
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
                    ) : null}

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
                          title="Mở kho trường và bộ bóc tách JSON cho cổng này"
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
                              className={`text-[10px] font-mono px-2 py-0.5 rounded-lg border flex items-center gap-1 ${fm.is_primary
                                ? "bg-amber-500/15 border-amber-500/40 text-amber-300 font-bold"
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
                          Đang dùng mã OTP mặc định. Bấm nút <b>"Cấu Hình Trường"</b> để bật thêm Ngày Giờ, Tiêu Đề...
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
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1.5 ${ping.reachable
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

                  {/* Main Action Buttons: 3 nút tối giản */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Live Test OTP Button */}
                    <button
                      type="button"
                      onClick={() => openOtpProbeModal(config.service_key)}
                      className="px-3 py-2 bg-gradient-to-r from-amber-600/25 to-amber-500/20 hover:from-amber-600/35 hover:to-amber-500/30 text-amber-300 border border-amber-500/35 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95"
                      title="Mở popup thử cào OTP từ email"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span>Thử Lấy OTP</span>
                    </button>

                    {/* Ping Test Button */}
                    <button
                      type="button"
                      onClick={() => handlePingTest(config.id)}
                      disabled={isPinging}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50"
                    >
                      <Wifi className={`w-3.5 h-3.5 text-cyan-400 ${isPinging ? "animate-pulse text-cyan-300" : ""}`} />
                      <span>{isPinging ? "Đang ping..." : "Ping"}</span>
                    </button>

                    {/* Save Button */}
                    <button
                      type="button"
                      onClick={() => handleSaveCard(config.id)}
                      disabled={isSaving}
                      className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg shadow-cyan-600/20 active:scale-95 disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isSaving ? "Lưu..." : "Lưu"}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </>
    ) : (
      /* SUB-PAGE 2: CẤU HÌNH MẪU THÔNG BÁO & MULTI-DEVICE PREVIEW (WEB / MOBILE) */
      <div className="space-y-5 animate-in fade-in duration-200">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* CỘT TRÁI (6 COLS): BẢNG SOẠN THẢO MẪU THÔNG BÁO (CHUẨN 1-1 ẢNH CỦA MASTER) */}
          <div className="lg:col-span-6 bg-slate-900/80 border border-slate-800/90 rounded-3xl p-5 sm:p-6 space-y-5 shadow-2xl backdrop-blur-md">
            {/* Tiêu đề mục & Switch Mặc định / Tùy chỉnh */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-cyan-400" />
                    Cấu hình mẫu thông báo
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Định nghĩa mẫu tin nhắn gửi qua Bot Telegram hoặc hiển thị nội dung cho nhân viên.
                  </p>
                </div>
              </div>

              {/* Switcher Mặc định / Tùy chỉnh */}
              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 w-fit">
                <button
                  type="button"
                  onClick={() => setTemplateMode("default")}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    templateMode === "default"
                      ? "bg-slate-800 text-white shadow"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Mặc định
                </button>
                <button
                  type="button"
                  onClick={() => setTemplateMode("custom")}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    templateMode === "custom"
                      ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Tùy chỉnh
                </button>
              </div>
            </div>

            {/* Chọn mẫu tin nhắn: 3 nút mẫu */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                <span>Chọn mẫu tin nhắn</span>
                <span className="text-rose-400">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {messageTemplates.map((tpl, idx) => {
                  const isSelected = selectedTemplateIndex === idx;
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => setSelectedTemplateIndex(idx)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all truncate border ${
                        isSelected
                          ? "bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30"
                          : "bg-slate-950/80 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white"
                      }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{tpl.name.split("(")[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Soạn nội dung template */}
            <div className="space-y-2.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                  <span>Nội dung</span>
                  <span className="text-rose-400">*</span>
                </label>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Bạn có thể tùy chỉnh nội dung theo ý thích. Hệ thống hỗ trợ các biến có sẵn giúp bạn có thể tạo mẫu tin nhắn theo cách riêng.
                </p>
              </div>

              {/* Toolbar Format & Dropdown Chèn biến */}
              <div className="relative">
                <div className="flex items-center justify-between bg-slate-950 p-1.5 rounded-t-xl border border-b-0 border-slate-800">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleFormatText("<b>", "</b>")}
                      title="In đậm (Bold - <b>)"
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                      <Bold className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFormatText("<i>", "</i>")}
                      title="In nghiêng (Italic - <i>)"
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                      <Italic className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFormatText('<a href="https://example.com">', "</a>")}
                      title="Chèn liên kết (Link - <a href>)"
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFormatText("<code>", "</code>")}
                      title="Định dạng mã code (Monospace - <code>)"
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-xs font-mono font-bold text-cyan-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors"
                    >
                      &lt;&gt;
                    </button>
                  </div>

                  {/* Nút Chèn biến ▾ */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowVariableDropdown(!showVariableDropdown)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-all shadow-sm"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Chèn biến</span>
                      <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showVariableDropdown ? "rotate-180" : ""}`} />
                    </button>

                    {/* Dropdown Menu Biến (Chuẩn 1-1 ảnh 2 của Master) */}
                    {showVariableDropdown && (
                      <div className="absolute right-0 top-full mt-1.5 w-80 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-30 p-2 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                        <div className="px-2.5 py-1 text-[11px] font-bold text-slate-400 border-b border-slate-800 pb-1.5 mb-1 flex items-center justify-between">
                          <span>Danh sách biến có sẵn:</span>
                          <span className="text-[10px] text-cyan-400">Click để chèn</span>
                        </div>
                        <div className="max-h-60 overflow-y-auto space-y-0.5">
                          {TEMPLATE_VARIABLES.map((v) => (
                            <button
                              key={v.key}
                              type="button"
                              onClick={() => handleInsertVariable(v.tag)}
                              className="w-full px-2.5 py-2 rounded-xl text-left hover:bg-slate-800/90 flex items-center justify-between group transition-colors"
                            >
                              <div className="min-w-0 pr-2">
                                <div className="text-xs font-medium text-slate-200 truncate">{v.label}</div>
                                <div className="text-[10px] text-slate-500 truncate">VD: {v.sample}</div>
                              </div>
                              <span className="font-mono text-xs font-bold text-rose-400 group-hover:text-rose-300 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-lg shrink-0">
                                {v.tag}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Textarea Template Editor */}
                <textarea
                  ref={textareaRef}
                  rows={10}
                  disabled={templateMode === "default"}
                  value={messageTemplates[selectedTemplateIndex]?.content || ""}
                  onChange={(e) => handleUpdateTemplateContent(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-b-xl p-3.5 font-mono text-xs text-slate-200 focus:outline-none focus:border-cyan-500 leading-relaxed disabled:opacity-60 disabled:cursor-not-allowed select-text"
                  placeholder="Nhập nội dung mẫu tin nhắn..."
                />
              </div>

              {/* Mẹo sử dụng biến */}
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-slate-500">Mẹo: Sử dụng các biến</span>
                {TEMPLATE_VARIABLES.slice(0, 3).map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => handleInsertVariable(v.tag)}
                    className="text-rose-400 hover:text-rose-300 font-mono text-[10px] bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20 transition-colors"
                  >
                    {v.tag}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setShowVariableDropdown(true)}
                  className="text-cyan-400 hover:text-cyan-300 font-semibold underline text-[11px] ml-1"
                >
                  Xem tất cả biến
                </button>
              </div>
            </div>

            {/* Nút Lưu & Khôi phục */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={handleResetTemplates}
                className="px-3.5 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 flex items-center gap-1.5 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Khôi phục mặc định</span>
              </button>

              <button
                type="button"
                onClick={handleSaveTemplates}
                className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-cyan-600/25 active:scale-95 transition-all"
              >
                <Save className="w-4 h-4" />
                <span>Lưu Mẫu Cấu Hình</span>
              </button>
            </div>
          </div>

          {/* CỘT PHẢI (6 COLS): LIVE PREVIEW TÙY BIẾN LINH HOẠT WEB HOẶC MOBILE (THEO CHỈ ĐẠO MASTER) */}
          <div className="lg:col-span-6 space-y-4">
            {/* Header Cột Phải: Bộ Chuyển Đổi Thiết Bị (Device Switcher) */}
            <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800/90 rounded-2xl p-2.5 shadow-md">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                <Eye className="w-4 h-4 text-cyan-400" />
                <span>Xem Trước Trực Quan (Live Preview)</span>
              </div>

              {/* Nút chuyển đổi Web vs Mobile */}
              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 shadow-inner">
                <button
                  type="button"
                  onClick={() => setPreviewDevice("web")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    previewDevice === "web"
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>Giao Diện Web</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewDevice("mobile")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    previewDevice === "mobile"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Giao Diện Mobile</span>
                </button>
              </div>
            </div>

            {/* 1. KHI CHỌN GIAO DIỆN WEB (CHUẨN 100% GIAO DIỆN otp_portal CỦA MASTER) */}
            {previewDevice === "web" ? (
              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in duration-150">
                {/* Web Browser Top Bar */}
                <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                    <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                    <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                  </div>
                  <div className="flex-1 max-w-sm bg-slate-900 border border-slate-800/80 rounded-lg px-3 py-1 text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                    <Globe className="w-3 h-3 text-amber-400" />
                    <span className="truncate">https://otp.mavrykpremium.com/portal/verify-session</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-semibold bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Trực Tuyến</span>
                  </div>
                </div>

                {/* Vùng Thẻ Thông Báo Web: HIỂN THỊ DUY NHẤT 1 GIAO DIỆN CHI TIẾT THEO CHỈ ĐẠO CỦA MASTER */}
                <div className="p-4 sm:p-6 bg-gradient-to-b from-[#0d0714] via-[#120a1d] to-[#0a0512] flex flex-col items-center justify-center min-h-[500px]">
                  <div className="w-full max-w-md bg-gradient-to-b from-[#1f1335]/95 via-[#180e2b]/95 to-[#120922]/95 border border-amber-500/30 rounded-3xl p-5 shadow-[0_15px_45px_rgba(0,0,0,0.7),0_0_35px_rgba(245,158,11,0.12)] space-y-4 text-white">
                    {/* Header Dịch Vụ: Adobe vs Netflix */}
                    <div className="flex p-1 bg-black/40 border border-amber-500/20 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setWebPreviewTab("adobe")}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                          webPreviewTab === "adobe"
                            ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-[0_2px_12px_rgba(245,158,11,0.35)]"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        <span className="w-4 h-4 rounded bg-black/20 flex items-center justify-center text-[10px] font-black">
                          A
                        </span>
                        <span>Adobe</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setWebPreviewTab("netflix")}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                          webPreviewTab === "netflix"
                            ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-[0_2px_12px_rgba(245,158,11,0.35)]"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        <Film className="w-3.5 h-3.5" />
                        <span>Netflix</span>
                      </button>
                    </div>

                    {/* ========================================================================= */}
                    {/* 1. KHI CHỌN ADOBE: ĐƠN LẬP 1 GIAO DIỆN DUY NHẤT                           */}
                    {/* ========================================================================= */}
                    {webPreviewTab === "adobe" && (
                      <div className="space-y-3.5">
                        <div className="flex items-center justify-between pb-2 border-b border-amber-500/15">
                          <span className="text-xs font-bold text-amber-200/90 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b]" />
                            Adobe Creative Cloud
                          </span>

                          <div className="flex p-0.5 bg-black/40 border border-amber-500/20 rounded-lg text-[11px]">
                            <button
                              type="button"
                              onClick={() => setWebPreviewSubForm(0)}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-bold transition-all ${
                                webPreviewSubForm === 0
                                  ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-sm"
                                  : "text-slate-400 hover:text-white"
                              }`}
                            >
                              <KeyRound className="w-3 h-3" />
                              <span>Lấy Tài Khoản</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setWebPreviewSubForm(1)}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-bold transition-all ${
                                webPreviewSubForm === 1
                                  ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-sm"
                                  : "text-slate-400 hover:text-white"
                              }`}
                            >
                              <Zap className="w-3 h-3" />
                              <span>Nhận OTP</span>
                            </button>
                          </div>
                        </div>

                        {/* HIỂN THỊ ĐƠN LẬP FORM 1 (NHẬN OTP) HOẶC FORM 0 (LẤY TÀI KHOẢN) */}
                        {webPreviewSubForm === 1 ? (
                          /* FORM 1: NHẬN OTP (MÃ SỐ TO RÕ, NÚT SAO CHÉP, KHÔNG CÓ KHỐI CHI TIẾT THỪA) */
                          <div className="space-y-3 animate-in fade-in zoom-in-95 duration-150">
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400/60" />
                              <input
                                type="text"
                                readOnly
                                value="netlink.port.8315@colegiomontealto.us"
                                className="w-full bg-black/45 border border-amber-500/25 rounded-xl pl-9 pr-3 py-2.5 text-xs text-amber-100/90 font-mono focus:outline-none"
                              />
                            </div>

                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setWebPreviewSubForm(0)}
                                className="px-3 py-2 rounded-xl text-xs font-bold border border-amber-500/20 bg-white/5 hover:bg-white/10 text-slate-300 flex items-center gap-1 transition-all"
                              >
                                <ArrowLeft className="w-3 h-3" />
                                <span>Lấy Tài Khoản</span>
                              </button>

                              <button
                                type="button"
                                className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-[0_3px_15px_rgba(245,158,11,0.3)] hover:brightness-110 active:scale-98 transition-all"
                              >
                                <Zap className="w-3.5 h-3.5 fill-current" />
                                <span>Lấy Mã OTP Adobe</span>
                              </button>
                            </div>

                            {/* Khối Kết Quả OTP */}
                            <div className="p-3.5 rounded-xl border border-amber-500/30 bg-black/65 text-center space-y-2.5 shadow-[0_4px_25px_rgba(245,158,11,0.15)]">
                              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                                MÃ XÁC MINH ADOBE CỦA BẠN
                              </div>

                              <div
                                onClick={() =>
                                  handleCopyPreviewText("699211", "otp_digits", "Đã sao chép mã OTP: 699211!")
                                }
                                className="flex items-center justify-center gap-2 cursor-pointer py-1"
                                title="Bấm vào để sao chép mã ngay"
                              >
                                {["6", "9", "9", "2", "1", "1"].map((digit, idx) => (
                                  <div
                                    key={idx}
                                    className="w-10 h-12 rounded-xl bg-gradient-to-b from-black/80 to-black/95 border border-amber-500/50 flex items-center justify-center text-2xl font-black text-amber-300 font-mono shadow-[0_0_12px_rgba(245,158,11,0.25)] hover:scale-105 transition-transform"
                                  >
                                    {digit}
                                  </div>
                                ))}
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  handleCopyPreviewText("699211", "otp_button", "Đã sao chép mã OTP: 699211!")
                                }
                                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 text-slate-950 font-bold text-xs uppercase tracking-wide flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(245,158,11,0.3)] hover:brightness-110 active:scale-98 transition-all"
                              >
                                {copiedPreviewKey === "otp_button" || copiedPreviewKey === "otp_digits" ? (
                                  <>
                                    <Check className="w-4 h-4 text-slate-950 stroke-[3]" />
                                    <span>ĐÃ SAO CHÉP MÃ (699211)!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-4 h-4 text-slate-950 stroke-[2.5]" />
                                    <span>SAO CHÉP MÃ XÁC THỰC (699211)</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* FORM 0: LẤY TÀI KHOẢN (KẾT QUẢ DẠNG TEXT CÓ DÒNG MẬT KHẨU THEO YÊU CẦU MASTER) */
                          <div className="space-y-3 animate-in fade-in zoom-in-95 duration-150">
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400/60" />
                              <input
                                type="text"
                                readOnly
                                value="customer.order.2026@gmail.com"
                                className="w-full bg-black/45 border border-amber-500/25 rounded-xl pl-9 pr-3 py-2.5 text-xs text-amber-100/90 font-mono focus:outline-none"
                              />
                            </div>

                            <div className="flex gap-2">
                              <button
                                type="button"
                                className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-[0_3px_15px_rgba(245,158,11,0.3)] hover:brightness-110 active:scale-98 transition-all"
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                                <span>Tra Cứu Tài Khoản</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setWebPreviewSubForm(1)}
                                className="px-3 py-2 rounded-xl text-xs font-bold border border-amber-500/20 bg-white/5 hover:bg-white/10 text-slate-300 flex items-center gap-1 transition-all"
                              >
                                <span>Lấy OTP</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            </div>

                            {/* Khối Kết Quả Tài Khoản Text Đầy Đủ Dòng Mật Khẩu */}
                            <div className="p-3.5 rounded-xl border border-amber-500/30 bg-black/65 space-y-2 text-xs shadow-[0_4px_25px_rgba(245,158,11,0.15)]">
                              <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                                <span className="font-bold text-slate-300 uppercase flex items-center gap-1 text-[11px]">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>TÀI KHOẢN ĐƯỢC CẤP</span>
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                  ĐANG HOẠT ĐỘNG
                                </span>
                              </div>

                              <div className="space-y-1.5 text-[11px]">
                                {/* Dòng 1: Email Cấp */}
                                <div className="flex items-center justify-between p-2 rounded-lg border border-amber-500/20 bg-black/40">
                                  <div className="truncate max-w-[240px] font-mono text-amber-100 font-bold">
                                    netlink.port.8315@colegiomontealto.us
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleCopyPreviewText(
                                        "netlink.port.8315@colegiomontealto.us",
                                        "acc_email",
                                        "Đã chép Email Adobe!"
                                      )
                                    }
                                    className="p-1 rounded border border-amber-500/30 hover:bg-amber-500/20 text-amber-400 transition-all"
                                    title="Sao chép Email"
                                  >
                                    {copiedPreviewKey === "acc_email" ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>

                                {/* Dòng 2: MẬT KHẨU (Chuẩn Master yêu cầu) */}
                                <div className="flex items-center justify-between p-2 rounded-lg border border-amber-500/20 bg-black/40">
                                  <div className="flex items-center gap-2">
                                    <span className="text-slate-400 text-[10px] uppercase font-semibold">
                                      Mật khẩu:
                                    </span>
                                    <span className="font-mono font-bold text-amber-300">
                                      Mavryk@2026!#
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleCopyPreviewText(
                                        "Mavryk@2026!#",
                                        "acc_pass",
                                        "Đã chép Mật khẩu Adobe!"
                                      )
                                    }
                                    className="p-1 rounded border border-amber-500/30 hover:bg-amber-500/20 text-amber-400 transition-all"
                                    title="Sao chép Mật khẩu"
                                  >
                                    {copiedPreviewKey === "acc_pass" ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>

                                {/* Dòng 3: Gói & Hạn dùng */}
                                <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 pt-0.5">
                                  <span>Gói: Adobe All Apps 1 Năm</span>
                                  <span>Hạn: 04/11/2027</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ========================================================================= */}
                    {/* 2. KHI CHỌN NETFLIX: ĐƠN LẬP 1 GIAO DIỆN DUY NHẤT                         */}
                    {/* ========================================================================= */}
                    {webPreviewTab === "netflix" && (
                      <div className="space-y-3.5 animate-in fade-in duration-150">
                        <div className="flex items-center justify-between pb-2 border-b border-amber-500/15">
                          <span className="text-xs font-bold text-amber-200/90 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e]" />
                            Netflix Premium Cổng Tự Động
                          </span>

                          <div className="flex p-0.5 bg-black/40 border border-amber-500/20 rounded-lg text-[10px]">
                            <button
                              type="button"
                              onClick={() => setWebPreviewNetflixSubTab(0)}
                              className={`px-2 py-0.5 rounded font-bold transition-all ${
                                webPreviewNetflixSubTab === 0
                                  ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950"
                                  : "text-slate-400 hover:text-white"
                              }`}
                            >
                              Link TV
                            </button>
                            <button
                              type="button"
                              onClick={() => setWebPreviewNetflixSubTab(1)}
                              className={`px-2 py-0.5 rounded font-bold transition-all ${
                                webPreviewNetflixSubTab === 1
                                  ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950"
                                  : "text-slate-400 hover:text-white"
                              }`}
                            >
                              Mã 6 Số
                            </button>
                            <button
                              type="button"
                              onClick={() => setWebPreviewNetflixSubTab(2)}
                              className={`px-2 py-0.5 rounded font-bold transition-all ${
                                webPreviewNetflixSubTab === 2
                                  ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950"
                                  : "text-slate-400 hover:text-white"
                              }`}
                            >
                              OTP Login
                            </button>
                          </div>
                        </div>

                        {/* Subform Netflix: Link TV */}
                        {webPreviewNetflixSubTab === 0 && (
                          <div className="space-y-3">
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400/60" />
                              <input
                                type="text"
                                readOnly
                                value="premium.family@netflix.com"
                                className="w-full bg-black/45 border border-amber-500/25 rounded-xl pl-9 pr-3 py-2.5 text-xs text-amber-100 font-mono focus:outline-none"
                              />
                            </div>
                            <button
                              type="button"
                              className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-[0_3px_15px_rgba(245,158,11,0.3)]"
                            >
                              <Zap className="w-3.5 h-3.5 fill-current" />
                              <span>Lấy Link Xác Minh TV / Hộ Gia Đình</span>
                            </button>

                            <div className="p-3 rounded-xl border border-amber-500/30 bg-black/65 space-y-2">
                              <div className="flex items-center justify-between text-[11px] font-bold text-emerald-400">
                                <span className="flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>LINK XÁC MINH SẴN SÀNG</span>
                                </span>
                                <span className="text-[10px] text-slate-400 font-normal">Hết hạn: 15p</span>
                              </div>
                              <div className="flex items-center justify-between p-2 rounded-lg border border-amber-500/20 bg-black/40">
                                <span className="font-mono text-[11px] text-amber-200 truncate max-w-[240px]">
                                  https://www.netflix.com/account/travel/verify?token=nf_99182a...
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleCopyPreviewText(
                                      "https://www.netflix.com/account/travel/verify?token=nf_99182a",
                                      "nf_link",
                                      "Đã sao chép link Netflix!"
                                    )
                                  }
                                  className="p-1 rounded border border-amber-500/30 hover:bg-amber-500/20 text-amber-400"
                                >
                                  {copiedPreviewKey === "nf_link" ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Subform Netflix: Mã 6 Số */}
                        {webPreviewNetflixSubTab === 1 && (
                          <div className="space-y-3">
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400/60" />
                              <input
                                type="text"
                                readOnly
                                value="premium.family@netflix.com"
                                className="w-full bg-black/45 border border-amber-500/25 rounded-xl pl-9 pr-3 py-2.5 text-xs text-amber-100 font-mono focus:outline-none"
                              />
                            </div>
                            <div className="p-3.5 rounded-xl border border-amber-500/30 bg-black/65 text-center space-y-2.5 shadow-[0_4px_25px_rgba(245,158,11,0.15)]">
                              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                                MÃ XÁC MINH 6 SỐ NETFLIX
                              </div>
                              <div className="flex items-center justify-center gap-2 py-1">
                                {["4", "8", "1", "0", "9", "3"].map((digit, idx) => (
                                  <div
                                    key={idx}
                                    className="w-10 h-12 rounded-xl bg-black/90 border border-amber-500/50 flex items-center justify-center text-2xl font-black text-amber-300 font-mono"
                                  >
                                    {digit}
                                  </div>
                                ))}
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  handleCopyPreviewText(
                                    "481093",
                                    "nf_6digit",
                                    "Đã sao chép mã Netflix: 481093!"
                                  )
                                }
                                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-2"
                              >
                                <Copy className="w-4 h-4" />
                                <span>SAO CHÉP MÃ XÁC THỰC (481093)</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Subform Netflix: OTP Login 4 Số */}
                        {webPreviewNetflixSubTab === 2 && (
                          <div className="space-y-3">
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400/60" />
                              <input
                                type="text"
                                readOnly
                                value="premium.family@netflix.com"
                                className="w-full bg-black/45 border border-amber-500/25 rounded-xl pl-9 pr-3 py-2.5 text-xs text-amber-100 font-mono focus:outline-none"
                              />
                            </div>
                            <div className="p-3.5 rounded-xl border border-amber-500/30 bg-black/65 text-center space-y-2.5 shadow-[0_4px_25px_rgba(245,158,11,0.15)]">
                              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                                MÃ ĐĂNG NHẬP 4 SỐ NETFLIX
                              </div>
                              <div className="flex items-center justify-center gap-2 py-1">
                                {["7", "2", "9", "5"].map((digit, idx) => (
                                  <div
                                    key={idx}
                                    className="w-10 h-12 rounded-xl bg-black/90 border border-amber-500/50 flex items-center justify-center text-2xl font-black text-amber-300 font-mono"
                                  >
                                    {digit}
                                  </div>
                                ))}
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  handleCopyPreviewText(
                                    "7295",
                                    "nf_4digit",
                                    "Đã sao chép mã đăng nhập: 7295!"
                                  )
                                }
                                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-2"
                              >
                                <Copy className="w-4 h-4" />
                                <span>SAO CHÉP MÃ ĐĂNG NHẬP (7295)</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Chân Thẻ Bảo Mật SSL */}
                    <div className="pt-1 flex items-center justify-center gap-1.5 text-[11px] text-amber-400/80">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Bảo mật 256–Bit SSL</span>
                    </div>
                  </div>

                  {/* Footer Ghi Chú Bên Dưới Thẻ Web */}
                  <div className="mt-4 text-center text-[10px] text-slate-500 space-y-1">
                    <div>📺 Mở link TV trên cùng Wi-Fi • 🎧 Hỗ trợ 24/7 trực tuyến</div>
                    <div>© 2026 Mavryk Premium • Cổng Dịch Vụ Khách Hàng</div>
                  </div>
                </div>
              </div>
            ) : (
              /* 2. KHI CHỌN GIAO DIỆN MOBILE (IPHONE SMARTPHONE PREVIEW - CHUẨN GIAO DIỆN otp_portal CỦA MASTER) */
              <div className="flex justify-center">
                <div className="w-[330px] sm:w-[360px] bg-[#0c1017] rounded-[50px] p-3 border-[6px] border-slate-700/80 shadow-2xl relative select-none">
                  {/* Dynamic Island iPhone */}
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-full z-30 flex items-center justify-between px-2.5">
                    <div className="w-2 h-2 rounded-full bg-slate-900 border border-slate-800" />
                    <div className="w-2 h-2 rounded-full bg-blue-950/60" />
                  </div>

                  {/* Màn hình điện thoại iPhone */}
                  <div className="bg-[#0e0717] rounded-[40px] overflow-hidden flex flex-col h-[600px] text-white font-sans text-xs relative border border-slate-800/80">
                    {/* Status Bar: Giờ 9:41, Pin, Sóng */}
                    <div className="pt-3 px-6 pb-1.5 flex items-center justify-between text-[11px] font-semibold text-slate-300 shrink-0 bg-[#0e0717]/90 z-20">
                      <span>9:41</span>
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <span>5G</span>
                        <span className="w-4 h-2 rounded-sm border border-slate-300 inline-block p-0.5">
                          <span className="w-full h-full bg-white block rounded-xs" />
                        </span>
                      </div>
                    </div>

                    {/* Mobile Safari URL Bar */}
                    <div className="px-3 py-1.5 bg-[#150a24] border-b border-amber-500/15 flex items-center gap-2 shrink-0 z-20">
                      <div className="flex-1 bg-black/50 border border-amber-500/20 rounded-lg px-2.5 py-1 text-[10px] font-mono text-slate-300 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 truncate">
                          <Lock className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                          <span className="truncate">otp.mavrykpremium.com</span>
                        </div>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
                      </div>
                      <RefreshCw className="w-3 h-3 text-slate-400 shrink-0" />
                    </div>

                    {/* Nội dung trang Web otp_portal bên trong iPhone (Có thể cuộn) */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gradient-to-b from-[#120722] via-[#1a0c30] to-[#0a0414] [scrollbar-width:none]">
                      {/* Brand Header */}
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-md bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center font-black text-slate-950 text-[10px] shadow-sm">
                            M
                          </div>
                          <div>
                            <div className="text-[10px] font-black tracking-wider text-amber-200 uppercase leading-none">
                              MAVRYK PREMIUM
                            </div>
                            <div className="text-[8px] text-slate-400 leading-none mt-0.5">Cổng Kích Hoạt Tự Động</div>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[8px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          ● Trực Tuyến
                        </span>
                      </div>

                      {/* Festival Title Stage Mobile */}
                      <div className="text-center py-1 space-y-1">
                        <div className="inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300 tracking-wider">
                          ✨ RẰM THÁNG TÁM ĐOÀN VIÊN
                        </div>
                        <div className="text-base font-bold text-amber-100 font-serif leading-tight">
                          Đêm hội trăng rằm
                        </div>
                        <div className="text-[10px] text-slate-400 italic">
                          Trăng tròn sum vầy, hội ngộ bình an.
                        </div>
                      </div>

                      {/* Mobile Card: Single-Interface Tương Tác Giống 100% Web */}
                      <div className="bg-gradient-to-b from-[#1e1133]/90 via-[#170c29]/95 to-[#10071e]/95 border border-amber-500/30 rounded-2xl p-3 space-y-3 shadow-lg">
                        {/* Service Switcher Tabs: Adobe vs Netflix */}
                        <div className="flex p-0.5 bg-black/40 border border-amber-500/20 rounded-lg">
                          <button
                            type="button"
                            onClick={() => setWebPreviewTab("adobe")}
                            className={`flex-1 py-1 rounded-md text-[10px] font-bold transition-all flex items-center justify-center gap-1 ${
                              webPreviewTab === "adobe"
                                ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-sm"
                                : "text-slate-400 hover:text-white"
                            }`}
                          >
                            <span className="w-3.5 h-3.5 rounded bg-black/20 flex items-center justify-center text-[9px] font-black">
                              A
                            </span>
                            <span>Adobe</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setWebPreviewTab("netflix")}
                            className={`flex-1 py-1 rounded-md text-[10px] font-bold transition-all flex items-center justify-center gap-1 ${
                              webPreviewTab === "netflix"
                                ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-sm"
                                : "text-slate-400 hover:text-white"
                            }`}
                          >
                            <Film className="w-3 h-3" />
                            <span>Netflix</span>
                          </button>
                        </div>

                        {/* Adobe Subform Mobile */}
                        {webPreviewTab === "adobe" && (
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between pb-1.5 border-b border-amber-500/15">
                              <span className="text-[10px] font-bold text-amber-200/90 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                Adobe CC
                              </span>

                              <div className="flex p-0.5 bg-black/40 border border-amber-500/20 rounded-md text-[9px]">
                                <button
                                  type="button"
                                  onClick={() => setWebPreviewSubForm(0)}
                                  className={`px-2 py-0.5 rounded font-bold transition-all ${
                                    webPreviewSubForm === 0
                                      ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950"
                                      : "text-slate-400 hover:text-white"
                                  }`}
                                >
                                  Lấy TK
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setWebPreviewSubForm(1)}
                                  className={`px-2 py-0.5 rounded font-bold transition-all ${
                                    webPreviewSubForm === 1
                                      ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950"
                                      : "text-slate-400 hover:text-white"
                                  }`}
                                >
                                  Nhận OTP
                                </button>
                              </div>
                            </div>

                            {/* CHỈ HIỂN THỊ ĐƠN LẬP 1 FORM DUY NHẤT */}
                            {webPreviewSubForm === 1 ? (
                              /* Mobile Form 1: Nhận OTP */
                              <div className="space-y-2.5 animate-in fade-in duration-150">
                                <div className="relative">
                                  <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-amber-400/60" />
                                  <input
                                    type="text"
                                    readOnly
                                    value="netlink.port.8315@colegiomontealto.us"
                                    className="w-full bg-black/45 border border-amber-500/25 rounded-xl pl-8 pr-2 py-2 text-[10px] text-amber-100 font-mono focus:outline-none truncate"
                                  />
                                </div>

                                <div className="flex gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setWebPreviewSubForm(0)}
                                    className="px-2.5 py-1.5 rounded-xl text-[10px] font-bold border border-amber-500/20 bg-white/5 text-slate-300 flex items-center gap-0.5"
                                  >
                                    <ArrowLeft className="w-3 h-3" />
                                    <span>TK</span>
                                  </button>

                                  <button
                                    type="button"
                                    className="flex-1 py-1.5 px-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 text-slate-950 font-bold text-[10px] flex items-center justify-center gap-1 shadow-md hover:brightness-110 active:scale-98 transition-all"
                                  >
                                    <Zap className="w-3 h-3 fill-current" />
                                    <span>Lấy Mã OTP Adobe</span>
                                  </button>
                                </div>

                                <div className="p-2.5 rounded-xl border border-amber-500/30 bg-black/65 text-center space-y-2 shadow-md">
                                  <div className="text-[9px] font-bold uppercase tracking-wider text-amber-400">
                                    MÃ XÁC MINH ADOBE
                                  </div>

                                  <div
                                    onClick={() =>
                                      handleCopyPreviewText("699211", "m_otp_digits", "Đã sao chép mã OTP: 699211!")
                                    }
                                    className="flex items-center justify-center gap-1.5 cursor-pointer py-0.5"
                                    title="Bấm vào để sao chép mã ngay"
                                  >
                                    {["6", "9", "9", "2", "1", "1"].map((digit, idx) => (
                                      <div
                                        key={idx}
                                        className="w-8 h-10 rounded-lg bg-black/90 border border-amber-500/50 flex items-center justify-center text-lg font-black text-amber-300 font-mono shadow-sm"
                                      >
                                        {digit}
                                      </div>
                                    ))}
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleCopyPreviewText("699211", "m_otp_btn", "Đã sao chép mã OTP: 699211!")
                                    }
                                    className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold text-[10px] uppercase flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                                  >
                                    {copiedPreviewKey === "m_otp_btn" || copiedPreviewKey === "m_otp_digits" ? (
                                      <>
                                        <Check className="w-3 h-3 text-slate-950 stroke-[3]" />
                                        <span>ĐÃ SAO CHÉP MÃ!</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3 h-3 text-slate-950 stroke-[2.5]" />
                                        <span>SAO CHÉP MÃ (699211)</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              /* Mobile Form 0: Lấy Tài Khoản (Dạng Text có dòng mật khẩu) */
                              <div className="space-y-2.5 animate-in fade-in duration-150">
                                <div className="relative">
                                  <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-amber-400/60" />
                                  <input
                                    type="text"
                                    readOnly
                                    value="customer.order.2026@gmail.com"
                                    className="w-full bg-black/45 border border-amber-500/25 rounded-xl pl-8 pr-2 py-2 text-[10px] text-amber-100 font-mono focus:outline-none truncate"
                                  />
                                </div>

                                <div className="flex gap-1.5">
                                  <button
                                    type="button"
                                    className="flex-1 py-1.5 px-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 text-slate-950 font-bold text-[10px] flex items-center justify-center gap-1 shadow-md hover:brightness-110 active:scale-98 transition-all"
                                  >
                                    <KeyRound className="w-3 h-3" />
                                    <span>Tra Cứu</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setWebPreviewSubForm(1)}
                                    className="px-2.5 py-1.5 rounded-xl text-[10px] font-bold border border-amber-500/20 bg-white/5 text-slate-300 flex items-center gap-0.5"
                                  >
                                    <span>OTP</span>
                                    <ArrowRight className="w-3 h-3" />
                                  </button>
                                </div>

                                <div className="p-2.5 rounded-xl border border-amber-500/30 bg-black/65 space-y-1.5 text-[10px] shadow-md">
                                  <div className="flex items-center justify-between border-b border-amber-500/20 pb-1.5">
                                    <span className="font-bold text-slate-300 uppercase flex items-center gap-1 text-[9px]">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                      <span>TÀI KHOẢN CẤP</span>
                                    </span>
                                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                      HOẠT ĐỘNG
                                    </span>
                                  </div>

                                  <div className="space-y-1 text-[9.5px]">
                                    {/* Dòng Email */}
                                    <div className="flex items-center justify-between p-1.5 rounded-lg border border-amber-500/20 bg-black/40">
                                      <span className="truncate max-w-[190px] font-mono text-amber-100 font-bold">
                                        netlink.port.8315@colegiomontealto.us
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleCopyPreviewText(
                                            "netlink.port.8315@colegiomontealto.us",
                                            "m_acc_email",
                                            "Đã chép Email Adobe!"
                                          )
                                        }
                                        className="p-0.5 text-amber-400"
                                      >
                                        {copiedPreviewKey === "m_acc_email" ? (
                                          <Check className="w-3 h-3 text-emerald-400" />
                                        ) : (
                                          <Copy className="w-3 h-3" />
                                        )}
                                      </button>
                                    </div>

                                    {/* Dòng MẬT KHẨU */}
                                    <div className="flex items-center justify-between p-1.5 rounded-lg border border-amber-500/20 bg-black/40">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-slate-400 text-[8.5px] uppercase font-semibold">
                                          Mật khẩu:
                                        </span>
                                        <span className="font-mono font-bold text-amber-300">
                                          Mavryk@2026!#
                                        </span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleCopyPreviewText(
                                            "Mavryk@2026!#",
                                            "m_acc_pass",
                                            "Đã chép Mật khẩu Adobe!"
                                          )
                                        }
                                        className="p-0.5 text-amber-400"
                                      >
                                        {copiedPreviewKey === "m_acc_pass" ? (
                                          <Check className="w-3 h-3 text-emerald-400" />
                                        ) : (
                                          <Copy className="w-3 h-3" />
                                        )}
                                      </button>
                                    </div>

                                    <div className="flex items-center justify-between text-[8.5px] text-slate-400 px-0.5">
                                      <span>Adobe All Apps 1 Năm</span>
                                      <span>Hạn: 04/11/2027</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Netflix Mobile */}
                        {webPreviewTab === "netflix" && (
                          <div className="space-y-2.5 animate-in fade-in duration-150">
                            <div className="flex items-center justify-between pb-1.5 border-b border-amber-500/15">
                              <span className="text-[10px] font-bold text-amber-200/90 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                Netflix
                              </span>

                              <div className="flex p-0.5 bg-black/40 border border-amber-500/20 rounded-md text-[8.5px]">
                                <button
                                  type="button"
                                  onClick={() => setWebPreviewNetflixSubTab(0)}
                                  className={`px-1.5 py-0.5 rounded font-bold ${
                                    webPreviewNetflixSubTab === 0
                                      ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950"
                                      : "text-slate-400 hover:text-white"
                                  }`}
                                >
                                  Link TV
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setWebPreviewNetflixSubTab(1)}
                                  className={`px-1.5 py-0.5 rounded font-bold ${
                                    webPreviewNetflixSubTab === 1
                                      ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950"
                                      : "text-slate-400 hover:text-white"
                                  }`}
                                >
                                  Mã 6 Số
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setWebPreviewNetflixSubTab(2)}
                                  className={`px-1.5 py-0.5 rounded font-bold ${
                                    webPreviewNetflixSubTab === 2
                                      ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950"
                                      : "text-slate-400 hover:text-white"
                                  }`}
                                >
                                  OTP
                                </button>
                              </div>
                            </div>

                            {/* Netflix Mobile Subforms */}
                            {webPreviewNetflixSubTab === 0 && (
                              <div className="space-y-2">
                                <input
                                  type="text"
                                  readOnly
                                  value="premium.family@netflix.com"
                                  className="w-full bg-black/45 border border-amber-500/25 rounded-xl px-2.5 py-1.5 text-[10px] text-amber-100 font-mono truncate"
                                />
                                <button
                                  type="button"
                                  className="w-full py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold text-[10px]"
                                >
                                  Lấy Link Xác Minh TV
                                </button>
                                <div className="p-2 rounded-xl border border-amber-500/30 bg-black/65 flex items-center justify-between text-[9px]">
                                  <span className="font-mono text-amber-200 truncate max-w-[190px]">
                                    netflix.com/verify?token=...
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleCopyPreviewText(
                                        "https://www.netflix.com/account/travel/verify?token=nf_99182a",
                                        "m_nf_link",
                                        "Đã sao chép link Netflix!"
                                      )
                                    }
                                    className="p-0.5 text-amber-400"
                                  >
                                    {copiedPreviewKey === "m_nf_link" ? (
                                      <Check className="w-3 h-3 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            )}

                            {webPreviewNetflixSubTab === 1 && (
                              <div className="space-y-2 text-center">
                                <div className="text-[9px] font-bold text-amber-400">MÃ 6 SỐ NETFLIX</div>
                                <div className="flex justify-center gap-1">
                                  {["4", "8", "1", "0", "9", "3"].map((d, i) => (
                                    <div
                                      key={i}
                                      className="w-7 h-9 rounded-md bg-black/90 border border-amber-500/50 flex items-center justify-center font-bold text-base text-amber-300 font-mono"
                                    >
                                      {d}
                                    </div>
                                  ))}
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleCopyPreviewText("481093", "m_nf_6", "Đã sao chép mã Netflix: 481093!")
                                  }
                                  className="w-full py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold text-[10px]"
                                >
                                  SAO CHÉP MÃ (481093)
                                </button>
                              </div>
                            )}

                            {webPreviewNetflixSubTab === 2 && (
                              <div className="space-y-2 text-center">
                                <div className="text-[9px] font-bold text-amber-400">MÃ ĐĂNG NHẬP NETFLIX</div>
                                <div className="flex justify-center gap-1">
                                  {["7", "2", "9", "5"].map((d, i) => (
                                    <div
                                      key={i}
                                      className="w-8 h-9 rounded-md bg-black/90 border border-amber-500/50 flex items-center justify-center font-bold text-base text-amber-300 font-mono"
                                    >
                                      {d}
                                    </div>
                                  ))}
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleCopyPreviewText("7295", "m_nf_4", "Đã sao chép mã đăng nhập: 7295!")
                                  }
                                  className="w-full py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold text-[10px]"
                                >
                                  SAO CHÉP MÃ (7295)
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="pt-0.5 flex items-center justify-center gap-1 text-[9px] text-amber-400/80">
                          <ShieldCheck className="w-3 h-3" />
                          <span>Bảo mật 256–Bit SSL</span>
                        </div>
                      </div>

                      {/* Footer Ghi Chú Mobile */}
                      <div className="text-center text-[8.5px] text-slate-500 space-y-0.5 pt-1 pb-3">
                        <div>📺 Mở link TV trên cùng Wi-Fi • 🎧 Hỗ trợ 24/7</div>
                        <div>© 2026 Mavryk Premium</div>
                      </div>
                    </div>

                    {/* Vạch Home Indicator iPhone */}
                    <div className="pb-1 pt-1 flex justify-center bg-[#0e0717] shrink-0 border-t border-slate-900">
                      <div className="w-28 h-1 bg-slate-500 rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
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
                  {configs.map((c) => (
                    <option key={c.id} value={c.service_key}>
                      {c.service_name} ({c.service_key})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">Nhập Địa Chỉ Email Cần Lấy OTP</label>
                  <span className="text-[10px] text-slate-400">Gợi ý thử nhanh:</span>
                </div>
                <input
                  type="email"
                  placeholder="VD: netlink.port.8315@colegiomontealto.us, user@tinyhost.shop..."
                  value={otpTestEmail}
                  onChange={(e) => setOtpTestEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                />
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setOtpTestEmail("netlink.port.8315@colegiomontealto.us");
                      setOtpTargetService("fix_ades");
                    }}
                    className="px-2 py-0.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/25 text-[10px] font-mono transition-all"
                  >
                    ⚡ netlink.port.8315@colegiomontealto.us (Ades Demo)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpTestEmail("demo_test@tinyhost.shop");
                      setOtpTargetService("tinyhost");
                    }}
                    className="px-2 py-0.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/25 text-[10px] font-mono transition-all"
                  >
                    📬 demo_test@tinyhost.shop (TinyHost Demo)
                  </button>
                </div>
              </div>

              {/* Kết quả Probe */}
              {otpProbeResult && (
                <div
                  className={`p-4 rounded-xl border text-xs space-y-2.5 animate-in zoom-in-95 duration-200 ${otpProbeResult.found
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

      {/* MODAL 2: THÊM CỔNG DỊCH VỤ OTP MỚI */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
                  <Key className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Thêm Cổng Dịch Vụ OTP Mới</h3>
                  <p className="text-xs text-slate-400">Cấu hình kết nối tới máy chủ đọc mail hoặc API giải mã OTP</p>
                </div>
              </div>

              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Presets Bar */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Nạp Mẫu Cấu Hình Chuẩn (1-Click):</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() =>
                    setNewConfig({
                      service_key: "fix_ades",
                      service_name: "Fix Ades Support (Only-OTP)",
                      category: "OTP",
                      description: "API chuyên dụng Only-OTP với Bearer token tự động cấp",
                      base_url: "https://api-2026-02.ades.support",
                      token: "",
                      timeoutMs: 12000,
                    })
                  }
                  className="px-2.5 py-1.5 bg-amber-950/40 hover:bg-amber-900/50 border border-amber-500/30 text-amber-300 rounded-lg text-left font-semibold truncate transition-all"
                >
                  ⚡ Ades Support (Only-OTP)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setNewConfig({
                      service_key: "yuna_mail",
                      service_name: "Yuna Mail Rules & Scraper",
                      category: "OTP",
                      description: "Tổng hợp 5 API proxy gửi thẳng JSON và 2 webmail chuyển tiếp",
                      base_url: "https://mail.yunagrp.com",
                      token: "",
                      timeoutMs: 15000,
                    })
                  }
                  className="px-2.5 py-1.5 bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-500/30 text-cyan-300 rounded-lg text-left font-semibold truncate transition-all"
                >
                  📬 Yuna Mail Hub
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setNewConfig({
                      service_key: "otp_hdsd",
                      service_name: "OTP HDSD (otp.hdsd.net)",
                      category: "OTP",
                      description: "API lấy mã OTP tài khoản Adobe qua HTTP GET",
                      base_url: "https://otp.hdsd.net",
                      token: "",
                      timeoutMs: 10000,
                    })
                  }
                  className="px-2.5 py-1.5 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 rounded-lg text-left font-semibold truncate transition-all"
                >
                  🔑 HDSD OTP
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setNewConfig({
                      service_key: "tinyhost",
                      service_name: "TinyHost Temp Mail",
                      category: "OTP",
                      description: "Hộp thư tạm TinyHost tự động quét và cào OTP",
                      base_url: "https://tinyhost.shop",
                      token: "",
                      timeoutMs: 15000,
                    })
                  }
                  className="px-2.5 py-1.5 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 rounded-lg text-left font-semibold truncate transition-all"
                >
                  ✉️ TinyHost Temp Mail
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Mã Service Key</label>
                  <input
                    type="text"
                    placeholder="VD: custom_otp_mail"
                    value={newConfig.service_key}
                    onChange={(e) => setNewConfig({ ...newConfig, service_key: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Timeout (ms)</label>
                  <input
                    type="number"
                    step="1000"
                    placeholder="10000"
                    value={newConfig.timeoutMs}
                    onChange={(e) => setNewConfig({ ...newConfig, timeoutMs: Number(e.target.value) || 10000 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
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
                <label className="text-xs font-semibold text-slate-300">API Token / Secret Key (Nếu có)</label>
                <input
                  type="password"
                  placeholder="Nhập secret key hoặc để trống nếu cổng tự cấp / Zero-Auth"
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
                className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-cyan-600/20 active:scale-95 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                {creating ? "Đang thêm..." : "Thêm Cổng OTP"}
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
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${mappingMode === "api"
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
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${mappingMode === "paste"
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
                    onClick={() => handleLoadPresetSample()}
                    className="px-2.5 py-1 text-[11px] font-semibold text-cyan-300 hover:text-cyan-200 bg-cyan-950/50 hover:bg-cyan-900/50 border border-cyan-500/30 rounded-lg flex items-center gap-1 transition-all"
                    title="Nạp cấu trúc mẫu chuẩn { status: 'success', data: [{ code, otp, date, content }] }"
                  >
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    <span>Nạp Dữ Liệu Mẫu</span>
                  </button>
                </div>

                {/* Form gửi request API thực tế (Chuẩn Postman GET/POST) */}
                {mappingMode === "api" ? (
                  <div className="bg-slate-950/70 rounded-2xl border border-slate-800/90 p-3.5 space-y-3 shrink-0 shadow-lg">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-200 flex items-center gap-1.5">
                        <Code2 className="w-3.5 h-3.5 text-cyan-400" />
                        Gửi Request Thử Đến Endpoint (Postman Explorer)
                      </span>
                      {analysisResult && (
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold flex items-center gap-1 shadow-sm ${analysisResult.status >= 200 && analysisResult.status < 300
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                            }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${analysisResult.status >= 200 && analysisResult.status < 300 ? "bg-emerald-400" : "bg-rose-400"}`} />
                          HTTP {analysisResult.status} ({analysisResult.latency_ms}ms)
                        </span>
                      )}
                    </div>

                    {/* Thanh URL dạng Postman với Method Selector & Live Preview */}
                    <div className="flex items-center gap-2">
                      <select
                        value={analyzerMethod}
                        onChange={(e) => setAnalyzerMethod(e.target.value as "GET" | "POST")}
                        className={`border rounded-xl px-3 py-2 text-xs font-bold focus:outline-none transition-all cursor-pointer shadow-sm ${analyzerMethod === "GET"
                          ? "bg-emerald-950/50 border-emerald-500/50 text-emerald-300 hover:border-emerald-400"
                          : "bg-amber-950/50 border-amber-500/50 text-amber-300 hover:border-amber-400"
                          }`}
                      >
                        <option value="GET" className="bg-slate-900 text-emerald-300 font-bold">GET</option>
                        <option value="POST" className="bg-slate-900 text-amber-300 font-bold">POST</option>
                      </select>

                      <div className="flex-1 min-w-0 bg-slate-900/95 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono flex items-center gap-1.5 overflow-hidden shadow-inner">
                        <span className="text-slate-400 truncate">{analyzerUrl}</span>
                        {analyzerMethod === "GET" && analyzerEmail.trim() && (
                          <span className="text-emerald-400 font-semibold shrink-0">
                            {analyzerUrl.includes("?") ? "&" : "?"}email={analyzerEmail.trim()}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={handleAnalyzeEndpoint}
                        disabled={analyzing}
                        className="px-4 py-2 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-cyan-600/25 active:scale-95 disabled:opacity-50 shrink-0 transition-all"
                      >
                        <Sparkles className={`w-3.5 h-3.5 ${analyzing ? "animate-spin" : ""}`} />
                        <span>{analyzing ? "Đang gửi..." : "Gửi Thử & Phân Tích"}</span>
                      </button>
                    </div>

                    {/* Vùng Tham Số: GET (Query Params) vs POST (Request Body) */}
                    {analyzerMethod === "GET" ? (
                      <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-1.5 font-bold text-slate-300">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              PARAMS
                            </span>
                            <span>Query Parameters (Gửi qua URL ?email=...):</span>
                          </div>
                          <div className="flex items-center gap-1 text-[10px]">
                            <span className="text-slate-500">Mẫu email:</span>
                            <button
                              type="button"
                              onClick={() => setAnalyzerEmail("netlink.port.8315@colegiomontealto.us")}
                              className="px-2 py-0.5 rounded-md bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-500/30 font-mono transition-all"
                              title="Tài khoản hòm thư Ades đang có thư OTP"
                            >
                              ⚡ Ades Mail
                            </button>
                            <button
                              type="button"
                              onClick={() => setAnalyzerEmail("demo_probe@example.com")}
                              className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-mono transition-all"
                            >
                              Demo Probe
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-emerald-400 bg-slate-950/80 px-2.5 py-1.5 rounded-lg border border-slate-800 shrink-0 font-bold">
                            email =
                          </span>
                          <input
                            type="text"
                            value={analyzerEmail}
                            onChange={(e) => setAnalyzerEmail(e.target.value)}
                            placeholder="Nhập địa chỉ email cần đọc mã OTP (VD: user@domain.com)..."
                            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500 placeholder:text-slate-600"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-1.5 font-bold text-slate-300">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              BODY
                            </span>
                            <span>Request Body (application/json):</span>
                          </div>
                          <div className="flex items-center gap-1 text-[10px]">
                            <span className="text-slate-500">Mẫu body:</span>
                            <button
                              type="button"
                              onClick={() => setAnalyzerBody(JSON.stringify({ email: "netlink.port.8315@colegiomontealto.us" }, null, 2))}
                              className="px-2 py-0.5 rounded-md bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-500/30 font-mono transition-all"
                            >
                              Ades Mail
                            </button>
                            <button
                              type="button"
                              onClick={() => setAnalyzerBody(JSON.stringify({ email: "demo_probe@example.com" }, null, 2))}
                              className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-mono transition-all"
                            >
                              Demo
                            </button>
                          </div>
                        </div>
                        <textarea
                          value={analyzerBody}
                          onChange={(e) => setAnalyzerBody(e.target.value)}
                          rows={2}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 font-mono text-xs text-slate-200 focus:outline-none focus:border-cyan-500 leading-snug"
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
                {/* KHỐI 1: KHO TRƯỜNG CÓ SẴN (PRESET FIELD CATALOG - 1-CLICK TẬN DỤNG NGAY) */}
                <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 space-y-3 shrink-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      Kho Trường Có Sẵn Cho Dịch Vụ Này
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Bật/tắt trường bạn muốn sử dụng:
                    </span>
                  </div>

                  {/* Danh sách các thẻ trường có sẵn */}
                  <div className="space-y-2">
                    {(PRESET_AVAILABLE_FIELDS[mappingServiceKey] || PRESET_AVAILABLE_FIELDS.otp_hdsd).map((preset) => {
                      const isSelected = currentFields.some((f) => f.path === preset.path || f.key === preset.key);
                      return (
                        <div
                          key={preset.key}
                          className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${isSelected
                            ? "bg-cyan-950/40 border-cyan-500/50 shadow-sm"
                            : "bg-slate-950/60 border-slate-800/80 hover:border-slate-700"
                            }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <span className="text-base select-none shrink-0">{preset.icon || "📌"}</span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-white truncate">{preset.label}</span>
                                {preset.is_primary && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                                    OTP Chính
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                                <span className="text-cyan-400/90">{preset.path}</span>
                                {preset.sampleValue && (
                                  <span className="text-slate-500 truncate">(VD: {preset.sampleValue})</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Nút hành động Bật / Tắt */}
                          <div className="shrink-0">
                            {isSelected ? (
                              <div className="flex items-center gap-1.5">
                                <span className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold flex items-center gap-1">
                                  <Check className="w-3 h-3" /> Đang dùng
                                </span>
                                {!preset.is_primary && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemovePresetField(preset.path)}
                                    className="px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[11px] font-semibold transition-all"
                                    title="Bỏ chọn trường này"
                                  >
                                    Bỏ
                                  </button>
                                )}
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleAddPresetField(preset)}
                                className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-bold flex items-center gap-1 shadow-sm active:scale-95 transition-all"
                              >
                                <Plus className="w-3 h-3" /> Bật trường này
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Accordion mở rộng phần Tùy Chỉnh Nâng Cao */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAdvancedMapping(!showAdvancedMapping)}
                      className="w-full py-1.5 px-2 rounded-xl text-[11px] font-semibold text-slate-400 hover:text-slate-200 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 flex items-center justify-between transition-all"
                    >
                      <span className="flex items-center gap-1.5">
                        <Sliders className="w-3 h-3 text-cyan-400" />
                        Tùy chỉnh JSON Path khác (Dành cho chuyên viên)
                      </span>
                      {showAdvancedMapping ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {showAdvancedMapping && (
                      <div className="mt-2.5 p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5 animate-in fade-in duration-150">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={customPathInput}
                            onChange={(e) => setCustomPathInput(e.target.value)}
                            placeholder="VD: data.code hoặc data.otp"
                            className="flex-1 bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded-xl px-3 py-1.5 text-xs font-mono text-cyan-300 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleApplyPath(customPathInput, true)}
                            className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-[11px] font-bold whitespace-nowrap"
                          >
                            🎯 Đặt OTP
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApplyPath(customPathInput, false)}
                            className="px-2.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-[11px] font-bold whitespace-nowrap"
                          >
                            ➕ Thêm
                          </button>
                        </div>

                        {/* Chips phát hiện được từ phản hồi thực tế */}
                        {analysisResult?.detected_fields && analysisResult.detected_fields.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              Các trường bóc tách được từ JSON:
                            </span>
                            <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                              {analysisResult.detected_fields.map((f, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => setCustomPathInput(f.path)}
                                  className="px-2 py-0.5 rounded text-[10px] font-mono border bg-slate-900 border-slate-800 hover:border-cyan-500 text-slate-300"
                                >
                                  {f.path}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
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
                          className={`px-2.5 py-1 rounded-lg border text-xs flex items-center gap-1.5 ${f.is_primary
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
