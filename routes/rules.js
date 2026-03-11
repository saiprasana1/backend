const express = require("express");
const router = express.Router();
const store = require("../telemetryStore");

// GET all rules
router.get("/", (req, res) => {
  const rules = store.getRules();
  res.json({ rules });
});

// CREATE rule: { name, service, threshold }
router.post("/", (req, res) => {
  const { name, service, threshold } = req.body;
  if (!name || !service || threshold == null)
    return res.status(400).json({ error: "all fields required" });

  store.addRule({ name, service, threshold });
  res.json({ status: "ok" });
});

// UPDATE rule
router.put("/:id", (req, res) => {
  const { id } = req.params;
  const updated = store.updateRule(id, req.body);
  res.json({ status: updated ? "ok" : "not_found" });
});

// DELETE rule
router.delete("/:id", (req, res) => {
  const { id } = req.params;
  const removed = store.deleteRule(id);
  res.json({ status: removed ? "ok" : "not_found" });
});

module.exports = router;
