import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Calendar as CalendarIcon,
  Lock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Save,
  Eye,
  Check,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  LayoutGrid,
} from "lucide-react";
import {
  generateMonthCalendar,
  CalendarCell,
} from "../shared/utils/lunarCalendar";

type SeasonFilter = "all" | "spring" | "summer" | "autumn" | "winter" | "modern";
type ViewTab = "calendar" | "presets";

interface ThemeItem {
  id: string;
  season: SeasonFilter;
  name: string;
  icon: string;
  badge: string;
  title: string;
  subtitle: string;
  accent: string;
}

const THEMES_LIST: ThemeItem[] = [
  // Xuân
  { id: "tet-duong-lich", season: "spring", name: "Tết Dương Lịch", icon: "🎆", badge: "1 Tháng 1", title: "Chào năm mới", subtitle: "Một khởi đầu, ngàn điều rực rỡ.", accent: "#edc882" },
  { id: "ong-tao", season: "spring", name: "Ông Công Ông Táo", icon: "🐟", badge: "23 Tháng Chạp Âm", title: "Cá chép hóa rồng", subtitle: "Tiễn năm cũ, đón điều lành.", accent: "#f0bd72" },
  { id: "tet", season: "spring", name: "Tết Nguyên Đán", icon: "🧧", badge: "Tết Cổ Truyền", title: "Xuân khởi sắc", subtitle: "Mai đào nở, bình an gõ cửa.", accent: "#ffcf78" },
  { id: "valentine", season: "spring", name: "Lễ Valentine", icon: "💘", badge: "14 Tháng 2", title: "Gửi ngàn yêu thương", subtitle: "Một lời thương, một kết nối gần.", accent: "#ffb1c4" },
  { id: "nguyen-tieu", season: "spring", name: "Tết Nguyên Tiêu", icon: "🏮", badge: "Rằm Tháng Giêng", title: "Trăng đầu năm", subtitle: "Ánh trăng soi những ước nguyện an lành.", accent: "#f3d28c" },
  { id: "quoc-te-phu-nu", season: "spring", name: "Quốc Tế Phụ Nữ 8/3", icon: "🌸", badge: "8 Tháng 3", title: "Quốc Tế Phụ Nữ", subtitle: "Rạng rỡ theo cách của riêng bạn.", accent: "#eab7ee" },
  { id: "han-thuc", season: "spring", name: "Tết Hàn Thực", icon: "🥣", badge: "Mùng 3 Tháng 3 Âm", title: "Hương vị cội nguồn", subtitle: "Một chút ngọt lành, vẹn nguyên ký ức.", accent: "#b5e3d0" },
  { id: "gio-to", season: "spring", name: "Giỗ Tổ Hùng Vương", icon: "🏛️", badge: "10 Tháng 3 Âm", title: "Về miền đất Tổ", subtitle: "Ngàn năm nguồn cội, một lòng hướng về.", accent: "#d9ba77" },
  // Hạ
  { id: "thong-nhat", season: "summer", name: "Giải Phóng 30/4", icon: "🇻🇳", badge: "30 Tháng 4", title: "Non sông liền một dải", subtitle: "Hòa bình nở trên những mùa hoa.", accent: "#ffd486" },
  { id: "lao-dong", season: "summer", name: "Quốc Tế Lao Động 1/5", icon: "☭", badge: "1 Tháng 5", title: "Vinh quang lao động", subtitle: "Từ đôi bàn tay, dựng xây ngày mới.", accent: "#f6cf78" },
  { id: "phat-dan", season: "summer", name: "Đại Lễ Phật Đản", icon: "🪷", badge: "Rằm Tháng 4 Âm", title: "Sen nở an lành", subtitle: "Một đóa sen, một niềm an.", accent: "#f4c5d6" },
  { id: "thieu-nhi", season: "summer", name: "Quốc Tế Thiếu Nhi", icon: "🎈", badge: "1 Tháng 6", title: "Thế giới tuổi thơ", subtitle: "Giữ mãi những ngày trong veo.", accent: "#ffdc9c" },
  { id: "doan-ngo", season: "summer", name: "Tết Đoan Ngọ", icon: "🌿", badge: "5 Tháng 5 Âm", title: "Hương lành Đoan Ngọ", subtitle: "Nếp thơm, trái ngọt, mùa hè an vui.", accent: "#d8e6a0" },
  { id: "gia-dinh", season: "summer", name: "Ngày Gia Đình VN", icon: "🏡", badge: "28 Tháng 6", title: "Nơi yêu thương trở về", subtitle: "Có nhau là đủ đầy.", accent: "#f5c894" },
  // Thu
  { id: "that-tich", season: "autumn", name: "Lễ Thất Tịch", icon: "🌌", badge: "7 Tháng 7 Âm", title: "Hẹn dưới Ngân Hà", subtitle: "Dẫu xa ngàn sao, vẫn tìm thấy nhau.", accent: "#c9b4ff" },
  { id: "vu-lan", season: "autumn", name: "Vu Lan Báo Hiếu", icon: "🕯️", badge: "Rằm Tháng 7 Âm", title: "Một đời biết ơn", subtitle: "Bông hồng nhỏ, tình yêu lớn.", accent: "#efc5ab" },
  { id: "quoc-khanh", season: "autumn", name: "Quốc Khánh 2/9", icon: "⭐️", badge: "2 Tháng 9", title: "Rạng ngời Việt Nam", subtitle: "Một niềm tự hào, triệu trái tim.", accent: "#ffd28b" },
  { id: "trung-thu", season: "autumn", name: "Tết Trung Thu", icon: "🥮", badge: "Rằm Tháng 8 Âm", title: "Đêm hội trăng rằm", subtitle: "Trăng tròn sum vầy, hội ngộ bình an.", accent: "#f1d08e" },
  { id: "phu-nu-vn", season: "autumn", name: "Phụ Nữ VN 20/10", icon: "💐", badge: "20 Tháng 10", title: "Nét đẹp Việt Nam", subtitle: "Dịu dàng mà rực rỡ.", accent: "#edb9d0" },
  // Đông
  { id: "halloween", season: "winter", name: "Đêm Halloween", icon: "🎃", badge: "31 Tháng 10", title: "Phép màu đêm bí ngô", subtitle: "Một chút kỳ bí, thật nhiều niềm vui.", accent: "#f1b877" },
  { id: "nha-giao", season: "winter", name: "Nhà Giáo VN 20/11", icon: "🎓", badge: "20 Tháng 11", title: "Người thắp những ước mơ", subtitle: "Từ trang sách nhỏ, đến chân trời xa.", accent: "#c4d8ef" },
  { id: "qdnd-vn", season: "winter", name: "Quân Đội 22/12", icon: "🎖️", badge: "22 Tháng 12", title: "Vững bước dưới quân kỳ", subtitle: "Bình yên hôm nay, niềm tin ngày mai.", accent: "#d8cc8e" },
  { id: "giang-sinh", season: "winter", name: "Giáng Sinh Noel", icon: "🎄", badge: "24 Tháng 12", title: "Mùa an lành", subtitle: "Để yêu thương sưởi ấm mùa đông.", accent: "#efcf91" },
  // Core
  { id: "modern", season: "modern", name: "Cyber Core", icon: "⚡", badge: "Mavryk Standard", title: "Kết nối trong an tâm", subtitle: "Bảo vệ từng kết nối của bạn.", accent: "#00f0ff" },
  // 4 Mùa Anime Cinematic
  { id: "season-spring", season: "spring", name: "Mùa Xuân Anime", icon: "🌸", badge: "Xuân Khởi Sắc", title: "Xuân khởi sắc", subtitle: "Bình minh dịu, cánh hoa anh đào và thung lũng anime.", accent: "#f4a8c0" },
  { id: "season-summer", season: "summer", name: "Mùa Hạ Anime", icon: "☀️", badge: "Hạ Rực Rỡ", title: "Hạ rực rỡ", subtitle: "Nắng xanh, đồng lúa bao la và đom đóm lấp lánh.", accent: "#7fd7d2" },
  { id: "season-autumn", season: "autumn", name: "Mùa Thu Anime", icon: "🍁", badge: "Thu Đoàn Viên", title: "Thu đoàn viên", subtitle: "Phố cổ, nắng mật ong và sắc lá phong chao lượn.", accent: "#e9aa68" },
  { id: "season-winter", season: "winter", name: "Mùa Đông Anime", icon: "❄️", badge: "Đông Ấm Áp", title: "Đông ấm áp", subtitle: "Làng núi, tuyết trắng tinh khôi và những ô cửa ấm.", accent: "#9fd5ef" },
];

