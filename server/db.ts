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

// Create tables and run migrations
export function initializeDatabase() {
  // Run migration for directives table (old priority system to new)
  migrateDirectivesTable();
  
  // Run migration for notices table (add priority field)
  migrateNoticesTable();

  // Run migration for stores and resupply items tables
  migrateResupplyTables();

  // Seed data
  seedData();
}

function migrateDirectivesTable() {
  // Check if directives table exists and if it has the old schema
  const tableInfo = db.prepare(`
    SELECT sql FROM sqlite_master WHERE type='table' AND name='directives'
  `).get() as { sql?: string } | undefined;

  const needsMigration = tableInfo?.sql?.includes("'low', 'med', 'high'");

  if (needsMigration) {
    console.log("🔄 Migrating directives table to new priority system...");
    
    db.exec(`
      BEGIN TRANSACTION;
      
      -- Create new table with updated schema
      CREATE TABLE directives_new (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        notes TEXT,
        priority TEXT NOT NULL CHECK(priority IN ('Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo')),
        due_at TEXT,
        completed INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      
      -- Migrate data with priority mapping: high→Alpha, med→Bravo, low→Charlie
      INSERT INTO directives_new (id, title, notes, priority, due_at, completed, created_at, updated_at)
      SELECT 
        id, 
        title, 
        notes,
        CASE priority
          WHEN 'high' THEN 'Alpha'
          WHEN 'med' THEN 'Bravo'
          WHEN 'low' THEN 'Charlie'
          ELSE priority
        END as priority,
        due_at,
        completed,
        created_at,
        updated_at
      FROM directives;
      
      -- Drop old table and rename new one
      DROP TABLE directives;
      ALTER TABLE directives_new RENAME TO directives;
      
      COMMIT;
    `);
    
    console.log("✅ Directives table migrated successfully");
  } else if (!tableInfo) {
    // Table doesn't exist, create it with new schema
    db.exec(`
      CREATE TABLE directives (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        notes TEXT,
        priority TEXT NOT NULL CHECK(priority IN ('Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo')),
        due_at TEXT,
        completed INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
  }
}

function migrateNoticesTable() {
  // Check if notices table exists
  const tableInfo = db.prepare(`
    SELECT sql FROM sqlite_master WHERE type='table' AND name='notices'
  `).get() as { sql?: string } | undefined;

  // Check if priority column exists
  const columns = db.prepare(`PRAGMA table_info(notices)`).all() as Array<{ name: string }>;
  const hasPriorityColumn = columns.some(col => col.name === 'priority');

  if (tableInfo && !hasPriorityColumn) {
    console.log("🔄 Migrating notices table to add priority field...");
    
    db.exec(`
      BEGIN TRANSACTION;
      
      -- Create new table with priority field
      CREATE TABLE notices_new (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        notes TEXT,
        priority TEXT NOT NULL CHECK(priority IN ('Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo')) DEFAULT 'Charlie',
        at TEXT NOT NULL,
        repeat TEXT NOT NULL CHECK(repeat IN ('none', 'daily', 'weekly', 'monthly')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      
      -- Migrate existing data with default priority 'Charlie'
      INSERT INTO notices_new (id, title, notes, priority, at, repeat, created_at, updated_at)
      SELECT id, title, notes, 'Charlie', at, repeat, created_at, updated_at
      FROM notices;
      
      -- Drop old table and rename new one
      DROP TABLE notices;
      ALTER TABLE notices_new RENAME TO notices;
      
      COMMIT;
    `);
    
    console.log("✅ Notices table migrated successfully");
  } else if (!tableInfo) {
    // Table doesn't exist, create it with new schema
    db.exec(`
      CREATE TABLE notices (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        notes TEXT,
        priority TEXT NOT NULL CHECK(priority IN ('Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo')) DEFAULT 'Charlie',
        at TEXT NOT NULL,
        repeat TEXT NOT NULL CHECK(repeat IN ('none', 'daily', 'weekly', 'monthly')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
  }
}

function migrateResupplyTables() {
  // Check if stores table exists
  const storesTableInfo = db.prepare(`
    SELECT sql FROM sqlite_master WHERE type='table' AND name='stores'
  `).get() as { sql?: string } | undefined;

  if (!storesTableInfo) {
    // Create stores table
    db.exec(`
      CREATE TABLE stores (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `);
    console.log("✅ Stores table created");
  }

  // Check if categories table exists
  const categoriesTableInfo = db.prepare(`
    SELECT sql FROM sqlite_master WHERE type='table' AND name='categories'
  `).get() as { sql?: string } | undefined;

  if (!categoriesTableInfo) {
    // Create categories table
    db.exec(`
      CREATE TABLE categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `);
    console.log("✅ Categories table created");
  }

  // Check if resupply_items table exists and needs migration
  const resupplyTableInfo = db.prepare(`
    SELECT sql FROM sqlite_master WHERE type='table' AND name='resupply_items'
  `).get() as { sql?: string } | undefined;

  const needsResupplyMigration = resupplyTableInfo?.sql?.includes("category TEXT");

  if (needsResupplyMigration) {
    console.log("🔄 Migrating resupply_items table to use category_id...");
    
    // Count existing items for verification
    const oldItemCount = (db.prepare(`SELECT COUNT(*) as count FROM resupply_items`).get() as { count: number }).count;
    console.log(`📊 Found ${oldItemCount} existing resupply items to migrate`);
    
    const now = new Date().toISOString();
    
    // Wrap entire migration in a transaction for atomicity
    db.exec(`BEGIN TRANSACTION;`);
    
    try {
      // Step 1: Extract unique category strings from existing resupply_items
      const existingCategories = db.prepare(`
        SELECT DISTINCT category FROM resupply_items WHERE category IS NOT NULL AND category != ''
      `).all() as Array<{ category: string }>;
      
      // Step 2: Create fallback "Uncategorized" category for items with null/empty categories
      const uncategorizedId = randomUUID();
      const insertCategory = db.prepare(`
        INSERT INTO categories (id, name, created_at) VALUES (?, ?, ?)
      `);
      
      insertCategory.run(uncategorizedId, "Uncategorized", now);
      
      const categoryMap = new Map<string, string>();
      categoryMap.set("", uncategorizedId); // Map empty string to Uncategorized
      categoryMap.set(null as any, uncategorizedId); // Map null to Uncategorized
      
      // Step 3: Create category records for each unique non-empty category string
      for (const { category } of existingCategories) {
        const categoryId = randomUUID();
        insertCategory.run(categoryId, category, now);
        categoryMap.set(category, categoryId);
      }
      
      console.log(`✅ Created ${existingCategories.length + 1} category records (including Uncategorized)`);
      
      // Step 4: Create new resupply_items table with updated schema
      db.exec(`
        CREATE TABLE resupply_items_new (
          id TEXT PRIMARY KEY,
          item TEXT NOT NULL,
          quantity TEXT NOT NULL,
          category_id TEXT NOT NULL,
          store_id TEXT NOT NULL,
          purchased INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
          FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
        );
      `);
      
      // Step 5: Migrate each item by mapping category string to categoryId
      const oldItems = db.prepare(`
        SELECT * FROM resupply_items
      `).all() as Array<{
        id: string;
        item: string;
        quantity: string;
        category: string | null;
        store_id: string;
        purchased: number;
        created_at: string;
        updated_at: string;
      }>;
      
      const insertItem = db.prepare(`
        INSERT INTO resupply_items_new (id, item, quantity, category_id, store_id, purchased, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      let migratedCount = 0;
      for (const item of oldItems) {
        // Get categoryId, defaulting to uncategorizedId if category is null/empty
        const categoryId = categoryMap.get(item.category || "") || uncategorizedId;
        
        insertItem.run(
          item.id,
          item.item,
          item.quantity,
          categoryId,
          item.store_id,
          item.purchased,
          item.created_at,
          item.updated_at
        );
        migratedCount++;
      }
      
      // Verify migration count matches
      if (migratedCount !== oldItemCount) {
        throw new Error(`Migration count mismatch: expected ${oldItemCount}, got ${migratedCount}`);
      }
      
      console.log(`✅ Migrated ${migratedCount} resupply items (all data preserved)`);
      
      // Step 6: Drop old table and rename new one
      db.exec(`
        DROP TABLE resupply_items;
        ALTER TABLE resupply_items_new RENAME TO resupply_items;
      `);
      
      db.exec(`COMMIT;`);
      console.log("✅ Resupply items table migrated successfully");
    } catch (error) {
      db.exec(`ROLLBACK;`);
      console.error("❌ Migration failed, rolling back:", error);
      throw error;
    }
  } else if (!resupplyTableInfo) {
    // Table doesn't exist, create it with new schema
    db.exec(`
      CREATE TABLE resupply_items (
        id TEXT PRIMARY KEY,
        item TEXT NOT NULL,
        quantity TEXT NOT NULL,
        category_id TEXT NOT NULL,
        store_id TEXT NOT NULL,
        purchased INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
      )
    `);
    console.log("✅ Resupply items table created");
  }
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
      "Alpha",
      tomorrow,
      0,
      now,
      now
    );

    insertDirective.run(
      randomUUID(),
      "Update tactical briefing materials",
      "Prepare presentation slides and situation reports for tomorrow's briefing",
      "Bravo",
      new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      0,
      now,
      now
    );

    insertDirective.run(
      randomUUID(),
      "Inventory equipment supplies",
      "Complete quarterly audit of all equipment and supply levels",
      "Charlie",
      nextWeek,
      0,
      now,
      now
    );

    // Seed 2 notices
    const insertNotice = db.prepare(`
      INSERT INTO notices (id, title, notes, priority, at, repeat, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const twoHoursLater = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    const tomorrowMorning = new Date();
    tomorrowMorning.setDate(tomorrowMorning.getDate() + 1);
    tomorrowMorning.setHours(9, 0, 0, 0);

    insertNotice.run(
      randomUUID(),
      "Command briefing session",
      "Daily operations review with department heads",
      "Bravo",
      twoHoursLater,
      "none",
      now,
      now
    );

    insertNotice.run(
      randomUUID(),
      "Morning status report",
      "Submit operational readiness report to command",
      "Charlie",
      tomorrowMorning.toISOString(),
      "daily",
      now,
      now
    );

    console.log("✅ Database seeded with sample data");
  }
}
