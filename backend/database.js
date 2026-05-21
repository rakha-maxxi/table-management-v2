const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

async function setupDatabase() {
  const db = await open({
    filename: path.join(__dirname, 'database.sqlite'),
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      floor_number INTEGER DEFAULT 1,
      type TEXT DEFAULT 'indoor',
      status TEXT DEFAULT 'active',
      layout_width INTEGER DEFAULT 800,
      layout_height INTEGER DEFAULT 600,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS tables (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      code TEXT NOT NULL,
      name TEXT,
      shape TEXT DEFAULT 'square',
      capacity_min INTEGER DEFAULT 2,
      capacity_max INTEGER DEFAULT 4,
      chair_count INTEGER DEFAULT 4,
      status TEXT DEFAULT 'available',
      x_position REAL DEFAULT 0,
      y_position REAL DEFAULT 0,
      width REAL DEFAULT 80,
      height REAL DEFAULT 80,
      rotation REAL DEFAULT 0,
      notes TEXT,
      created_at TEXT,
      updated_at TEXT,
      FOREIGN KEY (room_id) REFERENCES rooms(id)
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      booking_code TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT,
      party_size INTEGER DEFAULT 2,
      booking_date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT,
      duration_minutes INTEGER DEFAULT 90,
      status TEXT DEFAULT 'confirmed',
      channel TEXT DEFAULT 'admin',
      assigned_table_id TEXT,
      special_request TEXT,
      internal_notes TEXT,
      created_at TEXT,
      updated_at TEXT,
      FOREIGN KEY (assigned_table_id) REFERENCES tables(id)
    );

    CREATE TABLE IF NOT EXISTS auditLogs (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      old_value TEXT,
      new_value TEXT,
      actor_name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      status TEXT DEFAULT 'active',
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      parent_id TEXT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      created_at TEXT,
      updated_at TEXT,
      FOREIGN KEY (parent_id) REFERENCES organizations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS organization_access (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      organization_id TEXT NOT NULL,
      role_id TEXT NOT NULL,
      permissions TEXT DEFAULT '[]',
      created_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
      FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
      UNIQUE(user_id, organization_id)
    );
  `);

  // Migration: Add permissions column to organization_access if it doesn't exist
  try {
    const tableInfo = await db.all("PRAGMA table_info(organization_access);");
    const hasPermissions = tableInfo.some(col => col.name === 'permissions');
    if (!hasPermissions) {
      await db.exec("ALTER TABLE organization_access ADD COLUMN permissions TEXT DEFAULT '[]';");
    }
  } catch (err) {
    console.error('Migration error adding permissions column:', err);
  }

  return db;
}

module.exports = setupDatabase;
