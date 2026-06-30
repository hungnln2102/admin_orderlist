import type { RenewSystemLogEntry } from "@/features/renew-adobe/api/renewAdobeApi";
import { describeLogMessageVi, formatMetaValue, vi } from "./logFormatters";

export function LogMeta({ item, compact = false }: { item: RenewSystemLogEntry; compact?: boolean }) {
  const metaEntries = compact
    ? []
    : Object.entries(item).filter(
    ([key, value]) =>
      !["timestamp", "level", "message", "sourceFile", "raw"].includes(key) &&
      value !== undefined &&
      value !== null &&
      value !== ""
  );
  const description = describeLogMessageVi(String(item.message || item.raw || ""));

  return (
    <div className="mt-3 space-y-3">
      {!compact ? (
      <div className="rounded-2xl border border-amber-400/15 bg-amber-500/10 px-4 py-3">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-100/60">
          {vi("Diễn giải tiếng Việt")}
        </p>
        <p className="mt-2 text-sm font-semibold leading-6 text-amber-50">
          {description}
        </p>
      </div>
      ) : null}

      {metaEntries.length ? (
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {metaEntries.slice(0, 6).map(([key, value]) => (
            <div
              key={key}
              className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2"
            >
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
                {key}
              </p>
              <p className="mt-1 break-words text-xs font-medium text-indigo-100/80">
                {formatMetaValue(value)}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
