import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Eye, History, Monitor, PencilLine, Save, Smartphone } from "lucide-react";
import { BaseModal, CopyButton, CustomSelect, GlassCard } from "@/shared/components";
import { useNotification } from "@/shared/context/NotificationContext";
import { formatDateDisplay } from "@/shared/utils/format";
import {
  EDITORIAL_ACTION_LABEL, EDITORIAL_STATUS_LABEL, editorialPlainText, sanitizeEditorialHtml,
} from "../editorialContent";
import { useEditorialWorkspace } from "../hooks/useEditorialWorkspace";
import type { WebsiteVariant } from "../types";
import { VariantThumbnail } from "./VariantThumbnail";
import "./editorial.css";

const DescriptionRichEditor = lazy(() =>
  import("./DescriptionRichEditor").then((module) => ({ default: module.DescriptionRichEditor }))
);

const button = "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium hover:bg-slate-800 focus-visible:outline-cyan-400 disabled:cursor-not-allowed disabled:opacity-40";
const primaryButton = "inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-300 px-3 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-200 focus-visible:outline-cyan-400 disabled:cursor-not-allowed disabled:opacity-40";
const tabs = [
  { value: "edit", label: "Soạn thảo", icon: PencilLine },
  { value: "preview", label: "Xem trước", icon: Eye },
  { value: "history", label: "Lịch sử", icon: History },
] as const;

type WorkspaceTab = (typeof tabs)[number]["value"];

function ContentPreview({ html, label }: { html: string; label: string }) {
  const clean = useMemo(() => sanitizeEditorialHtml(html, true), [html]);
  return (
    <section aria-label={label} className="min-w-0 space-y-3">
      <h3 className="text-sm font-semibold text-slate-200">{label}</h3>
      <div className="rounded-xl bg-slate-50 p-5 text-slate-900 sm:p-7">
        {clean.trim() ? (
          <article
            className="editorial-prose"
            onClick={(event) => {
              if ((event.target as Element).closest("a")) event.preventDefault();
            }}
            dangerouslySetInnerHTML={{ __html: clean }}
          />
        ) : (
          <p className="text-sm text-slate-500">Chưa có nội dung.</p>
        )}
      </div>
    </section>
  );
}

interface Props {
  variant: WebsiteVariant;
  onExit: () => void;
}

