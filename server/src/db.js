import Database from "better-sqlite3";
import { cocktails } from "./data/cocktails.js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, "..", "drinktionary.db");

export function getDb() {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  return db;
}

export function initDb() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS cocktails (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      restaurant TEXT,
      city TEXT,
      region TEXT,
      country TEXT,
      cuisine TEXT,
      vibes TEXT
    );
    CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      room_code TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT 'lobby',
      current_cocktail_id INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (current_cocktail_id) REFERENCES cocktails(id)
    );
    CREATE TABLE IF NOT EXISTS definitions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id TEXT NOT NULL,
      cocktail_id INTEGER NOT NULL,
      player_name TEXT NOT NULL,
      definition TEXT NOT NULL,
      award_name TEXT,
      award_description TEXT,
      round INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (game_id) REFERENCES games(id),
      FOREIGN KEY (cocktail_id) REFERENCES cocktails(id)
    );
  `);
  return db;
}

// Seed the database with cocktail data
export function seedDb() {
  const db = initDb();
  const count = db.prepare("SELECT COUNT(*) as c FROM cocktails").get();
  if (count.c > 0) {
    console.log(`Database already has ${count.c} cocktails, skipping seed.`);
    return db;
  }
  const insert = db.prepare(
    "INSERT INTO cocktails (name, restaurant, city, region, country, cuisine, vibes) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );
  const tx = db.transaction(() => {
    for (const c of cocktails) {
      insert.run(c.name, c.restaurant, c.city, c.region, c.country, c.cuisine, JSON.stringify(c.vibes));
    }
  });
  tx();
  console.log(`Seeded ${cocktails.length} cocktails.`);
  return db;
}

// Run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedDb();
}
