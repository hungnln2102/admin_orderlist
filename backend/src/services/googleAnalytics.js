const { BetaAnalyticsDataClient } = require('@google-analytics/data');
const path = require('path');

const propertyId = '540562174';

const analyticsDataClient = new BetaAnalyticsDataClient({
  keyFilename: path.join(__dirname, '../config/ga4-credentials.json'),
});

// Cache in memory for 15 minutes to prevent slow loading and quota limits
const cache = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000;

const getTrafficData = async (days = 30) => {
  const cacheKey = `traffic_${days}`;
  const cached = cache.get(cacheKey);
  
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    return cached.data;
  }

  const dateRanges = [{ startDate: `${days}daysAgo`, endDate: 'today' }];
  
  // Filter: exclude admin.mavrykpremium.com
  const dimensionFilter = {
    notExpression: {
      filter: {
        fieldName: 'hostName',
        stringFilter: {
          matchType: 'EXACT',
          value: 'admin.mavrykpremium.com',
        },
      },
    },
  };

  try {
    // Run all Google Analytics queries concurrently (Parallel fetching)
    // This reduces load time from ~4-5s to ~1s
    const [timeResult, sourceResult, deviceResult, pagesResult, newReturningResult] = await Promise.all([
      analyticsDataClient.runReport({
        property: `properties/${propertyId}`,
        dateRanges,
        dimensions: [{ name: 'date' }],
        metrics: [
          { name: 'screenPageViews' },
          { name: 'activeUsers' },
          { name: 'bounceRate' },
          { name: 'averageSessionDuration' },
        ],
        dimensionFilter,
        orderBys: [{ dimension: { dimensionName: 'date' } }],
      }),
      analyticsDataClient.runReport({
        property: `properties/${propertyId}`,
        dateRanges,
        dimensions: [{ name: 'sessionSource' }],
        metrics: [{ name: 'sessions' }],
        dimensionFilter,
        limit: 5,
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      }),
      analyticsDataClient.runReport({
        property: `properties/${propertyId}`,
        dateRanges,
        dimensions: [{ name: 'deviceCategory' }],
        metrics: [{ name: 'sessions' }],
        dimensionFilter,
      }),
      analyticsDataClient.runReport({
        property: `properties/${propertyId}`,
        dateRanges,
        dimensions: [{ name: 'pagePath' }],
        metrics: [{ name: 'screenPageViews' }, { name: 'averageSessionDuration' }],
        dimensionFilter,
        limit: 10,
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      }),
      analyticsDataClient.runReport({
        property: `properties/${propertyId}`,
        dateRanges,
        dimensions: [{ name: 'newVsReturning' }],
        metrics: [{ name: 'activeUsers' }],
        dimensionFilter,
      })
    ]);

    const timeResponse = timeResult[0];
    const sourceResponse = sourceResult[0];
    const deviceResponse = deviceResult[0];
    const pagesResponse = pagesResult[0];
    const newReturningResponse = newReturningResult[0];

    // Parse Time Series
    const trafficData = [];
    let totalPageviews = 0;
    let totalVisitors = 0;
    let totalBounceRate = 0;
    let totalDuration = 0;
    
    (timeResponse.rows || []).forEach(row => {
      const dateRaw = row.dimensionValues[0].value; // YYYYMMDD
      const dateStr = `${dateRaw.substring(6,8)}/${dateRaw.substring(4,6)}`;
      
      const pageviews = parseInt(row.metricValues[0].value, 10);
      const visitors = parseInt(row.metricValues[1].value, 10);
      
      trafficData.push({
        date: dateStr,
        pageviews,
        visitors,
      });

      totalPageviews += pageviews;
      totalVisitors += visitors;
      totalBounceRate += parseFloat(row.metricValues[2].value);
      totalDuration += parseFloat(row.metricValues[3].value);
    });

    const daysCount = Math.max((timeResponse.rows || []).length, 1);
    const avgBounceRate = (totalBounceRate / daysCount) * 100;
    const avgDuration = totalDuration / daysCount;

    // Parse Sources
    const sourceData = (sourceResponse.rows || []).map(row => ({
      name: row.dimensionValues[0].value,
      value: parseInt(row.metricValues[0].value, 10),
    }));

    // Parse Devices
    const deviceData = (deviceResponse.rows || []).map(row => ({
      name: row.dimensionValues[0].value,
      value: parseInt(row.metricValues[0].value, 10),
    }));

    // Parse Top Pages
    const topPages = (pagesResponse.rows || []).map(row => {
      const seconds = Math.round(parseFloat(row.metricValues[1].value));
      const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
      const ss = String(seconds % 60).padStart(2, '0');

      return {
        path: row.dimensionValues[0].value,
        views: parseInt(row.metricValues[0].value, 10),
        time: `${mm}:${ss}`,
      };
    });

    // Parse New vs Returning
    const newReturningData = (newReturningResponse.rows || []).map(row => {
      let name = row.dimensionValues[0].value;
      if (name === 'new') name = 'Khách Mới';
      if (name === 'returning') name = 'Khách Cũ';
      return {
        name,
        value: parseInt(row.metricValues[0].value, 10),
      };
    }).filter(item => item.name === 'Khách Mới' || item.name === 'Khách Cũ');

    const formatDuration = (seconds) => {
      const s = Math.round(seconds);
      const m = Math.floor(s / 60);
      return `${String(m).padStart(2,'0')}m ${String(s % 60).padStart(2,'0')}s`;
    };

    const finalData = {
      kpi: {
        pageviews: totalPageviews.toLocaleString(),
        visitors: totalVisitors.toLocaleString(),
        bounceRate: `${avgBounceRate.toFixed(1)}%`,
        avgDuration: formatDuration(avgDuration),
        changes: {
          pageviews: "+0.0%",
          visitors: "+0.0%",
          bounceRate: "-0.0%",
          avgDuration: "+0.0%"
        }
      },
      trafficData,
      sourceData,
      deviceData,
      topPages,
      newReturningData
    };

    // Save to Cache
    cache.set(cacheKey, {
      timestamp: Date.now(),
      data: finalData
    });

    return finalData;
  } catch (error) {
    console.error('GA4 Fetch Error:', error);
    throw error;
  }
};

module.exports = {
  getTrafficData
};
