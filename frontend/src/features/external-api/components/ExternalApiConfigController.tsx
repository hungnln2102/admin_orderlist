import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Database,
  Edit,
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
  Bot,
  Star,
} from "lucide-react";
import { useNotification } from "@/shared/context/NotificationContext";
import type {
  AvailableFieldPreset,
  DetectedField,
  ExternalApiConfig,
  FieldMappingItem,
  PingResult,
  PortalSlotItem,
  ProductApiMappingItem,
  ProductItem,
} from "@/features/external-api/types";
import { externalApiClient } from "@/features/external-api/api/externalApiClient";
import { useClipboard } from "@/shared/hooks/useClipboard";

export const PRESET_AVAILABLE_FIELDS: Record<string, AvailableFieldPreset[]> = {
  warehouse_2fa: [
    { key: "otp", label: "Mã 2FA / OTP", path: "code", is_primary: true, description: "Mã 2FA 6 số", icon: "🎯", sampleValue: "515152" },
    { key: "account_username", label: "Tài khoản kho", path: "account_username", is_primary: false, description: "Tài khoản trong kho", icon: "👤", sampleValue: "user@domain.com" },
    { key: "remaining_seconds", label: "Thời gian còn lại (s)", path: "remainingSeconds", is_primary: false, description: "Số giây còn hiệu lực", icon: "⏳", sampleValue: "28" },
  ],
  totp: [
    { key: "otp", label: "Mã 2FA / OTP", path: "code", is_primary: true, description: "Mã 2FA 6 số", icon: "🎯", sampleValue: "419205" },
    { key: "remaining_seconds", label: "Thời gian còn lại (s)", path: "remainingSeconds", is_primary: false, description: "Số giây còn hiệu lực", icon: "⏳", sampleValue: "28" },
  ],
  vivarocky_household: [
    { key: "netflix_link", label: "Link Cập Nhật Netflix", path: "netflix_link", is_primary: true, description: "Link cập nhật Household / TV Netflix", icon: "🔗", sampleValue: "https://www.netflix.com/update-primary-location" },
  ],
  vivarocky_six_digit: [
    { key: "otp", label: "Mã Xác Minh 6 Số", path: "otp", is_primary: true, description: "Mã xác minh 6 số từ Viva Rocky", icon: "🎯", sampleValue: "582103" },
  ],
  vivarocky_signin: [
    { key: "otp", label: "Mã OTP Đăng Nhập", path: "otp", is_primary: true, description: "Mã đăng nhập nhanh Sign-in Code", icon: "🔑", sampleValue: "918234" },
  ],
  vivarocky: [
    { key: "netflix_link", label: "Link Cập Nhật Netflix", path: "netflix_link", is_primary: false, description: "Link cập nhật Household / TV Netflix", icon: "🔗", sampleValue: "https://www.netflix.com/update-primary-location" },
    { key: "otp", label: "Mã OTP / 6 Số", path: "otp", is_primary: true, description: "Mã xác minh 6 số từ Viva Rocky", icon: "🎯", sampleValue: "582103" },
    { key: "server_message", label: "Thông Báo Máy Chủ", path: "error_box", is_primary: false, description: "Thông báo từ Viva Rocky", icon: "ℹ️", sampleValue: "Error: No recent email found..." },
  ],

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

// Vector Flaticon Icons cho từng loại mặt hàng (Chuẩn nhận diện thương hiệu quốc tế)
export const AdobeFlaticon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 48 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="48" height="48" rx="12" fill="#FA0F00" />
    <path d="M29.5 10H40V38L29.5 10Z" fill="white" />
    <path d="M18.5 10H8V38L18.5 10Z" fill="white" />
    <path d="M24 23L31 38H26.5L24.5 32H19.5L24 23Z" fill="white" />
  </svg>
);

export const NetflixFlaticon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 48 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="48" height="48" rx="12" fill="#000000" />
    <path d="M14 9H20.5V39H14V9Z" fill="#E50914" />
    <path d="M27.5 9H34V39H27.5V9Z" fill="#E50914" />
    <path d="M14 9H20.5L34 39H27.5L14 9Z" fill="#B81D24" />
  </svg>
);

export const ChatGPTFlaticon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 48 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="48" height="48" rx="12" fill="#10A37F" />
    <path
      d="M37.5 21.2a7.6 7.6 0 0 0-.6-6 7.7 7.7 0 0 0-7.3-4.1 7.4 7.4 0 0 0-4.8 1.8 7.6 7.6 0 0 0-10.4 3.7 7.7 7.7 0 0 0-3.3 6.9 7.7 7.7 0 0 0 3.7 7.5 7.6 7.6 0 0 0 .6 6 7.7 7.7 0 0 0 7.3 4.1 7.4 7.4 0 0 0 4.8-1.8 7.6 7.6 0 0 0 10.4-3.7 7.7 7.7 0 0 0 3.3-6.9 7.7 7.7 0 0 0-3.7-7.5zm-14.7 17a5.5 5.5 0 0 1-3.6-1.3l.2-.1 6-3.5a1.1 1.1 0 0 0 .6-1V24l2.5 1.4v7a5.6 5.6 0 0 1-5.7 5.8zm-11-7a5.5 5.5 0 0 1-.7-3.8l.2.1 6 3.5a1.1 1.1 0 0 0 1.1 0l7.2-4.1v2.9l-6 3.5a5.6 5.6 0 0 1-7.8-2.1zm-1.8-13.1a5.5 5.5 0 0 1 2.9-2.5v7.2a1.1 1.1 0 0 0 .6 1l7.2 4.1-2.5 1.5-6-3.5a5.6 5.6 0 0 1-2.2-7.8zm21.4 5.3-7.2-4.1 2.5-1.5 6 3.5a5.6 5.6 0 0 1 2.2 7.8 5.5 5.5 0 0 1-2.9 2.5v-7.2a1.1 1.1 0 0 0-.6-1zm3.6 7.6a5.5 5.5 0 0 1 .7 3.8l-.2-.1-6-3.5a1.1 1.1 0 0 0-1.1 0l-7.2 4.1v-2.9l6-3.5a5.6 5.6 0 0 1 7.8 2.1zm-12.7-2.6-3.2-1.8 3.2-1.9 3.2 1.9-3.2 1.8zm-6.2-7.5a5.5 5.5 0 0 1 3.6 1.3l-.2.1-6 3.5a1.1 1.1 0 0 0-.6 1v8.3l-2.5-1.4v-7a5.6 5.6 0 0 1 5.7-5.8z"
      fill="white"
    />
  </svg>
);

export const TwoFactorFlaticon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 48 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="48" height="48" rx="12" fill="#1A73E8" />
    <path d="M24 10L13 14.5V23C13 30.2 17.7 36.8 24 38.5C30.3 36.8 35 30.2 35 23V14.5L24 10Z" fill="#1557B0" />
    <path d="M24 12L15 15.7V23C15 29.1 18.8 34.7 24 36.2C29.2 34.7 33 29.1 33 23V15.7L24 12Z" fill="white" opacity="0.9" />
    <circle cx="24" cy="22" r="3.5" fill="#1A73E8" />
    <path d="M22.5 24H25.5V29H22.5V24Z" fill="#1A73E8" />
  </svg>
);

