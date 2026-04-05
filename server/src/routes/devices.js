const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');

router.get('/', (req, res) => {
  const { job_id } = req.query;
  if (!job_id) return res.status(400).json({ error: 'job_id is required' });

  const devices = db.prepare(`
    SELECT d.*, hm.model_name, hm.model_number, hm.category as hw_category, hm.brand,
      (SELECT COUNT(*) FROM photos WHERE device_id = d.id) as photo_count
    FROM devices d
    LEFT JOIN hardware_models hm ON d.hardware_model_id = hm.id
    WHERE d.job_id = ?
    ORDER BY d.sort_order ASC, d.created_at ASC
  `).all(job_id);

  res.json(devices);
});

router.get('/:id', (req, res) => {
  const device = db.prepare(`
    SELECT d.*, hm.model_name, hm.model_number, hm.category as hw_category, hm.brand, hm.description as hw_description
    FROM devices d
    LEFT JOIN hardware_models hm ON d.hardware_model_id = hm.id
    WHERE d.id = ?
  `).get(req.params.id);

  if (!device) return res.status(404).json({ error: 'Device not found' });

  const photos = db.prepare(
    'SELECT * FROM photos WHERE device_id = ? ORDER BY sort_order ASC, created_at ASC'
  ).all(req.params.id);

  res.json({ ...device, photos });
});

router.post('/', (req, res) => {
  const { job_id, name, device_type, hardware_model_id, location, notes } = req.body;
  if (!job_id) return res.status(400).json({ error: 'job_id is required' });
  if (!name) return res.status(400).json({ error: 'Device name is required' });

  const job = db.prepare('SELECT id FROM jobs WHERE id = ?').get(job_id);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  const maxOrder = db.prepare('SELECT MAX(sort_order) as max FROM devices WHERE job_id = ?').get(job_id);
  const sort_order = (maxOrder.max ?? -1) + 1;

  const id = uuidv4();
  db.prepare(`
    INSERT INTO devices (id, job_id, name, device_type, hardware_model_id, location, notes, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, job_id, name, device_type || null, hardware_model_id || null, location || null, notes || null, sort_order);

  db.prepare('UPDATE jobs SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(job_id);

  const device = db.prepare(`
    SELECT d.*, hm.model_name, hm.model_number, hm.category as hw_category, hm.brand
    FROM devices d
    LEFT JOIN hardware_models hm ON d.hardware_model_id = hm.id
    WHERE d.id = ?
  `).get(id);

  res.status(201).json({ ...device, photos: [] });
});

router.put('/:id', (req, res) => {
  const device = db.prepare('SELECT * FROM devices WHERE id = ?').get(req.params.id);
  if (!device) return res.status(404).json({ error: 'Device not found' });

  const { name, device_type, hardware_model_id, location, notes } = req.body;
  db.prepare(`
    UPDATE devices SET
      name = COALESCE(?, name),
      device_type = COALESCE(?, device_type),
      hardware_model_id = ?,
      location = COALESCE(?, location),
      notes = COALESCE(?, notes),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(name, device_type, hardware_model_id ?? device.hardware_model_id, location, notes, req.params.id);

  db.prepare('UPDATE jobs SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(device.job_id);

  const updated = db.prepare(`
    SELECT d.*, hm.model_name, hm.model_number, hm.category as hw_category, hm.brand
    FROM devices d
    LEFT JOIN hardware_models hm ON d.hardware_model_id = hm.id
    WHERE d.id = ?
  `).get(req.params.id);

  const photos = db.prepare('SELECT * FROM photos WHERE device_id = ? ORDER BY sort_order ASC, created_at ASC').all(req.params.id);
  res.json({ ...updated, photos });
});

router.delete('/:id', (req, res) => {
  const device = db.prepare('SELECT * FROM devices WHERE id = ?').get(req.params.id);
  if (!device) return res.status(404).json({ error: 'Device not found' });

  db.prepare('DELETE FROM devices WHERE id = ?').run(req.params.id);
  db.prepare('UPDATE jobs SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(device.job_id);
  res.json({ success: true });
});

module.exports = router;
