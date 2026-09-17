import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Use repository-level data directory so migrations and DB helpers point to the same file
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const dataDir = path.join(repoRoot, "data");
const dbPath = path.join(dataDir, "rba.db");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const db = new Database(dbPath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

export function initSchema() {
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
      url TEXT,
      alt_url TEXT
    );

    CREATE TABLE IF NOT EXISTS user_system_access (
      user_id TEXT NOT NULL,
      system_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'manager', 'viewer')),
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
      attachment_data TEXT,
      attachment_name TEXT,
      scheduled_at TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
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

  const announcementColumns = db.prepare("PRAGMA table_info(announcements)").all() as Array<{ name: string }>;
  const existingColumns = new Set(announcementColumns.map((column) => column.name));

  const systemColumns = db.prepare("PRAGMA table_info(systems)").all() as Array<{ name: string }>;
  const existingSystemColumns = new Set(systemColumns.map((column) => column.name));

  if (!existingSystemColumns.has("alt_url")) {
    db.exec("ALTER TABLE systems ADD COLUMN alt_url TEXT;");
  }

  if (!existingColumns.has("attachment_url")) {
    db.exec("ALTER TABLE announcements ADD COLUMN attachment_url TEXT;");
  }
  if (!existingColumns.has("attachment_data")) {
    db.exec("ALTER TABLE announcements ADD COLUMN attachment_data TEXT;");
  }
  if (!existingColumns.has("attachment_name")) {
    db.exec("ALTER TABLE announcements ADD COLUMN attachment_name TEXT;");
  }
}

// Allow Role to be any string to support custom roles stored in `custom_roles`
export type Role = string;

export interface CustomRoleRow {
  id: string;
  name: string;
  description: string | null;
}

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  avatar: string;
  department: string;
  is_super_admin: number;
  is_approved: number;
}

export interface SystemRow {
  id: string;
  label: string;
  description: string;
  color: string;
  accent_bg: string;
  tag: string;
  url: string | null;
  alt_url: string | null;
}

export interface SystemSummary {
  id: string;
  label: string;
  description: string;
  color: string;
  accentBg: string;
  tag: string;
  url?: string | null;
  altUrl?: string | null;
}

export interface SystemAccessRow {
  system_id: string;
  role: Role;
}

export interface AuditLogRow {
  id: number;
  actor: string | null;
  action: string;
  details: string | null;
  created_at: string;
}

export interface DashboardSummary {
  totalUsers: number;
  totalAdmins: number;
  totalSystems: number;
  totalAccessEntries: number;
  auditLogCount: number;
  recentActivity: Array<{ action: string; details: string | null; created_at: string }>;
}

export function getUserByEmail(email: string): UserRow | undefined {
  return db
    .prepare("SELECT * FROM users WHERE lower(email) = lower(?)")
    .get(email) as UserRow | undefined;
}

export function getUserById(userId: string): UserRow | undefined {
  return db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as UserRow | undefined;
}

export function getAllUsers(): UserRow[] {
  return db.prepare("SELECT * FROM users ORDER BY name").all() as UserRow[];
}

export function getAllSystems(): SystemSummary[] {
  return db
    .prepare("SELECT id, label, description, color, accent_bg, tag, url, alt_url FROM systems ORDER BY label")
    .all()
    .map((row: any) => ({
      id: row.id,
      label: row.label,
      description: row.description,
      color: row.color,
      accentBg: row.accent_bg,
      tag: row.tag,
      url: row.url ?? null,
      altUrl: row.alt_url ?? null,
    }));
}

