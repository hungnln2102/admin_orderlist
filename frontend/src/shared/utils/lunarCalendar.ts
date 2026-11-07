/**
 * Lịch Âm Dương Việt Nam (Hồ Ngọc Đức algorithm) & Mapping 24 Themes Lễ Hội
 * Hỗ trợ hiển thị lịch tháng, tra cứu Can Chi ngày/năm, và tự động xác định theme lễ hội theo ngày.
 */

export interface LunarDate {
  day: number;
  month: number;
  year: number;
  leap: boolean;
  canChiDay: string;
  canChiMonth: string;
  canChiYear: string;
  jd: number;
}

export interface HolidayThemeMatch {
  themeKey: string;
  holidayName: string;
  calendarType: 'solar' | 'lunar';
  description: string;
  accentColor: string;
}

const CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
const CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];

export function jdFromDate(dd: number, mm: number, yy: number): number {
  const a = Math.floor((14 - mm) / 12);
  const y = yy + 4800 - a;
  const m = mm + 12 * a - 3;
  let jd = dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  if (jd < 2299161) {
    jd = dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 32083;
  }
  return jd;
}

export function jdToDate(jd: number): [number, number, number] {
  let a: number;
  let b: number;
  let c: number;
  if (jd > 2299160) {
    a = jd + 32044;
    b = Math.floor((4 * a + 3) / 146097);
    c = a - Math.floor((146097 * b) / 4);
  } else {
    b = 0;
    c = jd + 32082;
  }
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  const day = e - Math.floor((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * Math.floor(m / 10);
  const year = b * 100 + d - 4800 + Math.floor(m / 10);
  return [day, month, year];
}

export function getNewMoonDay(k: number, timeZone = 7): number {
  const T = k / 1236.85;
  const T2 = T * T;
  const T3 = T2 * T;
  const dr = Math.PI / 180;
  let Jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
  Jd1 += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
  const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
  const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
  const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
  let C1 = (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * dr * M);
  C1 -= 0.4068 * Math.sin(Mpr * dr) + 0.0161 * Math.sin(2 * dr * Mpr);
  C1 -= 0.0004 * Math.sin(3 * dr * Mpr);
  C1 += 0.0104 * Math.sin(2 * dr * F) - 0.0051 * Math.sin((M + Mpr) * dr);
  C1 -= 0.0074 * Math.sin((M - Mpr) * dr) + 0.0004 * Math.sin((2 * F + M) * dr);
  C1 -= 0.0004 * Math.sin((2 * F - M) * dr) - 0.0006 * Math.sin((2 * F + Mpr) * dr);
  C1 += 0.001 * Math.sin((2 * F - Mpr) * dr) + 0.0005 * Math.sin((2 * Mpr + M) * dr);
  const deltat =
    T < -11
      ? 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3
      : -0.000078 + 0.000086 * T + 0.000069 * T2;
  const JdNew = Jd1 + C1 - deltat;
  return Math.floor(JdNew + 0.5 + timeZone / 24);
}

export function getSunLongitude(dayNumber: number, timeZone = 7): number {
  const T = (dayNumber - 2451545.5 - timeZone / 24) / 36525;
  const T2 = T * T;
  const dr = Math.PI / 180;
  const M = 357.5291 + 35999.0503 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
  const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
  let DL = (1.9146 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M);
  DL += (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) + 0.00029 * Math.sin(dr * 3 * M);
  let L = L0 + DL;
  L = L * dr;
  L = L - Math.PI * 2 * Math.floor(L / (Math.PI * 2));
  return Math.floor((L / Math.PI) * 6);
}

export function getLunarMonth11(yy: number, timeZone = 7): number {
  const off = jdFromDate(31, 12, yy) - 2415021;
  const k = Math.floor(off / 29.530588853);
  let nm = getNewMoonDay(k, timeZone);
  const sunLong = getSunLongitude(nm, timeZone);
  if (sunLong >= 9) {
    nm = getNewMoonDay(k - 1, timeZone);
  }
  return nm;
}

export function getLeapMonthOffset(a11: number, timeZone = 7): number {
  const k = Math.floor((a11 - 2415021.076998695) / 29.530588853 + 0.5);
  let last = 0;
  let i = 1;
  let arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);
  do {
    last = arc;
    i++;
    arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);
  } while (arc !== last && i < 14);
  return i - 1;
}

