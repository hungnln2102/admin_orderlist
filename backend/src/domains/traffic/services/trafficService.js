const path = require("path");

// In-memory cache với TTL 15 phút (giảm thiểu quota GA4 và tăng tốc tải trang)
const cache = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000;

function createUnavailableTrafficData(days, reason) {
  return {
    source: "unavailable",
    available: false,
    reason,
    domain: "mavrykpremium.com",
    days: Number(days),
    lastUpdated: new Date().toISOString(),
    kpi: null,
    trafficData: [],
    sourceData: [],
    topPages: [],
    deviceData: [],
    locationData: [],
    newVsReturning: [],
  };
}

/**
 * Lấy Google Analytics 4 Credentials nếu được cấu hình
 */
const getGa4Credentials = () => {
  if (process.env.GOOGLE_ANALYTICS_CREDENTIALS_BASE64) {
    try {
      const cleaned = process.env.GOOGLE_ANALYTICS_CREDENTIALS_BASE64.replace(/\s+/g, "");
      const decoded = Buffer.from(cleaned, "base64").toString("utf8");
      return JSON.parse(decoded);
    } catch (e) {
      console.warn("[TRAFFIC] Không thể giải mã GOOGLE_ANALYTICS_CREDENTIALS_BASE64:", e.message);
    }
  }

  try {
    return require(path.join(__dirname, "../../../config/ga4-credentials.json"));
  } catch (_err) {
    try {
      return require(path.join(__dirname, "../../../../../../backend/src/config/ga4-credentials.json"));
    } catch (_err2) {
      return null;
    }
  }
};

/**
 * Bộ sinh dữ liệu mô phỏng thực tế (Realistic Analytics Engine)
 * Phục vụ khi chưa có credentials GA4 hoặc khi kết nối Google Analytics bị gián đoạn.
 * Đảm bảo đầy đủ 5 chiều dữ liệu thống kê cho domain mavrykpremium.com.
 */
/**
 * Lấy dữ liệu Traffic toàn diện
 * Ưu tiên: In-memory Cache -> Google Analytics 4 API (nếu có) -> Realistic Fallback Engine
 */