export function createSystem(opts: { id: string; label: string; description: string; color: string; accentBg: string; tag: string; url?: string | null; altUrl?: string | null }): SystemSummary {
  db.prepare(`
    INSERT INTO systems (id, label, description, color, accent_bg, tag, url, alt_url)
    VALUES (@id, @label, @description, @color, @accentBg, @tag, @url, @altUrl)
  `).run({
    id: opts.id,
    label: opts.label,
    description: opts.description,
    color: opts.color,
    accentBg: opts.accentBg,
    tag: opts.tag,
    url: opts.url ?? null,
    altUrl: opts.altUrl ?? null,
  });

  return {
    id: opts.id,
    label: opts.label,
    description: opts.description,
    color: opts.color,
    accentBg: opts.accentBg,
    tag: opts.tag,
    url: opts.url ?? null,
    altUrl: opts.altUrl ?? null,
  };
}

export function updateSystem(id: string, opts: { label?: string; description?: string; color?: string; accentBg?: string; tag?: string; url?: string | null; altUrl?: string | null }) {
  const row = db.prepare("SELECT * FROM systems WHERE id = ?").get(id) as SystemRow | undefined;
  if (!row) return null;

  const updated = {
    label: opts.label ?? row.label,
    description: opts.description ?? row.description,
    color: opts.color ?? row.color,
    accent_bg: opts.accentBg ?? row.accent_bg,
    tag: opts.tag ?? row.tag,
    url: typeof opts.url === "undefined" ? row.url : opts.url,
    alt_url: typeof opts.altUrl === "undefined" ? row.alt_url : opts.altUrl,
  };

  db.prepare(`
    UPDATE systems SET label = @label, description = @description, color = @color, accent_bg = @accent_bg, tag = @tag, url = @url, alt_url = @alt_url
    WHERE id = @id
  `).run({ id, label: updated.label, description: updated.description, color: updated.color, accent_bg: updated.accent_bg, tag: updated.tag, url: updated.url, alt_url: updated.alt_url });

  return getAllSystems().find((s) => s.id === id) ?? null;
}

export function getUserAccess(userId: string): SystemAccessRow[] {
  return db
    .prepare("SELECT system_id, role FROM user_system_access WHERE user_id = ?")
    .all(userId) as SystemAccessRow[];
}

export function updateUserSystemAccess(userId: string, access: Array<{ systemId: string; role: Role }>) {
  const deleteStmt = db.prepare("DELETE FROM user_system_access WHERE user_id = ?");
  const insertStmt = db.prepare(`
    INSERT INTO user_system_access (user_id, system_id, role)
    VALUES (@user_id, @system_id, @role)
  `);

  return db.transaction(() => {
    deleteStmt.run(userId);
    for (const item of access) {
      insertStmt.run({
        user_id: userId,
        system_id: item.systemId,
        role: item.role,
      });
    }
  })();
}

