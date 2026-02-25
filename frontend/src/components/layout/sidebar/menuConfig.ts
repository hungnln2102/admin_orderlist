import type { ComponentType, SVGProps } from "react";
import {
  ChartBarIcon,
  ShoppingBagIcon,
  CubeIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  DocumentIcon,
  InformationCircleIcon,
  ArchiveBoxIcon,
  UserGroupIcon,
  TicketIcon,
  ClipboardDocumentListIcon,
  BanknotesIcon,
  KeyIcon,
  ClipboardDocumentIcon,
} from "@heroicons/react/24/outline";

export type MenuItem = {
  name: string;
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
};

export type MenuSection = {
  title: string;
  items: MenuItem[];
};

export const menuSections: MenuSection[] = [
  {
    title: "Tổng Quan",
    items: [{ name: "Tổng Quan", href: "/dashboard", icon: ChartBarIcon }],
  },
  {
    title: "Sản Phẩm",
    items: [
      { name: "Đơn Hàng", href: "/orders", icon: ShoppingBagIcon },
      { name: "Gói Sản Phẩm", href: "/package-products", icon: CubeIcon },
      { name: "Bảng Giá", href: "/pricing", icon: CurrencyDollarIcon },
      {
        name: "Thông Tin Sản Phẩm",
        href: "/product-info",
        icon: InformationCircleIcon,
      },
      {
        name: "Form thông tin",
        href: "/form-info",
        icon: ClipboardDocumentIcon,
      },
    ],
  },
  {
    title: "Cung Cấp",
    items: [
      { name: "Nhà Cung Cấp", href: "/sources", icon: DocumentTextIcon },
      { name: "Báo Giá", href: "/show-price", icon: DocumentIcon },
      { name: "Hóa Đơn", href: "/bill-order", icon: DocumentIcon },
      { name: "Biên Lai", href: "/invoices", icon: DocumentIcon },
      { name: "Lô Hàng", href: "/warehouse", icon: ArchiveBoxIcon },
    ],
  },
  {
    title: "Khách hàng & CTV",
    items: [
      { name: "Danh sách CTV", href: "/ctv", icon: UserGroupIcon },
      { name: "Danh sách mã khuyến mãi", href: "/promo-codes", icon: TicketIcon },
      {
        name: "Trạng thái khách hàng",
        href: "/customer-status",
        icon: ClipboardDocumentListIcon,
      },
      { name: "Add Mcoin", href: "/add-mcoin", icon: BanknotesIcon },
      { name: "Quản lí Key active", href: "/active-keys", icon: KeyIcon },
    ],
  },
];
