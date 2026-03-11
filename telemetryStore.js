const { DateTime } = require('luxon');

class TelemetryStore {
  constructor() {
    this.metrics = []; 
    this.logs = []; 

    // Default alert rule
    this.alertRules = [
      {
        id: 'error_rate_rule',
        name: 'High error rate',
        service: null,
        metric: 'errors',
        windowMinutes: 5,
        threshold: 0.05,
        severity: 'critical'
      }
    ];

    this.acknowledged = new Set();
  }

  /* ---------------------- TELEMETRY INGEST ---------------------- */

  ingestTelemetry(item) {
    const ts = item.timestamp ? DateTime.fromISO(item.timestamp).toMillis() : Date.now();

    if (item.type === 'metric') {
      const { name, value } = item.fields || {};
      if (!name || typeof value === 'undefined')
        throw new Error('metric fields require name and value');
      this.metrics.push({
        service: item.service,
        name,
        value: Number(value),
        timestamp: ts
      });

    } else if (item.type === 'log') {
      const { level, message } = item.fields || {};
      if (!level || !message)
        throw new Error('log fields require level and message');
      this.logs.push({
        service: item.service,
        level,
        message,
        timestamp: ts
      });

    } else {
      throw new Error('unknown telemetry type');
    }
  }

  ingestBatch(items) {
    for (const it of items) {
      this.ingestTelemetry(it);
    }
  }

  /* ---------------------- SERVICES ---------------------- */

  listServices() {
    const set = new Set();
    this.metrics.forEach(m => set.add(m.service));
    this.logs.forEach(l => set.add(l.service));
    return Array.from(set).sort();
  }

  /* ---------------------- METRICS QUERY ---------------------- */

  queryMetrics({ service, metricName, from, to, resolutionMs }) {
    const fromTs = from ? DateTime.fromISO(from).toMillis() : 0;
    const toTs = to ? DateTime.fromISO(to).toMillis() : Date.now();

    const filtered = this.metrics.filter(m =>
      m.service === service &&
      m.name === metricName &&
      m.timestamp >= fromTs &&
      m.timestamp <= toTs
    );

    if (!resolutionMs) {
      return filtered.sort((a, b) => a.timestamp - b.timestamp);
    }

    const buckets = new Map();
    filtered.forEach(m => {
      const bucket = Math.floor(m.timestamp / resolutionMs) * resolutionMs;
      if (!buckets.has(bucket)) buckets.set(bucket, []);
      buckets.get(bucket).push(m.value);
    });

    return Array.from(buckets.entries())
      .map(([bucket, values]) => ({
        timestamp: bucket,
        value: values.reduce((a, b) => a + b, 0) / values.length
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  /* ---------------------- LOGS QUERY ---------------------- */

  queryLogs({ service, level, q, from, to, limit = 200, offset = 0 }) {
    const fromTs = from ? DateTime.fromISO(from).toMillis() : 0;
    const toTs = to ? DateTime.fromISO(to).toMillis() : Date.now();

    let list = this.logs.filter(l =>
      (!service || l.service === service) &&
      (!level || l.level.toLowerCase() === level.toLowerCase()) &&
      l.timestamp >= fromTs &&
      l.timestamp <= toTs
    );

    if (q) {
      const qlc = q.toLowerCase();
      list = list.filter(l => l.message.toLowerCase().includes(qlc));
    }

    list.sort((a, b) => b.timestamp - a.timestamp);

    return {
      total: list.length,
      logs: list.slice(offset, offset + limit)
    };
  }

  /* ---------------------- ALERT RULE CRUD ---------------------- */

  getRules() {
    return this.alertRules;
  }

  addRule(rule) {
    rule.id = Date.now().toString();
    this.alertRules.push(rule);
  }

  updateRule(id, data) {
    const i = this.alertRules.findIndex(r => r.id === id);
    if (i === -1) return false;
    this.alertRules[i] = { ...this.alertRules[i], ...data };
    return true;
  }

  deleteRule(id) {
    const before = this.alertRules.length;
    this.alertRules = this.alertRules.filter(r => r.id !== id);
    return this.alertRules.length !== before;
  }

  /* ---------------------- ALERT EVALUATION ---------------------- */

  activeAlerts() {
    const services = this.listServices();
    const alerts = [];
    const now = Date.now();

    for (const rule of this.alertRules) {
      const evaluationServices = rule.service ? [rule.service] : services;

      for (const svc of evaluationServices) {
        const windowStart = now - rule.windowMinutes * 60 * 1000;

        const logs = this.logs.filter(l =>
          l.service === svc &&
          l.timestamp >= windowStart &&
          l.timestamp <= now
        );

        const errorCount = logs.filter(l => l.level.toLowerCase() === 'error').length;
        const totalCount = logs.length || 1;
        const errorRate = errorCount / totalCount;

        if (errorRate > rule.threshold) {
          const id = `${rule.id}:${svc}`;
          alerts.push({
            id,
            ruleId: rule.id,
            service: svc,
            name: rule.name,
            severity: rule.severity,
            value: errorRate,
            threshold: rule.threshold,
            windowMinutes: rule.windowMinutes,
            timestamp: now,
            acknowledged: this.acknowledged.has(id)
          });
        }
      }
    }

    return alerts;
  }

  /* ---------------------- ACK ALERT ---------------------- */

  acknowledgeAlert(id) {
    this.acknowledged.add(id);
  }

  /* ---------------------- RESET ---------------------- */

  reset() {
    this.metrics = [];
    this.logs = [];
    this.acknowledged.clear();
  }
}

module.exports = new TelemetryStore();
