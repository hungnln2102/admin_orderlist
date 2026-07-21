const { getTrafficData } = require('@/services/googleAnalytics');

const getTrafficStats = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const data = await getTrafficData(days);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch traffic data' });
  }
};

module.exports = {
  getTrafficStats
};