export const DEFAULT_PORTAL_SLOTS: PortalSlotItem[] = [
  {
    slot_key: "adobe_otp",
    name: "Adobe: Lấy Mã OTP 6 Số",
    category: "adobe",
    assigned_services: ["fix_ades", "tinyhost"],
    primary_service_key: "fix_ades",
    fallback_service_key: "tinyhost",
        cooldown_seconds: 30,
    btn_text: "Lấy Mã OTP Adobe",
    input_placeholder: "Nhập địa chỉ Email Adobe (VD: user@domain.com)...",
    enabled: true,
  },
  {
    slot_key: "adobe_account",
    name: "Adobe: Tra Cứu Tài Khoản",
    category: "adobe",
    assigned_services: ["yuna_2fa"],
    primary_service_key: "yuna_2fa",
    fallback_service_key: null,
        cooldown_seconds: 15,
    btn_text: "Tra Cứu Thông Tin",
    input_placeholder: "Nhập Email hoặc Mã Đơn Hàng...",
    enabled: true,
  },
  {
    slot_key: "netflix_household",
    name: "Netflix: Link TV / Hộ Gia Đình",
    category: "netflix",
    assigned_services: ["vivarocky_household", "fix_ades", "tmail_webmail"],
    primary_service_key: "fix_ades",
    fallback_service_key: "tmail_webmail",
        cooldown_seconds: 45,
    btn_text: "Lấy Link Cập Nhật TV",
    input_placeholder: "Nhập Email tài khoản Netflix...",
    enabled: true,
  },
  {
    slot_key: "netflix_six_digit",
    name: "Netflix: Mã Xác Minh 6 Số",
    category: "netflix",
    assigned_services: ["vivarocky_six_digit", "fix_ades", "tinyhost"],
    primary_service_key: "fix_ades",
    fallback_service_key: "tinyhost",
        cooldown_seconds: 30,
    btn_text: "Lấy Mã 6 Số Netflix",
    input_placeholder: "Nhập Email tài khoản Netflix...",
    enabled: true,
  },
  {
    slot_key: "netflix_login_otp",
    name: "Netflix: OTP Đăng Nhập",
    category: "netflix",
    assigned_services: ["vivarocky", "fix_ades", "tmail_webmail"],
    primary_service_key: "fix_ades",
    fallback_service_key: "tmail_webmail",
        cooldown_seconds: 30,
    btn_text: "Lấy OTP Đăng Nhập",
    input_placeholder: "Nhập Email tài khoản Netflix...",
    enabled: true,
  },
  {
    slot_key: "gpt_otp",
    name: "ChatGPT: Mã Xác Minh OpenAI",
    category: "gpt",
    assigned_services: ["warehouse_2fa", "tinyhost"],
    primary_service_key: "tinyhost",
    fallback_service_key: null,
        cooldown_seconds: 30,
    btn_text: "Lấy OTP ChatGPT",
    input_placeholder: "Nhập Email tài khoản OpenAI / ChatGPT...",
    enabled: true,
  },
  {
    slot_key: "gpt_account",
    name: "ChatGPT: Tra Cứu Tài Khoản",
    category: "gpt",
    assigned_services: ["warehouse_2fa", "yuna_2fa"],
    primary_service_key: "warehouse_2fa",
    fallback_service_key: "yuna_2fa",
    cooldown_seconds: 15,
    btn_text: "Tra Cứu Tài Khoản",
    input_placeholder: "Nhập Email mua hàng hoặc Mã đơn hàng...",
    enabled: true,
  },
  {
    slot_key: "two_factor_totp",
    name: "2FA: Sinh Mã TOTP",
    category: "2fa",
    assigned_services: ["totp", "yuna_2fa"],
    primary_service_key: "yuna_2fa",
    fallback_service_key: null,
        cooldown_seconds: 10,
    btn_text: "Lấy Mã 2FA (6 Số)",
    input_placeholder: "Nhập Secret Key 2FA (VD: JBSWY3DPEHPK3PXP)...",
    enabled: true,
  },
];

