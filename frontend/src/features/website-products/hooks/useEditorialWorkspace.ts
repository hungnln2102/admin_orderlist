import { useCallback, useEffect, useRef, useState } from "react";
import { useNotification } from "@/shared/context/NotificationContext";
import type { EditorialAction, VariantEditorial } from "../types";
import {
  getVariantEditorial, runEditorialAction, saveVariantDraft, WebsiteProductsError,
} from "../websiteProductsApi";

export function useEditorialWorkspace(id: number, pauseAutosave: boolean) {
  const notify = useNotification();
  const [data, setData] = useState<VariantEditorial | null>(null);
  const [html, setHtml] = useState("");
  const htmlRef = useRef("");
  const [editorKey, setEditorKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<"save" | "action" | null>(null);
  const [composing, setComposing] = useState(false);
  const mutation = useRef(false);
  const failedAutosave = useRef<{ html: string; version: number } | null>(null);
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const dirty = data !== null && html !== data.draft.html;
  const busy = pending !== null;

  const changeHtml = useCallback((value: string) => {
    htmlRef.current = value;
    setHtml(value);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    getVariantEditorial(id, controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      setData(result);
      changeHtml(result.draft.html);
      failedAutosave.current = null;
      setEditorKey((key) => key + 1);
      setConflict(false);
    }).catch((cause: Error) => {
      if (!controller.signal.aborted) setError(cause.message);
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [id, reloadKey, changeHtml]);

  useEffect(() => {
    if (!dirty && !busy) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty, busy]);

  const mutate = useCallback(async (
    request: () => Promise<VariantEditorial>,
    operation: { kind: "save"; html: string; version: number; automatic: boolean } | { kind: "action"; message: string }
  ) => {
    if (mutation.current || conflict || loading) return;
    mutation.current = true;
    setPending(operation.kind);
    setError("");
    const submittedHtml = htmlRef.current;
    try {
      const result = await request();
      setData(result);
      failedAutosave.current = null;
      if (operation.kind === "action" || htmlRef.current === operation.html) {
        changeHtml(result.draft.html);
        if (operation.kind === "action" && result.draft.html !== submittedHtml) {
          setEditorKey((key) => key + 1);
        }
      }
      if (operation.kind === "action") notify.success(operation.message);
      else if (!operation.automatic) notify.success("Đã lưu bản nháp.");
    } catch (cause) {
      if (operation.kind === "save") failedAutosave.current = operation;
      if (cause instanceof WebsiteProductsError && cause.status === 409) {
        setConflict(true);
        setError("Bản nháp đã thay đổi ở phiên khác. Sao chép nội dung đang soạn trước khi tải lại bản mới.");
      } else {
        setError((cause as Error).message);
      }
    } finally {
      setPending(null);
      mutation.current = false;
    }
  }, [changeHtml, conflict, loading, notify]);

  const save = useCallback((automatic = false) => {
    if (!data || !dirty || composing || data.draft.status === "in_review") return;
    const version = data.draft.version;
    const failed = failedAutosave.current;
    if (automatic && failed?.html === html && failed.version === version) return;
    void mutate(() => saveVariantDraft(id, html, version), { kind: "save", html, version, automatic });
  }, [composing, data, dirty, html, id, mutate]);

  useEffect(() => {
    if (!dirty || loading || busy || conflict || composing || pauseAutosave) return;
    const timer = window.setTimeout(() => save(true), 1200);
    return () => window.clearTimeout(timer);
  }, [busy, composing, conflict, dirty, loading, pauseAutosave, save]);

  const act = (action: EditorialAction, message: string, options?: { revisionId?: number; note?: string }) => {
    if (data) {
      void mutate(
        () => runEditorialAction(id, { action, version: data.draft.version, ...options }),
        { kind: "action", message }
      );
    }
  };
  const reload = () => setReloadKey((key) => key + 1);

  return {
    data, html, setHtml: changeHtml, editorKey, loading, busy, pending, composing, setComposing,
    error, conflict, dirty, save, act, reload,
  };
}
