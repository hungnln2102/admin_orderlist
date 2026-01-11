import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  normalizeRichHtmlForSave,
  stripDurationSuffix,
  toHtmlFromPlain,
} from "../../utils/productInfoHelpers";
import { LinkModal } from "../LinkModal";
import { EditProductContent } from "./EditProductContent";
import { EditProductFooter } from "./EditProductFooter";
import { EditProductHeader } from "./EditProductHeader";
import { EditProductSidebar } from "./EditProductSidebar";
import { RichTextToolbar } from "./RichTextToolbar";
import {
  EditFormState,
  EditProductModalProps,
  EditorContext,
} from "./types";

export const EditProductModal: React.FC<EditProductModalProps> = ({
  product,
  saving,
  onClose,
  onSave,
}) => {
  const labels = {
    title: "Chỉnh sửa thông tin sản phẩm",
    productId: "Mã sản phẩm",
    productName: "Tên sản phẩm / Loại gói sản phẩm",
    imageUrl: "Đường dẫn hình ảnh sản phẩm",
    rules: "Quy tắc sản phẩm",
    description: "Mô tả sản phẩm",
    cancel: "Hủy bỏ",
    save: "Lưu thay đổi",
    saving: "Đang Lưu...",
    headingPrompt: "Chọn heading (1-6):",
    headingDefault: "2",
  };

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
  const [activeEditor, setActiveEditor] = useState<EditorContext | null>(null);
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
    field: EditorContext,
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
      setLinkError("Vui lòng chọn nút dung trước khi chọn link.");
      return;
    }
    const trimmed = linkUrl.trim();
    if (!/^https?:\/\//i.test(trimmed)) {
      setLinkError("URL phải bắt đầu bằng http:// hoặc https://");
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
    context: EditorContext
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

  const renderToolbar = (context: EditorContext) => (
    <RichTextToolbar
      context={context}
      onCommand={applyRichCommand}
      onOpenLink={openLinkModal}
      onOpenColor={openColorPicker}
      headingPrompt={labels.headingPrompt}
      headingDefault={labels.headingDefault}
    />
  );

  if (!product) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 py-8">
        <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#0b1220] border border-white/10 shadow-2xl custom-scroll">
          <input
            ref={colorNativeInputRef}
            type="color"
            className="rich-color-native"
            value={colorInput}
            onChange={(event) => handleNativeColorChange(event.target.value)}
            onBlur={() => setOpenColorType(null)}
          />
          <EditProductHeader title={labels.title} />
          <div className="px-5 py-4">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              <EditProductSidebar
                form={form}
                labels={{ productId: labels.productId, productName: labels.productName }}
                onProductIdChange={(value) => setForm((prev) => ({ ...prev, productId: value }))}
                onProductNameChange={(value) => setForm((prev) => ({ ...prev, productName: value }))}
                onImageUrlChange={(value) => setForm((prev) => ({ ...prev, imageUrl: value }))}
              />
              <EditProductContent
                labels={{ rules: labels.rules, description: labels.description }}
                rulesEditorRef={rulesEditorRef}
                descriptionEditorRef={descriptionEditorRef}
                rulesEditorKey={(product?.id ?? "rules") + "-editor"}
                descriptionEditorKey={(product?.id ?? "description") + "-editor"}
                renderToolbar={renderToolbar}
                onFocusEditor={(context) => setActiveEditor(context)}
                onSyncEditor={syncRichText}
              />
            </div>
          </div>
          <EditProductFooter
            saving={saving}
            onClose={onClose}
            onSave={() => onSave(form)}
            labels={{ cancel: labels.cancel, save: labels.save, saving: labels.saving }}
          />
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

export type { SavePayload } from "./types";
