import { db } from "./db";
import { randomUUID } from "crypto";
import type { Directive, Notice, InsertDirective, InsertNotice, Status } from "@shared/schema";

export interface IStorage {
  // Directives
  getDirectives(filters?: { status?: string; priority?: string }): Promise<Directive[]>;
  getDirective(id: string): Promise<Directive | undefined>;
  createDirective(directive: InsertDirective): Promise<Directive>;
  updateDirective(id: string, updates: Partial<InsertDirective> & { completed?: boolean }): Promise<Directive>;
  deleteDirective(id: string): Promise<void>;

  // Notices
  getNotices(filters?: { from?: string; to?: string }): Promise<Notice[]>;
  getNotice(id: string): Promise<Notice | undefined>;
  createNotice(notice: InsertNotice): Promise<Notice>;
  updateNotice(id: string, updates: Partial<InsertNotice>): Promise<Notice>;
  deleteNotice(id: string): Promise<void>;

  // Status
  getStatus(): Promise<Status>;
}

export class SqliteStorage implements IStorage {
  // Directives
  async getDirectives(filters?: { status?: string; priority?: string }): Promise<Directive[]> {
    let query = "SELECT * FROM directives WHERE 1=1";
    const params: any[] = [];

    if (filters?.status === "active") {
      query += " AND completed = 0";
    } else if (filters?.status === "completed") {
      query += " AND completed = 1";
    }

    if (filters?.priority && filters.priority !== "all") {
      query += " AND priority = ?";
      params.push(filters.priority);
    }

    query += " ORDER BY created_at DESC";

    const rows = db.prepare(query).all(...params) as any[];
    return rows.map(this.mapDirectiveFromDb);
  }

  async getDirective(id: string): Promise<Directive | undefined> {
    const row = db.prepare("SELECT * FROM directives WHERE id = ?").get(id) as any;
    return row ? this.mapDirectiveFromDb(row) : undefined;
  }

  async createDirective(directive: InsertDirective): Promise<Directive> {
    const id = randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO directives (id, title, notes, priority, due_at, completed, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 0, ?, ?)
    `).run(
      id,
      directive.title,
      directive.notes || null,
      directive.priority,
      directive.dueAt || null,
      now,
      now
    );

    return (await this.getDirective(id))!;
  }

  async updateDirective(id: string, updates: Partial<InsertDirective> & { completed?: boolean }): Promise<Directive> {
    const current = await this.getDirective(id);
    if (!current) {
      throw new Error("Directive not found");
    }

    const now = new Date().toISOString();
    const title = updates.title ?? current.title;
    const notes = updates.notes !== undefined ? (updates.notes || null) : current.notes;
    const priority = updates.priority ?? current.priority;
    const dueAt = updates.dueAt !== undefined ? (updates.dueAt || null) : current.dueAt;
    const completed = updates.completed !== undefined ? (updates.completed ? 1 : 0) : (current.completed ? 1 : 0);

    db.prepare(`
      UPDATE directives
      SET title = ?, notes = ?, priority = ?, due_at = ?, completed = ?, updated_at = ?
      WHERE id = ?
    `).run(title, notes, priority, dueAt, completed, now, id);

    return (await this.getDirective(id))!;
  }

  async deleteDirective(id: string): Promise<void> {
    db.prepare("DELETE FROM directives WHERE id = ?").run(id);
  }

  // Notices
  async getNotices(filters?: { from?: string; to?: string }): Promise<Notice[]> {
    let query = "SELECT * FROM notices WHERE 1=1";
    const params: any[] = [];

    if (filters?.from) {
      query += " AND at >= ?";
      params.push(filters.from);
    }

    if (filters?.to) {
      query += " AND at <= ?";
      params.push(filters.to);
    }

    query += " ORDER BY at ASC";

    const rows = db.prepare(query).all(...params) as any[];
    return rows.map(this.mapNoticeFromDb);
  }

  async getNotice(id: string): Promise<Notice | undefined> {
    const row = db.prepare("SELECT * FROM notices WHERE id = ?").get(id) as any;
    return row ? this.mapNoticeFromDb(row) : undefined;
  }

  async createNotice(notice: InsertNotice): Promise<Notice> {
    const id = randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO notices (id, title, notes, priority, at, repeat, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      notice.title,
      notice.notes || null,
      notice.priority,
      notice.at,
      notice.repeat,
      now,
      now
    );

    return (await this.getNotice(id))!;
  }

  async updateNotice(id: string, updates: Partial<InsertNotice>): Promise<Notice> {
    const current = await this.getNotice(id);
    if (!current) {
      throw new Error("Notice not found");
    }

    const now = new Date().toISOString();
    const title = updates.title ?? current.title;
    const notes = updates.notes !== undefined ? (updates.notes || null) : current.notes;
    const priority = updates.priority ?? current.priority;
    const at = updates.at ?? current.at;
    const repeat = updates.repeat ?? current.repeat;

    db.prepare(`
      UPDATE notices
      SET title = ?, notes = ?, priority = ?, at = ?, repeat = ?, updated_at = ?
      WHERE id = ?
    `).run(title, notes, priority, at, repeat, now, id);

    return (await this.getNotice(id))!;
  }

  async deleteNotice(id: string): Promise<void> {
    db.prepare("DELETE FROM notices WHERE id = ?").run(id);
  }

  // Status
  async getStatus(): Promise<Status> {
    const directivesTotal = db.prepare("SELECT COUNT(*) as count FROM directives").get() as { count: number };
    const directivesActive = db.prepare("SELECT COUNT(*) as count FROM directives WHERE completed = 0").get() as { count: number };
    const directivesCompleted = db.prepare("SELECT COUNT(*) as count FROM directives WHERE completed = 1").get() as { count: number };
    
    const now = new Date().toISOString();
    const upcomingNotices = db.prepare("SELECT COUNT(*) as count FROM notices WHERE at > ?").get(now) as { count: number };

    return {
      directives: {
        total: directivesTotal.count,
        active: directivesActive.count,
        completed: directivesCompleted.count,
      },
      notices: {
        upcomingCount: upcomingNotices.count,
      },
      lastUpdated: now,
    };
  }

  // Helper methods to map database rows to TypeScript types
  private mapDirectiveFromDb(row: any): Directive {
    return {
      id: row.id,
      title: row.title,
      notes: row.notes,
      priority: row.priority,
      dueAt: row.due_at,
      completed: row.completed === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapNoticeFromDb(row: any): Notice {
    return {
      id: row.id,
      title: row.title,
      notes: row.notes,
      priority: row.priority,
      at: row.at,
      repeat: row.repeat as "none" | "daily" | "weekly" | "monthly",
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export const storage = new SqliteStorage();
