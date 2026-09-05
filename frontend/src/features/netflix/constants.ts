import { FilmIcon, ClipboardDocumentIcon, DevicePhoneMobileIcon, CommandLineIcon, KeyIcon } from "@heroicons/react/24/outline";

export type TabResultType = "link" | "code" | "text";

export interface TabConfig {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  color: string;
  activeColor: string;
  /** Endpoint backend xử lý, relative path, e.g. "/api/netflix/public/household" */
  apiEndpoint: string;
  /** Label hiển thị cho input email trên Website */
  inputLabel: string;
  /** Placeholder cho input email trên Website */
  inputPlaceholder: string;
  /** Text trên nút submit trên Website */
  submitLabel: string;
  /** Loại kết quả trả về: "link" | "code" | "text" */
  resultType: TabResultType;
  /** Có hiển thị trên Website (trang khách) không */
  visibleOnWebsite: boolean;
}

export const NETFLIX_TABS: TabConfig[] = [
  {
    id: "household",
    label: "Xác minh Hộ gia đình",
    description: "Lấy link xác minh Household Netflix",
    icon: FilmIcon,
    color: "text-rose-300",
    activeColor: "bg-rose-500/20 border-rose-400/50 text-rose-200",
    apiEndpoint: "/api/netflix/public/household",
    inputLabel: "Email Netflix",
    inputPlaceholder: "example@email.com",
    submitLabel: "Lấy link xác minh",
    resultType: "link",
    visibleOnWebsite: true,
  },
  {
    id: "otp",
    label: "Mã OTP đăng nhập",
    description: "Lấy mã OTP 4–8 số từ email Netflix",
    icon: ClipboardDocumentIcon,
    color: "text-amber-300",
    activeColor: "bg-amber-500/20 border-amber-400/50 text-amber-200",
    apiEndpoint: "/api/netflix/public/send-otp",
    inputLabel: "Email Netflix",
    inputPlaceholder: "example@email.com",
    submitLabel: "Lấy mã OTP",
    resultType: "code",
    visibleOnWebsite: true,
  },
  {
    id: "six-digit",
    label: "Mã 6 số đăng nhập",
    description: "Lấy mã xác minh 6 số (TV login)",
    icon: DevicePhoneMobileIcon,
    color: "text-emerald-300",
    activeColor: "bg-emerald-500/20 border-emerald-400/50 text-emerald-200",
    apiEndpoint: "/api/netflix/public/six-digit-login",
    inputLabel: "Email Netflix",
    inputPlaceholder: "example@email.com",
    submitLabel: "Lấy mã 6 số",
    resultType: "code",
    visibleOnWebsite: true,
  },
  {
    id: "sub-access",
    label: "Mã phụ (Sub-Code)",
    description: "Quản lý Sub-Access Codes VIVA",
    icon: KeyIcon,
    color: "text-purple-300",
    activeColor: "bg-purple-500/20 border-purple-400/50 text-purple-200",
    apiEndpoint: "/api/netflix/public/customer-panel/list",
    inputLabel: "",
    inputPlaceholder: "",
    submitLabel: "",
    resultType: "text",
    visibleOnWebsite: false,
  },
  {
    id: "outlook-fix",
    label: "Fix lỗi OTP Netflix",
    description: "Sửa lỗi quy tắc chuyển tiếp thư Outlook",
    icon: CommandLineIcon,
    color: "text-blue-300",
    activeColor: "bg-blue-500/20 border-blue-400/50 text-blue-200",
    apiEndpoint: "",
    inputLabel: "Địa chỉ Email Outlook chính (Primary Email)",
    inputPlaceholder: "example@outlook.com",
    submitLabel: "Bắt đầu sửa lỗi",
    resultType: "text",
    visibleOnWebsite: false,
  },
];
