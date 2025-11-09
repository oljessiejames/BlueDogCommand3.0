import { z } from "zod";

// Tactical priority levels
export const priorityLevels = ["Alpha", "Bravo", "Charlie", "Delta", "Echo"] as const;
export type PriorityLevel = typeof priorityLevels[number];

// Directives (Tasks) Schema
export const directiveSchema = z.object({
  id: z.string(),
  title: z.string(),
  notes: z.string().nullable(),
  priority: z.enum(priorityLevels),
  dueAt: z.string().nullable(),
  completed: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const insertDirectiveSchema = z.object({
  title: z.string().min(1, "Title is required"),
  notes: z.string().optional(),
  priority: z.enum(priorityLevels).default("Charlie"),
  dueAt: z.string().optional(),
});

export type Directive = z.infer<typeof directiveSchema>;
export type InsertDirective = z.infer<typeof insertDirectiveSchema>;

// Op Notices (Reminders) Schema
export const noticeSchema = z.object({
  id: z.string(),
  title: z.string(),
  notes: z.string().nullable(),
  priority: z.enum(priorityLevels),
  at: z.string(),
  repeat: z.enum(["none", "daily", "weekly", "monthly"]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const insertNoticeSchema = z.object({
  title: z.string().min(1, "Title is required"),
  notes: z.string().optional(),
  priority: z.enum(priorityLevels).default("Charlie"),
  at: z.string().min(1, "Schedule time is required"),
  repeat: z.enum(["none", "daily", "weekly", "monthly"]).default("none"),
});

export type Notice = z.infer<typeof noticeSchema>;
export type InsertNotice = z.infer<typeof insertNoticeSchema>;

// API Status Response
export const statusSchema = z.object({
  directives: z.object({
    total: z.number(),
    active: z.number(),
    completed: z.number(),
  }),
  notices: z.object({
    upcomingCount: z.number(),
  }),
  lastUpdated: z.string(),
});

export type Status = z.infer<typeof statusSchema>;

// Chat Message Schema
export const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
});

export const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type ChatRequest = z.infer<typeof chatRequestSchema>;

// Calendar Event Schema (unified view of directives and notices)
export const calendarEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  notes: z.string().nullable(),
  priority: z.enum(priorityLevels),
  date: z.string(), // ISO datetime
  type: z.enum(["directive", "notice"]),
  completed: z.boolean().optional(),
  repeat: z.enum(["none", "daily", "weekly", "monthly"]).optional(),
});

export const calendarEventsRequestSchema = z.object({
  from: z.string(),
  to: z.string(),
});

export type CalendarEvent = z.infer<typeof calendarEventSchema>;
export type CalendarEventsRequest = z.infer<typeof calendarEventsRequestSchema>;

// Excel import schema
export const excelImportSchema = z.object({
  title: z.string().min(1, "Title is required"),
  date: z.string().min(1, "Date is required"),
  priority: z.enum(priorityLevels).optional(),
  notes: z.string().optional(),
  type: z.enum(["directive", "notice"]).optional(),
  repeat: z.enum(["none", "daily", "weekly", "monthly"]).optional(),
});

export type ExcelImport = z.infer<typeof excelImportSchema>;

// Store Schema (for resupply items)
export const storeSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string(),
});

export const insertStoreSchema = z.object({
  name: z.string().min(1, "Store name is required"),
});

export type Store = z.infer<typeof storeSchema>;
export type InsertStore = z.infer<typeof insertStoreSchema>;

// Category Schema
export const categorySchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string(),
});

export const insertCategorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
});

export type Category = z.infer<typeof categorySchema>;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

// Resupply Item Schema
export const resupplyItemSchema = z.object({
  id: z.string(),
  item: z.string(),
  quantity: z.string(),
  categoryId: z.string(),
  storeId: z.string(),
  purchased: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const insertResupplyItemSchema = z.object({
  item: z.string().min(1, "Item name is required"),
  quantity: z.string().min(1, "Quantity is required"),
  categoryId: z.string().min(1, "Category is required"),
  storeId: z.string().min(1, "Store is required"),
});

export type ResupplyItem = z.infer<typeof resupplyItemSchema>;
export type InsertResupplyItem = z.infer<typeof insertResupplyItemSchema>;
