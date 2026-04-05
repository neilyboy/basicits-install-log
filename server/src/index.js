require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
const { UPLOADS_DIR, THUMBNAILS_DIR } = require('./db');
const { exportJobAsZip, serveReportInline } = require('./export');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/uploads', express.static(UPLOADS_DIR));
app.use('/thumbnails', express.static(THUMBNAILS_DIR));

app.use('/api/jobs', require('./routes/jobs'));
app.use('/api/devices', require('./routes/devices'));
app.use('/api/photos', require('./routes/photos'));
app.use('/api/hardware', require('./routes/hardware'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/import', require('./routes/import'));

app.get('/api/jobs/:id/export', async (req, res) => {
  const shareUrl = `${req.protocol}://${req.get('host')}/share/${req.params.id}`;
  try {
    await exportJobAsZip(req.params.id, res, { shareUrl });
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

app.get('/share/:id', async (req, res) => {
  const shareUrl = `${req.protocol}://${req.get('host')}/share/${req.params.id}`;
  try {
    await serveReportInline(req.params.id, res, shareUrl);
  } catch (err) {
    if (!res.headersSent) res.status(500).send(`<html><body style="font-family:sans-serif;padding:2rem"><h2>Error: ${err.message}</h2></body></html>`);
  }
});

app.get('/share/:id/print', async (req, res) => {
  const shareUrl = `${req.protocol}://${req.get('host')}/share/${req.params.id}`;
  try {
    await serveReportInline(req.params.id, res, shareUrl, { autoPrint: true });
  } catch (err) {
    if (!res.headersSent) res.status(500).send(`<html><body style="font-family:sans-serif;padding:2rem"><h2>Error: ${err.message}</h2></body></html>`);
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const CLIENT_BUILD = path.join(__dirname, '../../client/dist');
if (fs.existsSync(CLIENT_BUILD)) {
  app.use(express.static(CLIENT_BUILD));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/') || req.path.startsWith('/thumbnails/') || req.path.startsWith('/share/')) return;
    res.sendFile(path.join(CLIENT_BUILD, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.send('<h2>Basic ITS Install Log - API running. Client not built yet.</h2>');
  });
}

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Basic ITS Install Log server running on port ${PORT}`);
});
