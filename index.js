const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require("path");

const ingest = require('./routes/ingest');
const metrics = require('./routes/metrics');
const logs = require('./routes/logs');
const alerts = require('./routes/alerts');
const mockgen = require('./routes/mockgen');
const rules = require('./routes/rules');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(bodyParser.json({ limit: '5mb' }));

// API routes
app.use('/ingest', ingest);
app.use('/metrics', metrics);
app.use('/logs', logs);
app.use('/alerts', alerts);
app.use('/mock', mockgen);
app.use('/rules', rules);

// Optional API status route
app.get('/api/status', (req, res) => res.json({ status: 'ok' }));

// // Serve frontend static files
// const frontendPath = path.join(__dirname, "../frontend/dist");
// app.use(express.static(frontendPath));

// // SPA fallback for React/Vite
// app.get("*", (req, res) => {
//   res.sendFile(path.join(frontendPath, "index.html"));
// });

app.listen(PORT, () => {
  console.log(`Observability backend listening on http://localhost:${PORT}`);
});
