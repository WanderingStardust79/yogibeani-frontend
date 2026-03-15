const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, 'data', 'yogibeani.db');
const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    style TEXT NOT NULL,
    day_of_week INTEGER NOT NULL,
    time TEXT NOT NULL,
    duration INTEGER NOT NULL DEFAULT 60,
    capacity INTEGER NOT NULL DEFAULT 15,
    instructor TEXT NOT NULL DEFAULT 'Charlene',
    description TEXT DEFAULT '',
    color TEXT DEFAULT '#C4956A',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    class_id INTEGER NOT NULL,
    client_name TEXT NOT NULL,
    client_email TEXT NOT NULL,
    client_phone TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'confirmed',
    booked_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS waivers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT DEFAULT '',
    emergency_contact_name TEXT DEFAULT '',
    emergency_contact_phone TEXT DEFAULT '',
    medical_conditions TEXT DEFAULT '',
    signature_data TEXT NOT NULL,
    signed_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_name TEXT NOT NULL,
    client_email TEXT NOT NULL,
    package_type TEXT NOT NULL,
    amount REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'completed',
    purchased_at TEXT DEFAULT (datetime('now'))
  );
`);

// Seed default settings if empty
const settingsCount = db.prepare('SELECT COUNT(*) as count FROM settings').get();
if (settingsCount.count === 0) {
  const insert = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
  const defaults = {
    studio_name: 'YogiBeani',
    studio_email: 'yogibeani@gmail.com',
    studio_phone: '',
    studio_address: 'Salt Lake City, UT',
    stripe_publishable_key: '',
    stripe_price_drop_in: '',
    stripe_price_five_pack: '',
    stripe_price_ten_pack: '',
    stripe_price_unlimited: '',
    pricing_drop_in: '20',
    pricing_five_pack: '90',
    pricing_ten_pack: '160',
    pricing_unlimited: '120'
  };
  const insertMany = db.transaction(() => {
    for (const [key, value] of Object.entries(defaults)) {
      insert.run(key, value);
    }
  });
  insertMany();
}

module.exports = db;
