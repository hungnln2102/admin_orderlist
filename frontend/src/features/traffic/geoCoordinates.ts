export interface GeoCoord {
  lng: number;
  lat: number;
}

export interface CountryViewport extends GeoCoord {
  zoom: number;
}

/**
 * Chuẩn hóa tên địa danh (bỏ dấu tiếng Việt, chữ thường, gom khoảng trắng) để khớp tên thành phố từ GA4/GeoIP.
 */
export function normalizeGeoKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function isUnknownGeoName(value?: string | null): boolean {
  if (!value) return true;
  const key = normalizeGeoKey(value);
  return !key || key === "not set" || key === "unknown" || key === "none";
}

// Tọa độ [lng, lat] các tỉnh/thành Việt Nam (khớp cả tên tiếng Anh GA4 lẫn tên tiếng Việt không dấu)
const VIETNAM_CITIES: Record<string, [number, number]> = {
  "ho chi minh city": [106.7009, 10.7769],
  "ho chi minh": [106.7009, 10.7769],
  "saigon": [106.7009, 10.7769],
  "thu duc": [106.7717, 10.8494],
  "hanoi": [105.8342, 21.0278],
  "ha noi": [105.8342, 21.0278],
  "da nang": [108.2022, 16.0544],
  "danang": [108.2022, 16.0544],
  "hai phong": [106.6881, 20.8449],
  "haiphong": [106.6881, 20.8449],
  "can tho": [105.7851, 10.0452],
  "cantho": [105.7851, 10.0452],
  "bien hoa": [106.8427, 10.9574],
  "dong nai": [107.0056, 11.0686],
  "thu dau mot": [106.6519, 10.9804],
  "binh duong": [106.6519, 11.1667],
  "di an": [106.7694, 10.9069],
  "thuan an": [106.7042, 10.9167],
  "vung tau": [107.0843, 10.346],
  "ba ria": [107.168, 10.4964],
  "ba ria vung tau": [107.168, 10.4964],
  "nha trang": [109.1967, 12.2388],
  "cam ranh": [109.1591, 11.9214],
  "khanh hoa": [109.1967, 12.2585],
  "hue": [107.5909, 16.4637],
  "thua thien hue": [107.5909, 16.4637],
  "da lat": [108.4583, 11.9404],
  "dalat": [108.4583, 11.9404],
  "bao loc": [107.8077, 11.548],
  "lam dong": [108.4583, 11.5753],
  "pleiku": [108.0005, 13.9833],
  "gia lai": [108.0005, 13.8079],
  "buon ma thuot": [108.0378, 12.6667],
  "dak lak": [108.2378, 12.71],
  "quy nhon": [109.2197, 13.783],
  "binh dinh": [109.0005, 13.9833],
  "vinh": [105.6813, 18.6796],
  "nghe an": [104.92, 19.2342],
  "thanh hoa": [105.7852, 19.8067],
  "thai nguyen": [105.8482, 21.5672],
  "bac ninh": [106.0763, 21.1861],
  "bac giang": [106.1975, 21.2731],
  "ha long": [107.0448, 20.9599],
  "cam pha": [107.2728, 21.0114],
  "uong bi": [106.7733, 21.035],
  "mong cai": [107.9662, 21.5247],
  "quang ninh": [107.2925, 21.0064],
  "hai duong": [106.3309, 20.9373],
  "hung yen": [106.0511, 20.6464],
  "nam dinh": [106.1621, 20.4388],
  "thai binh": [106.3366, 20.4463],
  "ninh binh": [105.9745, 20.2506],
  "phu ly": [105.9122, 20.5453],
  "ha nam": [105.9229, 20.5835],
  "viet tri": [105.4019, 21.3227],
  "phu tho": [105.2046, 21.2684],
  "vinh yen": [105.5967, 21.3089],
  "vinh phuc": [105.5474, 21.3609],
  "hoa binh": [105.3376, 20.8133],
  "lao cai": [103.9755, 22.4809],
  "sapa": [103.8438, 22.3364],
  "yen bai": [104.8987, 21.7168],
  "tuyen quang": [105.218, 21.8236],
  "ha giang": [104.9836, 22.8233],
  "cao bang": [106.2579, 22.6657],
  "lang son": [106.7615, 21.8537],
  "bac kan": [105.8348, 22.147],
  "son la": [103.9188, 21.3256],
  "dien bien phu": [103.0168, 21.386],
  "dien bien": [103.0168, 21.386],
  "lai chau": [103.4703, 22.3862],
  "ha tinh": [105.9057, 18.3428],
  "dong hoi": [106.6223, 17.4689],
  "quang binh": [106.3487, 17.6103],
  "dong ha": [107.1003, 16.8163],
  "quang tri": [107.1855, 16.7403],
  "tam ky": [108.474, 15.5736],
  "hoi an": [108.338, 15.8801],
  "quang nam": [108.0191, 15.5394],
  "quang ngai": [108.8044, 15.1214],
  "tuy hoa": [109.2997, 13.0955],
  "phu yen": [109.0929, 13.0882],
  "phan rang": [108.995, 11.5752],
  "ninh thuan": [108.8629, 11.6739],
  "phan thiet": [108.1021, 10.9289],
  "binh thuan": [108.0721, 11.0904],
  "kon tum": [108.0076, 14.3497],
  "gia nghia": [107.6907, 12.0042],
  "dak nong": [107.6907, 12.2646],
  "dong xoai": [106.8906, 11.535],
  "binh phuoc": [106.9056, 11.7512],
  "tay ninh": [106.1099, 11.3352],
  "tan an": [106.4133, 10.5359],
  "long an": [106.2431, 10.6956],
  "my tho": [106.36, 10.36],
  "tien giang": [106.3421, 10.4493],
  "ben tre": [106.3755, 10.2434],
  "tra vinh": [106.3452, 9.9347],
  "vinh long": [105.9722, 10.2537],
  "cao lanh": [105.6331, 10.4592],
  "sa dec": [105.7564, 10.2923],
  "dong thap": [105.6882, 10.4938],
  "long xuyen": [105.4352, 10.3864],
  "chau doc": [105.1119, 10.7011],
  "an giang": [105.1259, 10.5216],
  "rach gia": [105.0809, 10.0125],
  "phu quoc": [103.984, 10.2899],
  "kien giang": [105.1259, 9.8249],
  "vi thanh": [105.4701, 9.7845],
  "hau giang": [105.6413, 9.7579],
  "soc trang": [105.9739, 9.6037],
  "bac lieu": [105.7244, 9.294],
  "ca mau": [105.1524, 9.1768],
};

