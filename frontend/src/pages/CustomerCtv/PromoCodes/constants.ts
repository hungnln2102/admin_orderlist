import type { PromoCodeItem, PromoUsageItem } from "./types";

/** Lịch sử sử dụng mã khuyến mãi (mock) */
export const MOCK_PROMO_USAGE: PromoUsageItem[] = [
  { id: "1", promoCode: "GIAM10", account: "nguyenvana", usedAt: "25/02/2025 14:30", orderCode: "DH001", discountAmount: "50.000₫" },
  { id: "2", promoCode: "TET2025", account: "tranthib", usedAt: "24/02/2025 10:15", orderCode: "DH002", discountAmount: "15%" },
  { id: "3", promoCode: "NEWUSER", account: "levanc", usedAt: "23/02/2025 09:00", orderCode: "DH003", discountAmount: "50.000₫" },
  { id: "4", promoCode: "VIP20", account: "hoangvane", usedAt: "22/02/2025 16:45", orderCode: "DH004", discountAmount: "20%" },
  { id: "5", promoCode: "GIAM10", account: "phamthid", usedAt: "21/02/2025 11:20", orderCode: "DH005", discountAmount: "45.000₫" },
];

export const MOCK_PROMO_CODES: PromoCodeItem[] = [
  {
    id: "1",
    code: "GIAM10",
    discount: "10%",
    max: "500.000đ",
    condition: "Đơn từ 500.000đ",
    status: "active",
  },
  {
    id: "2",
    code: "TET2025",
    discount: "15%",
    max: "1.000.000đ",
    condition: "Áp dụng toàn sàn",
    status: "active",
  },
  {
    id: "3",
    code: "NEWUSER",
    discount: "50.000đ",
    max: "50.000đ",
    condition: "Khách hàng mới",
    status: "active",
  },
  {
    id: "4",
    code: "BLACKFRIDAY",
    discount: "20%",
    max: "2.000.000đ",
    condition: "Đơn từ 2.000.000đ",
    status: "inactive",
  },
  {
    id: "5",
    code: "SUMMER24",
    discount: "12%",
    max: "800.000đ",
    condition: "Hết hạn 31/08/2024",
    status: "expired",
  },
  {
    id: "6",
    code: "VIP20",
    discount: "20%",
    max: "Không giới hạn",
    condition: "Khách VIP",
    status: "active",
  },
];
