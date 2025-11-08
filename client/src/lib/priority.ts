import type { PriorityLevel as PriorityLevelType } from "@shared/schema";
import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Flame, Cog, Leaf, CheckCircle2 } from "lucide-react";

export type PriorityLevel = PriorityLevelType;

export interface PriorityConfig {
  name: PriorityLevel;
  label: string;
  color: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  Icon: LucideIcon;
  description: string;
  examples: string;
}

export const priorityConfig: Record<PriorityLevel, PriorityConfig> = {
  Alpha: {
    name: "Alpha",
    label: "Priority Alpha (Critical)",
    color: "#DC2626",
    bgClass: "bg-destructive/10",
    textClass: "text-destructive",
    borderClass: "border-destructive/20",
    Icon: AlertTriangle,
    description: "Mission-critical or time-sensitive. Immediate action required.",
    examples: "Legal deadlines, investor meetings, emergency alerts"
  },
  Bravo: {
    name: "Bravo",
    label: "Priority Bravo (High)",
    color: "#F97316",
    bgClass: "bg-orange-500/10",
    textClass: "text-orange-500",
    borderClass: "border-orange-500/20",
    Icon: Flame,
    description: "High importance. Needs completion within 24–48 hours.",
    examples: "Pending tasks, key operations, prep work before events"
  },
  Charlie: {
    name: "Charlie",
    label: "Priority Charlie (Medium)",
    color: "#EAB308",
    bgClass: "bg-yellow-500/10",
    textClass: "text-yellow-500",
    borderClass: "border-yellow-500/20",
    Icon: Cog,
    description: "Routine but necessary. Complete after higher priorities.",
    examples: "Inventory updates, internal notes, scheduling tasks"
  },
  Delta: {
    name: "Delta",
    label: "Priority Delta (Low)",
    color: "#16A34A",
    bgClass: "bg-green-600/10",
    textClass: "text-green-600",
    borderClass: "border-green-600/20",
    Icon: Leaf,
    description: "Low urgency. Can be scheduled, delegated, or postponed.",
    examples: "Long-term planning, ideas, low-stakes follow-ups"
  },
  Echo: {
    name: "Echo",
    label: "Priority Echo (Completed/Archived)",
    color: "#6B7280",
    bgClass: "bg-muted/50",
    textClass: "text-muted-foreground",
    borderClass: "border-muted/20",
    Icon: CheckCircle2,
    description: "Task completed or archived.",
    examples: "Finalized directives or logged operations"
  }
};

// Helper function to get priority config
export function getPriorityConfig(priority: PriorityLevel): PriorityConfig {
  return priorityConfig[priority];
}

// Get all priorities for dropdowns
export function getAllPriorities(): PriorityConfig[] {
  return Object.values(priorityConfig);
}

// Get active priorities (excluding Echo for new items)
export function getActivePriorities(): PriorityConfig[] {
  return Object.values(priorityConfig).filter(p => p.name !== "Echo");
}

// Priority order for sorting (Alpha highest, Echo lowest)
export const priorityOrder: Record<PriorityLevel, number> = {
  Alpha: 5,
  Bravo: 4,
  Charlie: 3,
  Delta: 2,
  Echo: 1
};

export function sortByPriority<T extends { priority: PriorityLevel }>(items: T[]): T[] {
  return [...items].sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
}
