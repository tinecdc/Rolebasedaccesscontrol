import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { pathToFileURL, fileURLToPath } from "url";
import { getDatabaseMode, runSql, initSchema } from "./db";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const dbPath = path.join(repoRoot, "data", "rba.db");
const migrationsDir = path.join(repoRoot, "server", "src", "migrations");

export async function runMigrations() {
  // ensure data directory exists so SQLite can open the DB file
  try {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  } catch (err) {
    // ignore
  }

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  // For SQL pool modes, use initSchema which handles CREATE TABLE IF NOT EXISTS
  if (getDatabaseMode() === "mysql") {
    await initSchema();
    return;
  }

  try {
    db.exec(`CREATE TABLE IF NOT EXISTS migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL);`);
  } catch (err) {
    // ignore
  }

  const applied = new Set<string>();
  const rows = db.prepare("SELECT id FROM migrations").all() as Array<{ id: string }>;
  rows.forEach((r) => applied.add(r.id));
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".ts") || f.endsWith(".js")).sort();
  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const mod = await import(pathToFileURL(filePath).href);
    if (!mod.id || !mod.up) continue;
    if (applied.has(mod.id)) continue;
    console.log("Applying migration", mod.id);
    await mod.up(db);
    db.prepare("INSERT INTO migrations (id, applied_at) VALUES (?, datetime('now'))").run(mod.id);
  }
}

if (process.argv[1]?.endsWith("migrate.ts")) {
  void runMigrations();
}
