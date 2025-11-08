import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Pencil, Trash2, ListChecks, Circle, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Empty } from "@/components/Empty";
import { DirectiveForm } from "@/components/DirectiveForm";
import { formatDateTime, isPastDue } from "@/lib/time";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Directive, InsertDirective } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

export default function Directives() {
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "completed">("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | "low" | "med" | "high">("all");
  const [editingDirective, setEditingDirective] = useState<Directive | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const queryParams = new URLSearchParams();
  if (statusFilter !== "all") queryParams.set("status", statusFilter);
  if (priorityFilter !== "all") queryParams.set("priority", priorityFilter);

  const { data: directives = [], isLoading } = useQuery<Directive[]>({
    queryKey: ['/api/directives', statusFilter, priorityFilter],
    queryFn: () => fetch(`/api/directives?${queryParams}`).then(r => r.json()),
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; updates: Partial<InsertDirective> & { completed?: boolean } }) =>
      apiRequest("PATCH", `/api/directives/${data.id}`, data.updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/directives'] });
      queryClient.invalidateQueries({ queryKey: ['/api/status'] });
      setEditingDirective(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/directives/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/directives'] });
      queryClient.invalidateQueries({ queryKey: ['/api/status'] });
      setDeletingId(null);
    },
  });

  const handleToggleComplete = (directive: Directive) => {
    updateMutation.mutate({
      id: directive.id,
      updates: { completed: !directive.completed },
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-destructive/10 text-destructive border-destructive/20";
      case "med":
        return "bg-chart-2/10 text-chart-2 border-chart-2/20";
      case "low":
        return "bg-muted text-muted-foreground border-border";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case "high":
        return "HIGH";
      case "med":
        return "MEDIUM";
      case "low":
        return "LOW";
      default:
        return priority.toUpperCase();
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="p-6">
            <Skeleton className="h-5 w-48 mb-2" />
            <Skeleton className="h-4 w-full mb-1" />
            <Skeleton className="h-4 w-24" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4">
        <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
          <SelectTrigger className="w-40" data-testid="select-filter-status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" data-testid="option-status-all">All Status</SelectItem>
            <SelectItem value="active" data-testid="option-status-active">Active Only</SelectItem>
            <SelectItem value="completed" data-testid="option-status-completed">Completed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={(v: any) => setPriorityFilter(v)}>
          <SelectTrigger className="w-40" data-testid="select-filter-priority">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" data-testid="option-priority-all">All Priorities</SelectItem>
            <SelectItem value="low" data-testid="option-priority-filter-low">Low Priority</SelectItem>
            <SelectItem value="med" data-testid="option-priority-filter-med">Med Priority</SelectItem>
            <SelectItem value="high" data-testid="option-priority-filter-high">High Priority</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {directives.length === 0 ? (
        <Empty
          icon={ListChecks}
          title="No Directives Found"
          description="No directives match your current filters. Try adjusting the filters or create a new directive."
        />
      ) : (
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {directives.map((directive, index) => (
              <motion.div
                key={directive.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
              >
                <Card className="p-6 hover-elevate" data-testid={`card-directive-${directive.id}`}>
                  <div className="flex items-start gap-4">
                    <Checkbox
                      checked={directive.completed}
                      onCheckedChange={() => handleToggleComplete(directive)}
                      className="mt-1"
                      data-testid={`checkbox-directive-${directive.id}`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex-1">
                          <h3
                            className={`text-lg font-semibold font-heading ${
                              directive.completed ? "line-through text-muted-foreground" : ""
                            }`}
                            data-testid={`text-directive-title-${directive.id}`}
                          >
                            {directive.title}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={`${getPriorityColor(directive.priority)} font-mono text-xs`}
                            data-testid={`badge-priority-${directive.id}`}
                          >
                            {getPriorityLabel(directive.priority)}
                          </Badge>
                        </div>
                      </div>

                      {directive.notes && (
                        <p className="text-sm text-muted-foreground mb-3" data-testid={`text-directive-notes-${directive.id}`}>
                          {directive.notes}
                        </p>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
                          {directive.dueAt && (
                            <span
                              className={isPastDue(directive.dueAt) && !directive.completed ? "text-destructive" : ""}
                              data-testid={`text-directive-due-${directive.id}`}
                            >
                              Due: {formatDateTime(directive.dueAt)}
                            </span>
                          )}
                          {directive.completed && (
                            <span className="flex items-center gap-1 text-chart-3">
                              <CheckCircle2 className="h-3 w-3" />
                              Completed
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingDirective(directive)}
                            data-testid={`button-edit-directive-${directive.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingId(directive.id)}
                            data-testid={`button-delete-directive-${directive.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <Dialog open={!!editingDirective} onOpenChange={() => setEditingDirective(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Directive</DialogTitle>
            <DialogDescription>
              Update the directive details below
            </DialogDescription>
          </DialogHeader>
          {editingDirective && (
            <DirectiveForm
              directive={editingDirective}
              onSubmit={(data) => {
                updateMutation.mutate({
                  id: editingDirective.id,
                  updates: data,
                });
              }}
              onCancel={() => setEditingDirective(null)}
              isPending={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Directive</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this directive? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-delete-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingId && deleteMutation.mutate(deletingId)}
              className="bg-destructive hover:bg-destructive/90"
              data-testid="button-delete-confirm"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
