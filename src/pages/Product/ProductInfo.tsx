import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  EyeIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import Pagination from "../../components/Pagination";
import { apiFetch } from "../../lib/api";
import {
  fetchProductDescriptions,
  saveProductDescription,
  type ProductDescription,
} from "../../lib/productDescApi";
import { normalizeErrorMessage } from "../../lib/textUtils";
import "./ProductInfo.css";

const PAGE_SIZE = 10;

type ProductPriceItem = {
  id: number;
  san_pham: string;
  package_product?: string | null;
  package?: string | null;
};

type MergedProduct = ProductDescription & {
  packageProduct?: string | null;
  packageName?: string | null;
  rulesHtml?: string | null;
  descriptionHtml?: string | null;
};

const getInitials = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return "--";
  return trimmed.slice(0, 2).toUpperCase();
};

const stripDurationSuffix = (value: string): string => {
  if (!value) return "";
  return value.replace(/--\d+m$/i, "").trim();
};

const toHtmlFromPlain = (value: string): string =>
  (value || "").replace(/\n/g, "<br/>");

const normalizeProductKey = (value: string): string =>
  stripDurationSuffix(value).toLowerCase();

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const sanitizeHtmlForDisplay = (value: string | null | undefined): string => {
  if (!value) return "";
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(value, "text/html");
    const blockTags = new Set([
      "DIV",
      "P",
      "H1",
      "H2",
      "H3",
      "H4",
      "H5",
      "H6",
      "UL",
      "OL",
      "LI",
      "SECTION",
    ]);
    const walk = (node: ChildNode): string => {
      if (node.nodeType === Node.TEXT_NODE) {
        return escapeHtml(node.textContent || "");
      }
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        if (el.tagName === "BR") return "<br/>";
        if (el.tagName === "A") {
          const href = el.getAttribute("href") || "#";
          const safeHref = escapeHtml(href);
          const content = Array.from(el.childNodes).map(walk).join("");
          return `<a href="${safeHref}" title="${safeHref}" target="_blank" rel="noopener noreferrer">${content}</a>`;
        }
        const inner = Array.from(el.childNodes).map(walk).join("");
        if (blockTags.has(el.tagName)) {
          return `${inner}<br/>`;
        }
        return inner;
      }
      return "";
    };
    const raw = Array.from(doc.body.childNodes).map(walk).join("");
    return raw.replace(/(?:<br\/>\s*){3,}/g, "<br/><br/>");
  } catch {
    return escapeHtml(value);
  }
};

// Normalize richtext coming from contentEditable before saving to DB.
// Keeps basic line breaks/links, strips styling/classes/extra wrappers.
const normalizeRichHtmlForSave = (value: string | null | undefined): string => {
  if (!value) return "";
  return sanitizeHtmlForDisplay(value);
};

