import type { ComponentType, SVGProps } from "react";
import {
  ArchiveBoxIcon,
  ArrowPathIcon,
  BanknotesIcon,
  ChartBarIcon,
  CalculatorIcon,
  ClipboardDocumentIcon,
  CubeIcon,
  CurrencyDollarIcon,
  DocumentIcon,
  DocumentTextIcon,
  FolderIcon,
  InformationCircleIcon,
  KeyIcon,
  NewspaperIcon,
  PencilSquareIcon,
  PhotoIcon,
  ReceiptPercentIcon,
  ShieldCheckIcon,
  ShoppingBagIcon,
  TicketIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";

export type MenuItem = {
  name: string;
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
};

export type MenuTone =
  | "indigo"
  | "sky"
  | "emerald"
  | "rose"
  | "amber";

export type MenuSection = {
  id: string;
  title: string;
  description: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  items: MenuItem[];
  tone: MenuTone;
  defaultOpen?: boolean;
};

export const menuSections: MenuSection[] = [
  {
    id: "overview",
    title: "Tổng quan",
    description: "Theo dõi nhanh toàn bộ hoạt động quản trị.",
    icon: ChartBarIcon,
    tone: "indigo",
    defaultOpen: true,
    items: [
      { name: "Tổng quan", href: "/dashboard", icon: ChartBarIcon },
      { name: "Thuế", href: "/tax", icon: ReceiptPercentIcon },
      { name: "Chi phí", href: "/expenses", icon: CalculatorIcon },
    ],
  },
  {
    id: "sales",
    title: "Bán hàng",
    description: "Điều phối đơn hàng, giá bán và dòng tiền giao dịch.",
    icon: ShoppingBagIcon,
    tone: "indigo",
    defaultOpen: true,
    items: [
      { name: "Đơn hàng", href: "/orders", icon: ShoppingBagIcon },
      { name: "Bảng giá", href: "/pricing", icon: CurrencyDollarIcon },
    ],
  },
  {
    id: "catalog",
    title: "Danh mục sản phẩm",
    description: "Quản lý cấu trúc sản phẩm, form và key phân phối.",
    icon: CubeIcon,
    tone: "sky",
    defaultOpen: true,
    items: [
      { name: "Gói sản phẩm", href: "/package-products", icon: CubeIcon },
      {
        name: "Thông tin sản phẩm",
        href: "/product-info",
        icon: InformationCircleIcon,
      },
      {
        name: "Form thông tin",
        href: "/form-info",
        icon: ClipboardDocumentIcon,
      },
      { name: "Danh sách Key", href: "/active-keys", icon: KeyIcon },
    ],
  },
  {
    id: "sourcing",
    title: "Nguồn hàng",
    description: "Theo dõi nhà cung cấp, chứng từ và các lô nhập.",
    icon: DocumentTextIcon,
    tone: "emerald",
    items: [
      { name: "Nhà cung cấp", href: "/sources", icon: DocumentTextIcon },
      { name: "Báo giá", href: "/show-price", icon: DocumentIcon },
      { name: "Hóa đơn", href: "/bill-order", icon: DocumentIcon },
      { name: "Biên lai", href: "/invoices", icon: DocumentIcon },
      { name: "Lô hàng", href: "/warehouse", icon: ArchiveBoxIcon },
    ],
  },
  {
    id: "customers",
    title: "Khách hàng & CTV",
    description: "Chăm sóc khách hàng, khuyến mãi và số dư Mcoin.",
    icon: UserGroupIcon,
    tone: "rose",
    items: [
      {
        name: "Danh sách khách hàng",
        href: "/customer-list",
        icon: UserGroupIcon,
      },
      {
        name: "Danh sách mã khuyến mãi",
        href: "/promo-codes",
        icon: TicketIcon,
      },
      { name: "Add Mcoin", href: "/add-mcoin", icon: BanknotesIcon },
    ],
  },
  {
    id: "content",
    title: "Nội dung",
    description: "Quản lý bài viết, danh mục tin tức và banner trang chủ.",
    icon: NewspaperIcon,
    tone: "sky",
    items: [
      { name: "Viết bài", href: "/content/create", icon: PencilSquareIcon },
      { name: "Danh sách bài viết", href: "/content/articles", icon: NewspaperIcon },
      { name: "Danh mục bài viết", href: "/content/categories", icon: FolderIcon },
      { name: "Banner trang chủ", href: "/content/banners", icon: PhotoIcon },
    ],
  },
  {
    id: "renew",
    title: "Hệ thống Renew",
    description: "Quản trị Adobe admin và nhóm sản phẩm hệ thống.",
    icon: ArrowPathIcon,
    tone: "amber",
    items: [
      {
        name: "Danh sách Admin Adobe",
        href: "/renew-adobe-admin",
        icon: UserGroupIcon,
      },
      {
        name: "Sản phẩm hệ thống",
        href: "/product-system",
        icon: CubeIcon,
      },
      {
        name: "IP whitelist",
        href: "/ip-whitelist",
        icon: ShieldCheckIcon,
      },
    ],
  },
];
