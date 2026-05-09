import { ORDER_CODE_PREFIXES } from "../../../constants";
import type { CustomerType } from "./types";

/** Copy khớp `docs/PAGES_DON_HANG.md` — gợi ý nghiệp vụ trên khối giá khi tạo đơn */
export function getCreateOrderPricingCopy(
  customerType: CustomerType,
  isMavrykSupply: boolean
): {
  costLabel: string;
  priceLabel: string;
  costFieldTitle?: string;
  priceFieldTitle?: string;
} {
  if (isMavrykSupply) {
    return {
      costLabel: "Giá nhập",
      priceLabel: "Giá bán",
      costFieldTitle: "NCC Mavryk/Shop — luôn 0",
      priceFieldTitle: "Giá bán theo tier hiện hành",
    };
  }

  const P = ORDER_CODE_PREFIXES;

  switch (customerType) {
    case P.GIFT:
      return {
        costLabel: "Giá nhập",
        priceLabel: "Giá bán",
        priceFieldTitle: "Đơn quà tặng — giá bán lưu 0",
      };
    case P.IMPORT:
      return {
        costLabel: "Giá nhập",
        priceLabel: "Giá bán",
      };
    case P.PROMO:
      return {
        costLabel: "Giá nhập",
        priceLabel: "Giá bán",
      };
    case P.STUDENT:
      return {
        costLabel: "Giá nhập",
        priceLabel: "Giá bán",
      };
    case P.CUSTOMER:
      return {
        costLabel: "Giá nhập",
        priceLabel: "Giá bán",
      };
    case P.COLLABORATOR:
    default:
      return {
        costLabel: "Giá nhập",
        priceLabel: "Giá bán",
      };
  }
}
