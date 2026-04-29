import * as SQLite from 'expo-sqlite';

let _db: SQLite.SQLiteDatabase | null = null;

export function getDB(): SQLite.SQLiteDatabase {
  if (!_db) {
    _db = SQLite.openDatabaseSync('repertorio_liturgico.db');
    initializeSchema(_db);
  }
  return _db;
}

function initializeSchema(db: SQLite.SQLiteDatabase): void {
  db.execSync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS offline_repertories (
      id          TEXT PRIMARY KEY,
      data        TEXT NOT NULL,   -- JSON serialized Repertory
      downloaded_at TEXT NOT NULL,
      synced_at   TEXT
    );

    CREATE TABLE IF NOT EXISTS offline_songs (
      id    TEXT PRIMARY KEY,
      data  TEXT NOT NULL          -- JSON serialized Song
    );

    CREATE TABLE IF NOT EXISTS sync_meta (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

// ─── Repertory operations ────────────────────────────────────────────────────

export function saveRepertoryOffline(id: string, data: object): void {
  const db = getDB();
  db.runSync(
    `INSERT OR REPLACE INTO offline_repertories (id, data, downloaded_at)
     VALUES (?, ?, ?)`,
    id,
    JSON.stringify(data),
    new Date().toISOString()
  );
}

export function getOfflineRepertory(id: string): object | null {
  const db = getDB();
  const row = db.getFirstSync<{ data: string }>(
    'SELECT data FROM offline_repertories WHERE id = ?',
    id
  );
  return row ? JSON.parse(row.data) : null;
}

export function getAllOfflineRepertories(): object[] {
  const db = getDB();
  const rows = db.getAllSync<{ data: string }>('SELECT data FROM offline_repertories ORDER BY downloaded_at DESC');
  return rows.map(r => JSON.parse(r.data));
}

export function deleteOfflineRepertory(id: string): void {
  const db = getDB();
  db.runSync('DELETE FROM offline_repertories WHERE id = ?', id);
}

// ─── Sync meta ────────────────────────────────────────────────────────────────

export function getLastSync(): string | null {
  const db = getDB();
  const row = db.getFirstSync<{ value: string }>(
    `SELECT value FROM sync_meta WHERE key = 'last_sync'`
  );
  return row?.value ?? null;
}

export function setLastSync(iso: string): void {
  const db = getDB();
  db.runSync(
    `INSERT OR REPLACE INTO sync_meta (key, value) VALUES ('last_sync', ?)`,
    iso
  );
}
