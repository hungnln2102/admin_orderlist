import type { RenewSystemLogEntry, RenewSystemLogLevel, RenewSystemLogSource } from "@/features/renew-adobe/api/renewAdobeApi";

export const vi = (value: string) => value;

export const LEVEL_OPTIONS: { value: RenewSystemLogLevel; label: string }[] = [
  { value: "all", label: vi("Tất cả") },
  { value: "error", label: "Error" },
  { value: "warn", label: "Warn" },
  { value: "info", label: "Info" },
  { value: "debug", label: "Debug" },
 ];

export const LOG_SOURCE_TABS: { value: RenewSystemLogSource; label: string; description: string }[] = [
  {
    value: "system",
    label: vi("Log hệ thống"),
    description: vi("Lỗi backend, webhook, Redis, Telegram và cảnh báo vận hành."),
  },
  {
    value: "user",
    label: vi("Log người dùng"),
    description: vi("Hoạt động như tạo đơn hàng, sửa đơn hàng, tạo log chi phí."),
  },
];

export const levelClassName = (level: string) => {
  const normalized = level.toLowerCase();
  if (normalized === "error") return "border-rose-400/30 bg-rose-500/10 text-rose-200";
  if (normalized === "warn") return "border-amber-400/30 bg-amber-500/10 text-amber-200";
  if (normalized === "debug") return "border-sky-400/30 bg-sky-500/10 text-sky-200";
  if (normalized === "http") return "border-violet-400/30 bg-violet-500/10 text-violet-200";
  return "border-emerald-400/30 bg-emerald-500/10 text-emerald-200";
};

export const orderCodeClassName = "border-cyan-300/30 bg-cyan-500/10 text-cyan-100";

export const isMetadataRecord = (value: unknown): value is Record<string, unknown> => (
  Boolean(value) && typeof value === "object" && !Array.isArray(value)
);

export const getUserLogBadgeText = (item: RenewSystemLogEntry): string => {
  const metadata = isMetadataRecord(item.metadata) ? item.metadata : {};
  const candidates = [metadata.orderCode, item.entityId, item.entity_id];
  const orderCode = candidates
    .map((value) => (value == null ? "" : String(value).trim()))
    .find(Boolean);
  return orderCode || item.level || "info";
};

export const getUserLogActionText = (item: RenewSystemLogEntry): string => {
  const action = item.action == null ? "" : String(item.action).trim();
  return action || "Thao tác người dùng";
};

export const formatMetaValue = (value: unknown): string => {
  if (value == null || value === "") return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

export const describeLogLevelVi = (level: string): string => {
  const normalized = level.toLowerCase();
  if (normalized === "error") return vi("Lỗi nghiêm trọng cần xử lý");
  if (normalized === "warn") return vi("Cảnh báo, hệ thống vẫn chạy nhưng có điểm cần kiểm tra");
  if (normalized === "info") return vi("Thông tin vận hành bình thường");
  if (normalized === "debug") return vi("Log ghi lại chi tiết");
  if (normalized === "http") return vi("Log yêu cầu HTTP");
  return vi("Log hệ thống");
};

export const describeLogMessageVi = (message: string): string => {
  const text = String(message || "").toLowerCase();
  if (!text) return vi("Chưa có nội dung mô tả.");
  if (text.includes("redis") && text.includes("session")) {
    return vi("Lỗi session Redis: môi trường production đang yêu cầu Redis session store nhưng Redis chưa bật hoặc chưa có cấu hình/kết nối.");
  }
  if (text.includes("redis") && text.includes("refusing to boot")) {
    return vi("Ứng dụng từ chối khởi động vì thiếu Redis cần thiết cho session.");
  }
  if (text.includes("webhook") && text.includes("failed")) {
    return vi("Webhook xử lý thất bại, cần xem chi tiết payload và stacktrace.");
  }
  if (text.includes("telegram")) {
    return vi("Lỗi hoặc cảnh báo khi gửi thông báo Telegram.");
  }
  if (text.includes("renewal")) {
    return vi("Log liên quan luồng gia hạn Renew Adobe.");
  }
  if (text.includes("payment_receipt") || text.includes("payment receipt")) {
    return vi("Log liên quan biên nhận thanh toán hoặc đồng bộ giao dịch.");
  }
  if (text.includes("auto assign")) {
    return vi("Log liên quan tự động gắn tài khoản hoặc user cho Renew.");
  }
  return vi("Log vận hành cần kiểm tra thêm nội dung gốc.");
};