export const OtpThemeConfigPage: React.FC = () => {
  const [themesList, setThemesList] = useState<ThemeItem[]>(THEMES_LIST);
  const [mode, setMode] = useState<"auto" | "fixed">("auto");
  const [selectedTheme, setSelectedTheme] = useState<string>("modern");
  const [activeSeason, setActiveSeason] = useState<SeasonFilter>("all");
  const [activeTab, setActiveTab] = useState<ViewTab>("calendar");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Tự động đồng bộ toàn bộ Themes mới nhất từ Backend SSOT Catalog (/api/public/themes)
  useEffect(() => {
    fetch("/api/public/themes")
      .then((res) => res.json())
      .then((data) => {
        if (data?.themes && Array.isArray(data.themes) && data.themes.length > 0) {
          setThemesList(data.themes);
        }
      })
      .catch((err) => console.log("Sử dụng fallback danh mục theme nội bộ:", err));
  }, []);

  // Trạng thái tháng/năm cho Lịch Âm Dương
  const now = new Date();
  const [calYear, setCalYear] = useState<number>(now.getFullYear());
  const [calMonth, setCalMonth] = useState<number>(now.getMonth() + 1);
  const [selectedDayCell, setSelectedDayCell] = useState<CalendarCell | null>(null);

  // Fetch current config from system_configs
  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/system/configs");
      if (res.ok) {
        const configs: any[] = await res.json();
        const themeConfig = configs.find((c) => c.config_key === "OTP_PORTAL_THEME");
        if (themeConfig?.config_value) {
          const parsed = typeof themeConfig.config_value === "string"
            ? JSON.parse(themeConfig.config_value)
            : themeConfig.config_value;
          if (parsed.mode) setMode(parsed.mode);
          if (parsed.theme) setSelectedTheme(parsed.theme);
        }
      }
    } catch (err: any) {
      console.error("Lỗi tải cấu hình theme:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      const payloadValue = JSON.stringify({
        mode,
        theme: mode === "fixed" ? selectedTheme : null,
      });

      const res = await fetch("/api/system/configs/OTP_PORTAL_THEME", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: payloadValue }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Không thể lưu cấu hình");
      }

      setToast({ type: "success", message: "Đã cập nhật cấu hình giao diện OTP Portal thành công!" });
      setTimeout(() => setToast(null), 3000);
    } catch (err: any) {
      setToast({ type: "error", message: err.message || "Lỗi lưu cấu hình" });
      setTimeout(() => setToast(null), 3500);
    } finally {
      setSaving(false);
    }
  };

  // Điều hướng lịch
  const handlePrevMonth = () => {
    if (calMonth === 1) {
      setCalMonth(12);
      setCalYear((y) => y - 1);
    } else {
      setCalMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (calMonth === 12) {
      setCalMonth(1);
      setCalYear((y) => y + 1);
    } else {
      setCalMonth((m) => m + 1);
    }
  };

  const handleGoToday = () => {
    const today = new Date();
    setCalYear(today.getFullYear());
    setCalMonth(today.getMonth() + 1);
    const cells = generateMonthCalendar(today.getFullYear(), today.getMonth() + 1);
    const todayCell = cells.find((c) => c.isToday) || null;
    setSelectedDayCell(todayCell);
  };

  // Danh sách cells cho tháng
  const monthCells = generateMonthCalendar(calYear, calMonth);

  // Tự động gán cell hôm nay khi mới mở
  useEffect(() => {
    if (!selectedDayCell) {
      const todayCell = monthCells.find((c) => c.isToday) || monthCells[0];
      setSelectedDayCell(todayCell);
    }
  }, [calYear, calMonth]);

  const filteredThemes = activeSeason === "all"
    ? themesList
    : themesList.filter((t) => t.season === activeSeason);

  const activeThemeMeta = themesList.find((t) => t.id === selectedTheme) || themesList[0] || THEMES_LIST[0];

  // Lấy thông tin theme của ngày đang click trên lịch
  const activeCellTheme = selectedDayCell?.holidayTheme
    ? themesList.find((t) => t.id === selectedDayCell.holidayTheme?.themeKey) || null
    : null;

  return (
    <div className="h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)] flex flex-col p-4 space-y-3 text-slate-100 overflow-hidden">
      {/* 1. Header Bar (Siêu nhỏ gọn, cao ~40px) */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-cyan-900/30">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
              Cấu Hình Theme OTP
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/60 uppercase">
                v2.0
              </span>
            </h1>
            <span className="hidden md:inline text-[11px] text-slate-400">
              • Quản trị giao diện ngày lễ & cỗ máy đổi theme cho otp.mavrykpremium.com
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchConfig}
            disabled={loading}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700/60 transition-all flex items-center gap-1 shadow-sm"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin text-cyan-400" : ""}`} />
            <span className="hidden sm:inline">Tải Lại</span>
          </button>

          <a
            href="http://localhost:3005"
            target="_blank"
            rel="noreferrer"
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 transition-all flex items-center gap-1 shadow-sm"
          >
            <ExternalLink className="w-3 h-3 text-indigo-400" />
            <span className="hidden sm:inline">Cổng Live</span>
          </a>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 transition-all flex items-center gap-1.5 shadow-md shadow-cyan-900/40 disabled:opacity-50"
          >
            {saving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            <span>{saving ? "Lưu..." : "Lưu Cấu Hình"}</span>
          </button>
        </div>
      </div>

      {/* Toast Alert mini nếu có */}
      {toast && (
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border animate-in fade-in duration-200 shrink-0 ${
            toast.type === "success"
              ? "bg-emerald-950/90 text-emerald-300 border-emerald-500/40"
              : "bg-rose-950/90 text-rose-300 border-rose-500/40"
          }`}
        >
          {toast.type === "success" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* 2. Top Control Toolbar (Gộp Mode + Tabs + Active Theme Badge vào 1 hàng duy nhất) */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm shrink-0">
        {/* Nhóm 1: Chế độ hoạt động (Tự động / Cố định) */}
        <div className="flex items-center gap-1.5 bg-slate-950/60 p-1 rounded-lg border border-slate-800/80">
          <button
            type="button"
            onClick={() => setMode("auto")}
            className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
              mode === "auto"
                ? "bg-cyan-500 text-slate-950 shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>Tự Động Theo Lịch</span>
          </button>

          <button
            type="button"
            onClick={() => setMode("fixed")}
            className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
              mode === "fixed"
                ? "bg-amber-500 text-slate-950 shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Cố Định 1 Theme</span>
          </button>
        </div>

        {/* Nhóm 2: View Switcher (Lịch Âm Dương <-> 24 Themes) */}
        <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-lg border border-slate-800/80">
          <button
            type="button"
            onClick={() => setActiveTab("calendar")}
            className={`px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "calendar"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Lịch Âm Dương</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("presets")}
            className={`px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "presets"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Bộ Sưu Tập ({themesList.length} Themes)</span>
          </button>
        </div>

        {/* Nhóm 3: Mini Badge Theme đang chọn */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-xs">
          <span className="text-slate-400 text-[11px] hidden sm:inline">Theme lưu:</span>
          <span className="text-base">{activeThemeMeta.icon}</span>
          <span className="font-bold text-white text-xs">{activeThemeMeta.name}</span>
          <span className="w-2.5 h-2.5 rounded-full border border-white/20 ml-1" style={{ background: activeThemeMeta.accent }} />
        </div>
      </div>

      {/* 3. Main Content Area (Tự động co dãn vừa khít chiều cao còn lại của màn hình) */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === "calendar" ? (
          /* TAB 1: BẢNG LỊCH ÂM DƯƠNG (Layout 2 cột ngang, Cột Lịch + Cột Inspector) */
          <div className="h-full grid grid-cols-1 lg:grid-cols-12 gap-3 overflow-hidden">
            {/* Cột Trái: Bảng Lịch (Chiếm 8/12 cột = ~67%) */}
            <div className="lg:col-span-8 h-full flex flex-col rounded-xl border border-emerald-800/60 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 shadow-xl overflow-hidden">
              {/* Header Lịch Compact */}
              <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-emerald-950 px-3 py-2 border-b border-emerald-700/60 flex items-center justify-between shrink-0">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="px-2 py-1 rounded-lg bg-emerald-950/80 hover:bg-emerald-800 text-emerald-200 border border-emerald-700/60 transition-all flex items-center gap-0.5 text-xs font-semibold"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Trước</span>
                </button>

                <div className="text-center">
                  <h2 className="text-xs sm:text-sm font-black tracking-wide text-white uppercase drop-shadow">
                    Lịch Âm Dương Tháng {calMonth} Năm {calYear}
                  </h2>
                  <p className="text-[10px] text-emerald-300/90 font-medium">
                    Chuẩn giờ Việt Nam (UTC+7) • Tự động gắn kết 24 Themes Lễ Hội
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleGoToday}
                    className="px-2 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold border border-emerald-500 shadow-sm transition-all"
                  >
                    Hôm nay
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="px-2 py-1 rounded-lg bg-emerald-950/80 hover:bg-emerald-800 text-emerald-200 border border-emerald-700/60 transition-all flex items-center gap-0.5 text-xs font-semibold"
                  >
                    <span className="hidden sm:inline">Sau</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* 7 Cột Thứ Hai -> Chủ Nhật (Compact) */}
              <div className="grid grid-cols-7 text-center font-bold text-[11px] uppercase tracking-wider border-b border-emerald-800/60 bg-emerald-950/90 text-emerald-200 py-1.5 shrink-0">
                <div>Thứ Hai</div>
                <div>Thứ Ba</div>
                <div>Thứ Tư</div>
                <div>Thứ Năm</div>
                <div>Thứ Sáu</div>
                <div className="text-emerald-300">Thứ Bảy</div>
                <div className="text-amber-400">Chủ Nhật</div>
              </div>

              {/* Grid Ô Ngày: Dùng flex-1 để tự co giãn chia đều chiều cao */}
              <div className="flex-1 grid grid-cols-7 gap-px bg-slate-800/50 p-1 min-h-0">
                {monthCells.map((cell, idx) => {
                  const isSelected =
                    selectedDayCell &&
                    selectedDayCell.solarDay === cell.solarDay &&
                    selectedDayCell.solarMonth === cell.solarMonth &&
                    selectedDayCell.solarYear === cell.solarYear;

                  const isFirstLunarDay = cell.lunar.day === 1;

                  return (
                    <div
                      key={`${cell.solarYear}-${cell.solarMonth}-${cell.solarDay}-${idx}`}
                      onClick={() => setSelectedDayCell(cell)}
                      className={`p-1 rounded cursor-pointer transition-all flex flex-col justify-between relative select-none ${
                        cell.isToday
                          ? "bg-emerald-900/40 border-2 border-emerald-400 text-emerald-100 shadow-md font-bold"
                          : cell.isCurrentMonth
                          ? isSelected
                            ? "bg-slate-800 border border-cyan-400 ring-1 ring-cyan-500/40"
                            : "bg-slate-900/90 hover:bg-slate-800/70 border border-slate-800/60"
                          : "bg-slate-950/30 border border-slate-900/30 opacity-25 text-slate-500 hover:opacity-50"
                      }`}
                    >
                      {/* Top Row: Solar Day + Dots */}
                      <div className="flex items-center justify-between leading-none">
                        <span
                          className={`text-xs sm:text-sm font-bold ${
                            cell.isSunday
                              ? "text-amber-400 font-black"
                              : cell.isSaturday
                              ? "text-emerald-300"
                              : "text-slate-100"
                          }`}
                        >
                          {cell.solarDay}
                        </span>

                        <div className="flex items-center gap-0.5">
                          {cell.isToday && (
                            <span className="text-[8px] font-black px-1 py-0.2 rounded bg-emerald-500 text-slate-950 uppercase leading-none">
                              NAY
                            </span>
                          )}
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              cell.isAuspiciousDay ? "bg-rose-500" : "bg-purple-400"
                            }`}
                            title={cell.isAuspiciousDay ? "Hoàng Đạo" : "Hắc Đạo"}
                          />
                        </div>
                      </div>

                      {/* Middle: Lunar Day + Can Chi */}
                      <div className="text-center my-0.5">
                        <span
                          className={`text-[10px] sm:text-xs font-bold leading-none ${
                            isFirstLunarDay
                              ? "text-rose-400 font-black"
                              : "text-slate-300"
                          }`}
                        >
                          {isFirstLunarDay ? `1/${cell.lunar.month}` : cell.lunar.day}
                        </span>
                        <div className="text-[8px] sm:text-[9px] text-slate-400 font-medium truncate leading-tight">
                          {cell.lunar.canChiDay}
                        </div>
                      </div>

                      {/* Bottom: Theme Badge Mini */}
                      {cell.holidayTheme ? (
                        <div
                          className="px-1 py-0.2 rounded text-[8px] font-bold text-center truncate border shadow-xs leading-tight"
                          style={{
                            backgroundColor: `${cell.holidayTheme.accentColor}25`,
                            borderColor: `${cell.holidayTheme.accentColor}70`,
                            color: cell.holidayTheme.accentColor,
                          }}
                          title={`${cell.holidayTheme.holidayName}: ${cell.holidayTheme.description}`}
                        >
                          ✨ {cell.holidayTheme.holidayName}
                        </div>
                      ) : (
                        <div className="h-2" />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Footer chú thích thanh lịch */}
              <div className="px-3 py-1 bg-slate-950/80 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400 shrink-0">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>Hôm nay</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span>Mùng 1 Âm</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    <span>Có Theme Lễ Hội</span>
                  </span>
                </div>
                <span className="hidden sm:inline italic text-slate-500">
                  Click vào ngày bất kỳ để xem chi tiết
                </span>
              </div>
            </div>

            {/* Cột Phải: Inspector Ngày Đang Chọn & Cài Đặt (Chiếm 4/12 cột = ~33%) */}
            <div className="lg:col-span-4 h-full flex flex-col gap-2.5 overflow-hidden">
              {/* Box 1: Thông tin chi tiết ngày click */}
              {selectedDayCell ? (
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-lg space-y-2.5 shrink-0">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <CalendarDays className="w-3.5 h-3.5 text-emerald-400" /> Chi Tiết Ngày Đang Xem
                    </span>
                    {selectedDayCell.isToday && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/50">
                        Hôm Nay
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-700 flex flex-col items-center justify-center text-white shrink-0 shadow-md">
                      <span className="text-[9px] font-bold uppercase">Dương</span>
                      <span className="text-lg font-black leading-none">{selectedDayCell.solarDay}</span>
                    </div>

                    <div>
                      <h4 className="font-bold text-sm text-white">
                        Thứ {selectedDayCell.isSunday ? "Chủ Nhật" : selectedDayCell.isSaturday ? "Bảy" : `${((new Date(selectedDayCell.solarYear, selectedDayCell.solarMonth - 1, selectedDayCell.solarDay).getDay() + 6) % 7) + 2}`}, {selectedDayCell.solarDay}/{selectedDayCell.solarMonth}/{selectedDayCell.solarYear}
                      </h4>
                      <p className="text-xs text-emerald-400 font-semibold mt-0.5">
                        🌙 Ngày {selectedDayCell.lunar.day} Tháng {selectedDayCell.lunar.month} {selectedDayCell.lunar.leap ? "(Nhuận)" : ""} • Năm {selectedDayCell.lunar.canChiYear}
                      </p>
                    </div>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800/80 text-[11px] space-y-0.5">
                    <p className="text-slate-300">
                      Can Chi: <span className="font-semibold text-white">Ngày {selectedDayCell.lunar.canChiDay}</span> • Tháng {selectedDayCell.lunar.canChiMonth}
                    </p>
                    <p className="text-slate-400 text-[10px]">
                      {selectedDayCell.isAuspiciousDay ? "⭐ Ngày Hoàng Đạo (Thuận lợi, may mắn)" : "🌑 Ngày Hắc Đạo (Thận trọng)"}
                    </p>
                  </div>

                  {/* Theme Kích Hoạt Của Ngày Này */}
                  <div className="pt-2 border-t border-slate-800/70 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Theme Tự Động Kích Hoạt:</span>
                    {selectedDayCell.holidayTheme ? (
                      <div className="p-2.5 rounded-lg border bg-slate-950/90" style={{ borderColor: `${selectedDayCell.holidayTheme.accentColor}50` }}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xl">{activeCellTheme?.icon || "✨"}</span>
                            <div>
                              <div className="text-xs font-bold text-white flex items-center gap-1">
                                {selectedDayCell.holidayTheme.holidayName}
                                <span className="text-[9px] px-1 py-0.2 rounded font-normal bg-cyan-950 text-cyan-300 border border-cyan-800/60">
                                  {selectedDayCell.holidayTheme.calendarType === "lunar" ? "Lễ Âm" : "Lễ Dương"}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400 italic line-clamp-1">{selectedDayCell.holidayTheme.description}</p>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTheme(selectedDayCell.holidayTheme!.themeKey);
                            setMode("fixed");
                            setToast({
                              type: "success",
                              message: `Đã chọn theme "${selectedDayCell.holidayTheme!.holidayName}". Hãy bấm "Lưu Cấu Hình" để áp dụng!`,
                            });
                          }}
                          className="mt-2 w-full py-1.5 rounded-lg text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition-all flex items-center justify-center gap-1.5"
                        >
                          <Lock className="w-3 h-3" />
                          <span>Cố Định Theme Này Cho Cổng OTP</span>
                        </button>
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-lg border border-slate-800/80 bg-slate-950/70 flex items-center gap-2">
                        <span className="text-xl">⚡</span>
                        <div>
                          <div className="text-xs font-bold text-cyan-400">Cyber Core (Ngày Thường)</div>
                          <p className="text-[10px] text-slate-400 italic">Không rơi vào lễ hội, giữ giao diện mặc định hiện đại</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              {/* Box 2: Thông tin nhanh Theme Đang Chọn Lưu */}
              <div className="flex-1 min-h-0 p-3 rounded-xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 shadow-md flex flex-col justify-between overflow-hidden">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Eye className="w-3 h-3 text-indigo-400" /> Xem Trước Theme Lưu
                  </span>

                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-2xl">{activeThemeMeta.icon}</span>
                    <div>
                      <h4 className="font-bold text-xs text-white">{activeThemeMeta.name}</h4>
                      <span className="text-[10px] font-semibold text-slate-400">{activeThemeMeta.badge}</span>
                    </div>
                  </div>

                  <div className="mt-2 p-2 rounded-lg bg-slate-950/70 border border-slate-800/80">
                    <p className="text-[11px] font-bold text-slate-200 truncate">{activeThemeMeta.title}</p>
                    <p className="text-[10px] text-slate-400 italic truncate mt-0.5">{activeThemeMeta.subtitle}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px]">
                  <span className="text-slate-400">Màu chủ đạo:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full border border-white/30" style={{ background: activeThemeMeta.accent }} />
                    <span className="font-mono text-[10px] text-slate-300">{activeThemeMeta.accent}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* TAB 2: DANH SÁCH 24 THEMES PRESETS (Cuộn nội bộ, toàn trang không scroll) */
          <div className="h-full flex flex-col space-y-2 overflow-hidden">
            {/* Filter buttons */}
            <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 shrink-0">
              <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-900/90 border border-slate-800">
                {[
                  { id: "all", label: `Tất cả (${themesList.length})` },
                  { id: "spring", label: `Mùa Xuân (${themesList.filter((t) => t.season === "spring").length})` },
                  { id: "summer", label: `Mùa Hạ (${themesList.filter((t) => t.season === "summer").length})` },
                  { id: "autumn", label: `Mùa Thu (${themesList.filter((t) => t.season === "autumn").length})` },
                  { id: "winter", label: `Mùa Đông (${themesList.filter((t) => t.season === "winter").length})` },
                  { id: "modern", label: "Cyber Core" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveSeason(tab.id as SeasonFilter)}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all whitespace-nowrap ${
                      activeSeason === tab.id
                        ? "bg-cyan-500 text-slate-950 shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {mode === "fixed" && (
                <span className="text-xs text-amber-400 font-semibold hidden sm:flex items-center gap-1 shrink-0">
                  <Lock className="w-3.5 h-3.5" /> Bấm vào thẻ để chọn theme muốn cố định
                </span>
              )}
            </div>

            {/* Scrollable Theme Grid */}
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {filteredThemes.map((item) => {
                const isSelected = selectedTheme === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedTheme(item.id)}
                    className={`relative p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? "bg-slate-900/90 border-cyan-400 ring-2 ring-cyan-500/20 shadow-md shadow-cyan-950/60"
                        : "bg-slate-900/40 border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/40"
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center font-bold shadow-xs">
                        <Check className="w-3 h-3" />
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{item.icon}</span>
                        <div>
                          <h4 className="font-bold text-xs text-white truncate max-w-[150px]">{item.name}</h4>
                          <span className="text-[9px] text-slate-400">{item.badge}</span>
                        </div>
                      </div>

                      <div className="mt-2 space-y-0.5">
                        <p className="text-[10px] font-bold text-slate-200 truncate">{item.title}</p>
                        <p className="text-[9px] text-slate-400 italic truncate">{item.subtitle}</p>
                      </div>
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[9px]">
                      <span className="text-slate-500 font-mono">#{item.id}</span>
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full" style={{ background: item.accent }} />
                        <span className="text-slate-400">{item.accent}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OtpThemeConfigPage;
