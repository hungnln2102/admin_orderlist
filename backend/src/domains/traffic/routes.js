const express = require('express');
const { getTrafficStats } = require('./controller');

const router = express.Router();

router.get('/stats', getTrafficStats);

module.exports = router;
