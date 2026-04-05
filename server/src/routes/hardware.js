const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');

router.get('/', (req, res) => {
  const models = db.prepare(`
    SELECT * FROM hardware_models
    WHERE is_active = 1
    ORDER BY category ASC, sort_order ASC, model_name ASC
  `).all();

  const grouped = models.reduce((acc, m) => {
    if (!acc[m.category]) acc[m.category] = [];
    acc[m.category].push(m);
    return acc;
  }, {});

  res.json({ models, grouped });
});

router.get('/all', (req, res) => {
  const models = db.prepare(`
    SELECT * FROM hardware_models
    ORDER BY category ASC, sort_order ASC, model_name ASC
  `).all();
  res.json(models);
});

router.post('/', (req, res) => {
  const { category, brand, model_name, model_number, description } = req.body;
  if (!category) return res.status(400).json({ error: 'Category is required' });
  if (!model_name) return res.status(400).json({ error: 'Model name is required' });

  const maxOrder = db.prepare('SELECT MAX(sort_order) as max FROM hardware_models WHERE category = ?').get(category);
  const sort_order = (maxOrder.max ?? -1) + 1;

  const id = uuidv4();
  db.prepare(`
    INSERT INTO hardware_models (id, category, brand, model_name, model_number, description, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, category, brand || 'Verkada', model_name, model_number || null, description || null, sort_order);

  res.status(201).json(db.prepare('SELECT * FROM hardware_models WHERE id = ?').get(id));
});

router.put('/:id', (req, res) => {
  const model = db.prepare('SELECT * FROM hardware_models WHERE id = ?').get(req.params.id);
  if (!model) return res.status(404).json({ error: 'Hardware model not found' });

  const { category, brand, model_name, model_number, description, is_active } = req.body;
  db.prepare(`
    UPDATE hardware_models SET
      category = COALESCE(?, category),
      brand = COALESCE(?, brand),
      model_name = COALESCE(?, model_name),
      model_number = COALESCE(?, model_number),
      description = COALESCE(?, description),
      is_active = COALESCE(?, is_active)
    WHERE id = ?
  `).run(category, brand, model_name, model_number, description, is_active, req.params.id);

  res.json(db.prepare('SELECT * FROM hardware_models WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const model = db.prepare('SELECT * FROM hardware_models WHERE id = ?').get(req.params.id);
  if (!model) return res.status(404).json({ error: 'Hardware model not found' });

  db.prepare('UPDATE hardware_models SET is_active = 0 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
