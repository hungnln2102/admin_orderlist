import {
  LayoutDashboard,
  BarChart3,
  DollarSign,
  Receipt,
  ShoppingCart,
  CreditCard,
  Package,
  Layers,
  FileText,
  Tag,
  Key,
  Building2,
  PackagePlus,
  Warehouse,
  Landmark,
  Shield,
  ShieldCheck,
  Sliders,
  Tv,
  Newspaper,
  PenTool,
  FolderKanban,
  Image,
  Settings
} from "lucide-react";

export interface MenuItem {
  name: string;
  path: string;
  icon: any;
  badge?: string;
}

export interface MenuGroup {
  groupName: string;
  items: MenuItem[];
}

export const NAVIGATION_GROUPS: MenuGroup[] = [
  {
    groupName: "Tổng quan & Báo cáo",
    items: [
      { name: "Tổng quan", path: "/dashboard", icon: LayoutDashboard },
      { name: "Tài Chính", path: "/finance", icon: DollarSign },
      { name: "Traffic & Analytics", path: "/traffic", icon: BarChart3 },
    ],
  },
  {
    groupName: "Bán hàng & Đơn hàng",
    items: [
      { name: "Danh sách Đơn hàng", path: "/orders", icon: ShoppingCart },
      { name: "Nhật ký Credit", path: "/credit", icon: CreditCard },
      { name: "Biên lai Thanh toán", path: "/invoices", icon: Receipt },
    ],
  },
  {
    groupName: "Danh mục Sản phẩm & Giá",
    items: [
      { name: "Gói sản phẩm", path: "/package-products", icon: Package },
      { name: "Bảng giá Niêm yết", path: "/pricing", icon: Tag },
    ],
  },
  {
    groupName: "Nguồn hàng & Kho",
    items: [
      { name: "Nhà cung cấp", path: "/sources", icon: Building2 },
      { name: "Nhập ngoài luồng", path: "/external-imports", icon: PackagePlus },
      { name: "Kho Hàng", path: "/warehouse", icon: Warehouse },
    ],
  },
  {
    groupName: "Hệ thống & Ví",
    items: [
      { name: "Cấu hình Hệ thống", path: "/system-config", icon: Settings },
      { name: "Nhật ký Hoạt động", path: "/system-logs", icon: ShieldCheck },
      { name: "Tài khoản Shop Bank", path: "/shop-bank-accounts", icon: Landmark },
      { name: "Cấu hình API bên thứ 3", path: "/external-api-config", icon: Sliders },
      { name: "Quản trị Netflix", path: "/netflix", icon: Tv },
    ],
  },
  {
    groupName: "Nội dung & Truyền thông",
    items: [
      { name: "Danh sách Bài viết", path: "/content/articles", icon: Newspaper },
      { name: "Tạo / Sửa Bài viết", path: "/content/create", icon: PenTool },
      { name: "Danh mục Bài viết", path: "/content/categories", icon: FolderKanban },
      { name: "Banners Quảng cáo", path: "/content/banners", icon: Image },
    ],
  },
  {
    groupName: "Hệ thống Website",
    items: [
      { name: "Thông tin Sản phẩm", path: "/product-info", icon: Layers },
      { name: "Cấu hình Form Đơn", path: "/form-info", icon: FileText },
      { name: "Active Keys", path: "/active-keys", icon: Key },
      { name: "IP Whitelist", path: "/ip-whitelist", icon: Shield },
    ],
  },
];