// Các đô thị quốc tế phổ biến thường xuất hiện trong GA4
const GLOBAL_CITIES: Record<string, [number, number]> = {
  "singapore": [103.8198, 1.3521],
  "bangkok": [100.5018, 13.7563],
  "kuala lumpur": [101.6869, 3.139],
  "jakarta": [106.8456, -6.2088],
  "manila": [120.9842, 14.5995],
  "phnom penh": [104.9282, 11.5564],
  "vientiane": [102.6331, 17.9757],
  "hong kong": [114.1694, 22.3193],
  "taipei": [121.5654, 25.033],
  "tokyo": [139.6917, 35.6895],
  "osaka": [135.5023, 34.6937],
  "seoul": [126.978, 37.5665],
  "busan": [129.0756, 35.1796],
  "beijing": [116.4074, 39.9042],
  "shanghai": [121.4737, 31.2304],
  "shenzhen": [114.0579, 22.5431],
  "guangzhou": [113.2644, 23.1291],
  "sydney": [151.2093, -33.8688],
  "melbourne": [144.9631, -37.8136],
  "brisbane": [153.0251, -27.4698],
  "auckland": [174.7633, -36.8485],
  "mumbai": [72.8777, 19.076],
  "bengaluru": [77.5946, 12.9716],
  "bangalore": [77.5946, 12.9716],
  "new delhi": [77.209, 28.6139],
  "delhi": [77.209, 28.6139],
  "dubai": [55.2708, 25.2048],
  "london": [-0.1276, 51.5072],
  "paris": [2.3522, 48.8566],
  "frankfurt": [8.6821, 50.1109],
  "berlin": [13.405, 52.52],
  "munich": [11.582, 48.1351],
  "amsterdam": [4.9041, 52.3676],
  "zurich": [8.5417, 47.3769],
  "warsaw": [21.0122, 52.2297],
  "prague": [14.4378, 50.0755],
  "moscow": [37.6173, 55.7558],
  "new york": [-74.006, 40.7128],
  "ashburn": [-77.4874, 39.0438],
  "san jose": [-121.8863, 37.3382],
  "san francisco": [-122.4194, 37.7749],
  "los angeles": [-118.2437, 34.0522],
  "seattle": [-122.3321, 47.6062],
  "chicago": [-87.6298, 41.8781],
  "dallas": [-96.797, 32.7767],
  "miami": [-80.1918, 25.7617],
  "boardman": [-119.7006, 45.8399],
  "council bluffs": [-95.8608, 41.2619],
  "toronto": [-79.3832, 43.6532],
  "vancouver": [-123.1207, 49.2827],
  "montreal": [-73.5673, 45.5017],
};