export function getCanChiDay(jd: number): string {
  const can = CAN[(jd + 9) % 10];
  const chi = CHI[(jd + 1) % 12];
  return `${can} ${chi}`;
}

export function convertSolar2Lunar(dd: number, mm: number, yy: number, timeZone = 7): LunarDate {
  const dayNumber = jdFromDate(dd, mm, yy);
  const k = Math.floor((dayNumber - 2415021.076998695) / 29.530588853);
  let monthStart = getNewMoonDay(k + 1, timeZone);
  if (monthStart > dayNumber) {
    monthStart = getNewMoonDay(k, timeZone);
  }
  let a11 = getLunarMonth11(yy, timeZone);
  let b11 = a11;
  let lunarYear = yy;
  if (a11 >= monthStart) {
    lunarYear = yy - 1;
    a11 = getLunarMonth11(yy - 1, timeZone);
  } else {
    b11 = getLunarMonth11(yy + 1, timeZone);
  }
  const lunarDay = dayNumber - monthStart + 1;
  const diff = Math.floor((monthStart - a11) / 29);
  let lunarLeap = false;
  let lunarMonth = diff + 11;
  if (b11 - a11 > 365) {
    const leapMonthDiff = getLeapMonthOffset(a11, timeZone);
    if (diff >= leapMonthDiff) {
      lunarMonth = diff + 10;
      if (diff === leapMonthDiff) {
        lunarLeap = true;
      }
    }
  }
  if (lunarMonth > 12) {
    lunarMonth = lunarMonth - 12;
  }
  if (lunarMonth >= 11 && diff < 4) {
    lunarYear -= 1;
  }

  const canYear = CAN[(lunarYear + 6) % 10];
  const chiYear = CHI[(lunarYear + 8) % 12];
  const canMonth = CAN[(lunarYear * 12 + lunarMonth + 3) % 10];
  const chiMonth = CHI[(lunarMonth + 1) % 12];

  return {
    day: lunarDay,
    month: lunarMonth,
    year: lunarYear,
    leap: lunarLeap,
    canChiDay: getCanChiDay(dayNumber),
    canChiMonth: `${canMonth} ${chiMonth}`,
    canChiYear: `${canYear} ${chiYear}`,
    jd: dayNumber
  };
}

/**
 * Kiểm tra ngày Solar (Dương) hoặc Lunar (Âm) có khớp với Theme Lễ Hội nào trong 24 themes không.
 * Khóa ID theme chuẩn hóa theo THEMES_LIST của hệ thống.
 */
