export type PromoStatus = "active" | "inactive" | "expired";

export interface PromoCodeItem {
  id: string;
  code: string;           // Mã khuyến mãi
  discount: string;       // Chiết khấu (e.g. "10%", "50.000đ")
  max: string;            // Tối đa (e.g. "500.000đ", "100 lần")
  condition: string;       // Điều kiện
  status: PromoStatus;
}

export const PROMO_STATUS_LABELS: Record<PromoStatus, string> = {
  active: "Đang áp dụng",
  inactive: "Tạm dừng",
  expired: "Hết hạn",
};

export const PROMO_STATUS_OPTIONS: { value: PromoStatus | "all"; label: string }[] = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "active", label: "Đang áp dụng" },
  { value: "inactive", label: "Tạm dừng" },
  { value: "expired", label: "Hết hạn" },
];

/** Một lần sử dụng mã khuyến mãi (cho tab Lịch sử) */
export interface PromoUsageItem {
  id: string;
  promoCode: string;
  account: string;
  usedAt: string; // ISO date or display string
  orderCode?: string;
  discountAmount: string; // e.g. "50.000₫", "10%"
}
