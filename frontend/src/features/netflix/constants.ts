import { FilmIcon, ClipboardDocumentIcon, DevicePhoneMobileIcon } from "@heroicons/react/24/outline";
import type { ActiveTab } from "../hooks/useNetflixAdmin";

interface TabConfig {
  id: ActiveTab;
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
];