const splitCombinedContent = (
  rulesHtmlRaw: string,
  descriptionHtmlRaw?: string | null
): { rulesHtml: string; descriptionHtml: string } => {
  // If description is already provided separately, just use it.
  if (descriptionHtmlRaw && descriptionHtmlRaw.trim()) {
    return {
      rulesHtml: rulesHtmlRaw || "",
      descriptionHtml: descriptionHtmlRaw,
    };
  }

  const normalized = (rulesHtmlRaw || "")
    .replace(/<\/?(?:p|div)[^>]*>/gi, "\n")
    .replace(/<br\s*\/?>(?![\s\S]*<td)/gi, "\n")
    .replace(/<br\s*\/?>(?=\s*<\/)/gi, "\n")
    .replace(/<br\s*\/?>(?=\s*$)/gi, "\n");

  const normalizedNoAccent = normalized
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const markerRegex =
    /(thông tin\s*&\s*tính năng|thông tin sản phẩm|mô tả|nội dung|tính năng)/i;
  const match = normalizedNoAccent.match(markerRegex);
  const toHtml = (val: string) =>
    val.replace(/\n+/g, "\n").split("\n").join("<br/>");

  if (match && (match.index ?? 0) >= 3) {
    const splitIndex = match.index ?? 0;
    const before = normalized.slice(0, splitIndex).trim();
    const after = normalized.slice(splitIndex).trim();
    return {
      rulesHtml: toHtml(before),
      descriptionHtml: toHtml(after),
    };
  }

  return {
    rulesHtml: rulesHtmlRaw || "",
    descriptionHtml: descriptionHtmlRaw || "",
  };
};
function mergeProducts(
  productDescs: ProductDescription[],
  productPriceList: ProductPriceItem[],
  searchTerm: string
): MergedProduct[] {
  const search = (searchTerm || "").toLowerCase().trim();
  const priceMap = new Map<string, ProductPriceItem>();
  productPriceList.forEach((item) => {
    const sanKey = normalizeProductKey(item.san_pham || "");
    const packageKey = normalizeProductKey(item.package_product || "");
    const keys = [sanKey, packageKey].filter(Boolean) as string[];
    keys.forEach((key) => {
      if (!priceMap.has(key)) {
        priceMap.set(key, item);
      }
    });
  });

  const mergedMap = new Map<string, MergedProduct>();

  for (const item of productDescs) {
    const normalizedId = normalizeProductKey(item.productId || "");
    const priceRow = normalizedId ? priceMap.get(normalizedId) : null;
    const merged: MergedProduct = {
      ...item,
      productId: stripDurationSuffix(item.productId || ""),
      productName:
        item.productName ||
        (priceRow
          ? stripDurationSuffix(
              priceRow.package_product || priceRow.san_pham || ""
            )
          : null) ||
        item.productId,
      packageProduct: priceRow
        ? stripDurationSuffix(
            priceRow.package_product || priceRow.san_pham || ""
          )
        : null,
      packageName: priceRow
        ? stripDurationSuffix(priceRow.package || priceRow.san_pham || "")
        : null,
      rulesHtml: toHtmlFromPlain(item.rules || ""),
      descriptionHtml: toHtmlFromPlain(item.description || ""),
    };
    const key = normalizedId || normalizeProductKey(merged.productName || "");
    if (!key) continue;
    if (!mergedMap.has(key)) {
      mergedMap.set(key, merged);
    }
  }

  for (const priceItem of productPriceList) {
    const sanKey = normalizeProductKey(priceItem.san_pham || "");
    const packageKey = normalizeProductKey(priceItem.package_product || "");
    const key = sanKey || packageKey;
    const matched =
      (sanKey && mergedMap.has(sanKey)) ||
      (packageKey && mergedMap.has(packageKey));
    if (!key || matched) continue;
    mergedMap.set(key, {
      id: priceItem.id,
      productId: stripDurationSuffix(priceItem.san_pham || ""),
      productName: stripDurationSuffix(
        priceItem.package_product || priceItem.san_pham || ""
      ),
      packageProduct: stripDurationSuffix(
        priceItem.package_product || priceItem.san_pham || ""
      ),
      packageName: stripDurationSuffix(priceItem.package || ""),
      rules: "",
      rulesHtml: "",
      description: "",
      descriptionHtml: "",
      imageUrl: null,
    });
  }

  let merged = Array.from(mergedMap.values());

  if (search) {
    merged = merged.filter((item) => {
      const haystack = `${item.productId || ""} ${item.productName || ""} ${
        item.description || ""
      } ${item.rules || ""}`
        .toLowerCase()
        .replace(/\s+/g, " ");
      return haystack.includes(search);
    });
  }

  return merged;
}

