import { z } from "zod";

// Directives (Tasks) Schema
export const directiveSchema = z.object({
  id: z.string(),
  title: z.string(),
  notes: z.string().nullable(),
  priority: z.enum(["low", "med", "high"]),
  dueAt: z.string().nullable(),
  completed: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const insertDirectiveSchema = z.object({
  title: z.string().min(1, "Title is required"),
  notes: z.string().optional(),
  priority: z.enum(["low", "med", "high"]).default("med"),
  dueAt: z.string().optional(),
});

export type Directive = z.infer<typeof directiveSchema>;
export type InsertDirective = z.infer<typeof insertDirectiveSchema>;

// Op Notices (Reminders) Schema
export const noticeSchema = z.object({
  id: z.string(),
  title: z.string(),
  notes: z.string().nullable(),
  at: z.string(),
  repeat: z.enum(["none", "daily", "weekly", "monthly"]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const insertNoticeSchema = z.object({
  title: z.string().min(1, "Title is required"),
  notes: z.string().optional(),
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
