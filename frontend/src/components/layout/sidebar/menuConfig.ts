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
];
