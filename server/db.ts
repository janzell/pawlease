import type { Client, InValue, ResultSet, Transaction } from "@libsql/client";

// Same schema runs on a local SQLite file (dev/tests) and on Turso (production).
// Foreign keys aren't reliably enforced over Turso's HTTP connections, so
// related-row cleanup is done explicitly in app code rather than via CASCADE.
const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  active_household_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS households (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS memberships (
  household_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (household_id, user_id)
);

CREATE TABLE IF NOT EXISTS pets (
  id INTEGER PRIMARY KEY,
  household_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  breed TEXT NOT NULL DEFAULT '',
  sex TEXT NOT NULL DEFAULT '',
  birthday TEXT NOT NULL DEFAULT '',
  weight_kg REAL,
  color TEXT NOT NULL DEFAULT '',
  microchip TEXT NOT NULL DEFAULT '',
  food TEXT NOT NULL DEFAULT '',
  allergies TEXT NOT NULL DEFAULT '',
  medications TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  avatar TEXT NOT NULL DEFAULT '🐶',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS professionals (
  id INTEGER PRIMARY KEY,
  household_id INTEGER NOT NULL,
  kind TEXT NOT NULL DEFAULT 'vet',
  name TEXT NOT NULL,
  business TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  website TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  is_primary INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY,
  household_id INTEGER NOT NULL,
  pet_id INTEGER,
  title TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  due_date TEXT NOT NULL DEFAULT '',
  due_time TEXT NOT NULL DEFAULT '',
  repeat TEXT NOT NULL DEFAULT 'none',
  assignee_id INTEGER,
  done_at TEXT,
  done_by INTEGER,
  created_by INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY,
  household_id INTEGER NOT NULL,
  pet_id INTEGER,
  title TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  pinned INTEGER NOT NULL DEFAULT 0,
  created_by INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY,
  household_id INTEGER NOT NULL,
  pet_id INTEGER,
  professional_id INTEGER,
  type TEXT NOT NULL DEFAULT 'vet',
  title TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'upcoming',
  created_by INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS activities (
  id INTEGER PRIMARY KEY,
  household_id INTEGER NOT NULL,
  pet_id INTEGER,
  kind TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  value REAL,
  created_by INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_user ON memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_pets_household ON pets(household_id);
CREATE INDEX IF NOT EXISTS idx_tasks_household ON tasks(household_id);
CREATE INDEX IF NOT EXISTS idx_notes_household ON notes(household_id);
CREATE INDEX IF NOT EXISTS idx_bookings_household ON bookings(household_id);
CREATE INDEX IF NOT EXISTS idx_pros_household ON professionals(household_id);
CREATE INDEX IF NOT EXISTS idx_activities_household ON activities(household_id, created_at);
`;

export type Param = InValue;
export type Row = Record<string, Param>;

/** Query helpers, usable both on the client and inside a transaction. */
export interface Q {
  one<T = Row>(sql: string, ...args: Param[]): Promise<T | undefined>;
  all<T = Row>(sql: string, ...args: Param[]): Promise<T[]>;
  run(sql: string, ...args: Param[]): Promise<{ changes: number; lastId: number }>;
}

export interface DB extends Q {
  tx<T>(fn: (q: Q) => Promise<T>): Promise<T>;
  /** Creates tables on first use; cheap to call on every request. */
  ready(): Promise<void>;
}

const toRows = (rs: ResultSet) => rs.rows.map((r) => Object.fromEntries(rs.columns.map((c, i) => [c, r[i]])) as Row);

function helpers(exec: (sql: string, args: Param[]) => Promise<ResultSet>): Q {
  return {
    one: async <T>(sql: string, ...args: Param[]) => toRows(await exec(sql, args))[0] as T | undefined,
    all: async <T>(sql: string, ...args: Param[]) => toRows(await exec(sql, args)) as T[],
    run: async (sql, ...args) => {
      const rs = await exec(sql, args);
      return { changes: rs.rowsAffected, lastId: Number(rs.lastInsertRowid ?? 0) };
    },
  };
}

export function createDb(client: Client): DB {
  let init: Promise<void> | undefined;
  return {
    ...helpers((sql, args) => client.execute({ sql, args })),
    async tx(fn) {
      const t: Transaction = await client.transaction("write");
      try {
        const r = await fn(helpers((sql, args) => t.execute({ sql, args })));
        await t.commit();
        return r;
      } catch (e) {
        await t.rollback().catch(() => {});
        throw e;
      } finally {
        t.close();
      }
    },
    ready() {
      init ??= client.executeMultiple(SCHEMA).catch((e) => {
        init = undefined; // allow a retry on the next request
        throw e;
      });
      return init;
    },
  };
}
