const express = require('express');
const router = express.Router();
const store = require('../telemetryStore');

// GET /alerts
router.get('/', (req, res) => {
  const alerts = store.activeAlerts();
  res.json({ alerts });
});

// POST /alerts/ack
router.post('/ack', (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: 'id required' });
  
  store.acknowledgeAlert(id);
  res.json({ status: 'ok' });
});

module.exports = router;
