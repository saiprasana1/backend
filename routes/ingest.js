const express = require('express');
const router = express.Router();
const store = require('../telemetryStore');

router.post('/', (req, res) => {
  try {
    const body = req.body;
    if (Array.isArray(body)) {
      store.ingestBatch(body);
    } else {
      store.ingestTelemetry(body);
    }
    res.json({ status: 'ok' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
