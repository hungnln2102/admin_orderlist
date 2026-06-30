import type { RenewSystemLogEntry, RenewSystemLogLevel, RenewSystemLogSource } from "@/features/renew-adobe/api/renewAdobeApi";

export const vi = (value: string) => value;

export const LEVEL_OPTIONS: { value: RenewSystemLogLevel; label: string }[] = [
  { value: "all", label: vi("Táº¥t cáº£") },
  { value: "error", label: "Error" },
  { value: "warn", label: "Warn" },
  { value: "info", label: "Info" },
  { value: "debug", label: "Debug" },
 ];

export const LOG_SOURCE_TABS: { value: RenewSystemLogSource; label: string; description: string }[] = [
  {
    value: "system",
    label: vi("Log há»‡ thá»‘ng"),
    description: vi("Lá»—i backend, webhook, Redis, Telegram vÃ  cáº£nh bÃ¡o váº­n hÃ nh."),
  },
  {
    value: "user",
    label: vi("Log ngÆ°á»i dÃ¹ng"),
    description: vi("Hoáº¡t Ä‘á»™ng nhÆ° táº¡o Ä‘Æ¡n hÃ ng, sá»­a Ä‘Æ¡n hÃ ng, táº¡o log chi phÃ­."),
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
  return action || "Thao tÃ¡c ngÆ°á»i dÃ¹ng";
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
  if (normalized === "error") return vi("Lá»—i nghiÃªm trá»ng cáº§n xá»­ lÃ½");
  if (normalized === "warn") return vi("Cáº£nh bÃ¡o, há»‡ thá»‘ng váº«n cháº¡y nhÆ°ng cÃ³ Ä‘iá»ƒm cáº§n kiá»ƒm tra");
  if (normalized === "info") return vi("ThÃ´ng tin váº­n hÃ nh bÃ¬nh thÆ°á»ng");
  if (normalized === "debug") return vi("Log ghi láº¡i chi tiáº¿t");
  if (normalized === "http") return vi("Log yÃªu cáº§u HTTP");
  return vi("Log há»‡ thá»‘ng");
};

export const describeLogMessageVi = (message: string): string => {
  const text = String(message || "").toLowerCase();
  if (!text) return vi("ChÆ°a cÃ³ ná»™i dung mÃ´ táº£.");
  if (text.includes("redis") && text.includes("session")) {
    return vi("Lá»—i session Redis: mÃ´i trÆ°á»ng production Ä‘ang yÃªu cáº§u Redis session store nhÆ°ng Redis chÆ°a báº­t hoáº·c chÆ°a cÃ³ cáº¥u hÃ¬nh/káº¿t ná»‘i.");
  }
  if (text.includes("redis") && text.includes("refusing to boot")) {
    return vi("á»¨ng dá»¥ng tá»« chá»‘i khá»Ÿi Ä‘á»™ng vÃ¬ thiáº¿u Redis cáº§n thiáº¿t cho session.");
  }
  if (text.includes("webhook") && text.includes("failed")) {
    return vi("Webhook xá»­ lÃ½ tháº¥t báº¡i, cáº§n xem chi tiáº¿t payload vÃ  stacktrace.");
  }
  if (text.includes("telegram")) {
    return vi("Lá»—i hoáº·c cáº£nh bÃ¡o khi gá»­i thÃ´ng bÃ¡o Telegram.");
  }
  if (text.includes("renewal")) {
    return vi("Log liÃªn quan luá»“ng gia háº¡n Renew Adobe.");
  }
  if (text.includes("payment_receipt") || text.includes("payment receipt")) {
    return vi("Log liÃªn quan biÃªn nháº­n thanh toÃ¡n hoáº·c Ä‘á»“ng bá»™ giao dá»‹ch.");
  }
  if (text.includes("auto assign")) {
    return vi("Log liÃªn quan tá»± Ä‘á»™ng gáº¯n tÃ i khoáº£n hoáº·c user cho Renew.");
  }
  return vi("Log váº­n hÃ nh cáº§n kiá»ƒm tra thÃªm ná»™i dung gá»‘c.");
};