// Tâm quốc gia + mức zoom hợp lý khi flyTo theo mã ISO-2 (countryCode)
const COUNTRY_VIEWPORTS: Record<string, [number, number, number]> = {
  VN: [106.5, 16.0, 4.9],
  SG: [103.82, 1.35, 9.5],
  TH: [100.99, 15.87, 5.1],
  MY: [101.98, 4.21, 5.2],
  ID: [113.92, -0.79, 4.1],
  PH: [121.77, 12.88, 5.1],
  KH: [104.99, 12.57, 6.2],
  LA: [102.5, 19.86, 5.5],
  MM: [95.96, 21.92, 5.0],
  JP: [138.25, 36.2, 4.6],
  KR: [127.77, 35.91, 6.0],
  TW: [120.96, 23.7, 6.6],
  HK: [114.17, 22.32, 9.2],
  CN: [104.2, 35.86, 3.6],
  IN: [78.96, 20.59, 4.2],
  BD: [90.36, 23.68, 6.0],
  PK: [69.35, 30.38, 4.8],
  AU: [133.78, -25.27, 3.6],
  NZ: [174.89, -40.9, 4.8],
  US: [-98.58, 39.83, 3.4],
  CA: [-106.35, 56.13, 3.0],
  MX: [-102.55, 23.63, 4.4],
  BR: [-51.93, -14.24, 3.5],
  AR: [-63.62, -38.42, 3.6],
  GB: [-3.44, 55.38, 4.8],
  IE: [-8.24, 53.41, 5.8],
  FR: [2.21, 46.23, 5.0],
  DE: [10.45, 51.17, 5.2],
  NL: [5.29, 52.13, 6.5],
  BE: [4.47, 50.5, 6.8],
  CH: [8.23, 46.82, 6.8],
  AT: [14.55, 47.52, 6.2],
  IT: [12.57, 41.87, 5.0],
  ES: [-3.75, 40.46, 5.1],
  PT: [-8.22, 39.4, 5.8],
  PL: [19.15, 51.92, 5.4],
  CZ: [15.47, 49.82, 6.4],
  SE: [18.64, 60.13, 4.2],
  NO: [8.47, 60.47, 4.2],
  FI: [25.75, 61.92, 4.4],
  DK: [9.5, 56.26, 6.0],
  RU: [95.0, 61.52, 2.5],
  UA: [31.17, 48.38, 5.0],
  TR: [35.24, 38.96, 5.0],
  AE: [53.85, 23.42, 6.4],
  SA: [45.08, 23.89, 4.5],
  ZA: [22.94, -30.56, 4.6],
};

export function resolveCountryViewport(countryCode?: string | null): CountryViewport | null {
  if (!countryCode) return null;
  const entry = COUNTRY_VIEWPORTS[countryCode.toUpperCase()];
  if (!entry) return null;
  return { lng: entry[0], lat: entry[1], zoom: entry[2] };
}

export function resolveLocationCoordinates(
  city?: string | null,
  countryCode?: string | null
): (GeoCoord & { precision: "city" | "country" }) | null {
  if (!isUnknownGeoName(city)) {
    const key = normalizeGeoKey(city!);
    const vnHit = VIETNAM_CITIES[key];
    if (vnHit) return { lng: vnHit[0], lat: vnHit[1], precision: "city" };

    const globalHit = GLOBAL_CITIES[key];
    if (globalHit) return { lng: globalHit[0], lat: globalHit[1], precision: "city" };

    // Khớp tiền tố/hậu tố nhẹ cho các tên thành phố VN dạng "Thanh pho Ho Chi Minh" hoặc "Pleiku City"
    const trimmed = key.replace(/\b(city|province|tinh|thanh pho|tp)\b/g, "").replace(/\s+/g, " ").trim();
    if (trimmed && VIETNAM_CITIES[trimmed]) {
      const hit = VIETNAM_CITIES[trimmed];
      return { lng: hit[0], lat: hit[1], precision: "city" };
    }
    if (trimmed && GLOBAL_CITIES[trimmed]) {
      const hit = GLOBAL_CITIES[trimmed];
      return { lng: hit[0], lat: hit[1], precision: "city" };
    }
  }

  const country = resolveCountryViewport(countryCode);
  if (country) {
    return { lng: country.lng, lat: country.lat, precision: "country" };
  }
  return null;
}
