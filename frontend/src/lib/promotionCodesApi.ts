import { apiFetch } from "./api";

export interface PromotionCodeDto {
  id: number;
  code: string | null;
  discountPercent: number | null;
  maxDiscountAmount: number | null;
  minOrderAmount: number | null;
  description: string | null;
  status: string | null;
  isPublic: boolean | null;
  usageLimit: number | null;
  usedCount: number | null;
  startAt: string | null;
  endAt: string | null;
  createdAt: string | null;
}

interface PromotionCodesResponse {
  items?: PromotionCodeDto[];
}

function formatVnd(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("vi-VN", {
    style: "decimal",
    maximumFractionDigits: 0,
  }).format(value) + "₫";
}

/** Map status từ DB sang active | inactive | expired */
function mapStatus(status: string | null | undefined): "active" | "inactive" | "expired" {
  const s = (status || "").toLowerCase();
  if (s === "active" || s === "applying") return "active";
  if (s === "expired" || s === "het_han") return "expired";
  return "inactive";
}

export async function fetchPromotionCodes(): Promise<PromotionCodeDto[]> {
  const res = await apiFetch("/api/promotion-codes");
  if (!res.ok) {
    throw new Error("Không thể tải danh sách mã khuyến mãi");
  }
  const data: PromotionCodesResponse = await res.json().catch(() => ({}));
  if (!data || !Array.isArray(data.items)) {
    return [];
  }
  return data.items;
}

/** Chuyển DTO từ API sang format dùng ở trang (PromoCodeItem) */
export function mapPromotionCodeToItem(dto: PromotionCodeDto): {
  id: string;
  code: string;
  discount: string;
  max: string;
  condition: string;
  status: "active" | "inactive" | "expired";
} {
  const discount =
    dto.discountPercent != null && Number.isFinite(dto.discountPercent)
      ? `${Number(dto.discountPercent)}%`
      : dto.description || "—";
  const max =
    dto.maxDiscountAmount != null && Number.isFinite(dto.maxDiscountAmount)
      ? formatVnd(dto.maxDiscountAmount)
      : "Không giới hạn";
  const condition =
    dto.minOrderAmount != null && Number.isFinite(dto.minOrderAmount)
      ? `Đơn từ ${formatVnd(dto.minOrderAmount)}`
      : (dto.description || "—");
  return {
    id: String(dto.id),
    code: dto.code ?? "",
    discount,
    max,
    condition,
    status: mapStatus(dto.status),
  };
}
