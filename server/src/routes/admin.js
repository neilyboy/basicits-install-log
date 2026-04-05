const express = require('express');
const router = express.Router();
const { db } = require('../db');

router.post('/verify-pin', (req, res) => {
  const { pin } = req.body;
  if (!pin) return res.status(400).json({ error: 'PIN is required' });

  const setting = db.prepare("SELECT value FROM settings WHERE key = 'admin_pin'").get();
  const correct = setting && setting.value === String(pin);
  res.json({ valid: correct });
});

router.post('/change-pin', (req, res) => {
  const { current_pin, new_pin } = req.body;
  if (!current_pin || !new_pin) return res.status(400).json({ error: 'current_pin and new_pin are required' });
  if (String(new_pin).length < 4) return res.status(400).json({ error: 'PIN must be at least 4 digits' });

  const setting = db.prepare("SELECT value FROM settings WHERE key = 'admin_pin'").get();
  if (!setting || setting.value !== String(current_pin)) {
    return res.status(401).json({ error: 'Current PIN is incorrect' });
  }

  db.prepare("UPDATE settings SET value = ? WHERE key = 'admin_pin'").run(String(new_pin));
  res.json({ success: true });
});

module.exports = router;