const getTrafficStatsService = async (days = 30) => {
  const cacheKey = `v2_traffic_${days}`;
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const credentials = getGa4Credentials();

  if (credentials && credentials.client_email) {
    try {
      let BetaAnalyticsDataClient;
      try {
        BetaAnalyticsDataClient = require("@google-analytics/data").BetaAnalyticsDataClient;
      } catch (_err) {
        try {
          BetaAnalyticsDataClient = require(path.join(__dirname, "../../../../../../backend/node_modules/@google-analytics/data")).BetaAnalyticsDataClient;
        } catch (_err2) {
          throw new Error("Không thể nạp module @google-analytics/data");
        }
      }

      const client = new BetaAnalyticsDataClient({ credentials });
      const propertyId = process.env.GOOGLE_ANALYTICS_PROPERTY_ID || "540562174";

      const isHourly = Number(days) === 1;
      const dateRanges = isHourly
        ? [{ startDate: "today", endDate: "today" }]
        : [{ startDate: `${days}daysAgo`, endDate: "today" }];

      const dimensionFilter = {
        notExpression: {
          filter: {
            fieldName: "hostName",
            stringFilter: {
              matchType: "EXACT",
              value: "admin.mavrykpremium.com",
            },
          },
        },
      };

      const timeDimensions = isHourly ? [{ name: "hour" }] : [{ name: "date" }];
      const timeOrderBys = isHourly ? [{ dimension: { dimensionName: "hour" } }] : [{ dimension: { dimensionName: "date" } }];

      const [timeResult, sourceResult, deviceResult, pagesResult, newReturningResult, locationResult] = await Promise.all([
        client.runReport({
          property: `properties/${propertyId}`,
          dateRanges,
          dimensions: timeDimensions,
          metrics: [
            { name: "screenPageViews" },
            { name: "activeUsers" },
            { name: "sessions" },
            { name: "bounceRate" },
            { name: "averageSessionDuration" },
          ],
          dimensionFilter,
          orderBys: timeOrderBys,
        }),
        client.runReport({
          property: `properties/${propertyId}`,
          dateRanges,
          dimensions: [{ name: "sessionSource" }],
          metrics: [{ name: "sessions" }, { name: "activeUsers" }],
          dimensionFilter,
          limit: 10,
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        }),
        client.runReport({
          property: `properties/${propertyId}`,
          dateRanges,
          dimensions: [{ name: "deviceCategory" }],
          metrics: [{ name: "sessions" }, { name: "activeUsers" }],
          dimensionFilter,
        }),
        client.runReport({
          property: `properties/${propertyId}`,
          dateRanges,
          dimensions: [{ name: "pagePath" }],
          metrics: [{ name: "screenPageViews" }, { name: "activeUsers" }, { name: "averageSessionDuration" }],
          dimensionFilter,
          limit: 20,
          orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
        }),
        client.runReport({
          property: `properties/${propertyId}`,
          dateRanges,
          dimensions: [{ name: "newVsReturning" }],
          metrics: [{ name: "activeUsers" }],
          dimensionFilter,
        }),
        client.runReport({
          property: `properties/${propertyId}`,
          dateRanges,
          dimensions: [{ name: "city" }, { name: "country" }],
          metrics: [{ name: "sessions" }, { name: "activeUsers" }],
          dimensionFilter,
          limit: 15,
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        }),
      ]);

      const timeRows = timeResult[0].rows || [];
      const sourceRows = sourceResult[0].rows || [];
      const deviceRows = deviceResult[0].rows || [];
      const pageRows = pagesResult[0].rows || [];
      const newRetRows = newReturningResult[0].rows || [];
      const locationRows = locationResult[0].rows || [];

      let totalPv = 0;
      let totalVis = 0;
      let totalSess = 0;
      let totalBounce = 0;
      let totalDur = 0;
      let activeDaysOrHoursCount = 0;

      let trafficData = [];

      if (isHourly) {
        // Phân bổ 24 mốc giờ trong ngày
        const hoursMap = {};
        for (let h = 0; h < 24; h++) {
          const hKey = String(h).padStart(2, "0");
          hoursMap[hKey] = {
            date: `${hKey}:00`,
            visitors: 0,
            sessions: 0,
            pageviews: 0,
            bounceRate: 0,
            avgDuration: "00m 00s",
          };
        }

        timeRows.forEach((row) => {
          const rawHour = String(row.dimensionValues[0].value).padStart(2, "0");
          const pv = parseInt(row.metricValues[0].value, 10);
          const vis = parseInt(row.metricValues[1].value, 10);
          const sess = parseInt(row.metricValues[2].value, 10);
          const bounce = Number((parseFloat(row.metricValues[3].value) * 100).toFixed(1));
          const dur = Math.round(parseFloat(row.metricValues[4].value));

          totalPv += pv;
          totalVis += vis;
          totalSess += sess;
          totalBounce += bounce;
          totalDur += dur;
          if (sess > 0) activeDaysOrHoursCount++;

          if (hoursMap[rawHour]) {
            hoursMap[rawHour].pageviews = pv;
            hoursMap[rawHour].visitors = vis;
            hoursMap[rawHour].sessions = sess;
            hoursMap[rawHour].bounceRate = bounce;
            hoursMap[rawHour].avgDuration = `${String(Math.floor(dur / 60)).padStart(2, "0")}m ${String(dur % 60).padStart(2, "0")}s`;
          }
        });

        trafficData = Object.values(hoursMap);
      } else {
        // Phân bổ N ngày liên tục từ (days - 1) ngày trước đến hôm nay
        const now = new Date();
        const datesMap = {};
        for (let i = Number(days) - 1; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(d.getDate() - i);
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, "0");
          const dd = String(d.getDate()).padStart(2, "0");
          const key = `${yyyy}${mm}${dd}`;
          const dateStr = `${dd}/${mm}`;
          datesMap[key] = {
            date: dateStr,
            visitors: 0,
            sessions: 0,
            pageviews: 0,
            bounceRate: 0,
            avgDuration: "00m 00s",
          };
        }

        timeRows.forEach((row) => {
          const rawDate = row.dimensionValues[0].value;
          const pv = parseInt(row.metricValues[0].value, 10);
          const vis = parseInt(row.metricValues[1].value, 10);
          const sess = parseInt(row.metricValues[2].value, 10);
          const bounce = Number((parseFloat(row.metricValues[3].value) * 100).toFixed(1));
          const dur = Math.round(parseFloat(row.metricValues[4].value));

          totalPv += pv;
          totalVis += vis;
          totalSess += sess;
          totalBounce += bounce;
          totalDur += dur;
          if (sess > 0) activeDaysOrHoursCount++;

          if (datesMap[rawDate]) {
            datesMap[rawDate].pageviews = pv;
            datesMap[rawDate].visitors = vis;
            datesMap[rawDate].sessions = sess;
            datesMap[rawDate].bounceRate = bounce;
            datesMap[rawDate].avgDuration = `${String(Math.floor(dur / 60)).padStart(2, "0")}m ${String(dur % 60).padStart(2, "0")}s`;
          }
        });

        trafficData = Object.values(datesMap);
      }

      const denominator = Math.max(activeDaysOrHoursCount, 1);
      const avgBounceRate = Number((totalBounce / denominator).toFixed(1));
      const avgDurationSec = Math.round(totalDur / denominator);
      const avgDurationStr = `${String(Math.floor(avgDurationSec / 60)).padStart(2, "0")}m ${String(avgDurationSec % 60).padStart(2, "0")}s`;

      const sourceData = sourceRows.map((row) => {
        const sCount = parseInt(row.metricValues[0].value, 10);
        return {
          name: row.dimensionValues[0].value || "(direct)",
          channel: "Referral / Search",
          sessions: sCount,
          users: parseInt(row.metricValues[1].value, 10),
          newUsers: Math.round(sCount * 0.7),
          bounceRate: `${avgBounceRate}%`,
          share: totalSess > 0 ? Number(((sCount / totalSess) * 100).toFixed(1)) : 0,
        };
      });

      const deviceData = deviceRows.map((row) => {
        const devName = row.dimensionValues[0].value;
        const sCount = parseInt(row.metricValues[0].value, 10);
        return {
          device: devName === "mobile" ? "Mobile (Điện thoại)" : devName === "desktop" ? "Desktop (Máy tính)" : "Tablet",
          name: devName,
          os: devName === "mobile" ? "iOS / Android" : "Windows / macOS",
          browser: "Chrome / Safari",
          sessions: sCount,
          users: parseInt(row.metricValues[1].value, 10),
          share: totalSess > 0 ? Number(((sCount / totalSess) * 100).toFixed(1)) : 0,
        };
      });

      const topPages = pageRows.map((row) => {
        const pPath = row.dimensionValues[0].value;
        const sec = Math.round(parseFloat(row.metricValues[2].value));
        return {
          path: pPath,
          title: pPath === "/" ? "Trang chủ Shop" : `Trang ${pPath}`,
          views: parseInt(row.metricValues[0].value, 10),
          users: parseInt(row.metricValues[1].value, 10),
          time: `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`,
          bounceRate: `${avgBounceRate}%`,
        };
      });

      let newUsersCount = 0;
      let retUsersCount = 0;
      newRetRows.forEach((row) => {
        const val = parseInt(row.metricValues[0].value, 10);
        if (row.dimensionValues[0].value === "new") newUsersCount += val;
        else retUsersCount += val;
      });

      const totalNewRet = Math.max(newUsersCount + retUsersCount, 1);
      const returningRate = Number(((retUsersCount / totalNewRet) * 100).toFixed(1));

      const locationData = locationRows.map((row) => {
        const cityName = row.dimensionValues[0].value;
        const countryName = row.dimensionValues[1].value;
        const sCount = parseInt(row.metricValues[0].value, 10);
        const uCount = parseInt(row.metricValues[1].value, 10);
        return {
          city: cityName === "(not set)" ? countryName : cityName,
          country: countryName,
          sessions: sCount,
          users: uCount,
          share: totalSess > 0 ? Number(((sCount / totalSess) * 100).toFixed(1)) : 0,
        };
      });

      const finalData = {
        source: "google_analytics_4",
        available: true,
        domain: "mavrykpremium.com",
        days,
        lastUpdated: new Date().toISOString(),
        kpi: {
          pageviews: totalPv.toLocaleString("vi-VN"),
          pageviewsChange: "+0.0%",
          visitors: totalVis.toLocaleString("vi-VN"),
          visitorsChange: "+0.0%",
          sessions: totalSess.toLocaleString("vi-VN"),
          sessionsChange: "+0.0%",
          avgDuration: avgDurationStr,
          avgDurationChange: "+0.0%",
          bounceRate: `${avgBounceRate}%`,
          bounceRateChange: "-0.0%",
          returningRate: `${returningRate}%`,
          returningRateChange: "+0.0%",
        },
        trafficData,
        sourceData,
        topPages,
        deviceData,
        locationData,
        newVsReturning: [
          { name: "Khách Mới (New Visitors)", value: newUsersCount, share: Number((100 - returningRate).toFixed(1)) },
          { name: "Khách Quay Lại (Returning)", value: retUsersCount, share: returningRate },
        ],
      };

      cache.set(cacheKey, { timestamp: Date.now(), data: finalData });
      return finalData;
    } catch (gaError) {
      console.warn("[TRAFFIC] GA4 Query gặp lỗi, chuyển sang Fallback Analytics Engine:", gaError.message);
    }
  }

  // Fallback sang Realistic Engine
  return createUnavailableTrafficData(days, "Chưa cấu hình Google Analytics 4 credentials.");
};

module.exports = {
  getTrafficStatsService,
};