export function getHolidayThemeForDate(solarDay: number, solarMonth: number, solarYear: number): HolidayThemeMatch | null {
  const lunar = convertSolar2Lunar(solarDay, solarMonth, solarYear);
  const ld = lunar.day;
  const lm = lunar.month;

  // 1. Ngày Lễ Âm Lịch (Ưu tiên cao nhất)
  // Tết Nguyên Đán: 29/12 hoặc 30/12 Âm đến Mùng 4/1 Âm
  if ((lm === 12 && ld >= 29) || (lm === 1 && ld <= 4)) {
    return {
      themeKey: 'tet',
      holidayName: 'Tết Nguyên Đán',
      calendarType: 'lunar',
      description: 'Xuân khởi sắc, tết sum vầy muôn nơi',
      accentColor: '#ffcf78'
    };
  }

  // Ông Công Ông Táo: 23 Tháng Chạp (12 Âm)
  if (lm === 12 && ld === 23) {
    return {
      themeKey: 'ong-tao',
      holidayName: 'Ông Công Ông Táo',
      calendarType: 'lunar',
      description: 'Cá chép hóa rồng, tiễn năm cũ đón điều lành',
      accentColor: '#f0bd72'
    };
  }

  // Rằm Tháng Giêng (Tết Nguyên Tiêu): 15/1 Âm
  if (lm === 1 && ld === 15) {
    return {
      themeKey: 'nguyen-tieu',
      holidayName: 'Tết Nguyên Tiêu',
      calendarType: 'lunar',
      description: 'Ánh trăng soi sáng ước nguyện an lành',
      accentColor: '#f3d28c'
    };
  }

  // Tết Hàn Thực: 3/3 Âm
  if (lm === 3 && ld === 3) {
    return {
      themeKey: 'han-thuc',
      holidayName: 'Tết Hàn Thực',
      calendarType: 'lunar',
      description: 'Hương vị cội nguồn, vẹn nguyên ký ức',
      accentColor: '#b5e3d0'
    };
  }

  // Giỗ Tổ Hùng Vương: 10/3 Âm
  if (lm === 3 && ld === 10) {
    return {
      themeKey: 'gio-to',
      holidayName: 'Giỗ Tổ Hùng Vương',
      calendarType: 'lunar',
      description: 'Về miền đất Tổ, ngàn năm nguồn cội một lòng hướng về',
      accentColor: '#d9ba77'
    };
  }

  // Đại Lễ Phật Đản: 15/4 Âm
  if (lm === 4 && ld === 15) {
    return {
      themeKey: 'phat-dan',
      holidayName: 'Đại Lễ Phật Đản',
      calendarType: 'lunar',
      description: 'Sen nở an lành, một đời an nhiên',
      accentColor: '#f4c5d6'
    };
  }

  // Tết Đoan Ngọ: 5/5 Âm
  if (lm === 5 && ld === 5) {
    return {
      themeKey: 'doan-ngo',
      holidayName: 'Tết Đoan Ngọ',
      calendarType: 'lunar',
      description: 'Diệt sâu bọ, đón trọn phúc lành',
      accentColor: '#d8e6a0'
    };
  }

  // Lễ Thất Tịch: 7/7 Âm
  if (lm === 7 && ld === 7) {
    return {
      themeKey: 'that-tich',
      holidayName: 'Lễ Thất Tịch',
      calendarType: 'lunar',
      description: 'Cầu duyên nối nhịp cầu Ô Thước',
      accentColor: '#c9b4ff'
    };
  }

  // Đại Lễ Vu Lan: 15/7 Âm
  if (lm === 7 && ld === 15) {
    return {
      themeKey: 'vu-lan',
      holidayName: 'Vu Lan Báo Hiếu',
      calendarType: 'lunar',
      description: 'Hoa hồng cài áo, ghi ơn sinh thành',
      accentColor: '#efc5ab'
    };
  }

  // Tết Trung Thu: 14/8 và 15/8 Âm
  if (lm === 8 && (ld === 14 || ld === 15)) {
    return {
      themeKey: 'trung-thu',
      holidayName: 'Tết Trung Thu',
      calendarType: 'lunar',
      description: 'Trăng rằm rạng rỡ, đoàn viên ấm áp',
      accentColor: '#f1d08e'
    };
  }

  // 2. Ngày Lễ Dương Lịch
  // Tết Dương Lịch: 1/1 Dương
  if (solarMonth === 1 && solarDay === 1) {
    return {
      themeKey: 'tet-duong-lich',
      holidayName: 'Tết Dương Lịch',
      calendarType: 'solar',
      description: 'Chào năm mới, một khởi đầu ngàn điều rực rỡ',
      accentColor: '#edc882'
    };
  }

  // Lễ Valentine: 14/2 Dương
  if (solarMonth === 2 && solarDay === 14) {
    return {
      themeKey: 'valentine',
      holidayName: 'Lễ Valentine',
      calendarType: 'solar',
      description: 'Gửi ngàn yêu thương, mỗi lời trao gửi là một lời nhắn',
      accentColor: '#ffb1c4'
    };
  }

  // Quốc Tế Phụ Nữ: 8/3 Dương
  if (solarMonth === 3 && solarDay === 8) {
    return {
      themeKey: 'quoc-te-phu-nu',
      holidayName: 'Quốc Tế Phụ Nữ 8/3',
      calendarType: 'solar',
      description: 'Rạng rỡ theo cách của riêng bạn',
      accentColor: '#eab7ee'
    };
  }

  // Giải Phóng Miền Nam: 30/4 Dương
  if (solarMonth === 4 && solarDay === 30) {
    return {
      themeKey: 'thong-nhat',
      holidayName: 'Giải Phóng 30/4',
      calendarType: 'solar',
      description: 'Non sông liền một dải, hòa bình muôn nơi',
      accentColor: '#ffd486'
    };
  }

  // Quốc Tế Lao Động: 1/5 Dương
  if (solarMonth === 5 && solarDay === 1) {
    return {
      themeKey: 'lao-dong',
      holidayName: 'Quốc Tế Lao Động 1/5',
      calendarType: 'solar',
      description: 'Vinh quang lao động, dựng xây ngày mới',
      accentColor: '#f6cf78'
    };
  }

  // Quốc Tế Thiếu Nhi: 1/6 Dương
  if (solarMonth === 6 && solarDay === 1) {
    return {
      themeKey: 'thieu-nhi',
      holidayName: 'Quốc Tế Thiếu Nhi 1/6',
      calendarType: 'solar',
      description: 'Thế giới tuổi thơ, giữ mãi những ngày trong veo',
      accentColor: '#ffdc9c'
    };
  }

  // Ngày Gia Đình Việt Nam: 28/6 Dương
  if (solarMonth === 6 && solarDay === 28) {
    return {
      themeKey: 'gia-dinh',
      holidayName: 'Ngày Gia Đình VN 28/6',
      calendarType: 'solar',
      description: 'Tổ ấm yêu thương, nơi bão giông dừng lại sau cánh cửa',
      accentColor: '#f5c894'
    };
  }

  // Quốc Khánh: 2/9 Dương
  if (solarMonth === 9 && solarDay === 2) {
    return {
      themeKey: 'quoc-khanh',
      holidayName: 'Quốc Khánh 2/9',
      calendarType: 'solar',
      description: 'Tự hào non sông Việt Nam gấm vóc',
      accentColor: '#ffd28b'
    };
  }

  // Phụ Nữ Việt Nam: 20/10 Dương
  if (solarMonth === 10 && solarDay === 20) {
    return {
      themeKey: 'phu-nu-vn',
      holidayName: 'Phụ Nữ Việt Nam 20/10',
      calendarType: 'solar',
      description: 'Tôn vinh sắc đẹp và dịu dàng phụ nữ Việt Nam',
      accentColor: '#edb9d0'
    };
  }

  // Halloween: 31/10 Dương
  if (solarMonth === 10 && solarDay === 31) {
    return {
      themeKey: 'halloween',
      holidayName: 'Lễ Hội Halloween',
      calendarType: 'solar',
      description: 'Phép màu đêm bí ngô, huyền bí sắc màu',
      accentColor: '#f1b877'
    };
  }

  // Nhà Giáo Việt Nam: 20/11 Dương
  if (solarMonth === 11 && solarDay === 20) {
    return {
      themeKey: 'nha-giao',
      holidayName: 'Nhà Giáo Việt Nam 20/11',
      calendarType: 'solar',
      description: 'Người thắp những ước mơ, tri ân thầy cô',
      accentColor: '#c4d8ef'
    };
  }

  // Quân Đội Nhân Dân VN: 22/12 Dương
  if (solarMonth === 12 && solarDay === 22) {
    return {
      themeKey: 'qdnd-vn',
      holidayName: 'Quân Đội Nhân Dân 22/12',
      calendarType: 'solar',
      description: 'Vững bước dưới quân kỳ, bình yên Tổ quốc',
      accentColor: '#d8cc8e'
    };
  }

  // Giáng Sinh: 24/12 & 25/12 Dương
  if (solarMonth === 12 && (solarDay === 24 || solarDay === 25)) {
    return {
      themeKey: 'giang-sinh',
      holidayName: 'Giáng Sinh Noel',
      calendarType: 'solar',
      description: 'Mùa an lành, chuông ngân rộn rã đón Noel',
      accentColor: '#efcf91'
    };
  }

  return null;
}

