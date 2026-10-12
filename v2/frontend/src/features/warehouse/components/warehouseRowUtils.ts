import { WarehouseAccountItem } from "../types";

/**
 * Format 2FA secret key into 4-character chunks for readability
 * e.g., "rerebwtpd7mb3ajg" -> "rere bwtp d7mb 3ajg"
 */
export const format2FAChunks = (twoFa?: string | null): string => {
  if (!twoFa) return "—";
  const trimmed = twoFa.trim();
  if (!trimmed) return "—";
  if (trimmed.includes(" ")) return trimmed;
  return trimmed.match(/.{1,4}/g)?.join(" ") || trimmed;
};

/**
 * Brand color palette styling for service pills and badges
 */
export interface ServiceBrandStyle {
  badgeClass: string;
  dotClass: string;
  accentColor: string;
}

export const getServiceBrandStyle = (
  serviceName?: string,
  isAvailable: boolean = true
): ServiceBrandStyle => {
  if (!isAvailable) {
    return {
      badgeClass:
        "bg-slate-800/80 text-slate-400 border-white/5 opacity-75 line-through",
      dotClass: "bg-slate-500",
      accentColor: "#64748b",
    };
  }

  const name = (serviceName || "").toLowerCase();

  if (name.includes("youtube")) {
    return {
      badgeClass:
        "bg-red-500/10 text-red-300 border-red-500/25 shadow-[0_0_12px_rgba(239,68,68,0.12)]",
      dotClass: "bg-red-400",
      accentColor: "#ef4444",
    };
  }
  if (name.includes("mail") || name.includes("gmail") || name.includes("outlook")) {
    return {
      badgeClass:
        "bg-sky-500/10 text-sky-300 border-sky-500/25 shadow-[0_0_12px_rgba(14,165,233,0.12)]",
      dotClass: "bg-sky-400",
      accentColor: "#0ea5e9",
    };
  }
  if (name.includes("adobe")) {
    return {
      badgeClass:
        "bg-amber-500/10 text-amber-300 border-amber-500/25 shadow-[0_0_12px_rgba(245,158,11,0.12)]",
      dotClass: "bg-amber-400",
      accentColor: "#f59e0b",
    };
  }
  if (name.includes("canva")) {
    return {
      badgeClass:
        "bg-purple-500/10 text-purple-300 border-purple-500/25 shadow-[0_0_12px_rgba(168,85,247,0.12)]",
      dotClass: "bg-purple-400",
      accentColor: "#a855f7",
    };
  }
  if (name.includes("netflix")) {
    return {
      badgeClass:
        "bg-rose-600/10 text-rose-300 border-rose-600/25 shadow-[0_0_12px_rgba(225,29,72,0.12)]",
      dotClass: "bg-rose-500",
      accentColor: "#e11d48",
    };
  }
  if (name.includes("spotify")) {
    return {
      badgeClass:
        "bg-emerald-500/10 text-emerald-300 border-emerald-500/25 shadow-[0_0_12px_rgba(16,185,129,0.12)]",
      dotClass: "bg-emerald-400",
      accentColor: "#10b981",
    };
  }
  if (
    name.includes("google") ||
    name.includes("gemini") ||
    name.includes("one")
  ) {
    return {
      badgeClass:
        "bg-teal-500/10 text-teal-300 border-teal-500/25 shadow-[0_0_12px_rgba(20,184,166,0.12)]",
      dotClass: "bg-teal-400",
      accentColor: "#14b8a6",
    };
  }
  if (name.includes("office") || name.includes("microsoft")) {
    return {
      badgeClass:
        "bg-blue-500/10 text-blue-300 border-blue-500/25 shadow-[0_0_12px_rgba(59,130,246,0.12)]",
      dotClass: "bg-blue-400",
      accentColor: "#3b82f6",
    };
  }
  if (name.includes("chatgpt") || name.includes("openai")) {
    return {
      badgeClass:
        "bg-emerald-500/10 text-emerald-300 border-emerald-500/25 shadow-[0_0_12px_rgba(16,185,129,0.12)]",
      dotClass: "bg-emerald-400",
      accentColor: "#10b981",
    };
  }

  // Default elegant Indigo styling
  return {
    badgeClass:
      "bg-indigo-500/10 text-indigo-300 border-indigo-500/25 shadow-[0_0_12px_rgba(99,102,241,0.10)]",
    dotClass: "bg-indigo-400",
    accentColor: "#6366f1",
  };
};

