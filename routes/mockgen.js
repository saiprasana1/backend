const express = require('express');
const router = express.Router();
const store = require('../telemetryStore');
const { faker } = require('@faker-js/faker');

const { DateTime } = require('luxon');

const SERVICES = ['payments', 'checkout', 'users'];

router.post('/generate', (req, res) => {
  const now = DateTime.local().toMillis();
  const start = now - 60 * 60 * 1000; 
  const items = [];

  SERVICES.forEach(service => {
    let latencyBase = service === 'payments' ? 180 : service === 'checkout' ? 120 : 80;
    for (let t = start; 
      t <= now; 
      t += 10 * 1000) {
      const spike = Math.random() < 0.02 ? (Math.random() * 600) : 0;
      const latency = Math.max(10, latencyBase + (Math.random() - 0.5) * 40 + spike);
      items.push({
        type: 'metric',
        service,
        timestamp: DateTime.fromMillis(t).toISO(),
        fields: {
          name: 'latency',
          value: Math.round(latency)
        }
      });

      const reqs = Math.max(1, Math.round(100 + (Math.random() - 0.5) * 50));
      items.push({
        type: 'metric',
        service,
        timestamp: DateTime.fromMillis(t + 100).toISO(),
        fields: {
          name: 'requests',
          value: reqs
        }
      });

      if (Math.random() < (service === 'payments' ? 0.06 : 0.03)) {
        items.push({
          type: 'log',
          service,
          timestamp: DateTime.fromMillis(t + 200).toISO(),
          fields: {
            level: 'error',
            message: faker.hacker.phrase()
          }
        });
      } else {
        items.push({
          type: 'log',
          service,
          timestamp: DateTime.fromMillis(t + 200).toISO(),
          fields: {
            level: 'info',
            message: faker.hacker.phrase()
          }
        });
      }
    }
  });
  // error generate
  const spikeStart = now - 10 * 60 * 1000;
  for (let t = spikeStart; t < now; t += 30 * 1000) {
    if (Math.random() < 0.5) {
      items.push({
        type: 'log',
        service: 'payments',
        timestamp: DateTime.fromMillis(t).toISO(),
        fields: { level: 'error', message: 'payment processor timeout' }
      });
    }
  }

  store.ingestBatch(items);
  res.json({ status: 'ok', generated: items.length });
});

module.exports = router;
