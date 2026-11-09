import { ThemeItem } from "../types";

export const THEMES_LIST: ThemeItem[] = [
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

