import { useMemo } from "react";
import { ChartBarIcon } from "@heroicons/react/24/outline";
import { buildArticleSeoChecks, type SeoLevel } from "../utils/articleSeoReview";

const levelStyles: Record<SeoLevel, string> = {
  good: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  warn: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  bad: "border-rose-500/35 bg-rose-500/10 text-rose-200",
};

const dotStyles: Record<SeoLevel, string> = {
  good: "bg-emerald-400",
  warn: "bg-amber-400",
  bad: "bg-rose-400",
};

export type ArticleSeoReviewProps = {
  title: string;
  slug: string;
  summary: string;
  contentHtml: string;
  imageUrl: string;
};

const barGradient: Record<SeoLevel, string> = {
  good: "from-emerald-500 to-teal-400",
  warn: "from-amber-500 to-orange-400",
  bad: "from-rose-500 to-orange-600",
};

export function ArticleSeoReview({ title, slug, summary, contentHtml, imageUrl }: ArticleSeoReviewProps) {
  const { items, overall, scoreLabel, score } = useMemo(
    () => buildArticleSeoChecks({ title, slug, summary, contentHtml, imageUrl }),
    [title, slug, summary, contentHtml, imageUrl]
  );

  const badgeClass =
    overall === "good"
      ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-200"
      : overall === "warn"
        ? "border-amber-500/40 bg-amber-500/15 text-amber-200"
        : "border-rose-500/40 bg-rose-500/15 text-rose-200";

  const scoreTone =
    score >= 80 ? "text-emerald-300" : score >= 55 ? "text-amber-300" : "text-rose-300";

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-5 backdrop-blur-md">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ChartBarIcon className="h-5 w-5 text-sky-400" />
          <h3 className="text-sm font-bold text-white">Review SEO</h3>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${badgeClass}`}>
          {scoreLabel}
        </span>
      </div>

      <div className="mb-4">
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Điểm SEO</span>
          <span className={`text-2xl font-bold tabular-nums ${scoreTone}`}>{score}</span>
        </div>
        <div
          className="h-2.5 w-full overflow-hidden rounded-full bg-white/10"
          role="progressbar"
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Điểm SEO ${score} trên 100`}
        >
          <div
            className={`h-full rounded-full bg-gradient-to-r transition-[width] duration-500 ease-out ${barGradient[overall]}`}
            style={{ width: `${score}%` }}
          />
        </div>
        <p className="mt-1 text-right text-[11px] text-slate-500">
          Thang 0–100 — chỉ mục <span className="text-emerald-400/90">đạt</span> mới cộng điểm
        </p>
      </div>

      <p className="mb-4 text-xs text-slate-400">
        Gợi ý dựa trên tiêu đề, slug, tóm tắt và nội dung bạn đang soạn — không thay thế công cụ SEO chuyên sâu.
      </p>
      <ul className="grid list-none grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 xl:grid-cols-3">
        {items.map((item, idx) => (
          <li
            key={`${item.id}-${idx}`}
            className={`flex min-h-0 min-w-0 gap-2.5 rounded-xl border px-3 py-2.5 text-sm ${levelStyles[item.level]}`}
          >
            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dotStyles[item.level]}`} aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="font-semibold leading-tight text-white/95">{item.label}</p>
              <p className="mt-1 text-[12px] leading-snug text-slate-200/90">{item.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
