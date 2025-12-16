import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  MergedProduct,
  normalizeRichHtmlForSave,
  stripDurationSuffix,
  toHtmlFromPlain,
} from "../utils/productInfoHelpers";
import { LinkModal } from "./LinkModal";

export type EditFormState = {
  productId: string;
  productName: string;
  rules: string;
  rulesHtml: string;
  description: string;
  descriptionHtml: string;
  imageUrl: string;
};

export type SavePayload = EditFormState;

type EditProductModalProps = {
  product: MergedProduct | null;
  saving: boolean;
  onClose: () => void;
  onSave: (payload: SavePayload) => void;
};

export const EditProductModal: React.FC<EditProductModalProps> = ({
  product,
  saving,
  onClose,
  onSave,
}) => {
  const initialForm = useMemo<EditFormState>(
    () => ({
      productId: stripDurationSuffix(product?.productId || ""),
      productName:
        stripDurationSuffix(product?.packageProduct || product?.productName || "") ||
        "",
      rules: product?.rules || "",
      rulesHtml: product?.rulesHtml || toHtmlFromPlain(product?.rules || ""),
      description: product?.description || "",
      descriptionHtml:
        product?.descriptionHtml ||
        toHtmlFromPlain(product?.description || ""),
      imageUrl: product?.imageUrl || "",
    }),
    [product]
  );

  const [form, setForm] = useState<EditFormState>(initialForm);
  const [activeEditor, setActiveEditor] = useState<"rules" | "description" | null>(
    null
  );
  const rulesEditorRef = useRef<HTMLDivElement | null>(null);
  const descriptionEditorRef = useRef<HTMLDivElement | null>(null);
  const savedSelectionRef = useRef<Range | null>(null);
  const typingFromEditorRef = useRef(false);
  const [openColorType, setOpenColorType] = useState<
    "foreColor" | "hiliteColor" | null
  >(null);
  const [colorInput, setColorInput] = useState("#38bdf8");
  const colorNativeInputRef = useRef<HTMLInputElement | null>(null);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("https://");
  const [linkError, setLinkError] = useState<string | null>(null);

  useEffect(() => {
    if (!product) return;
    setForm(initialForm);
    setActiveEditor(null);
    setLinkModalOpen(false);
    setLinkUrl("https://");
    setLinkError(null);
  }, [initialForm, product]);

  const getActiveEditorEl = (): HTMLDivElement | null => {
    return activeEditor === "rules"
      ? rulesEditorRef.current
      : descriptionEditorRef.current;
  };

  const syncRichText = (
    field: "rules" | "description",
    element: HTMLDivElement | null
  ) => {
    if (!element) return;
    const selection = document.getSelection();
    const range =
      selection && selection.rangeCount > 0
        ? selection.getRangeAt(0).cloneRange()
        : null;

    const html = normalizeRichHtmlForSave(element.innerHTML);
    const text = element.innerText;
    typingFromEditorRef.current = true;
    setForm((prev) => ({
      ...prev,
      [field]: text,
      [`${field}Html`]: html,
    }));

    const shouldRestore = document.activeElement === element;
    if (range && shouldRestore) {
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  };

  useEffect(() => {
    const target = rulesEditorRef.current;
    if (!target) return;
    if (typingFromEditorRef.current) {
      typingFromEditorRef.current = false;
      return;
    }
    target.innerHTML = form.rulesHtml || toHtmlFromPlain(form.rules);
  }, [form.rules, form.rulesHtml]);

  useEffect(() => {
    const target = descriptionEditorRef.current;
    if (!target) return;
    if (typingFromEditorRef.current) {
      typingFromEditorRef.current = false;
      return;
    }
    target.innerHTML =
      form.descriptionHtml || toHtmlFromPlain(form.description);
  }, [form.description, form.descriptionHtml]);

  useEffect(() => {
    if (!openColorType) return;
    const input = colorNativeInputRef.current;
    if (!input) return;
    requestAnimationFrame(() => {
      if (typeof input.showPicker === "function") {
        input.showPicker();
      } else {
        input.click();
      }
    });
  }, [openColorType]);

  const saveCurrentSelection = () => {
    const target = getActiveEditorEl();
    if (!target) {
      savedSelectionRef.current = null;
      return;
    }
    const selection = document.getSelection();
    if (
      selection &&
      selection.rangeCount > 0 &&
      target.contains(selection.focusNode)
    ) {
      savedSelectionRef.current = selection.getRangeAt(0).cloneRange();
    } else {
      savedSelectionRef.current = null;
    }
  };

  const applyRichCommand = (
    command: string,
    value?: string,
    restoreSelection = false
  ) => {
    const target = getActiveEditorEl();
    if (!target) return;
    if (restoreSelection && savedSelectionRef.current) {
      const selection = document.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(savedSelectionRef.current);
      }
    } else {
      saveCurrentSelection();
    }
    target.focus();
    document.execCommand(command, false, value);
    syncRichText(activeEditor || "rules", target);
  };

  const openLinkModal = () => {
    const target = getActiveEditorEl();
    if (!target) return;
    saveCurrentSelection();
    setLinkUrl("https://");
    setLinkError(null);
    setLinkModalOpen(true);
  };

  const closeLinkModal = () => {
    setLinkModalOpen(false);
    setLinkError(null);
    setLinkUrl("https://");
  };

  const applyLink = () => {
    const target = getActiveEditorEl();
    if (!target) {
      setLinkError("Vui lAýng ch ¯?n n ¯Ti dung tr’ø ¯>c khi chA\"n link.");
      return;
    }
    const trimmed = linkUrl.trim();
    if (!/^https?:\/\//i.test(trimmed)) {
      setLinkError("URL ph §œi b §_t Ž` §u b §ñng http:// ho §úc https://");
      return;
    }
    target.focus();
    const selection = document.getSelection();
    if (selection && savedSelectionRef.current) {
      selection.removeAllRanges();
      selection.addRange(savedSelectionRef.current);
    }
    document.execCommand("createLink", false, trimmed);
    syncRichText(activeEditor || "rules", target);
    closeLinkModal();
  };

  const openColorPicker = (
    type: "foreColor" | "hiliteColor",
    context: "rules" | "description"
  ) => {
    setActiveEditor(context);
    saveCurrentSelection();
    setOpenColorType(type);
    setColorInput(type === "hiliteColor" ? "#fef08a" : "#38bdf8");
  };

  const applyColor = (color: string) => {
    const command = openColorType;
    if (!command) return;
    setColorInput(color);
    setOpenColorType(null);
    applyRichCommand(command, color, true);
  };

  const handleNativeColorChange = (value: string) => {
    if (!value) {
      setOpenColorType(null);
      return;
    }
    setColorInput(value);
    applyColor(value);
  };

  const renderRichToolbar = (context: "rules" | "description") => (
    <div className="rich-toolbar-wrapper">
      <div className="rich-toolbar mb-2">
        <button type="button" onClick={() => applyRichCommand("bold")}>
          B
        </button>
        <button type="button" onClick={() => applyRichCommand("italic")}>
          I
        </button>
        <button type="button" onClick={() => applyRichCommand("underline")}>
          U
        </button>
        <button type="button" onClick={openLinkModal}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
          >
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.71" />
          </svg>
        </button>
        <button
          type="button"
          data-color-button="true"
          onClick={() => openColorPicker("foreColor", context)}
        >
          A
        </button>
        <button
          type="button"
          data-color-button="true"
          onClick={() => openColorPicker("hiliteColor", context)}
        >
          Bg
        </button>
        <button
          type="button"
          className="rich-toolbar-heading"
          onClick={() => {
            const level = window.prompt("Chon heading (1-6):", "2");
            const num = Number(level);
            if (Number.isInteger(num) && num >= 1 && num <= 6) {
              applyRichCommand(`formatBlock`, `h${num}`);
            }
          }}
        >
          H
        </button>
        <select
          className="rich-toolbar-select"
          value=""
          onChange={(event) => {
            const value = event.target.value;
            event.target.value = "";
            if (value) applyRichCommand("fontName", value);
          }}
        >
          <option value="">Font</option>
          <option value="Arial">Arial</option>
          <option value="Georgia">Georgia</option>
          <option value="Times New Roman">Times New Roman</option>
          <option value="Verdana">Verdana</option>
          <option value="Tahoma">Tahoma</option>
          <option value="Roboto">Roboto</option>
          <option value="Inter">Inter</option>
          <option value="Poppins">Poppins</option>
          <option value="Montserrat">Montserrat</option>
          <option value="Open Sans">Open Sans</option>
          <option value="Nunito">Nunito</option>
          <option value="Raleway">Raleway</option>
          <option value="Merriweather">Merriweather</option>
          <option value="Playfair Display">Playfair Display</option>
          <option value="Courier New">Courier New</option>
          <option value="Fira Code">Fira Code</option>
          <option value="Source Sans Pro">Source Sans Pro</option>
        </select>
        <select
          className="rich-toolbar-select"
          value=""
          onChange={(event) => {
            const value = event.target.value;
            event.target.value = "";
            if (value) applyRichCommand("fontSize", value);
          }}
        >
          <option value="">Size</option>
          <option value="2">12px</option>
          <option value="3">16px</option>
          <option value="4">18px</option>
          <option value="5">24px</option>
          <option value="6">32px</option>
          <option value="7">48px</option>
        </select>
      </div>
    </div>
  );

  if (!product) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 py-8">
        <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#0b1220] border border-white/10 shadow-2xl custom-scroll">
          <input
            ref={colorNativeInputRef}
            type="color"
            className="rich-color-native"
            value={colorInput}
            onChange={(event) => handleNativeColorChange(event.target.value)}
            onBlur={() => setOpenColorType(null)}
          />
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
            <h3 className="text-lg font-semibold text-white">
              Ch ¯%nh s ¯-a thA'ng tin s §œn ph §cm
            </h3>
            <button
              className="text-white/70 hover:text-white"
              onClick={onClose}
              disabled={saving}
              type="button"
            >
              A-
            </button>
          </div>
          <div className="space-y-4 px-5 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-wide text-white/70 mb-1">
                  MAœ s §œn ph §cm
                </label>
                <input
                  type="text"
                  value={form.productId}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, productId: e.target.value }))
                  }
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wide text-white/70 mb-1">
                  TA¦n s §œn ph §cm / Package product
                </label>
                <input
                  type="text"
                  value={form.productName}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, productName: e.target.value }))
                  }
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wide text-white/70 mb-1">
                Quy t §_c
              </label>
              {renderRichToolbar("rules")}
              <div
                key={(product?.id ?? "rules") + "-editor"}
                ref={rulesEditorRef}
                className="rich-editor"
                contentEditable
                suppressContentEditableWarning
                onFocus={() => setActiveEditor("rules")}
                onInput={(e) => syncRichText("rules", e.currentTarget)}
                onBlur={(e) => syncRichText("rules", e.currentTarget)}
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wide text-white/70 mb-1">
                MA' t §œ
              </label>
              {renderRichToolbar("description")}
              <div
                key={(product?.id ?? "description") + "-editor"}
                ref={descriptionEditorRef}
                className="rich-editor"
                contentEditable
                suppressContentEditableWarning
                onFocus={() => setActiveEditor("description")}
                onInput={(e) => syncRichText("description", e.currentTarget)}
                onBlur={(e) => syncRichText("description", e.currentTarget)}
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wide text-white/70 mb-1">
                Image URL
              </label>
              <input
                type="text"
                value={form.imageUrl}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, imageUrl: e.target.value }))
                }
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                placeholder="https://..."
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 border-t border-white/10 px-5 py-3">
            <button
              className="px-4 py-2 text-sm font-semibold text-white/80 hover:text-white"
              onClick={onClose}
              disabled={saving}
              type="button"
            >
              H ¯y
            </button>
            <button
              className="px-4 py-2 rounded-lg bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              onClick={() => onSave(form)}
              disabled={saving}
              type="button"
            >
              {saving ? "Ž?ang l’øu..." : "L’øu thay Ž` ¯i"}
            </button>
          </div>
        </div>
      </div>
      <LinkModal
        open={!!product && linkModalOpen}
        url={linkUrl}
        error={linkError}
        onChange={(value) => {
          setLinkUrl(value);
          setLinkError(null);
        }}
        onClose={closeLinkModal}
        onConfirm={applyLink}
      />
    </>
  );
};
