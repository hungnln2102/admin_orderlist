import GradientButton from "@/components/ui/GradientButton";

type CreateProductActionsProps = {
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: () => void;
};

export function CreateProductActions({
  isSubmitting,
  onClose,
  onSubmit,
}: CreateProductActionsProps) {
  return (
    <div className="flex items-center justify-end gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
      <button
        type="button"
        onClick={onClose}
        disabled={isSubmitting}
        className="rounded-xl border border-white/20 bg-transparent px-6 py-3 font-semibold text-white transition-all hover:bg-white/10 disabled:opacity-50"
      >
        Hủy bỏ
      </button>
      <GradientButton
        onClick={onSubmit}
        disabled={isSubmitting}
        className="px-6 py-3"
      >
        {isSubmitting ? "Đang Lưu..." : "Thêm Sản Phẩm"}
      </GradientButton>
    </div>
  );
}
