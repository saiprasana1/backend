const express = require('express');
const router = express.Router();
const store = require('../telemetryStore');

router.get('/', (req, res) => {
  const { service, level, q, from, to, limit, offset } = req.query;
  const l = limit ? parseInt(limit, 10) : 200;
  const o = offset ? parseInt(offset, 10) : 0;
  const result = store.queryLogs({ service, level, q, from, to, limit: l, offset: o });
  res.json(result);
});

module.exports = router;
