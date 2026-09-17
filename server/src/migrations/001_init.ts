import { Database } from "better-sqlite3";

export function up(db: Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      avatar TEXT NOT NULL,
      department TEXT NOT NULL,
      is_super_admin INTEGER NOT NULL DEFAULT 0,
      is_approved INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS systems (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      description TEXT NOT NULL,
      color TEXT NOT NULL,
      accent_bg TEXT NOT NULL,
      tag TEXT NOT NULL,
      url TEXT
    );

    CREATE TABLE IF NOT EXISTS user_system_access (
      user_id TEXT NOT NULL,
      system_id TEXT NOT NULL,
      -- Allow arbitrary role strings so custom roles can be used
      role TEXT NOT NULL,
      PRIMARY KEY (user_id, system_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (system_id) REFERENCES systems(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor TEXT,
      action TEXT NOT NULL,
      details TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      priority TEXT NOT NULL,
      audience_type TEXT NOT NULL,
      audience_json TEXT,
      attachment_url TEXT,
      attachment_name TEXT,
      scheduled_at TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS custom_roles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS announcement_clicks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      announcement_id TEXT NOT NULL,
      user_email TEXT,
      clicked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0
    );
  `);
}

export const id = "001_init";
