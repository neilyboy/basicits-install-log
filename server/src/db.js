const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../../data');
const DB_PATH = path.join(DATA_DIR, 'basicits.db');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const THUMBNAILS_DIR = path.join(DATA_DIR, 'thumbnails');

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOADS_DIR, { recursive: true });
fs.mkdirSync(THUMBNAILS_DIR, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      client TEXT,
      address TEXT,
      contact_name TEXT,
      contact_phone TEXT,
      status TEXT DEFAULT 'open',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      name TEXT NOT NULL,
      device_type TEXT,
      hardware_model_id TEXT,
      location TEXT,
      notes TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS photos (
      id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      thumbnail_filename TEXT,
      caption TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS hardware_models (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      brand TEXT DEFAULT 'Verkada',
      model_name TEXT NOT NULL,
      model_number TEXT,
      description TEXT,
      is_active INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const pinExists = db.prepare("SELECT value FROM settings WHERE key = 'admin_pin'").get();
  if (!pinExists) {
    const defaultPin = process.env.ADMIN_PIN || '1234';
    db.prepare("INSERT INTO settings (key, value) VALUES ('admin_pin', ?)").run(defaultPin);
  }

  const hwCount = db.prepare('SELECT COUNT(*) as c FROM hardware_models').get();
  if (hwCount.c === 0) {
    seedHardwareModels();
  }

  const catalogVersion = db.prepare("SELECT value FROM settings WHERE key = 'catalog_version'").get();
  if (!catalogVersion || parseInt(catalogVersion.value) < 2) {
    migrateHardwareModels();
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('catalog_version', '2')").run();
  }
}

const VERKADA_MODELS = [
  // ── Indoor Dome ──────────────────────────────────────────────────────────
  { category: 'Camera', model_name: 'CD22 Indoor Dome', model_number: 'CD22', description: '3MP, Fixed lens, 30-90 days' },
  { category: 'Camera', model_name: 'CD32 Indoor Dome', model_number: 'CD32', description: '3MP, Fixed lens, 30-90 days' },
  { category: 'Camera', model_name: 'CD43 Indoor Dome', model_number: 'CD43', description: '5MP, Fixed lens, 30-365 days' },
  { category: 'Camera', model_name: 'CD53 Indoor Dome', model_number: 'CD53', description: '5MP, Zoom lens, 30-365 days' },
  { category: 'Camera', model_name: 'CD63 Indoor Dome', model_number: 'CD63', description: '4K, Zoom lens, 30-120 days' },
  // ── Outdoor Dome ─────────────────────────────────────────────────────────
  { category: 'Camera', model_name: 'CD22-E Outdoor Dome', model_number: 'CD22-E', description: '3MP, Fixed lens, outdoor' },
  { category: 'Camera', model_name: 'CD32-E Outdoor Dome', model_number: 'CD32-E', description: '3MP, Fixed lens, outdoor' },
  { category: 'Camera', model_name: 'CD43-E Outdoor Dome', model_number: 'CD43-E', description: '5MP, Fixed lens, outdoor' },
  { category: 'Camera', model_name: 'CD53-E Outdoor Dome', model_number: 'CD53-E', description: '5MP, Zoom lens, outdoor' },
  { category: 'Camera', model_name: 'CD63-E Outdoor Dome', model_number: 'CD63-E', description: '4K, Zoom lens, outdoor' },
  // ── Bullet ───────────────────────────────────────────────────────────────
  { category: 'Camera', model_name: 'CB52-E Outdoor Bullet', model_number: 'CB52-E', description: '5MP, Zoom lens' },
  { category: 'Camera', model_name: 'CB62-E Outdoor Bullet', model_number: 'CB62-E', description: '4K, Zoom lens' },
  { category: 'Camera', model_name: 'CB52-TE Telephoto Bullet', model_number: 'CB52-TE', description: '5MP, Telephoto zoom' },
  { category: 'Camera', model_name: 'CB62-TE Telephoto Bullet', model_number: 'CB62-TE', description: '4K, Telephoto zoom' },
  // ── Mini ─────────────────────────────────────────────────────────────────
  { category: 'Camera', model_name: 'CM22 Mini Indoor', model_number: 'CM22', description: '3MP, Fixed lens' },
  { category: 'Camera', model_name: 'CM42 Mini Indoor', model_number: 'CM42', description: '5MP, Fixed lens' },
  { category: 'Camera', model_name: 'CM41-E Mini Outdoor', model_number: 'CM41-E', description: '5MP, Fixed lens, outdoor' },
  { category: 'Camera', model_name: 'CM42-S Mini Indoor', model_number: 'CM42-S', description: '5MP, Fixed lens, 30-90 days' },
  // ── Fisheye ──────────────────────────────────────────────────────────────
  { category: 'Camera', model_name: 'CF83-E Fisheye', model_number: 'CF83-E', description: '12.5MP, 360° coverage' },
  // ── Multisensor ──────────────────────────────────────────────────────────
  { category: 'Camera', model_name: 'CY53-E 2-Sensor', model_number: 'CY53-E', description: '2-sensor, 5MP each' },
  { category: 'Camera', model_name: 'CY63-E 2-Sensor', model_number: 'CY63-E', description: '2-sensor, 4K each' },
  { category: 'Camera', model_name: 'CH52-E 4-Sensor', model_number: 'CH52-E', description: '4-sensor, 5MP each' },
  { category: 'Camera', model_name: 'CH53-E 4-Sensor', model_number: 'CH53-E', description: '4-sensor, 5MP each' },
  { category: 'Camera', model_name: 'CH63-E 4-Sensor', model_number: 'CH63-E', description: '4-sensor, 4K each' },
  // ── PTZ ──────────────────────────────────────────────────────────────────
  { category: 'Camera', model_name: 'CP52-E PTZ', model_number: 'CP52-E', description: '5MP, Optical zoom PTZ' },
  { category: 'Camera', model_name: 'CP63-E PTZ', model_number: 'CP63-E', description: '4K, Optical zoom PTZ' },
  // ── Remote / Specialty ───────────────────────────────────────────────────
  { category: 'Camera', model_name: 'CR63-E Remote', model_number: 'CR63-E', description: '4K, Solar/cellular capable' },
  // ── Access Control — Controllers ─────────────────────────────────────────
  { category: 'Access Control', model_name: 'AC12 1-Door Controller', model_number: 'AC12', description: '1 door, PoE-powered' },
  { category: 'Access Control', model_name: 'AC42 4-Door Controller', model_number: 'AC42', description: '4 wired doors, 2 AUX I/Os' },
  { category: 'Access Control', model_name: 'AC62 16-Door Controller', model_number: 'AC62', description: '16 wired doors, 2 AUX I/Os' },
  { category: 'Access Control', model_name: 'AX11 I/O & Elevator Controller', model_number: 'AX11', description: '16 inputs, 16 outputs, 2 readers' },
  // ── Access Control — Readers ─────────────────────────────────────────────
  { category: 'Access Control', model_name: 'AD34 Door Reader', model_number: 'AD34', description: 'LF/HF/NFC/BLE, no PIN' },
  { category: 'Access Control', model_name: 'AD64 Door Reader', model_number: 'AD64', description: 'LF/HF/NFC/BLE, PIN + 2FA' },
  // ── Access Control — Wireless Locks ──────────────────────────────────────
  { category: 'Access Control', model_name: 'AL54-CY Cylindrical Lock', model_number: 'AL54-CY', description: 'Wireless cylindrical lock, VLink' },
  { category: 'Access Control', model_name: 'AL54-MS Mortise Lock', model_number: 'AL54-MS', description: 'Wireless mortise lock, VLink' },
  // ── Intercom ─────────────────────────────────────────────────────────────
  { category: 'Intercom', model_name: 'TD33 Video Intercom', model_number: 'TD33', description: '5MP, 7 unlock methods, surface mount' },
  { category: 'Intercom', model_name: 'TD53 Video Intercom', model_number: 'TD53', description: '5MP, 7 unlock methods, flush mount' },
  { category: 'Intercom', model_name: 'TD63 Video Intercom', model_number: 'TD63', description: '5MP, 8 unlock methods, premium' },
  { category: 'Intercom', model_name: 'TS12 Audio Intercom', model_number: 'TS12', description: 'Square audio intercom, IP69/IK10' },
  // ── Environmental / Air Quality ───────────────────────────────────────────
  { category: 'Environmental', model_name: 'SV21 Air Quality Sensor', model_number: 'SV21', description: '8 readings, cold storage range' },
  { category: 'Environmental', model_name: 'SV23 Air Quality Sensor', model_number: 'SV23', description: '15 readings' },
  { category: 'Environmental', model_name: 'SV25 Air Quality Sensor', model_number: 'SV25', description: '20 readings + audio, 90-day' },
  { category: 'Environmental', model_name: 'SV25-128 Air Quality Sensor', model_number: 'SV25-128', description: '20 readings + audio, 365-day' },
  // ── Alarm — Panels ────────────────────────────────────────────────────────
  { category: 'Alarm', model_name: 'BP32 Wireless Alarm Panel', model_number: 'BP32', description: 'Wireless alarm panel' },
  { category: 'Alarm', model_name: 'BP52 Alarm Panel', model_number: 'BP52', description: 'Wired/wireless alarm panel' },
  { category: 'Alarm', model_name: 'BK22 Alarm Keypad', model_number: 'BK22', description: 'Arm/disarm keypad, camera view' },
  { category: 'Alarm', model_name: 'BE32 Alarm Expander', model_number: 'BE32', description: 'Zone expansion module' },
  // ── Alarm — Wireless Hubs ────────────────────────────────────────────────
  { category: 'Alarm', model_name: 'WH32 Wireless Repeater', model_number: 'WH32', description: 'Extends wireless sensor range' },
  { category: 'Alarm', model_name: 'WH52 Wireless Hub', model_number: 'WH52', description: 'Primary wireless sensor hub' },
  // ── Alarm — Wired Sensors ────────────────────────────────────────────────
  { category: 'Alarm', model_name: 'BR11 Wired Motion Sensor', model_number: 'BR11', description: 'Wired PIR motion detector' },
  { category: 'Alarm', model_name: 'BR12 Wired Door Contacts', model_number: 'BR12', description: 'Wired surface mount, 5-pack' },
  { category: 'Alarm', model_name: 'BR13 Wired Recessed Door Contacts', model_number: 'BR13', description: 'Wired recessed mount, 5-pack' },
  // ── Alarm — Wireless Sensors ─────────────────────────────────────────────
  { category: 'Alarm', model_name: 'BR31 Wireless Door Sensor', model_number: 'BR31', description: 'Wireless door/window contact' },
  { category: 'Alarm', model_name: 'BR32 Wireless Motion Sensor', model_number: 'BR32', description: 'Wireless PIR motion detector' },
  { category: 'Alarm', model_name: 'BR33 Panic Button', model_number: 'BR33', description: 'Mounted wireless panic button' },
  { category: 'Alarm', model_name: 'BR35 Water Leak Sensor', model_number: 'BR35', description: 'Wireless water leak detector' },
  { category: 'Alarm', model_name: 'QC11-W Wireless Door/Window Sensor', model_number: 'QC11-W', description: 'Q-series wireless contact' },
  { category: 'Alarm', model_name: 'QM11-W Wireless Motion Sensor', model_number: 'QM11-W', description: 'Q-series wireless wall PIR' },
  { category: 'Alarm', model_name: 'QT11-W Universal Transmitter', model_number: 'QT11-W', description: 'Q-series wireless transmitter' },
  // ── Alarm — Output Devices ───────────────────────────────────────────────
  { category: 'Alarm', model_name: 'BZ11 Horn Speaker', model_number: 'BZ11', description: 'Indoor/outdoor horn speaker' },
  { category: 'Alarm', model_name: 'BZ32 Siren Strobe', model_number: 'BZ32', description: 'Siren with strobe light' },
  // ── Viewing Station ───────────────────────────────────────────────────────
  { category: 'Viewing Station', model_name: 'Viewing Station', model_number: 'VS', description: 'Local video viewing station' },
  // ── Networking / Connectivity ─────────────────────────────────────────────
  { category: 'Networking', model_name: 'CC300 Command Connector', model_number: 'CC300', description: 'Up to 10 IP camera channels' },
  { category: 'Networking', model_name: 'CC500 Command Connector', model_number: 'CC500', description: 'Up to 25 IP camera channels' },
  { category: 'Networking', model_name: 'CC700 Command Connector', model_number: 'CC700', description: 'Up to 50 IP camera channels' },
];

function seedHardwareModels() {
  const insert = db.prepare(`
    INSERT INTO hardware_models (id, category, brand, model_name, model_number, description, sort_order)
    VALUES (?, ?, 'Verkada', ?, ?, ?, ?)
  `);
  const insertMany = db.transaction((items) => {
    items.forEach((m, i) => {
      insert.run(require('uuid').v4(), m.category, m.model_name, m.model_number, m.description, i);
    });
  });
  insertMany(VERKADA_MODELS);
}

function migrateHardwareModels() {
  const insertIfMissing = db.prepare(`
    INSERT OR IGNORE INTO hardware_models (id, category, brand, model_name, model_number, description, sort_order)
    VALUES (?, ?, 'Verkada', ?, ?, ?, (SELECT COALESCE(MAX(sort_order),0)+1 FROM hardware_models))
  `);
  const migrate = db.transaction((items) => {
    items.forEach((m) => {
      const exists = db.prepare('SELECT id FROM hardware_models WHERE model_number = ?').get(m.model_number);
      if (!exists) {
        insertIfMissing.run(require('uuid').v4(), m.category, m.model_name, m.model_number, m.description);
      }
    });
  });
  migrate(VERKADA_MODELS);
}

migrate();

module.exports = { db, UPLOADS_DIR, THUMBNAILS_DIR };