export default function ProductInfo() {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [productDescs, setProductDescs] = useState<ProductDescription[]>([]);
  const [productPriceList, setProductPriceList] = useState<ProductPriceItem[]>(
    []
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<MergedProduct | null>(
    null
  );
  const [editForm, setEditForm] = useState({
    productId: "",
    productName: "",
    rules: "",
    rulesHtml: "",
    description: "",
    descriptionHtml: "",
    imageUrl: "",
  });
  const [editSaving, setEditSaving] = useState(false);
  const [activeEditor, setActiveEditor] = useState<
    "rules" | "description" | null
  >(null);
  const rulesEditorRef = useRef<HTMLDivElement | null>(null);
  const descriptionEditorRef = useRef<HTMLDivElement | null>(null);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("https://");
  const [linkError, setLinkError] = useState<string | null>(null);
  const savedSelectionRef = useRef<Range | null>(null);
  const typingFromEditorRef = useRef(false);
  const [openColorType, setOpenColorType] = useState<
    "foreColor" | "hiliteColor" | null
  >(null);
  const [colorInput, setColorInput] = useState("#38bdf8");
  const rulesToolbarRef = useRef<HTMLDivElement | null>(null);
  const descriptionToolbarRef = useRef<HTMLDivElement | null>(null);
  const colorNativeInputRef = useRef<HTMLInputElement | null>(null);

  const mergedProducts: MergedProduct[] = useMemo(
    () => mergeProducts(productDescs, productPriceList, searchTerm),
    [productDescs, productPriceList, searchTerm]
  );

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(mergedProducts.length / PAGE_SIZE)),
    [mergedProducts.length]
  );

  const pagedProducts = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    return mergedProducts.slice(start, end);
  }, [mergedProducts, currentPage]);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [descResponse, priceResponse] = await Promise.all([
        fetchProductDescriptions({}),
        apiFetch("/api/products"),
      ]);
      const priceData = (await priceResponse.json().catch(() => [])) as
        | ProductPriceItem[]
        | [];
      setProductDescs(
        Array.isArray(descResponse.items) ? descResponse.items : []
      );
      setProductPriceList(Array.isArray(priceData) ? priceData : []);
    } catch (err) {
      setProductDescs([]);
      setProductPriceList([]);
      setError(
        normalizeErrorMessage(
          err instanceof Error ? err.message : String(err ?? ""),
          { fallback: "Không thể tải danh sách sản phẩm." }
        )
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const openEditForm = (item: MergedProduct) => {
    setEditingProduct(item);
    setEditForm({
      productId: stripDurationSuffix(item.productId || ""),
      productName:
        stripDurationSuffix(item.packageProduct || item.productName || "") ||
        "",
      rules: item.rules || "",
      rulesHtml: item.rulesHtml || toHtmlFromPlain(item.rules || ""),
      description: item.description || "",
      descriptionHtml:
        item.descriptionHtml || toHtmlFromPlain(item.description || ""),
      imageUrl: item.imageUrl || "",
    });
  };

  const closeEditForm = () => {
    setEditingProduct(null);
    setEditForm({
      productId: "",
      productName: "",
      rules: "",
      rulesHtml: "",
      description: "",
      descriptionHtml: "",
      imageUrl: "",
    });
    setEditSaving(false);
    setActiveEditor(null);
    setLinkModalOpen(false);
    setLinkUrl("https://");
    setLinkError(null);
    savedSelectionRef.current = null;
  };

  const handleEditChange = (
    field: keyof typeof editForm,
    value: string
  ): void => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveEdit = async () => {
    if (!editingProduct) return;
    setEditSaving(true);
    const payload = {
      productId: editForm.productId.trim() || editingProduct.productId || "",
      rules: editForm.rulesHtml || editForm.rules,
      description: editForm.descriptionHtml || editForm.description,
      imageUrl: editForm.imageUrl || null,
    };

    try {
      const saved = await saveProductDescription(payload);
      const updated: MergedProduct = {
        ...editingProduct,
        id: saved.id || editingProduct.id,
        productId: saved.productId,
        rules: saved.rules || "",
        rulesHtml: saved.rules || "",
        description: saved.description || "",
        descriptionHtml: saved.description || "",
        imageUrl: saved.imageUrl || null,
      };

      setProductDescs((prev) => {
        const idx = prev.findIndex(
          (p) => p.id === saved.id || p.productId === saved.productId
        );
        if (idx === -1) {
          return [
            ...prev,
            {
              id: saved.id || editingProduct.id,
              productId: saved.productId,
              productName: editingProduct.productName || null,
              rules: saved.rules || "",
              rulesHtml: saved.rules || "",
              description: saved.description || "",
              descriptionHtml: saved.description || "",
              imageUrl: saved.imageUrl || null,
            },
          ];
        }
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          id: saved.id || next[idx].id,
          productId: saved.productId,
          rules: saved.rules || "",
          rulesHtml: saved.rules || "",
          description: saved.description || "",
          descriptionHtml: saved.description || "",
          imageUrl: saved.imageUrl || null,
        };
        return next;
      });

      setEditingProduct(updated);
      closeEditForm();
    } catch (err) {
      setError(
        normalizeErrorMessage(
          err instanceof Error ? err.message : String(err ?? ""),
          {
            fallback: "Không thể lưu thông tin sản phẩm.",
          }
        )
      );
    } finally {
      setEditSaving(false);
    }
  };

  const syncRichText = (
    field: "rules" | "description",
    element: HTMLDivElement | null
  ) => {
    if (!element) return;
    const html = normalizeRichHtmlForSave(element.innerHTML);
    const text = element.innerText;
    typingFromEditorRef.current = true;
    setEditForm((prev) => ({
      ...prev,
      [field]: text,
      [`${field}Html`]: html,
    }));
  };

  const getActiveEditorEl = (): HTMLDivElement | null => {
    return activeEditor === "rules"
      ? rulesEditorRef.current
      : descriptionEditorRef.current;
  };

  useEffect(() => {
    const target = rulesEditorRef.current;
    if (!target) return;
    // Always reset when editingProduct changes to ensure content appears.
    if (typingFromEditorRef.current) {
      typingFromEditorRef.current = false;
    }
    target.innerHTML = editForm.rulesHtml || toHtmlFromPlain(editForm.rules);
  }, [editForm.rules, editForm.rulesHtml, editingProduct]);

  useEffect(() => {
    const target = descriptionEditorRef.current;
    if (!target) return;
    if (typingFromEditorRef.current) {
      typingFromEditorRef.current = false;
      return;
    }
    target.innerHTML =
      editForm.descriptionHtml || toHtmlFromPlain(editForm.description);
  }, [editForm.description, editForm.descriptionHtml, editingProduct]);

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
      setLinkError("Vui lòng chọn nội dung trước khi chèn link.");
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
      <div
        className="rich-toolbar mb-2"
        ref={context === "rules" ? rulesToolbarRef : descriptionToolbarRef}
      >
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

  const renderImage = (
    item: ProductDescription,
    size: "small" | "large" = "small"
  ) => {
    const displayName = item.productName || item.productId || "--";
    const initials = getInitials(displayName);
    const baseClasses =
      "rounded-md bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold";
    const dimensions =
      size === "large" ? "w-32 h-32 text-2xl" : "w-12 h-12 text-xs";
    if (item.imageUrl) {
      return (
        <img
          src={item.imageUrl}
          alt={displayName}
          className={`${dimensions} rounded-md object-cover`}
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      );
    }
    return (
      <div className={`${dimensions} ${baseClasses}`}>
        <span>{initials}</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-white">Thông Tin Sản Phẩm</h1>
        <p className="text-sm text-white/70">
          Đồng bộ với bảng product_desc trong database.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-xl">
          <input
            type="text"
            placeholder="Tìm kiếm theo tên hoặc mã sản phẩm..."
            className="w-full bg-[#0f1729] border border-white/10 text-white placeholder:text-white/50 rounded-lg pl-10 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            value={searchTerm}
            onChange={(event) => handleSearchChange(event.target.value)}
          />
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60" />
        </div>
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow">
          Thêm Sản Phẩm Mới
        </button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#0b1220] shadow-xl overflow-hidden">
        <div className="border-b border-white/10 px-4 py-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Sản Phẩm</h2>
          {loading && (
            <span className="text-xs text-white/60">Đang tải...</span>
          )}
        </div>
        {error && (
          <div className="border-b border-white/10 px-4 py-2 text-sm text-rose-300">
            {error}
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="min-w-full table-fixed divide-y divide-white/10 text-sm text-white/90">
            <colgroup>
              <col style={{ width: "8%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "17%" }} />
              <col style={{ width: "25%", minWidth: "240px" }} />
              <col style={{ width: "25%", minWidth: "240px" }} />
              <col style={{ width: "11%", minWidth: "120px" }} />
            </colgroup>
            <thead className="bg-white/5 text-white">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Ảnh</th>
                <th className="px-4 py-3 text-left font-semibold">
                  Mã Sản Phẩm
                </th>
                <th className="px-4 py-3 text-left font-semibold">
                  Tên Sản Phẩm
                </th>
                <th className="px-5 py-3 text-left font-semibold border-r border-white/10 min-w-[240px]">
                  Quy Tắc
                </th>
                <th className="px-5 py-3 text-left font-semibold min-w-[240px] border-r border-white/10">
                  Mô Tả
                </th>
                <th className="px-4 py-3 text-left font-semibold min-w-[120px] text-center">
                  Thao Tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {pagedProducts.map((item) => {
                const displayName =
                  item.packageProduct ||
                  item.productName ||
                  item.productId ||
                  "--";
                const isExpanded = expandedId === item.id;
                const rawRulesHtml =
                  item.rulesHtml || toHtmlFromPlain(item.rules || "");
                const rawDescriptionHtml =
                  item.descriptionHtml ||
                  toHtmlFromPlain(item.description || "");
                const {
                  rulesHtml: displayRulesHtml,
                  descriptionHtml: displayDescriptionHtml,
                } = splitCombinedContent(rawRulesHtml, rawDescriptionHtml);
                const safeRulesHtml =
                  sanitizeHtmlForDisplay(displayRulesHtml) || "Chưa cập nhật";
                const safeDescriptionHtml =
                  sanitizeHtmlForDisplay(
                    displayDescriptionHtml ||
                      toHtmlFromPlain(item.description || "")
                  ) || "Chưa cập nhật";
                return (
                  <React.Fragment key={`${item.id}-${item.productId}`}>
                    <tr
                      className={`hover:bg-white/5 cursor-pointer ${
                        isExpanded ? "bg-white/5" : ""
                      }`}
                      onClick={() =>
                        setExpandedId(isExpanded ? null : Number(item.id))
                      }
                    >
                      <td className="px-4 py-3">{renderImage(item)}</td>
                      <td className="px-4 py-3 text-white">
                        <div className="flex flex-col">
                          <span className="font-semibold text-white">
                            {stripDurationSuffix(item.productId || "") || "--"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-white">
                        {stripDurationSuffix(displayName) || "--"}
                      </td>
                      {/* Cot Quy Tac */}
                      <td className="px-5 py-3 pr-5 text-white/80 align-top border-r border-white/10 min-w-[240px]">
                        <span
                          className="block whitespace-pre-line break-words rich-display"
                          style={{
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                          title={item.rulesHtml ? undefined : item.rules || ""}
                          dangerouslySetInnerHTML={{
                            __html: safeRulesHtml,
                          }}
                        />
                      </td>
                      {/* Cot Mo Ta */}
                      <td className="px-5 py-3 pl-5 text-white/80 align-top border-r border-white/10 min-w-[240px]">
                        <span
                          className="block whitespace-pre-line break-words rich-display"
                          style={{
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                          title={
                            item.descriptionHtml
                              ? undefined
                              : item.description || ""
                          }
                          dangerouslySetInnerHTML={{
                            __html: safeDescriptionHtml,
                          }}
                        />
                      </td>
                      <td className="px-4 py-3 space-x-2 whitespace-nowrap text-center align-top">
                        <button
                          className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                          title="Xem"
                        >
                          <EyeIcon className="h-5 w-5 text-blue-400" />
                        </button>
                        <button
                          className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                          title="Sửa"
                          onClick={(event) => {
                            event.stopPropagation();
                            openEditForm(item);
                          }}
                        >
                          <PencilSquareIcon className="h-5 w-5 text-green-400" />
                        </button>
                        <button
                          className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                          title="Xóa"
                        >
                          <TrashIcon className="h-5 w-5 text-red-400" />
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-white/5">
                        <td colSpan={6} className="px-6 py-4">
                          <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 mb-3 flex flex-col items-center text-center">
                            <p className="text-sm font-semibold text-white">
                              Thông tin chi tiết
                            </p>
                            <p className="mt-2 text-white/80 leading-relaxed">
                              {stripDurationSuffix(
                                item.packageProduct ||
                                  item.productName ||
                                  item.productId ||
                                  ""
                              ) || "Chưa có mô tả chi tiết."}
                            </p>
                          </div>
                          <div className="flex flex-col md:flex-row gap-4">
                            <div className="w-full md:w-64 rounded-lg border border-white/10 bg-white/5 p-4 flex flex-col items-center justify-center text-white">
                              {renderImage(item, "large")}
                            </div>
                            <div className="flex-1 space-y-3">
                              <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                                <p className="text-sm font-semibold text-white">
                                  Quy tắc bảo hành
                                </p>
                                <div
                                  className="mt-2 text-white/80 leading-relaxed break-words rich-display"
                                  dangerouslySetInnerHTML={{
                                    __html:
                                      sanitizeHtmlForDisplay(
                                        splitCombinedContent(
                                          item.rulesHtml ||
                                            toHtmlFromPlain(item.rules || ""),
                                          item.descriptionHtml ||
                                            toHtmlFromPlain(
                                              item.description || ""
                                            )
                                        ).rulesHtml
                                      ) || "Chưa có quy tắc.",
                                  }}
                                />
                              </div>
                              <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                                <p className="text-sm font-semibold text-white">
                                  Thông tin sản phẩm
                                </p>
                                <div
                                  className="mt-2 text-white/80 leading-relaxed break-words rich-display"
                                  dangerouslySetInnerHTML={{
                                    __html:
                                      sanitizeHtmlForDisplay(
                                        splitCombinedContent(
                                          item.rulesHtml ||
                                            toHtmlFromPlain(item.rules || ""),
                                          item.descriptionHtml ||
                                            toHtmlFromPlain(
                                              item.description || ""
                                            )
                                        ).descriptionHtml ||
                                          toHtmlFromPlain(
                                            item.description || ""
                                          )
                                      ) || "Chưa có nội dung.",
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {!loading && pagedProducts.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-4 text-center text-sm text-white/70"
                  >
                    Không có dữ liệu product_desc.
                  </td>
                </tr>
              )}
              {loading && pagedProducts.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-4 text-center text-sm text-white/80"
                  >
                    Đang tải danh sách...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-white/10 px-4 py-3">
          <Pagination
            currentPage={currentPage}
            totalItems={mergedProducts.length}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 py-8">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#0b1220] border border-white/10 shadow-2xl custom-scroll">
            <input
              ref={colorNativeInputRef}
              type="color"
              className="rich-color-native"
              value={colorInput}
              onChange={(event) => handleNativeColorChange(event.target.value)}
              onBlur={() => {
                setOpenColorType(null);
              }}
            />
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
              <h3 className="text-lg font-semibold text-white">
                Chỉnh sửa thông tin sản phẩm
              </h3>
              <button
                className="text-white/70 hover:text-white"
                onClick={closeEditForm}
                disabled={editSaving}
              >
                ×
              </button>
            </div>
            <div className="space-y-4 px-5 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wide text-white/70 mb-1">
                    Mã sản phẩm
                  </label>
                  <input
                    type="text"
                    value={editForm.productId}
                    onChange={(e) =>
                      handleEditChange("productId", e.target.value)
                    }
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wide text-white/70 mb-1">
                    Tên sản phẩm / Package product
                  </label>
                  <input
                    type="text"
                    value={editForm.productName}
                    onChange={(e) =>
                      handleEditChange("productName", e.target.value)
                    }
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wide text-white/70 mb-1">
                  Quy tắc
                </label>
                {renderRichToolbar("rules")}
                <div
                  key={(editingProduct?.id ?? "rules") + "-editor"}
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
                  Mô tả
                </label>
                {renderRichToolbar("description")}
                <div
                  key={(editingProduct?.id ?? "description") + "-editor"}
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
                  value={editForm.imageUrl}
                  onChange={(e) => handleEditChange("imageUrl", e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  placeholder="https://..."
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-white/10 px-5 py-3">
              <button
                className="px-4 py-2 text-sm font-semibold text-white/80 hover:text-white"
                onClick={closeEditForm}
                disabled={editSaving}
              >
                Hủy
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                onClick={handleSaveEdit}
                disabled={editSaving}
              >
                {editSaving ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingProduct && linkModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm rounded-xl bg-[#0b1220] border border-white/10 p-5 shadow-2xl space-y-4">
            <h4 className="text-white font-semibold">Chèn liên kết</h4>
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-wide text-white/70">
                URL
              </label>
              <input
                type="text"
                value={linkUrl}
                onChange={(e) => {
                  setLinkUrl(e.target.value);
                  setLinkError(null);
                }}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                placeholder="https://..."
              />
              {linkError && (
                <div className="text-xs text-rose-300">{linkError}</div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                className="px-3 py-2 text-sm font-semibold text-white/80 hover:text-white"
                onClick={closeLinkModal}
                type="button"
              >
                Hủy
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                onClick={applyLink}
                type="button"
              >
                Chèn link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
