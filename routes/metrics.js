const express = require('express');
const router = express.Router();
const store = require('../telemetryStore');

router.get('/', (req, res) => {
  const { service, metric, from, to, resolutionMs } = req.query;
  if (!service || !metric) {
    return res.status(400).json({ error: 'service and metric required' });
  }
  const resMs = resolutionMs ? parseInt(resolutionMs, 10) : null;
  const data = store.queryMetrics({ service, metricName: metric, from, to, resolutionMs: resMs });
  res.json({ series: data });
});

module.exports = router;
