import { ORDER_CODE_PREFIXES } from "../../../constants";
import type { CustomerType } from "./types";

/** Copy khớp `docs/PAGES_DON_HANG.md` — gợi ý nghiệp vụ trên khối giá khi tạo đơn */
export function getCreateOrderPricingCopy(
  customerType: CustomerType,
  isMavrykSupply: boolean
): {
  panelSubtitle: string;
  costLabel: string;
  priceLabel: string;
  costFieldTitle?: string;
  priceFieldTitle?: string;
} {
  if (isMavrykSupply) {
    return {
      panelSubtitle:
        "NCC Mavryk/Shop: không dùng giá nhập (cost = 0). Giá bán = lợi nhuận ghi nhận.",
      costLabel: "Giá nhập",
      priceLabel: "Giá bán (lợi nhuận)",
      costFieldTitle: "NCC cửa hàng — luôn 0, không trừ vào lợi nhuận",
      priceFieldTitle: "Doanh thu/lợi nhuận — không trừ giá nhập",
    };
  }

  const P = ORDER_CODE_PREFIXES;

  switch (customerType) {
    case P.GIFT:
      return {
        panelSubtitle:
          "MAVT: không có giá bán cho khách (0). Hết hạn chỉ báo hết hạn, không nhắc gia hạn.",
        costLabel: "Giá nhập",
        priceLabel: "Giá bán",
        priceFieldTitle: "Đơn quà tặng — giá bán lưu 0",
      };
    case P.IMPORT:
      return {
        panelSubtitle: "MAVN: giá bán = giá nhập (nhập hàng).",
        costLabel: "Giá nhập",
        priceLabel: "Giá bán",
      };
    case P.PROMO:
      return {
        panelSubtitle:
          "MAVK: MAVL × (1 − pct_promo). Không có pct_promo → tính theo giá khách lẻ.",
        costLabel: "Giá nhập",
        priceLabel: "Giá bán",
      };
    case P.STUDENT:
      return {
        panelSubtitle:
          "MAVS: từ giá CTV; thiếu pct sinh viên thì tương đương giá lẻ (pct khách).",
        costLabel: "Giá nhập",
        priceLabel: "Giá bán",
      };
    case P.CUSTOMER:
      return {
        panelSubtitle: "MAVL: giá từ giá CTV và tỷ lệ khách lẻ.",
        costLabel: "Giá nhập",
        priceLabel: "Giá bán",
      };
    case P.COLLABORATOR:
    default:
      return {
        panelSubtitle: "MAVC: giá bán suy ra từ giá nhập và tỷ lệ CTV.",
        costLabel: "Giá nhập",
        priceLabel: "Giá bán",
      };
  }
}
