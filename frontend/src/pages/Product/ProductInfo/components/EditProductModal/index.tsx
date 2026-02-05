import React, { useEffect, useMemo, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import {
  stripDurationSuffix,
  toHtmlFromPlain,
} from "../../utils/productInfoHelpers";
import ImageUpload from "./ImageUpload";
import RichTextEditor from "./RichTextEditor";
import {
  EditFormState,
  EditProductModalProps,
} from "./types";

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
      packageName: product?.packageName || "",
      shortDescription: product?.shortDescription || "",
      rules: product?.rules || "",
      rulesHtml: product?.rulesHtml || toHtmlFromPlain(product?.rules || ""),
      description: product?.description || "",
      descriptionHtml:
        product?.descriptionHtml ||
        toHtmlFromPlain(product?.description || ""),
      imageUrl: product?.imageUrl || "",
      priceId: product?.priceId ?? null,
    }),
    [product]
  );

  const [form, setForm] = useState<EditFormState>(initialForm);

  useEffect(() => {
    if (!product) return;
    setForm(initialForm);
  }, [initialForm, product]);

  const handleSubmit = () => {
    onSave(form);
  };

  if (!product) return null;

  const inputBase =
    "w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white placeholder:text-slate-400 shadow-inner focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all";

  const labelBase =
    "text-xs font-semibold text-slate-300 uppercase tracking-wide";

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative flex w-full max-w-7xl flex-col rounded-[32px] border border-white/20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-2xl max-h-[95vh] overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-6 top-6 z-10 rounded-full bg-slate-800/80 p-2 text-slate-400 backdrop-blur-sm transition-all hover:bg-slate-700 hover:text-white"
          aria-label="Close"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>

        {/* Content */}
        <div className="flex-1 space-y-6 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8">
          {/* Header */}
          <div className="text-center">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Chỉnh sửa thông tin sản phẩm
            </h2>
          </div>

          {/* Two Column Layout */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left Column: Image Upload + Basic Info */}
            <div className="lg:col-span-1 space-y-5">
              {/* Image Upload */}
              <div style={{ height: "400px" }}>
                <ImageUpload
                  imageUrl={form.imageUrl}
                  onImageChange={(url) => setForm((prev) => ({ ...prev, imageUrl: url }))}
                  onImageRemove={() => setForm((prev) => ({ ...prev, imageUrl: "" }))}
                />
              </div>

              {/* Basic Product Info */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-sm backdrop-blur-sm">
                <h3 className="mb-4 text-lg font-semibold text-white">
                  Thông Tin Cơ Bản
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className={labelBase}>Mã Sản Phẩm</label>
                    <input
                      type="text"
                      value={form.productId}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, productId: e.target.value }))
                      }
                      placeholder="Nhập mã sản phẩm..."
                      className={inputBase}
                    />
                  </div>

                  <div>
                    <label className={labelBase}>Tên Sản Phẩm</label>
                    <input
                      type="text"
                      value={form.productName}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, productName: e.target.value }))
                      }
                      placeholder="Nhập tên sản phẩm..."
                      className={inputBase}
                    />
                  </div>

                  <div>
                    <label className={labelBase}>Gói Sản Phẩm</label>
                    <input
                      type="text"
                      value={form.packageName}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, packageName: e.target.value }))
                      }
                      placeholder="Nhập gói sản phẩm..."
                      className={inputBase}
                    />
                  </div>

                  <div>
                    <label className={labelBase}>Mô Tả Ngắn</label>
                    <textarea
                      value={form.shortDescription}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, shortDescription: e.target.value }))
                      }
                      rows={3}
                      placeholder="Nhập mô tả ngắn về sản phẩm..."
                      className={inputBase}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Rich Text Editors */}
            <div className="lg:col-span-2 space-y-5">
              {/* Rich Text Editors */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-sm backdrop-blur-sm space-y-4">
                <RichTextEditor
                  label="Quy Tắc Sản Phẩm"
                  value={form.rulesHtml || ""}
                  onChange={(value) => {
                    setForm((prev) => ({
                      ...prev,
                      rulesHtml: value,
                      rules: value.replace(/<[^>]*>/g, ""),
                    }));
                  }}
                  placeholder="Nhập quy tắc sản phẩm..."
                  minHeight="150px"
                />
                <RichTextEditor
                  label="Mô Tả Sản Phẩm"
                  value={form.descriptionHtml || ""}
                  onChange={(value) => {
                    setForm((prev) => ({
                      ...prev,
                      descriptionHtml: value,
                      description: value.replace(/<[^>]*>/g, ""),
                    }));
                  }}
                  placeholder="Nhập mô tả chi tiết sản phẩm..."
                  minHeight="200px"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-white/20 bg-transparent px-6 py-3 font-semibold text-white transition-all hover:bg-white/10 disabled:opacity-50"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-3 font-semibold text-white shadow-lg transition-all hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50"
            >
              {saving ? "Đang Lưu..." : "Lưu thay đổi"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export type { SavePayload } from "./types";
