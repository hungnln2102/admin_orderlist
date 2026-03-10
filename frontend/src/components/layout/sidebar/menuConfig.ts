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
      { name: "Add Mcoin", href: "/add-mcoin", icon: BanknotesIcon },
      { name: "Danh sách Key", href: "/active-keys", icon: KeyIcon },
      {
        name: "Danh sách sản phẩm",
        href: "/active-key-products",
        icon: CubeIcon,
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
      { name: "Danh sách Khách Hàng", href: "/customer-list", icon: UserGroupIcon },
      { name: "Danh sách mã khuyến mãi", href: "/promo-codes", icon: TicketIcon },
    ],
  },
  {
    title: "Hệ Thống Renew",
    items: [
      {
        name: "Danh Sách Admin Adobe",
        href: "/renew-adobe-admin",
        icon: UserGroupIcon,
      },
    ],
  },
];