export function createUser(opts: {
  email: string;
  password_hash: string;
  name: string;
  avatar: string;
  department: string;
  is_super_admin?: number;
  is_approved?: number;
  systems?: Array<{ systemId: string; role: Role }>;
}) {
  const id = `u${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const insertUser = db.prepare(`
    INSERT INTO users (id, email, password_hash, name, avatar, department, is_super_admin)
    VALUES (@id, @email, @password_hash, @name, @avatar, @department, @is_super_admin)
  `);

  const insertAccess = db.prepare(`
    INSERT INTO user_system_access (user_id, system_id, role)
    VALUES (@user_id, @system_id, @role)
  `);

  return db.transaction(() => {
    insertUser.run({
      id,
      email: opts.email,
      password_hash: opts.password_hash,
      name: opts.name,
      avatar: opts.avatar,
      department: opts.department,
      is_super_admin: opts.is_super_admin ?? 0,
      is_approved: opts.is_approved ?? 1,
    });

    const systems = opts.systems ?? [];
    for (const s of systems) {
      insertAccess.run({ user_id: id, system_id: s.systemId, role: s.role });
    }

    const user = getUserById(id);
    if (!user) throw new Error("Failed to fetch created user");
    return buildUserResponse(user);
  })();
}

export function updateUserPassword(userId: string, passwordHash: string) {
  return db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(passwordHash, userId);
}

export function createAuditLog(opts: { actor?: string; action: string; details?: string }) {
  return db.prepare(`
    INSERT INTO audit_logs (actor, action, details)
    VALUES (@actor, @action, @details)
  `).run({
    actor: opts.actor ?? null,
    action: opts.action,
    details: opts.details ?? null,
  });
}

export function getAuditLogs(limit = 20, opts?: { start?: string | null; end?: string | null; action?: string | null }): AuditLogRow[] {
  const where: string[] = [];
  const params: any[] = [];
  if (opts?.start) {
    where.push("created_at >= ?");
    params.push(opts.start);
  }
  if (opts?.end) {
    where.push("created_at <= ?");
    params.push(opts.end);
  }
  if (opts?.action) {
    where.push("action LIKE ?");
    params.push(`%${opts.action}%`);
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
  return db.prepare(`
    SELECT id, actor, action, details, created_at
    FROM audit_logs
    ${whereSql}
    ORDER BY created_at DESC, id DESC
    LIMIT ?
  `).all(...params, limit) as AuditLogRow[];
}

export interface AnnouncementRow {
  id: string;
  title: string;
  message: string;
  priority: string;
  audience_type: string;
  audience_json: string | null;
  attachment_url: string | null;
  attachment_data: string | null;
  attachment_name: string | null;
  scheduled_at: string | null;
  created_by: string | null;
  created_at: string;
}

export function createAnnouncement(opts: { id: string; title: string; message: string; priority: string; audienceType: string; audienceJson?: string | null; attachmentUrl?: string | null; attachmentData?: string | null; attachmentName?: string | null; scheduledAt?: string | null; createdBy?: string | null; }) {
  db.prepare(`
    INSERT INTO announcements (id, title, message, priority, audience_type, audience_json, attachment_url, attachment_data, attachment_name, scheduled_at, created_by)
    VALUES (@id, @title, @message, @priority, @audience_type, @audience_json, @attachment_url, @attachment_data, @attachment_name, @scheduled_at, @created_by)
  `).run({
    id: opts.id,
    title: opts.title,
    message: opts.message,
    priority: opts.priority,
    audience_type: opts.audienceType,
    audience_json: opts.audienceJson ?? null,
    attachment_url: opts.attachmentUrl ?? null,
    attachment_data: opts.attachmentData ?? null,
    attachment_name: opts.attachmentName ?? null,
    scheduled_at: opts.scheduledAt ?? null,
    created_by: opts.createdBy ?? null,
  });

  return db.prepare("SELECT * FROM announcements WHERE id = ?").get(opts.id) as AnnouncementRow;
}

export function getRecentAnnouncements() {
  const rows = db.prepare("SELECT * FROM announcements WHERE scheduled_at IS NULL OR scheduled_at <= datetime('now') ORDER BY created_at DESC").all() as AnnouncementRow[];
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    message: r.message,
    priority: r.priority,
    audienceType: r.audience_type,
    audienceJson: r.audience_json ? JSON.parse(r.audience_json) : null,
    attachmentUrl: r.attachment_url,
    attachmentData: r.attachment_data,
    attachmentName: r.attachment_name,
    scheduledAt: r.scheduled_at,
    createdBy: r.created_by,
    createdAt: r.created_at,
  }));
}

export function recordAnnouncementClick(announcementId: string, userEmail: string | null) {
  db.prepare("INSERT INTO announcement_clicks (announcement_id, user_email) VALUES (?, ?) ").run(announcementId, userEmail);
}

export function getAnnouncementClicks(announcementId: string) {
  return db.prepare("SELECT announcement_id, user_email, clicked_at FROM announcement_clicks WHERE announcement_id = ? ORDER BY clicked_at DESC").all(announcementId);
}

export function getDashboardSummary(): DashboardSummary {
  const totalUsers = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
  const totalAdmins = db.prepare("SELECT COUNT(*) as count FROM users WHERE is_super_admin = 1").get() as { count: number };
  const totalSystems = db.prepare("SELECT COUNT(*) as count FROM systems").get() as { count: number };
  const totalAccessEntries = db.prepare("SELECT COUNT(*) as count FROM user_system_access").get() as { count: number };
  const auditLogCount = db.prepare("SELECT COUNT(*) as count FROM audit_logs").get() as { count: number };
  const recentActivity = db.prepare(`
    SELECT action, details, created_at
    FROM audit_logs
    ORDER BY created_at DESC, id DESC
    LIMIT 5
  `).all() as Array<{ action: string; details: string | null; created_at: string }>;

  return {
    totalUsers: totalUsers.count,
    totalAdmins: totalAdmins.count,
    totalSystems: totalSystems.count,
    totalAccessEntries: totalAccessEntries.count,
    auditLogCount: auditLogCount.count,
    recentActivity,
  };
}

export function createPasswordResetToken(email: string, token: string) {
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  db.prepare(`
    INSERT INTO password_reset_tokens (id, email, expires_at, used)
    VALUES (@id, @email, @expires_at, 0)
  `).run({ id: token, email, expires_at: expiresAt });
  return { token, expiresAt };
}

export function consumePasswordResetToken(email: string, token: string) {
  const record = db.prepare(`
    SELECT id, email, expires_at, used
    FROM password_reset_tokens
    WHERE id = ? AND lower(email) = lower(?)
  `).get(token, email) as { id: string; email: string; expires_at: string; used: number } | undefined;

  if (!record || record.used === 1 || new Date(record.expires_at) < new Date()) {
    return null;
  }

  db.prepare("UPDATE password_reset_tokens SET used = 1 WHERE id = ?").run(token);
  return record;
}

export function buildUserResponse(user: UserRow) {
  const access = getUserAccess(user.id);
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    department: user.department,
    isSuperAdmin: user.is_super_admin === 1,
    isApproved: user.is_approved === 1,
    systems: access.map((a) => ({
      systemId: a.system_id,
      role: a.role,
    })),
  };
}

export function getPendingRegistrations(): ReturnType<typeof buildUserResponse>[] {
  const rows = db.prepare("SELECT * FROM users WHERE is_approved = 0 ORDER BY name").all() as UserRow[];
  return rows.map((r) => buildUserResponse(r));
}

export function approveUser(userId: string) {
  db.prepare("UPDATE users SET is_approved = 1 WHERE id = ?").run(userId);
  const user = getUserById(userId);
  if (!user) return null;
  return buildUserResponse(user);
}

// Custom role helpers
export function getAllCustomRoles(): CustomRoleRow[] {
  return db.prepare("SELECT id, name, description FROM custom_roles ORDER BY name").all() as CustomRoleRow[];
}

export function createCustomRole(opts: { id: string; name: string; description?: string | null }): CustomRoleRow {
  db.prepare("INSERT INTO custom_roles (id, name, description) VALUES (@id, @name, @description)").run({ id: opts.id, name: opts.name, description: opts.description ?? null });
  const row = db.prepare("SELECT id, name, description FROM custom_roles WHERE id = ?").get(opts.id) as CustomRoleRow | undefined;
  if (!row) {
    throw new Error("Failed to create custom role.");
  }
  return row;
}

export function updateCustomRole(id: string, opts: { name?: string; description?: string | null }): CustomRoleRow | null {
  const row = db.prepare("SELECT * FROM custom_roles WHERE id = ?").get(id) as CustomRoleRow | undefined;
  if (!row) return null;
  const name = opts.name ?? row.name;
  const description = typeof opts.description === "undefined" ? row.description : opts.description;
  db.prepare("UPDATE custom_roles SET name = @name, description = @description WHERE id = @id").run({ id, name, description });
  const updated = db.prepare("SELECT id, name, description FROM custom_roles WHERE id = ?").get(id) as CustomRoleRow | undefined;
  return updated ?? null;
}

export function deleteCustomRole(id: string) {
  db.prepare("DELETE FROM custom_roles WHERE id = ?").run(id);
}