/**
 * Cấu trúc ngày trong tháng để vẽ grid lịch 7 cột (Thứ Hai -> Chủ Nhật)
 */
export interface CalendarCell {
  solarDay: number;
  solarMonth: number;
  solarYear: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  isSunday: boolean;
  isSaturday: boolean;
  isAuspiciousDay: boolean; // Ngày hoàng đạo
  lunar: LunarDate;
  holidayTheme: HolidayThemeMatch | null;
}

/**
 * Tạo dữ liệu bảng lịch tháng (7 cột, bắt đầu từ Thứ Hai)
 */
export function generateMonthCalendar(
  year: number,
  month: number,
  todaySolar?: { day: number; month: number; year: number }
): CalendarCell[] {
  const cells: CalendarCell[] = [];
  const today = todaySolar || {
    day: new Date().getDate(),
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  };

  // Ngày đầu tiên của tháng (1..31)
  const firstDayDate = new Date(year, month - 1, 1);
  // getDay(): 0 (Chủ Nhật), 1 (Thứ 2), ..., 6 (Thứ 7)
  // Chuẩn Việt Nam bắt đầu từ Thứ 2: (day + 6) % 7 -> 0: T2, 1: T3, ..., 6: CN
  const startDayOfWeek = (firstDayDate.getDay() + 6) % 7;

  // Số ngày trong tháng này
  const daysInMonth = new Date(year, month, 0).getDate();
  // Số ngày trong tháng trước
  const daysInPrevMonth = new Date(year, month - 1, 0).getDate();

  // 1. Các ô tháng trước (nếu có để làm đầy tuần đầu)
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const sDay = daysInPrevMonth - i;
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const lunar = convertSolar2Lunar(sDay, prevMonth, prevYear);
    const holidayTheme = getHolidayThemeForDate(sDay, prevMonth, prevYear);
    const dayOfWeek = (new Date(prevYear, prevMonth - 1, sDay).getDay() + 6) % 7;
    cells.push({
      solarDay: sDay,
      solarMonth: prevMonth,
      solarYear: prevYear,
      isCurrentMonth: false,
      isToday: false,
      isWeekend: dayOfWeek === 5 || dayOfWeek === 6,
      isSaturday: dayOfWeek === 5,
      isSunday: dayOfWeek === 6,
      isAuspiciousDay: (lunar.jd % 2 === 0),
      lunar,
      holidayTheme
    });
  }

  // 2. Các ngày trong tháng hiện tại
  for (let sDay = 1; sDay <= daysInMonth; sDay++) {
    const lunar = convertSolar2Lunar(sDay, month, year);
    const holidayTheme = getHolidayThemeForDate(sDay, month, year);
    const isToday = sDay === today.day && month === today.month && year === today.year;
    const dayOfWeek = (new Date(year, month - 1, sDay).getDay() + 6) % 7;
    cells.push({
      solarDay: sDay,
      solarMonth: month,
      solarYear: year,
      isCurrentMonth: true,
      isToday,
      isWeekend: dayOfWeek === 5 || dayOfWeek === 6,
      isSaturday: dayOfWeek === 5,
      isSunday: dayOfWeek === 6,
      isAuspiciousDay: (lunar.jd % 2 === 0),
      lunar,
      holidayTheme
    });
  }

  // 3. Các ô tháng sau để làm đầy hàng cuối cùng (bội số của 7)
  const remaining = 7 - (cells.length % 7);
  if (remaining < 7 && remaining > 0) {
    for (let sDay = 1; sDay <= remaining; sDay++) {
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextYear = month === 12 ? year + 1 : year;
      const lunar = convertSolar2Lunar(sDay, nextMonth, nextYear);
      const holidayTheme = getHolidayThemeForDate(sDay, nextMonth, nextYear);
      const dayOfWeek = (new Date(nextYear, nextMonth - 1, sDay).getDay() + 6) % 7;
      cells.push({
        solarDay: sDay,
        solarMonth: nextMonth,
        solarYear: nextYear,
        isCurrentMonth: false,
        isToday: false,
        isWeekend: dayOfWeek === 5 || dayOfWeek === 6,
        isSaturday: dayOfWeek === 5,
        isSunday: dayOfWeek === 6,
        isAuspiciousDay: (lunar.jd % 2 === 0),
        lunar,
        holidayTheme
      });
    }
  }

  return cells;
}
