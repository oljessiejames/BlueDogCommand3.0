import Database from "better-sqlite3";
import { randomUUID } from "crypto";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, "../data.db");
export const db = new Database(dbPath);

// Enable foreign keys
db.pragma("foreign_keys = ON");

// Create tables
export function initializeDatabase() {
  // Directives table
  db.exec(`
    CREATE TABLE IF NOT EXISTS directives (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      notes TEXT,
      priority TEXT NOT NULL CHECK(priority IN ('low', 'med', 'high')),
      due_at TEXT,
      completed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // Op Notices table
  db.exec(`
    CREATE TABLE IF NOT EXISTS notices (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      notes TEXT,
      at TEXT NOT NULL,
      repeat TEXT NOT NULL CHECK(repeat IN ('none', 'daily', 'weekly', 'monthly')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // Seed data
  seedData();
}

function seedData() {
  const directivesCount = db.prepare("SELECT COUNT(*) as count FROM directives").get() as { count: number };
  
  if (directivesCount.count === 0) {
    const now = new Date().toISOString();
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Seed 3 directives with different priorities
    const insertDirective = db.prepare(`
      INSERT INTO directives (id, title, notes, priority, due_at, completed, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertDirective.run(
      randomUUID(),
      "Secure perimeter checkpoints",
      "Verify all entry points are operational and guards are positioned correctly",
      "high",
      tomorrow,
      0,
      now,
      now
    );

    insertDirective.run(
      randomUUID(),
      "Update tactical briefing materials",
      "Prepare presentation slides and situation reports for tomorrow's briefing",
      "med",
      new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      0,
      now,
      now
    );

    insertDirective.run(
      randomUUID(),
      "Inventory equipment supplies",
      "Complete quarterly audit of all equipment and supply levels",
      "low",
      nextWeek,
      0,
      now,
      now
    );

    // Seed 2 notices
    const insertNotice = db.prepare(`
      INSERT INTO notices (id, title, notes, at, repeat, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const twoHoursLater = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    const tomorrowMorning = new Date();
    tomorrowMorning.setDate(tomorrowMorning.getDate() + 1);
    tomorrowMorning.setHours(9, 0, 0, 0);

    insertNotice.run(
      randomUUID(),
      "Command briefing session",
      "Daily operations review with department heads",
      twoHoursLater,
      "none",
      now,
      now
    );

    insertNotice.run(
      randomUUID(),
      "Morning status report",
      "Submit operational readiness report to command",
      tomorrowMorning.toISOString(),
      "daily",
      now,
      now
    );

    console.log("✅ Database seeded with sample data");
  }
}