export function VariantEditorialWorkspace({ variant, onExit }: Props) {
  const [discard, setDiscard] = useState<{ message: string; confirm: () => void } | null>(null);
  const {
    data, html, setHtml, editorKey, loading, busy, pending, composing, setComposing,
    error, conflict, dirty, save, act, reload,
  } = useEditorialWorkspace(variant.id, discard !== null);
  const notify = useNotification();
  const title = useRef<HTMLHeadingElement>(null);
  const [tab, setTab] = useState<WorkspaceTab>("edit");
  const [previewWidth, setPreviewWidth] = useState<"desktop" | "mobile">("desktop");
  const [showSidePreview, setShowSidePreview] = useState(false);
  const [showPublished, setShowPublished] = useState(false);
  const [selectedRevision, setSelectedRevision] = useState<number | null>(null);
  const revision = data?.history.find(({ id }) => id === selectedRevision) ?? data?.history[0];
  const variantName = variant.san_pham || variant.package_product;
  const words = useMemo(() => editorialPlainText(html).split(/\s+/).filter(Boolean).length, [html]);
  const inReview = data?.draft.status === "in_review";
  const savingDisabled = !dirty || busy || conflict || loading || inReview || composing;
  const actionsDisabled = dirty || busy || conflict || loading || composing;
  const contentExists = words > 0 || /<img\b/i.test(html);

  useEffect(() => {
    title.current?.focus();
  }, []);

  const confirmDiscard = (message: string, onConfirm: () => void) => {
    if (!dirty) {
      onConfirm();
      return;
    }
    setDiscard({ message, confirm: onConfirm });
  };

  const requestChanges = () => {
    notify.prompt({
      title: "Yêu cầu chỉnh sửa",
      message: "Ghi rõ nội dung cần thay đổi để người soạn có thể cập nhật bản nháp.",
      confirmText: "Gửi yêu cầu",
      onConfirm: (value) => {
        if (!value.trim()) {
          notify.error("Vui lòng nhập nội dung cần chỉnh sửa.");
          return;
        }
        act("request_changes", "Đã gửi yêu cầu chỉnh sửa.", { note: value.trim() });
      },
    });
  };

  const submitForReview = () => {
    const submit = () => act("submit", "Đã gửi bản nháp để duyệt.");
    if (contentExists) {
      submit();
      return;
    }
    notify.confirm({
      title: "Gửi duyệt mô tả trống",
      message: "Khi bản nháp trống được xuất bản, website sẽ gỡ nội dung mô tả hiện tại.",
      confirmText: "Gửi duyệt",
      onConfirm: submit,
    });
  };

  return (
    <section className="space-y-5" aria-label="Soạn mô tả biến thể">
      <button type="button" disabled={busy} className={button} onClick={() => confirmDiscard("Quay về danh sách sẽ bỏ thay đổi chưa lưu.", onExit)}>
        <ArrowLeft size={16} aria-hidden="true" /> Danh sách biến thể
      </button>
      <header className="flex flex-wrap items-center gap-3 border-b border-slate-800 pb-4">
        <VariantThumbnail src={variant.image_url} alt="" size="lg" />
        <div className="min-w-0 grow">
          <h2 ref={title} tabIndex={-1} className="text-lg font-bold text-white outline-none sm:text-2xl">{variantName}</h2>
          {variant.package_product !== variantName && <p className="break-words text-sm text-slate-400">{variant.package_product}</p>}
        </div>
        {data && (
          <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-200">
            {EDITORIAL_STATUS_LABEL[data.draft.status]}
          </span>
        )}
      </header>

      {loading && <p role="status" className="text-sm text-slate-400">Đang tải nội dung biên tập…</p>}
      {error && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-rose-200">
          <p role="alert" className="grow text-sm">{error}</p>
          {conflict && <CopyButton text={html} label="Sao chép HTML" title="Sao chép nội dung đang soạn" />}
          {(conflict || !data) && <button type="button" disabled={loading} className={button} onClick={() => confirmDiscard("Tải lại bản mới sẽ bỏ thay đổi chưa lưu.", reload)}>Tải lại</button>}
        </div>
      )}
      {data && (
        <>
          {data.draft.note && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
              <p className="font-semibold">Ghi chú duyệt</p>
              <p className="whitespace-pre-wrap break-words">{data.draft.note}</p>
            </div>
          )}
          <div className="flex flex-wrap gap-2" role="group" aria-label="Chế độ biên tập">
            {tabs.map(({ value, label, icon: Icon }) => (
              <button key={value} type="button" aria-pressed={tab === value} className={`${button} aria-pressed:border-cyan-400/50 aria-pressed:bg-cyan-400/10 aria-pressed:text-cyan-100`} onClick={() => setTab(value)}>
                <Icon size={16} aria-hidden="true" /> {label}
              </button>
            ))}
            {tab === "edit" && (
              <button
                type="button"
                className={`${button} ml-auto hidden lg:inline-flex aria-pressed:border-cyan-400/50 aria-pressed:bg-cyan-400/10`}
                aria-pressed={showSidePreview}
                onClick={() => setShowSidePreview((value) => !value)}
              >
                <Monitor size={16} aria-hidden="true" /> Xem trước bên cạnh
              </button>
            )}
          </div>

          <div className={tab !== "edit" ? "hidden" : showSidePreview ? "grid gap-4 lg:grid-cols-2" : ""}>
            <div className="min-w-0 rounded-xl border border-slate-800 bg-slate-900/50">
              <Suspense fallback={<p role="status" className="p-4 text-sm text-slate-400">Đang tải vùng soạn thảo…</p>}>
                <DescriptionRichEditor
                  key={editorKey}
                  initialHtml={data.draft.html}
                  onChange={setHtml}
                  onCompositionChange={setComposing}
                  readOnly={Boolean(inReview || pending === "action" || loading)}
                />
              </Suspense>
            </div>
            {showSidePreview && (
              <div className="hidden min-w-0 lg:block">
                <ContentPreview html={html} label="Bản xem trước" />
              </div>
            )}
          </div>

          {tab === "preview" && (
            <GlassCard className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" className={button} aria-label="Xem trước trên máy tính" aria-pressed={previewWidth === "desktop"} onClick={() => setPreviewWidth("desktop")}><Monitor size={16} aria-hidden="true" /> Máy tính</button>
                <button type="button" className={button} aria-label="Xem trước trên điện thoại" aria-pressed={previewWidth === "mobile"} onClick={() => setPreviewWidth("mobile")}><Smartphone size={16} aria-hidden="true" /> Điện thoại</button>
                {data.published && <button type="button" className={button} aria-pressed={showPublished} onClick={() => setShowPublished((value) => !value)}>So sánh với bản công bố</button>}
              </div>
              <div className={`grid gap-4 ${showPublished && data.published ? "lg:grid-cols-2" : ""}`}>
                <div className={previewWidth === "mobile" ? "mx-auto w-full max-w-[390px]" : ""}>
                  <ContentPreview html={html} label="Nội dung đang soạn" />
                </div>
                {showPublished && data.published && (
                  <div className={previewWidth === "mobile" ? "mx-auto w-full max-w-[390px]" : ""}>
                    <ContentPreview html={data.published.html} label="Bản đang công bố" />
                  </div>
                )}
              </div>
            </GlassCard>
          )}

          {tab === "history" && (
            <GlassCard className="space-y-4">
              {revision ? (
                <>
                  <div className="flex flex-wrap items-center gap-3">
                    <CustomSelect
                      className="w-full sm:max-w-lg"
                      ariaLabel="Phiên bản nội dung"
                      value={String(revision.id)}
                      options={data.history.map((entry) => ({
                        value: String(entry.id),
                        label: `${EDITORIAL_ACTION_LABEL[entry.action] ?? "Cập nhật"} · ${formatDateDisplay(entry.createdAt)}${entry.actor ? ` · ${entry.actor}` : ""}`,
                      }))}
                      onChange={(value) => setSelectedRevision(Number(value))}
                    />
                    <button type="button" disabled={actionsDisabled} className={button} onClick={() => notify.confirm({
                      title: "Khôi phục nội dung",
                      message: "Phiên bản đã chọn sẽ trở thành bản nháp mới. Bản đang công bố tiếp tục hiển thị trên website.",
                      confirmText: "Khôi phục bản nháp",
                      onConfirm: () => {
                        act("restore", "Đã khôi phục nội dung vào bản nháp.", { revisionId: revision.id });
                        setTab("edit");
                      },
                    })}>Khôi phục vào bản nháp</button>
                  </div>
                  {revision.note && <p className="whitespace-pre-wrap break-words text-sm text-slate-300">{revision.note}</p>}
                  <ContentPreview html={revision.html} label="Nội dung phiên bản đã lưu" />
                </>
              ) : (
                <p className="text-sm text-slate-400">Chưa có phiên bản đã lưu.</p>
              )}
            </GlassCard>
          )}

          <footer className="sticky bottom-0 z-10 flex flex-wrap items-center gap-2 border-t border-slate-800 bg-slate-950/95 py-3 backdrop-blur">
            <span className="grow text-xs text-slate-300" role="status">
              {pending === "save" ? "Đang lưu bản nháp…" : busy ? "Đang cập nhật…" : dirty ? "Có thay đổi chưa lưu" : `Phiên bản ${data.draft.version}`} · {words} từ
            </span>
            {!inReview && (
              <>
                <button type="button" className={button} disabled={savingDisabled} onClick={() => save()}><Save size={16} aria-hidden="true" /> Lưu nháp</button>
                {data.draft.status !== "published" && (
                  <button type="button" className={primaryButton} disabled={actionsDisabled || (!contentExists && !data.published)} onClick={submitForReview}>Gửi duyệt</button>
                )}
              </>
            )}
            {inReview && data.canPublish && (
              <>
                <button type="button" className={button} disabled={actionsDisabled} onClick={requestChanges}>Yêu cầu chỉnh sửa</button>
                <button type="button" className={primaryButton} disabled={actionsDisabled} onClick={() => notify.confirm({
                  title: "Xuất bản mô tả",
                  message: "Nội dung đã duyệt sẽ thay thế mô tả đang hiển thị trên website.",
                  confirmText: "Xuất bản",
                  onConfirm: () => act("publish", "Đã xuất bản mô tả."),
                })}>Xuất bản</button>
              </>
            )}
          </footer>
        </>
      )}
      {discard && (
        <BaseModal
          isOpen
          title="Nội dung chưa lưu"
          onClose={() => setDiscard(null)}
          footer={
            <>
              <button type="button" autoFocus className={button} onClick={() => setDiscard(null)}>Tiếp tục soạn</button>
              <button type="button" className={primaryButton} onClick={() => {
                setDiscard(null);
                discard.confirm();
              }}>Bỏ thay đổi</button>
            </>
          }
        >
          <p className="text-sm text-slate-200">{discard.message}</p>
        </BaseModal>
      )}
    </section>
  );
}