export const ExternalApiConfigController: React.FC = () => {
  const notify = useNotification();
  const { copy: copyToClipboard } = useClipboard();
  const showToast = useCallback((type: "success" | "error", text: string) => {
    if (type === "success") {
      notify.success(text);
    } else {
      notify.error(text);
    }
  }, [notify]);
  const [configs, setConfigs] = useState<ExternalApiConfig[]>([]);

  const renderConfigIcon = (cfg: ExternalApiConfig) => {
    const cat = String(cfg.category || "").toLowerCase();
    const key = String(cfg.service_key || "").toLowerCase();

    if (cat.includes("adobe") || key.includes("ades") || key.includes("adobe")) {
      return <AdobeFlaticon className="w-8 h-8 rounded-lg shadow-purple-500/20" />;
    }
    if (cat.includes("netflix") || key.includes("netflix") || key.includes("vivarocky")) {
      return <NetflixFlaticon className="w-8 h-8 rounded-lg shadow-red-500/20" />;
    }
    if (cat.includes("gpt") || key.includes("gpt") || key.includes("openai")) {
      return <ChatGPTFlaticon className="w-8 h-8 rounded-lg shadow-emerald-500/20" />;
    }
    if (cat.includes("2fa") || key.includes("2fa") || key.includes("totp") || key.includes("warehouse")) {
      return <TwoFactorFlaticon className="w-8 h-8 rounded-lg shadow-blue-500/20" />;
    }
    return <Globe className="w-6 h-6 text-cyan-400" />;
  };

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
    execution_mode: "GENERIC_HTTP",
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

  // State cho Bảng Form Test Nhanh Mọi Cổng API (Quick API Test Table)
  const [testInputs, setTestInputs] = useState<Record<string, string>>({});
  const [testingRows, setTestingRows] = useState<Record<string, boolean>>({});
  const [testResults, setTestResults] = useState<
    Record<
      string,
      {
        success: boolean;
        otp?: string | null;
        duration_ms?: number;
        message?: string;
        error?: string;
        timestamp?: string;
      } | null
    >
  >({});
  const [togglingRows, setTogglingRows] = useState<Record<number, boolean>>({});
  const [copiedOtpKey, setCopiedOtpKey] = useState<string | null>(null);
  const [portalSlots, setPortalSlots] = useState<PortalSlotItem[]>(DEFAULT_PORTAL_SLOTS);
  // State quản lý Tab chính: "slots" (Gán cổng vào ô input) vs "api_manager" (Quản lý cổng API trong DB) vs "product_apis" (Cấu hình API Sản Phẩm)
  const [activeMainTab, setActiveMainTab] = useState<"slots" | "api_manager" | "product_apis">("slots");

  // State Tab 3: Cấu hình API Sản Phẩm (Product API Mapping)
  const [productApisList, setProductApisList] = useState<ProductItem[]>([]);
  const [allAvailableApis, setAllAvailableApis] = useState<any[]>([]);
  const [loadingProductApis, setLoadingProductApis] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [productFilterStatus, setProductFilterStatus] = useState<"all" | "mapped" | "unmapped">("all");
  const [expandedProductVariants, setExpandedProductVariants] = useState<Record<number, boolean>>({});

  // Modal Gán API Cho Sản Phẩm
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedProductForAssign, setSelectedProductForAssign] = useState<ProductItem | null>(null);
  const [selectedApiConfigId, setSelectedApiConfigId] = useState<number | "">("");
  const [isDefaultAssign, setIsDefaultAssign] = useState(false);
  const [assignNote, setAssignNote] = useState("");
  const [submittingAssign, setSubmittingAssign] = useState(false);

  const fetchProductApis = useCallback(async () => {
    try {
      setLoadingProductApis(true);
      const res = await externalApiClient.request("/api/system/product-apis");
      if (!res.ok) throw new Error("Không thể tải danh sách cấu hình API sản phẩm.");
      const data = await res.json();
      if (data.success) {
        setProductApisList(data.products || []);
        setAllAvailableApis(data.availableApis || []);
      }
    } catch (err: any) {
      showToast("error", err.message || "Lỗi nạp danh sách API sản phẩm.");
    } finally {
      setLoadingProductApis(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (activeMainTab === "product_apis") {
      fetchProductApis();
    }
  }, [activeMainTab, fetchProductApis]);

  const handleOpenAssignModal = (product: ProductItem) => {
    setSelectedProductForAssign(product);
    setSelectedApiConfigId(allAvailableApis[0]?.id || "");
    setIsDefaultAssign(product.apis.length === 0);
    setAssignNote("");
    setAssignModalOpen(true);
  };

  const handleSubmitAssign = async () => {
    if (!selectedProductForAssign || !selectedApiConfigId) {
      showToast("error", "Vui lòng chọn cổng API cần gán!");
      return;
    }
    try {
      setSubmittingAssign(true);
      const res = await externalApiClient.request("/api/system/product-apis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProductForAssign.id,
          apiConfigId: Number(selectedApiConfigId),
          isDefault: isDefaultAssign,
          note: assignNote,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Không thể gán API cho sản phẩm.");
      showToast("success", data.message || "Đã gán API thành công!");
      setAssignModalOpen(false);
      fetchProductApis();
    } catch (err: any) {
      showToast("error", err.message || "Lỗi khi gán API cho sản phẩm.");
    } finally {
      setSubmittingAssign(false);
    }
  };

  const handleSetDefaultApi = async (mappingId: number, productName: string, apiName: string) => {
    try {
      const res = await externalApiClient.request(`/api/system/product-apis/${mappingId}/default`, {
        method: "PUT",
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Không thể đặt cổng mặc định.");
      showToast("success", `Đã đặt "${apiName}" làm cổng mặc định cho "${productName}".`);
      fetchProductApis();
    } catch (err: any) {
      showToast("error", err.message || "Lỗi khi đặt cổng mặc định.");
    }
  };

  const handleRemoveMapping = async (mappingId: number, productName: string, apiName: string) => {
    if (!confirm(`Bạn có chắc chắn muốn gỡ cổng API "${apiName}" khỏi sản phẩm "${productName}"?`)) return;
    try {
      const res = await externalApiClient.request(`/api/system/product-apis/${mappingId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Không thể gỡ bỏ API.");
      showToast("success", `Đã gỡ cổng "${apiName}" khỏi "${productName}".`);
      fetchProductApis();
    } catch (err: any) {
      showToast("error", err.message || "Lỗi khi gỡ cổng API.");
    }
  };

  const [editModalConfig, setEditModalConfig] = useState<ExternalApiConfig | null>(null);
  const [savingEditModal, setSavingEditModal] = useState(false);

  const [savingSlots, setSavingSlots] = useState(false);
  const [syncingSlots, setSyncingSlots] = useState(false);

  const handleSyncSlotsFromPortal = async () => {
    try {
      setSyncingSlots(true);
      const res = await externalApiClient.request("/api/public/otp-portal-slots");
      if (!res.ok) throw new Error("Không thể tải danh sách ô từ hệ thống.");
      const data = await res.json();
      if (data.success && Array.isArray(data.slots)) {
        setPortalSlots(data.slots);
        showToast("success", `Đã đồng bộ ${data.slots.length} ô input từ Web OTP Portal!`);
      }
    } catch (err: any) {
      showToast("error", err.message || "Lỗi khi đồng bộ ô input");
    } finally {
      setSyncingSlots(false);
    }
  };

  // Tải cấu hình gán ô từ DB system_configs hoặc public slots API
  const fetchPortalSlots = useCallback(async () => {
    try {
      const res = await externalApiClient.request("/api/public/otp-portal-slots");
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.slots) && data.slots.length > 0) {
          setPortalSlots(data.slots);
          return;
        }
      }
      const resConfig = await externalApiClient.request("/api/system/configs");
      if (resConfig.ok) {
        const list = await resConfig.json();
        const found = list.find((item: any) => item.config_key === "OTP_PORTAL_SLOTS_CONFIG");
        if (found && found.config_value) {
          const parsed = typeof found.config_value === "string" ? JSON.parse(found.config_value) : found.config_value;
          if (Array.isArray(parsed) && parsed.length > 0) {
            setPortalSlots(parsed);
          }
        }
      }
    } catch (err) {
      console.warn("Không thể tải cấu hình gán ô:", err);
    }
  }, []);

  // Lưu danh sách slots vào DB system_configs
  const savePortalSlotsToDb = async (updated: PortalSlotItem[]) => {
    try {
      setSavingSlots(true);
      const res = await externalApiClient.request("/api/system/configs/OTP_PORTAL_SLOTS_CONFIG", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: JSON.stringify(updated) }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Lỗi khi lưu cấu hình ô trên web");
      }
      showToast("success", "Đã tự động lưu cấu hình ô trên Web OTP Portal!");
    } catch (err: any) {
      showToast("error", err.message || "Lỗi lưu cấu hình");
    } finally {
      setSavingSlots(false);
    }
  };

  // Helper: lấy mảng danh sách cổng API được gán cho slot
  const getSlotServices = (slot: PortalSlotItem): string[] => {
    if (Array.isArray(slot.assigned_services) && slot.assigned_services.length > 0) {
      return slot.assigned_services;
    }
    const list: string[] = [];
    if (slot.primary_service_key) list.push(slot.primary_service_key);
    if (slot.fallback_service_key && slot.fallback_service_key !== "none" && !list.includes(slot.fallback_service_key)) {
      list.push(slot.fallback_service_key);
    }
    return list.length > 0 ? list : ["fix_ades"];
  };

  // Thêm 1 cổng mới vào chuỗi API của ô
  const handleAddServiceToSlot = async (slotKey: string, newServiceKey: string) => {
    if (!newServiceKey || newServiceKey === "none") return;
    const updated = portalSlots.map((s) => {
      if (s.slot_key !== slotKey) return s;
      const currentList = getSlotServices(s);
      if (currentList.includes(newServiceKey)) return s;
      const nextList = [...currentList, newServiceKey];
      return {
        ...s,
        assigned_services: nextList,
        primary_service_key: nextList[0],
        fallback_service_key: nextList[1] || null,
      };
    });
    setPortalSlots(updated);
    await savePortalSlotsToDb(updated);
  };

  // Gỡ bỏ 1 cổng khỏi chuỗi (giữ lại tối thiểu 1 cổng)
  const handleRemoveServiceFromSlot = async (slotKey: string, serviceToRemove: string) => {
    const targetSlot = portalSlots.find((s) => s.slot_key === slotKey);
    if (targetSlot && getSlotServices(targetSlot).length <= 1) {
      showToast("error", "Mỗi ô phải giữ lại tối thiểu 1 cổng API để xử lý!");
      return;
    }
    const updated = portalSlots.map((s) => {
      if (s.slot_key !== slotKey) return s;
      const currentList = getSlotServices(s);
      const nextList = currentList.filter((srv) => srv !== serviceToRemove);
      return {
        ...s,
        assigned_services: nextList,
        primary_service_key: nextList[0] || "fix_ades",
        fallback_service_key: nextList[1] || null,
      };
    });
    setPortalSlots(updated);
    await savePortalSlotsToDb(updated);
  };

  // Bật / Tắt hiển thị ô trên Web OTP Portal
  const handleToggleSlotEnabled = async (slotKey: string) => {
    const updated = portalSlots.map((s) =>
      s.slot_key === slotKey ? { ...s, enabled: !s.enabled } : s
    );
    setPortalSlots(updated);
    await savePortalSlotsToDb(updated);
  };

  // Test nhanh dữ liệu trực tiếp cho 1 ô (giả lập hành vi khách hàng gõ trên web)
  const handleQuickTestSlot = async (slot: PortalSlotItem) => {
    const inputVal = (testInputs[slot.slot_key] || "").trim();
    if (!inputVal) {
      showToast("error", `Vui lòng nhập dữ liệu test cho ô "${slot.name}"!`);
      return;
    }

    setTestingRows((prev) => ({ ...prev, [slot.slot_key]: true }));
    setTestResults((prev) => ({ ...prev, [slot.slot_key]: null }));

    const startTime = Date.now();
    try {
      const res = await externalApiClient.request("/api/public/otp/probe-slot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slot_key: slot.slot_key,
          input: inputVal,
        }),
      });

      const duration_ms = Date.now() - startTime;
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success && (data.otp || data.found || data.extra_fields?.length > 0)) {
        setTestResults((prev) => ({
          ...prev,
          [slot.slot_key]: {
            success: true,
            otp: data.otp || null,
            duration_ms: data.duration_ms || duration_ms,
            message: data.message || "Lấy mã OTP thành công!",
            timestamp: new Date().toLocaleTimeString("vi-VN"),
          },
        }));
        showToast("success", `[${slot.name}] ${data.otp ? `Mã OTP: ${data.otp}` : "Thành công!"}`);
      } else {
        setTestResults((prev) => ({
          ...prev,
          [slot.slot_key]: {
            success: false,
            duration_ms: data.duration_ms || duration_ms,
            message: data.message || data.error || "Không tìm thấy mã OTP hoặc chưa có thư mới.",
            timestamp: new Date().toLocaleTimeString("vi-VN"),
          },
        }));
        showToast("error", `[${slot.name}] ${data.message || data.error || "Không tìm thấy OTP"}`);
      }
    } catch (err: any) {
      setTestResults((prev) => ({
        ...prev,
        [slot.slot_key]: {
          success: false,
          error: err.message || "Lỗi kết nối",
          message: err.message || "Lỗi kết nối",
          timestamp: new Date().toLocaleTimeString("vi-VN"),
        },
      }));
      showToast("error", `Lỗi test ô ${slot.name}: ${err.message}`);
    } finally {
      setTestingRows((prev) => ({ ...prev, [slot.slot_key]: false }));
    }
  };

  const handleToggleApiActive = async (cfg: ExternalApiConfig) => {
    const newStatus = !cfg.is_active;
    setTogglingRows((prev) => ({ ...prev, [cfg.id]: true }));
    try {
      const res = await externalApiClient.request(`/api/system/external-apis/${cfg.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: newStatus }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Không thể cập nhật trạng thái");
      }
      setConfigs((prev) => prev.map((c) => (c.id === cfg.id ? { ...c, is_active: newStatus } : c)));
      showToast("success", `Đã ${newStatus ? "BẬT" : "TẮT"} cổng API: ${cfg.service_name}`);
    } catch (err: any) {
      showToast("error", err.message || "Lỗi khi cập nhật trạng thái");
    } finally {
      setTogglingRows((prev) => ({ ...prev, [cfg.id]: false }));
    }
  };

  const previewExtractedValue = useMemo(() => {
    if (!analysisResult?.is_json || !analysisResult?.data) return undefined;
    return getValueByPathFrontend(analysisResult.data, customPathInput);
  }, [analysisResult, customPathInput]);

  // 1. Tải danh sách cấu hình
  const fetchConfigs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await externalApiClient.request("/api/system/external-apis");
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
    fetchPortalSlots();
  }, [fetchConfigs, fetchPortalSlots]);

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

  
  // Lưu thay đổi từ Modal Sửa Cổng API vào DB
  const handleSaveEditModal = async () => {
    if (!editModalConfig) return;
    try {
      setSavingEditModal(true);
      const res = await externalApiClient.request(`/api/system/external-apis/${editModalConfig.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_name: editModalConfig.service_name,
          category: editModalConfig.category,
          description: editModalConfig.description,
          base_url: editModalConfig.base_url,
          execution_mode: editModalConfig.execution_mode,
          endpoints: editModalConfig.endpoints,
          auth_config: editModalConfig.auth_config,
          field_mapping: editModalConfig.field_mapping,
          is_active: editModalConfig.is_active,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Không thể cập nhật cấu hình.");

      showToast("success", `Đã lưu thành công cấu hình [${editModalConfig.service_name}]!`);
      setEditModalConfig(null);
      await fetchConfigs();
    } catch (err: any) {
      showToast("error", err.message || "Lỗi lưu cấu hình");
    } finally {
      setSavingEditModal(false);
    }
  };

  // 2. Lưu cấu hình của 1 card
  const handleSaveCard = async (id: number) => {
    const item = editForms[id];
    if (!item) return;
    try {
      setSavingId(id);
      const res = await externalApiClient.request(`/api/system/external-apis/${id}`, {
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
      const res = await externalApiClient.request(`/api/system/external-apis/${id}/test`, { method: "POST" });
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
      const res = await externalApiClient.request("/api/system/external-apis/test-otp", {
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
      const res = await externalApiClient.request("/api/system/external-apis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_key: newConfig.service_key.trim(),
          service_name: newConfig.service_name.trim(),
          category: newConfig.category,
          description: newConfig.description.trim(),
          base_url: newConfig.base_url.trim(),
          execution_mode: newConfig.execution_mode,
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
        execution_mode: "GENERIC_HTTP",
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
          const res = await externalApiClient.request(`/api/system/external-apis/${id}`, { method: "DELETE" });
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

      const res = await externalApiClient.request("/api/system/external-apis/analyze-endpoint", {
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
    void copyToClipboard(str, "json");
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
      else if (/time|date|created|at/i.test(rawKey)) autoLabel = "Thá»i Gian";
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
      const res = await externalApiClient.request(`/api/system/external-apis/${mappingConfigId}`, {
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
    () => configs.filter((c) => ["fix_ades", "otp_hdsd", "yuna_mail", "tinyhost", "yuna_2fa", "vivarocky"].includes(c.service_key)).length,
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
      {/* HEADER SECTION - 100% CHUYÃŠN BIá»†T CHO OTP */}
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


      {/* THANH ÄIá»€U HÆ¯á»šNG 2 TAB: GÃN Cá»”NG VÃ€O Ã” INPUT VS QUáº¢N LÃ Cá»”NG API */}
      <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => setActiveMainTab("slots")}
          className={`px-5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2.5 transition-all shadow-md active:scale-95 ${
            activeMainTab === "slots"
              ? "bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow-amber-600/25 ring-1 ring-amber-400/40"
              : "bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800"
          }`}
        >
          <Zap className="w-4 h-4 text-amber-300" />
          <span>Tab 1: Gán Cổng Vào Ô Input (Web OTP Portal)</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            activeMainTab === "slots" ? "bg-black/30 text-white" : "bg-slate-800 text-slate-400"
          }`}>
            {portalSlots.length} Ã”
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab("api_manager")}
          className={`px-5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2.5 transition-all shadow-md active:scale-95 ${
            activeMainTab === "api_manager"
              ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-cyan-600/25 ring-1 ring-cyan-400/40"
              : "bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800"
          }`}
        >
          <Database className="w-4 h-4 text-cyan-300" />
          <span>Tab 2: Quản Lý Cổng API (Database CRUD)</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            activeMainTab === "api_manager" ? "bg-black/30 text-white" : "bg-slate-800 text-slate-400"
          }`}>
            {configs.length} Cổng
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab("product_apis")}
          className={`px-5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2.5 transition-all shadow-md active:scale-95 ${
            activeMainTab === "product_apis"
              ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-purple-600/25 ring-1 ring-purple-400/40"
              : "bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800"
          }`}
        >
          <Layers className="w-4 h-4 text-purple-300" />
          <span>Tab 3: Cấu Hình API Sản Phẩm (Product Mapping)</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            activeMainTab === "product_apis" ? "bg-black/30 text-white" : "bg-slate-800 text-slate-400"
          }`}>
            {productApisList.length > 0 ? productApisList.filter(p => p.apis.length > 0).length : 3} Đã gán
          </span>
        </button>
      </div>

      <div className="space-y-5 animate-in fade-in duration-200">
          {activeMainTab === "slots" && (
          <div className="space-y-5">
          {/* Header Banner Bảng Kiểm Tra Nhanh */}
          <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-950 border border-amber-500/30 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden backdrop-blur-md">
            <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-amber-500/10 to-transparent pointer-events-none" />
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-lg shadow-amber-500/10">
                  <Zap className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-bold text-white tracking-wide">
                      Bảng Kiểm Tra Nhanh Mọi Cổng API Đọc OTP
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      LIVE TEST ENGINE
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                    Nhập dữ liệu test vào từng ô và bấm icon ⚡ để lấy OTP thực tế từ hòm thư của bên thứ 3 (Fix Ades, TinyHost, HDSD...).
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  disabled={syncingSlots}
                  onClick={handleSyncSlotsFromPortal}
                  title="Tự động đồng bộ các form/ô input mới từ Web OTP Portal"
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition-all flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncingSlots ? "animate-spin" : ""}`} />
                  <span>{syncingSlots ? "Đang đồng bộ..." : "Đồng Bộ Ô Từ Web"}</span>
                </button>
                <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
                  <span className="text-slate-400">Đang bật:</span>
                  <span className="font-bold text-emerald-400">
                    {configs.filter((c) => c.is_active).length}/{configs.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Thêm Cổng Mới</span>
                </button>
              </div>
            </div>
          </div>

          {/* Báº¢NG QUáº¢N LÃ & TEST NHANH 7 Ã” INPUT WEB OTP PORTAL */}
          <div className="bg-slate-900/90 border border-slate-800/90 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-3.5 px-4 w-14 text-center">STT</th>
                    <th className="py-3.5 px-4 min-w-[260px]">Ô Input Trên Web OTP Portal</th>
                    <th className="py-3.5 px-4 min-w-[250px]">Cổng API Xử Lý (Gán Cổng)</th>
                    <th className="py-3.5 px-4 w-32 text-center">Trạng Thái</th>
                    <th className="py-3.5 px-4 min-w-[360px]">Ô Input Và Icon ⚡ Test</th>
                    <th className="py-3.5 px-4 w-32 text-center">Thao Tác Tắt/Mở</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {portalSlots.map((slot, index) => {
                    const isTesting = testingRows[slot.slot_key] || false;
                    const result = testResults[slot.slot_key];
                    const isCopied = copiedOtpKey === slot.slot_key;
                    const primaryConfig = configs.find((c) => c.service_key === slot.primary_service_key);
                    const isPrimaryActive = primaryConfig ? primaryConfig.is_active : true;

                    return (
                      <tr
                        key={slot.slot_key}
                        className={`hover:bg-slate-800/40 transition-colors ${
                          !slot.enabled ? "opacity-60 bg-slate-950/30" : ""
                        }`}
                      >
                        {/* 1. STT */}
                        <td className="py-4 px-4 text-center font-mono font-bold text-slate-400">
                          {index + 1}
                        </td>

                        {/* 2. Ã” INPUT TRÃŠN WEB OTP PORTAL */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="shrink-0">
                              {slot.category === "adobe" && (
                                <AdobeFlaticon className="w-9 h-9 drop-shadow-md rounded-xl shadow-purple-500/20" />
                              )}
                              {slot.category === "netflix" && (
                                <NetflixFlaticon className="w-9 h-9 drop-shadow-md rounded-xl shadow-red-500/20" />
                              )}
                              {slot.category === "gpt" && (
                                <ChatGPTFlaticon className="w-9 h-9 drop-shadow-md rounded-xl shadow-emerald-500/20" />
                              )}
                              {slot.category === "2fa" && (
                                <TwoFactorFlaticon className="w-9 h-9 drop-shadow-md rounded-xl shadow-blue-500/20" />
                              )}
                            </div>

                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-white text-sm">
                                  {slot.name}
                                </span>
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-950 text-cyan-400 border border-slate-800">
                                  {slot.slot_key}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 line-clamp-1 max-w-xs" title={slot.input_placeholder}>
                                Gợi ý: {slot.input_placeholder || "Nhập dữ liệu..."}
                              </p>
                            </div>
                          </div>
                        </td>

                          {/* 3. Cá»”NG API Xá»¬ LÃ (GÃN Cá»”NG CHO Ã” INPUT) */}
                        <td className="py-4 px-4 min-w-[280px]">
                          <div className="space-y-2">
                            {/* Danh sách các Tags API phẳng, đồng cấp gán cho ô này */}
                            <div className="flex flex-wrap gap-1.5">
                              {getSlotServices(slot).map((srvKey) => {
                                const targetCfg = configs.find((c) => c.service_key === srvKey);

                                return (
                                  <span
                                    key={srvKey}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950/80 border border-slate-700/80 hover:border-cyan-500/50 text-slate-200 text-xs font-medium shadow-sm transition-all"
                                  >
                                    <Zap className="w-3 h-3 text-cyan-400 shrink-0 fill-current" />
                                    <span className="truncate max-w-[160px]" title={targetCfg?.service_name || srvKey}>
                                      {targetCfg?.service_name || srvKey}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveServiceFromSlot(slot.slot_key, srvKey)}
                                      title="Gỡ API này khỏi ô input"
                                      className="p-0.5 text-slate-400 hover:text-rose-400 rounded-md hover:bg-rose-950/40 transition-colors ml-0.5"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </span>
                                );
                              })}

                              {getSlotServices(slot).length === 0 && (
                                <span className="text-[11px] text-slate-500 italic">
                                  Chưa gán API nào
                                </span>
                              )}
                            </div>

                            {/* Dropdown Gán thêm API vào ô này */}
                            <div>
                              <select
                                value="none"
                                onChange={(e) => {
                                  if (e.target.value !== "none") {
                                    handleAddServiceToSlot(slot.slot_key, e.target.value);
                                  }
                                }}
                                className="w-full bg-slate-950/70 border border-dashed border-slate-700 hover:border-cyan-500/60 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all cursor-pointer"
                              >
                                <option value="none">➕ Gán thêm API cho ô này...</option>
                                {configs
                                  .filter((cfg) => !getSlotServices(slot).includes(cfg.service_key))
                                  .map((cfg) => (
                                    <option key={cfg.service_key} value={cfg.service_key} className="bg-slate-900 text-white">
                                      + {cfg.service_name} ({cfg.service_key}) {!cfg.is_active ? "[Cá»”NG Táº®T]" : ""}
                                    </option>
                                  ))}
                              </select>
                            </div>
                          </div>
                        </td>

                        {/* 4. TRáº NG THÃI */}
                        <td className="py-4 px-4 text-center">
                          {!slot.enabled ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                              Táº M áº¨N WEB
                            </span>
                          ) : !isPrimaryActive ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                              Cá»”NG ÄANG Táº®T
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              ONLINE
                            </span>
                          )}
                        </td>

                        {/* 5. Ã” INPUT VÃ€ ICON âš¡ TEST */}
                        <td className="py-4 px-4">
                          <div className="space-y-2">
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                handleQuickTestSlot(slot);
                              }}
                              className="flex items-center gap-2"
                            >
                              <div className="relative flex-1 min-w-[200px]">
                                <input
                                  type="text"
                                  value={testInputs[slot.slot_key] || ""}
                                  onChange={(e) =>
                                    setTestInputs((prev) => ({
                                      ...prev,
                                      [slot.slot_key]: e.target.value,
                                    }))
                                  }
                                  placeholder={slot.input_placeholder || "Nhập dữ liệu test..."}
                                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500/40 transition-all font-mono"
                                />
                              </div>

                              <button
                                type="submit"
                                disabled={isTesting}
                                title="Bấm để test lấy OTP giả lập khách trên web"
                                className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all shadow-md active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-500/20"
                              >
                                {isTesting ? (
                                  <>
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    <span>Äang test...</span>
                                  </>
                                ) : (
                                  <>
                                    <Zap className="w-3.5 h-3.5 fill-current" />
                                    <span>Test</span>
                                  </>
                                )}
                              </button>
                            </form>

                            {/* Khung kết quả test hiển thị ngay dưới ô */}
                            {result && (
                              <div
                                className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs animate-in fade-in duration-150 ${
                                  result.success
                                    ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-200"
                                    : "bg-rose-950/30 border-rose-500/30 text-rose-200"
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  {result.success ? (
                                    <>
                                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-bold text-slate-300">Kết quả:</span>
                                        {result.otp ? (
                                          <span className="font-mono text-base font-black text-emerald-400 bg-slate-950 px-2 py-0.5 rounded border border-emerald-500/30 tracking-widest">
                                            {result.otp}
                                          </span>
                                        ) : (
                                          <span className="text-emerald-300 font-bold">
                                            {result.message}
                                          </span>
                                        )}
                                        {result.duration_ms && (
                                          <span className="text-[10px] text-slate-400 font-mono">
                                            â±ï¸ {result.duration_ms}ms
                                          </span>
                                        )}
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                                      <span className="text-[11px] truncate">
                                        {result.message || "Không tìm thấy thư mới hoặc mã OTP."}
                                      </span>
                                      {result.duration_ms && (
                                        <span className="text-[10px] text-slate-400 font-mono shrink-0">
                                          â±ï¸ {result.duration_ms}ms
                                        </span>
                                      )}
                                    </>
                                  )}
                                </div>

                                {result.success && result.otp && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      void copyToClipboard(String(result.otp), slot.slot_key);
                                      setCopiedOtpKey(slot.slot_key);
                                      showToast("success", `Đã sao chép mã: ${result.otp}`);
                                      setTimeout(() => setCopiedOtpKey(null), 2000);
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[11px] font-bold flex items-center gap-1 shrink-0 transition-colors"
                                  >
                                    {isCopied ? (
                                      <>
                                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                                        <span>Đã chép</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3.5 h-3.5" />
                                        <span>Chép mã</span>
                                      </>
                                    )}
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* 6. THAO TÃC Táº®T/Má»ž TRÃŠN WEB */}
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <label className="relative inline-flex items-center cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={slot.enabled}
                                onChange={() => handleToggleSlotEnabled(slot.slot_key)}
                                className="sr-only"
                              />
                              <div
                                className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-1 ${
                                  slot.enabled ? "bg-emerald-500" : "bg-slate-700"
                                }`}
                              >
                                <div
                                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                                    slot.enabled ? "translate-x-5" : "translate-x-0"
                                  }`}
                                />
                              </div>
                            </label>
                            <span className="text-[11px] font-semibold text-slate-400 min-w-[50px] text-left">
                              {slot.enabled ? "Bật" : "Tắt"}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        )}

        {/* Ná»˜I DUNG TAB 2: QUáº¢N LÃ CHI TIáº¾T CÃC Cá»”NG API TRONG DATABASE */}
        {activeMainTab === "api_manager" && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Banner Header Quản lý API */}
            <div className="bg-gradient-to-r from-cyan-950/40 via-slate-900 to-slate-950 border border-cyan-500/30 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden backdrop-blur-md">
              <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-cyan-500/10 to-transparent pointer-events-none" />
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 shadow-lg shadow-cyan-500/10">
                    <Database className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg font-bold text-white tracking-wide">
                        Bảng Quản Lý Danh Sách Cổng API Bên Thứ 3
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        DATABASE: external_api_configs
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                      Xem và chỉnh sửa trực tiếp thông tin các cột trong database (Mã Key, Tên hiển thị, URL máy chủ, Khóa bí mật Secret, Data mapping).
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Tìm kiếm cổng API..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 w-48 sm:w-60"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(true)}
                    className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-cyan-600/20 active:scale-95 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Thêm Cổng Mới</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Báº¢NG CHI TIáº¾T CÃC Cá»˜T DATABASE - TOÃ€N KHUNG 100%, KHÃ”NG SCROLL NGANG */}
            <div className="bg-slate-900/90 border border-slate-800/90 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-md">
              <div className="w-full">
                <table className="w-full table-fixed text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="py-3.5 px-2 text-center w-[4%]">STT</th>
                      <th className="py-3.5 px-2.5 w-[16%]">Tên Cổng & Logo</th>
                      <th className="py-3.5 px-2.5 w-[18%]">Mã Định Danh (KEY)</th>
                      <th className="py-3.5 px-2.5 w-[18%]">Đường Dẫn Máy Chủ (URL)</th>
                      <th className="py-3.5 px-2 text-center w-[9%]">Khóa Bí Mật (SECRET)</th>
                      <th className="py-3.5 px-2.5 w-[20%]">Bóc Tách (DATA)</th>
                      <th className="py-3.5 px-2 text-center w-[7%]">Trạng Thái</th>
                      <th className="py-3.5 px-2 text-center w-[8%]">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 text-xs">
                    {configs.map((cfg, idx) => {
                      const isOnline = cfg.is_active;
                      const hasSecret = Boolean(cfg.auth_config?.token || cfg.auth_config?.api_key);
                      const isPinging = pingingId === cfg.id;

                      return (
                        <tr key={cfg.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-2 text-center font-bold text-slate-500 text-xs">
                            {idx + 1}
                          </td>

                          {/* 1. TÊN CỔNG & LOGO (16% - Thu gọn thanh lịch) */}
                          <td className="py-3 px-2.5 overflow-hidden">
                            <div className="flex items-center gap-2 min-w-0" title={cfg.description ? `${cfg.service_name} (${cfg.description})` : cfg.service_name}>
                              <div className="w-8 h-8 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0 p-1 shadow-md">
                                {renderConfigIcon(cfg)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="font-bold text-white text-xs truncate">
                                  {cfg.service_name}
                                </div>
                                <div className="mt-0.5">
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-800 text-cyan-400 border border-slate-700">
                                    {cfg.category || "OTP"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* 2. MÃ ĐỊNH DANH KEY (18% - Rộng rãi, trọn vẹn 100%) */}
                          <td className="py-3 px-2.5 overflow-hidden">
                            <button
                              type="button"
                              onClick={() => {
                                void copyToClipboard(cfg.service_key, String(cfg.id));
                                showToast("success", `Đã sao chép key: ${cfg.service_key}`);
                              }}
                              className="w-full px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-cyan-300 font-mono text-[11px] font-bold inline-flex items-center justify-between gap-1 hover:border-cyan-500/40 hover:bg-slate-900 transition-all group"
                              title={`Click để sao chép key: ${cfg.service_key}`}
                            >
                              <span className="truncate">{cfg.service_key}</span>
                              <Copy className="w-3 h-3 text-slate-500 group-hover:text-cyan-400 transition-colors shrink-0" />
                            </button>
                          </td>

                          {/* 3. ĐƯỜNG DẪN MÁY CHỦ URL (18% - Thu gọn vừa vặn) */}
                          <td className="py-3 px-2.5 overflow-hidden">
                            <div className="flex items-center gap-1.5 font-mono text-[11px] min-w-0" title={cfg.base_url}>
                              <span className="px-1 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/30 text-[10px] shrink-0">
                                {cfg.auth_config?.method || "POST"}
                              </span>
                              <span className="text-slate-200 font-semibold truncate select-all">
                                {cfg.base_url}
                              </span>
                            </div>
                          </td>

                          {/* 4. KHÓA BÍ MẬT SECRET (9% - Căn giữa) */}
                          <td className="py-3 px-2 text-center overflow-hidden">
                            {hasSecret ? (
                              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] font-mono">
                                <Lock className="w-3 h-3 text-amber-400 shrink-0" />
                                <span>â€¢â€¢â€¢â€¢â€¢â€¢</span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-500 italic">
                                Công khai
                              </span>
                            )}
                          </td>

                          {/* 5. BÓC TÁCH DỮ LIỆU DATA (20% - Mở rộng hiển thị rõ từng trường) */}
                          <td className="py-3 px-2.5 overflow-hidden">
                            <div className="flex flex-col gap-0.5 min-w-0">
                              {Array.isArray(cfg.field_mapping) && cfg.field_mapping.length > 0 ? (
                                cfg.field_mapping.map((f: any, fIdx: number) => (
                                  <div key={fIdx} className="flex items-center gap-1 text-[10px] truncate" title={`${f.key || f.label}: ${f.path}`}>
                                    <span className="text-amber-400 font-bold shrink-0">🎯 {f.key || f.label}:</span>
                                    <span className="font-mono text-slate-400 truncate">{f.path}</span>
                                  </div>
                                ))
                              ) : (
                                <span className="text-[10px] text-slate-500 italic">Mặc định (Auto-detect)</span>
                              )}
                            </div>
                          </td>

                          {/* 6. TRẠNG THÁI (7% - Căn giữa) */}
                          <td className="py-3 px-2 text-center overflow-hidden">
                            <button
                              type="button"
                              onClick={() => handleToggleApiActive(cfg)}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                                cfg.is_active
                                  ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20"
                                  : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.is_active ? "bg-emerald-400 animate-pulse" : "bg-slate-500"}`} />
                              <span>{cfg.is_active ? "Bật" : "Tắt"}</span>
                            </button>
                          </td>

                          {/* 7. THAO TÁC (8% - Căn giữa) */}
                          <td className="py-3 px-2 text-center overflow-hidden">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handlePingTest(cfg.id)}
                                disabled={isPinging}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-amber-500/20 hover:text-amber-300 text-slate-400 border border-slate-700/60 transition-all disabled:opacity-50"
                                title="Ping kiểm tra kết nối"
                              >
                                <Zap className={`w-3.5 h-3.5 ${isPinging ? "animate-spin text-amber-400" : ""}`} />
                              </button>

                              <button
                                type="button"
                                onClick={() => setEditModalConfig({ ...cfg })}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-cyan-500/20 hover:text-cyan-300 text-slate-400 border border-slate-700/60 transition-all"
                                title="Chỉnh sửa cấu hình cổng này"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteConfig(cfg.id, cfg.service_name)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 border border-slate-700/60 transition-all"
                                title="Xóa cổng này khỏi database"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>


  
      {/* MODAL Sá»¬A Cá»”NG Dá»ŠCH Vá»¤ API (DATABASE CRUD) */}
      {editModalConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl text-cyan-400">
                  <Edit className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Chỉnh Sửa Cổng API #{editModalConfig.id}</h3>
                  <p className="text-xs text-slate-400">Sửa đổi trực tiếp các cột lưu trong bảng database</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditModalConfig(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* 1. TÃŠN Cá»”NG & DANH Má»¤C */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">Tên Cổng Hiển Thị (Name)</label>
                  <input
                    type="text"
                    value={editModalConfig.service_name}
                    onChange={(e) => setEditModalConfig({ ...editModalConfig, service_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyan-500/60 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">Danh Mục (Category)</label>
                  <select
                    value={editModalConfig.category || "OTP"}
                    onChange={(e) => setEditModalConfig({ ...editModalConfig, category: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyan-500/60 font-semibold"
                  >
                    <option value="ADOBE">ADOBE</option>
                    <option value="NETFLIX">NETFLIX</option>
                    <option value="CHATGPT">CHATGPT</option>
                    <option value="2FA">2FA / TOTP</option>
                    <option value="OTP">OTP CHUNG</option>
                    <option value="OTHER">KHÃC</option>
                  </select>
                </div>
              </div>

              {/* 2. MÃƒ KEY Äá»ŠNH DANH */}
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">Mã Định Danh (KEY - Dùng để gán vào ô)</label>
                <input
                  type="text"
                  value={editModalConfig.service_key}
                  onChange={(e) => setEditModalConfig({ ...editModalConfig, service_key: e.target.value.trim().toLowerCase() })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-cyan-300 font-mono focus:outline-none focus:border-cyan-500/60 font-bold"
                />
              </div>

              {/* 3. URL MÃY CHá»¦ */}
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">Đường Dẫn Máy Chủ (Base URL)</label>
                <input
                  type="text"
                  value={editModalConfig.base_url}
                  onChange={(e) => setEditModalConfig({ ...editModalConfig, base_url: e.target.value.trim() })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-cyan-500/60 text-[11px]"
                />
              </div>

              {/* 4. KHÃ“A Báº¢O Máº¬T (SECRET) */}
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">Khóa Bí Mật / Token (SECRET - Để trống nếu công khai)</label>
                <input
                  type="password"
                  placeholder="Nhập Bearer Token, API Key hoặc Secret của NCC..."
                  value={editModalConfig.auth_config?.token || editModalConfig.auth_config?.api_key || ""}
                  onChange={(e) =>
                    setEditModalConfig({
                      ...editModalConfig,
                      auth_config: {
                        ...(editModalConfig.auth_config || {}),
                        token: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-amber-300 font-mono focus:outline-none focus:border-cyan-500/60 text-[11px]"
                />
              </div>

              {/* 5. MÃ” Táº¢ */}
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">Mô Tả Ghi Chú</label>
                <input
                  type="text"
                  value={editModalConfig.description || ""}
                  onChange={(e) => setEditModalConfig({ ...editModalConfig, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 focus:outline-none focus:border-cyan-500/60"
                  placeholder="Ghi chú về nguồn cung cấp hoặc đơn vị cấp API..."
                />
              </div>

              {/* 6. SWITCH TRáº NG THÃI */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <div>
                  <div className="font-bold text-white">Kích Hoạt Cổng Này</div>
                  <div className="text-[11px] text-slate-400">Cho phép các ô input sử dụng API này để lấy mã</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={editModalConfig.is_active}
                    onChange={(e) => setEditModalConfig({ ...editModalConfig, is_active: e.target.checked })}
                    className="sr-only"
                  />
                  <div
                    className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-1 ${
                      editModalConfig.is_active ? "bg-emerald-500" : "bg-slate-700"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        editModalConfig.is_active ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </div>
                </label>
              </div>
            </div>

            {/* BUTTONS */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditModalConfig(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={handleSaveEditModal}
                disabled={savingEditModal}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-600/25 active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{savingEditModal ? "Đang Lưu..." : "Lưu Thay Đổi"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: THá»¬ Láº¤Y OTP TRá»°C TIáº¾P (LIVE OTP PROBE) */}
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
                    âš¡ netlink.port.8315@colegiomontealto.us (Ades Demo)
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
                      <div className="text-[10px] text-emerald-400 uppercase tracking-widest font-semibold">MÃƒ OTP TRÃCH XUáº¤T</div>
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

      {/* MODAL 2: THÃŠM Cá»”NG Dá»ŠCH Vá»¤ OTP Má»šI */}
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
                      execution_mode: "AUTHENTICATED_OTP",
                      token: "",
                      timeoutMs: 12000,
                    })
                  }
                  className="px-2.5 py-1.5 bg-amber-950/40 hover:bg-amber-900/50 border border-amber-500/30 text-amber-300 rounded-lg text-left font-semibold truncate transition-all"
                >
                  âš¡ Ades Support (Only-OTP)
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
                      execution_mode: "YUNA_MAIL",
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
                      execution_mode: "GENERIC_HTTP",
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
                      execution_mode: "MAILBOX_REST",
                      token: "",
                      timeoutMs: 15000,
                    })
                  }
                  className="px-2.5 py-1.5 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 rounded-lg text-left font-semibold truncate transition-all"
                >
                  âœ‰ï¸ TinyHost Temp Mail
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

      {/* ========================================================= */}
      {/* TAB 3: Cáº¤U HÃŒNH API Sáº¢N PHáº¨M (PRODUCT API MAPPING)        */}
      {/* ========================================================= */}
      {activeMainTab === "product_apis" && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Header Banner Tab 3 */}
          <div className="bg-gradient-to-r from-purple-950/40 via-slate-900 to-slate-950 border border-purple-500/30 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden backdrop-blur-md">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Phân Bổ Cổng Tự Động
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    business.product_api_configs
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2.5">
                  <Layers className="w-5 h-5 text-purple-400" />
                  Cấu Hình API Cho Sản Phẩm (Product API Mapping)
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Gán các cổng API / OTP (Fix Ades, Viva Rocky, ChatGPT, Yuna...) trực tiếp cho Sản Phẩm cha.
                  Toàn bộ các biến thể con (Variant) sẽ tự động kế thừa và phân bổ dropdown OTP tương ứng khi Tạo hoặc Sửa đơn nhập hàng (MAVN).
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={fetchProductApis}
                  disabled={loadingProductApis}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
                  title="Tải lại danh sách"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingProductApis ? "animate-spin text-purple-400" : ""}`} />
                  <span>Làm Mới</span>
                </button>
              </div>
            </div>

            {/* Thống kê nhanh */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-800/80">
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3">
                <div className="text-[11px] text-slate-400">Tổng Sản Phẩm Cha</div>
                <div className="text-lg font-bold text-white font-mono mt-0.5">
                  {productApisList.length}
                </div>
              </div>

              <div className="bg-slate-950/60 border border-purple-500/20 rounded-2xl p-3">
                <div className="text-[11px] text-purple-300">Đã Gán Cổng API</div>
                <div className="text-lg font-bold text-purple-300 font-mono mt-0.5">
                  {productApisList.filter((p) => p.apis.length > 0).length}
                </div>
              </div>

              <div className="bg-slate-950/60 border border-amber-500/20 rounded-2xl p-3">
                <div className="text-[11px] text-amber-300">Chưa Gán Cổng</div>
                <div className="text-lg font-bold text-amber-300 font-mono mt-0.5">
                  {productApisList.filter((p) => p.apis.length === 0).length}
                </div>
              </div>

              <div className="bg-slate-950/60 border border-cyan-500/20 rounded-2xl p-3">
                <div className="text-[11px] text-cyan-300">Tổng Cổng API Khả Dụng</div>
                <div className="text-lg font-bold text-cyan-300 font-mono mt-0.5">
                  {allAvailableApis.length}
                </div>
              </div>
            </div>
          </div>

          {/* Thanh Tìm Kiếm & Lọc */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 p-3 rounded-2xl">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={productSearchQuery}
                onChange={(e) => setProductSearchQuery(e.target.value)}
                placeholder="Tìm theo tên sản phẩm, biến thể con..."
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex items-center gap-1.5 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setProductFilterStatus("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  productFilterStatus === "all"
                    ? "bg-purple-600 text-white"
                    : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                Tất cả ({productApisList.length})
              </button>
              <button
                type="button"
                onClick={() => setProductFilterStatus("mapped")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  productFilterStatus === "mapped"
                    ? "bg-purple-600 text-white"
                    : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                Đã gán API ({productApisList.filter((p) => p.apis.length > 0).length})
              </button>
              <button
                type="button"
                onClick={() => setProductFilterStatus("unmapped")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  productFilterStatus === "unmapped"
                    ? "bg-purple-600 text-white"
                    : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                Chưa gán ({productApisList.filter((p) => p.apis.length === 0).length})
              </button>
            </div>
          </div>

          {/* Danh Sách Card Sản Phẩm */}
          {loadingProductApis ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-purple-400" />
              <div className="text-sm">Đang tải danh sách sản phẩm và cấu hình API...</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {productApisList
                .filter((prod) => {
                  if (productFilterStatus === "mapped" && prod.apis.length === 0) return false;
                  if (productFilterStatus === "unmapped" && prod.apis.length > 0) return false;
                  if (productSearchQuery.trim()) {
                    const q = productSearchQuery.toLowerCase();
                    const matchName = prod.package_name.toLowerCase().includes(q);
                    const matchVariant = prod.variants.some(
                      (v) =>
                        v.variant_name.toLowerCase().includes(q) ||
                        v.display_name.toLowerCase().includes(q)
                    );
                    const matchApi = prod.apis.some(
                      (a) =>
                        a.service_name.toLowerCase().includes(q) ||
                        a.service_key.toLowerCase().includes(q)
                    );
                    if (!matchName && !matchVariant && !matchApi) return false;
                  }
                  return true;
                })
                .map((product) => {
                  const isExpanded = Boolean(expandedProductVariants[product.id]);
                  const hasApis = product.apis.length > 0;

                  return (
                    <div
                      key={product.id}
                      className={`rounded-2xl border transition-all flex flex-col justify-between ${
                        hasApis
                          ? "bg-slate-900/90 border-purple-500/30 hover:border-purple-500/60 shadow-lg shadow-purple-950/20"
                          : "bg-slate-900/50 border-slate-800/80 hover:border-slate-700"
                      }`}
                    >
                      {/* Card Top: Tên Sản Phẩm & Badges */}
                      <div className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                              <Layers className="w-5 h-5 text-purple-400" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-sm font-bold text-white truncate" title={product.package_name}>
                                {product.package_name}
                              </h4>
                              <div className="text-[10px] text-slate-400 font-mono">
                                ID: #{product.id} • {product.active_variants_count} biến thể hoạt động
                              </div>
                            </div>
                          </div>

                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                              hasApis
                                ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                                : "bg-slate-800 text-slate-500"
                            }`}
                          >
                            {product.apis.length} Cổng
                          </span>
                        </div>

                        {/* Danh sách Cổng API Đang Gán */}
                        <div className="space-y-1.5 pt-1">
                          <div className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                            <span>Cổng API Đang Gán:</span>
                            {hasApis && (
                              <span className="text-[10px] text-purple-400 font-mono lowercase">
                                tự động thừa kế
                              </span>
                            )}
                          </div>

                          {product.apis.length === 0 ? (
                            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-dashed border-slate-800 text-center text-xs text-slate-500">
                              Chưa gán cổng API nào
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {product.apis.map((api) => (
                                <div
                                  key={api.mapping_id}
                                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
                                    api.is_default
                                      ? "bg-purple-950/30 border-purple-500/50 shadow-[0_0_10px_rgba(168,85,247,0.15)]"
                                      : "bg-slate-950/70 border-slate-800/80"
                                  }`}
                                >
                                  <div className="min-w-0 space-y-0.5">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-xs font-bold text-white truncate">
                                        {api.service_name}
                                      </span>
                                      {api.is_default && (
                                        <span className="px-1.5 py-0.2 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[9.5px] font-bold flex items-center gap-0.5">
                                          <Star className="w-2.5 h-2.5 fill-amber-300" />
                                          Mặc định
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-mono truncate">
                                      {api.service_key} â€¢ {api.category}
                                    </div>
                                    {api.note && (
                                      <div className="text-[10px] text-slate-500 italic truncate">
                                        "{api.note}"
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    {!api.is_default && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleSetDefaultApi(
                                            api.mapping_id,
                                            product.package_name,
                                            api.service_name
                                          )
                                        }
                                        className="px-2 py-1 text-[10.5px] rounded-lg bg-slate-800 hover:bg-amber-950 hover:text-amber-300 hover:border hover:border-amber-500/40 text-slate-400 transition-colors cursor-pointer"
                                        title="Đặt làm cổng mặc định"
                                      >
                                        Đặt MĐ
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleRemoveMapping(
                                          api.mapping_id,
                                          product.package_name,
                                          api.service_name
                                        )
                                      }
                                      className="p-1.5 text-rose-400 hover:bg-rose-950/50 hover:border hover:border-rose-800 rounded-lg transition-colors cursor-pointer"
                                      title="Gỡ cổng này"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Danh sách Biến thể con (Preview & Expand) */}
                        <div className="pt-2 border-t border-slate-800/60">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedProductVariants((prev) => ({
                                ...prev,
                                [product.id]: !prev[product.id],
                              }))
                            }
                            className="w-full flex items-center justify-between text-[11px] text-slate-400 hover:text-slate-200 py-1 cursor-pointer transition-colors"
                          >
                            <span>
                              {product.variants.length} biến thể con kế thừa
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {isExpanded && (
                            <div className="mt-2 space-y-1 max-h-36 overflow-y-auto pr-1 text-xs">
                              {product.variants.length === 0 ? (
                                <div className="text-[11px] text-slate-500 italic">Chưa có biến thể con</div>
                              ) : (
                                product.variants.map((v) => (
                                  <div
                                    key={v.id}
                                    className="p-1.5 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-[11px]"
                                  >
                                    <span className="text-slate-300 truncate font-mono">
                                      {v.display_name || v.variant_name}
                                    </span>
                                    <span className="text-slate-500 font-mono text-[10px] shrink-0 ml-2">
                                      #{v.id}
                                    </span>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Bottom Button: + Gán Cổng API */}
                      <div className="p-3 bg-slate-950/40 border-t border-slate-800/80">
                        <button
                          type="button"
                          onClick={() => handleOpenAssignModal(product)}
                          className="w-full py-2 bg-gradient-to-r from-purple-600/80 to-pink-600/80 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-98 transition-all cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Gán Cổng API Cho Sản Phẩm</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {/* MODAL GÃN Cá»”NG API CHO Sáº¢N PHáº¨M */}
          {assignModalOpen && selectedProductForAssign && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
              <div className="bg-slate-900 border border-purple-500/30 rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Gán Cổng API Cho Sản Phẩm</h4>
                      <div className="text-[11px] text-purple-300 font-mono">
                        {selectedProductForAssign.package_name} (#{selectedProductForAssign.id})
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAssignModalOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Chọn Cổng API Khả Dụng *
                    </label>
                    <select
                      value={selectedApiConfigId}
                      onChange={(e) => setSelectedApiConfigId(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 cursor-pointer font-mono"
                    >
                      {allAvailableApis.map((api) => (
                        <option key={api.id} value={api.id}>
                          {api.service_name} ({api.service_key}) â€¢ {api.category}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-white">Đặt làm cổng mặc định</div>
                      <div className="text-[10.5px] text-slate-400">
                        Tự động chọn cổng này khi tạo đơn hàng mới cho sản phẩm
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={isDefaultAssign}
                      onChange={(e) => setIsDefaultAssign(e.target.checked)}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Ghi chú cấu hình (tùy chọn)
                    </label>
                    <input
                      type="text"
                      value={assignNote}
                      onChange={(e) => setAssignNote(e.target.value)}
                      placeholder="ví dụ: Dùng cho gói Pro / Team"
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setAssignModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitAssign}
                    disabled={submittingAssign}
                    className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-purple-600/25 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {submittingAssign ? "Đang gán..." : "Xác Nhận Gán Cổng API"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL 3: Bá»˜ CHá»ŒN TRÆ¯á»œNG Dá»® LIá»†U Äá»˜NG & PHÃ‚N TÃCH CÃ‚Y JSON (DYNAMIC FIELD SELECTOR) */}
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
              {/* Cá»˜T TRÃI (7 COLS / 58%): Request & Response JSON Explorer */}
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
                              âš¡ Ades Mail
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
                      placeholder='{
  "status": "success",
  "data": [
    {
      "code": "849201",
      "otp": "849201"
    }
  ]
}'
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

              {/* Cá»˜T PHáº¢I (5 COLS / 42%): Field Picker, Configured Fields & Live Preview */}
              <div className="lg:col-span-5 flex flex-col gap-3 min-h-0 overflow-y-auto pr-1">
                {/* KHá»I 1: KHO TRÆ¯á»œNG CÃ“ Sáº´N (PRESET FIELD CATALOG - 1-CLICK Táº¬N Dá»¤NG NGAY) */}
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
                                    Bá»
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

                {/* KHá»I 2: DANH SÃCH TRÆ¯á»œNG ÄÃƒ Cáº¤U HÃŒNH */}
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

                {/* KHá»I 3: XEM TRÆ¯á»šC HIá»‚N THá»Š (LIVE CARD PREVIEW) */}
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

export default ExternalApiConfigController;