/**
 * Detailed expiry analysis with days countdown calculation
 */
export interface ExpiryStatusResult {
  formattedDate: string;
  status: "expired" | "warning" | "valid" | "none";
  daysLeft?: number;
  badgeText: string;
  badgeClass: string;
}

export const getExpiryStatus = (expiryStr?: string | null): ExpiryStatusResult => {
  if (!expiryStr || expiryStr.trim() === "" || expiryStr === "—") {
    return {
      formattedDate: "—",
      status: "none",
      badgeText: "Vĩnh viễn / Không hạn",
      badgeClass: "text-slate-500",
    };
  }

  const clean = expiryStr.trim();
  let expiryDate: Date | null = null;

  // Pattern 1: DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = clean.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    expiryDate = new Date(year, month, day, 23, 59, 59);
  } else {
    // Pattern 2: Standard ISO or YYYY-MM-DD
    const parsed = new Date(clean);
    if (!isNaN(parsed.getTime())) {
      expiryDate = parsed;
    }
  }

  if (!expiryDate || isNaN(expiryDate.getTime())) {
    return {
      formattedDate: clean,
      status: "none",
      badgeText: clean,
      badgeClass: "text-slate-400",
    };
  }

  const now = new Date();
  const diffMs = expiryDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  const pad = (n: number) => n.toString().padStart(2, "0");
  const formattedDisplay = `${pad(expiryDate.getDate())}/${pad(
    expiryDate.getMonth() + 1
  )}/${expiryDate.getFullYear()}`;

  if (diffDays < 0) {
    return {
      formattedDate: formattedDisplay,
      status: "expired",
      daysLeft: diffDays,
      badgeText: `Hết hạn (${Math.abs(diffDays)} ngày trước)`,
      badgeClass: "bg-rose-500/10 text-rose-400 border border-rose-500/25",
    };
  }

  if (diffDays <= 7) {
    return {
      formattedDate: formattedDisplay,
      status: "warning",
      daysLeft: diffDays,
      badgeText: `Sắp hết (còn ${diffDays} ngày)`,
      badgeClass: "bg-amber-500/10 text-amber-300 border border-amber-500/25",
    };
  }

  return {
    formattedDate: formattedDisplay,
    status: "valid",
    daysLeft: diffDays,
    badgeText: `Còn ${diffDays} ngày`,
    badgeClass: "bg-slate-800/80 text-slate-300 border border-white/5",
  };
};

/**
 * Formats an entire warehouse account and its child services for clipboard copying
 * Exactly matching the format needed for customer handover & chat pasting
 */
export const formatWarehouseAccountForCopy = (account: WarehouseAccountItem): string => {
  const lines: string[] = [];
  lines.push(`TÀI KHOẢN: ${account.account}`);

  if (account.services && account.services.length > 0) {
    account.services.forEach((srv, idx) => {
      lines.push(`\n[DỊCH VỤ ${idx + 1}: ${(srv.display_name || srv.category).toUpperCase()}]`);
      if (srv.password) lines.push(`Mật khẩu: ${srv.password}`);
      if (srv.backup_email) lines.push(`Mail backup: ${srv.backup_email}`);
      if (srv.two_fa) lines.push(`2FA: ${format2FAChunks(srv.two_fa)}`);
      if (srv.expires_at) lines.push(`Hạn sử dụng: ${srv.expires_at}`);
      lines.push(
        `Trạng thái: ${
          srv.status === "AVAILABLE"
            ? "TỒN KHO"
            : srv.status === "IN_USE"
            ? "ĐANG SỬ DỤNG"
            : srv.status
        }`
      );
      if (srv.note) lines.push(`Ghi chú: ${srv.note}`);
    });
  }

  return lines.join("\n");
};
