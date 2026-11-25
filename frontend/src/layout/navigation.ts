import {
  LayoutDashboard,
  BarChart3,
  DollarSign,
  Receipt,
  ShoppingCart,
  CreditCard,
  Package,
  Tag,
  Building2,
  PackagePlus,
  Warehouse,
  ShieldCheck,
  Sliders,
  Settings,
  Sparkles,
  KeyRound,
  Link2,
} from "lucide-react";

export type NavGroupAccent = "cyan" | "emerald" | "amber" | "purple" | "sky" | "indigo";

export interface MenuItem {
  name: string;
  path: string;
  icon: any;
  badge?: string;
}

export interface MenuGroup {
  groupName: string;
  shortLabel: string;
  accent: NavGroupAccent;
  items: MenuItem[];
}

export const NAVIGATION_GROUPS: MenuGroup[] = [
  {
    groupName: "Tổng quan & Báo cáo",
    shortLabel: "Báo cáo",
    accent: "cyan",
    items: [
      { name: "Tổng quan", path: "/dashboard", icon: LayoutDashboard },
      { name: "Tài Chính", path: "/finance", icon: DollarSign },
      { name: "Traffic & Analytics", path: "/traffic", icon: BarChart3 },
    ],
  },
  {
    groupName: "Bán hàng & Đơn hàng",
    shortLabel: "Đơn hàng",
    accent: "emerald",
    items: [
      { name: "Danh sách Đơn hàng", path: "/orders", icon: ShoppingCart },
      { name: "Nhật ký Credit", path: "/credit", icon: CreditCard },
      { name: "Biên lai Thanh toán", path: "/invoices", icon: Receipt },
    ],
  },
  {
    groupName: "Danh mục Sản phẩm & Giá",
    shortLabel: "Sản phẩm",
    accent: "amber",
    items: [
      { name: "Gói sản phẩm", path: "/package-products", icon: Package },
      { name: "Bảng giá Niêm yết", path: "/pricing", icon: Tag },
      { name: "Quản lý Mã Kích Hoạt", path: "/activation-keys", icon: KeyRound },
    ],
  },
  {
    groupName: "Nguồn hàng & Kho",
    shortLabel: "Kho",
    accent: "purple",
    items: [
      { name: "Nhà cung cấp", path: "/sources", icon: Building2 },
      { name: "Chi phí & Nhập ngoài luồng", path: "/external-imports", icon: PackagePlus },
      { name: "Kho Hàng", path: "/warehouse", icon: Warehouse },
    ],
  },
  {
    groupName: "Quản lý Website",
    shortLabel: "Website",
    accent: "sky",
    items: [
      { name: "Quản lý URL", path: "/website-urls", icon: Link2 },
      { name: "Cấu hình Theme OTP", path: "/otp-theme-config", icon: Sparkles },
    ],
  },
  {
    groupName: "Hệ thống & Ví",
    shortLabel: "Hệ thống",
    accent: "indigo",
    items: [
      { name: "Cấu hình Hệ thống", path: "/system-config", icon: Settings },
      { name: "Nhật ký Hoạt động", path: "/system-logs", icon: ShieldCheck },
      { name: "Cấu hình API bên thứ 3", path: "/external-api-config", icon: Sliders },
    ],
  },
];
