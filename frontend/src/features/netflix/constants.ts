import { FilmIcon, ClipboardDocumentIcon, DevicePhoneMobileIcon, CommandLineIcon, KeyIcon } from "@heroicons/react/24/outline";

interface TabConfig {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  color: string;
  activeColor: string;
}

export const NETFLIX_TABS: TabConfig[] = [
  {
    id: "household",
    label: "Xác minh Hộ gia đình",
    description: "Lấy link xác minh Household Netflix",
    icon: FilmIcon,
    color: "text-rose-300",
    activeColor: "bg-rose-500/20 border-rose-400/50 text-rose-200",
  },
  {
    id: "otp",
    label: "Mã OTP đăng nhập",
    description: "Lấy mã OTP 4–8 số từ email Netflix",
    icon: ClipboardDocumentIcon,
    color: "text-amber-300",
    activeColor: "bg-amber-500/20 border-amber-400/50 text-amber-200",
  },
  {
    id: "six-digit",
    label: "Mã 6 số đăng nhập",
    description: "Lấy mã xác minh 6 số (TV login)",
    icon: DevicePhoneMobileIcon,
    color: "text-emerald-300",
    activeColor: "bg-emerald-500/20 border-emerald-400/50 text-emerald-200",
  },
  {
    id: "sub-access",
    label: "Mã phụ (Sub-Code)",
    description: "Quản lý Sub-Access Codes VIVA",
    icon: KeyIcon,
    color: "text-purple-300",
    activeColor: "bg-purple-500/20 border-purple-400/50 text-purple-200",
  },
  {
    id: "outlook-fix",
    label: "Sửa lỗi Outlook",
    description: "Sửa lỗi quy tắc chuyển tiếp thư Outlook",
    icon: CommandLineIcon,
    color: "text-blue-300",
    activeColor: "bg-blue-500/20 border-blue-400/50 text-blue-200",
  },
];
