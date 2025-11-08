import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Pencil, Trash2, Clock, Repeat } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { NoticeForm } from "@/components/NoticeForm";
import { formatDateTime, formatTime, isUpcoming } from "@/lib/time";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Notice, InsertNotice } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

export default function OpNotices() {
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: notices = [], isLoading } = useQuery<Notice[]>({
    queryKey: ['/api/notices'],
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; updates: Partial<InsertNotice> }) =>
      apiRequest("PATCH", `/api/notices/${data.id}`, data.updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/status'] });
      setEditingNotice(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/notices/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/status'] });
      setDeletingId(null);
    },
  });

  const getRepeatColor = (repeat: string) => {
    if (repeat === "none") return "bg-muted text-muted-foreground border-border";
    return "bg-primary/10 text-primary border-primary/20";
  };

  const getRepeatLabel = (repeat: string) => {
    switch (repeat) {
      case "daily":
        return "DAILY";
      case "weekly":
        return "WEEKLY";
      case "monthly":
        return "MONTHLY";
      case "none":
        return "ONCE";
      default:
        return repeat.toUpperCase();
    }
  };

  // Sort notices by scheduled time
  const sortedNotices = [...notices].sort((a, b) => 
    new Date(a.at).getTime() - new Date(b.at).getTime()
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="p-6">
            <Skeleton className="h-5 w-48 mb-2" />
            <Skeleton className="h-4 w-full mb-1" />
            <Skeleton className="h-4 w-32" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {sortedNotices.length === 0 ? (
        <Empty
          icon={Bell}
          title="No Op Notices Scheduled"
          description="You don't have any operational notices scheduled. Create one to set up reminders for important events."
        />
      ) : (
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {sortedNotices.map((notice, index) => {
              const upcoming = isUpcoming(notice.at);
              return (
                <motion.div
                  key={notice.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                >
                  <Card className="p-6 hover-elevate" data-testid={`card-notice-${notice.id}`}>
                    <div className="flex items-start gap-4">
                      <div className={`rounded-full p-3 ${upcoming ? "bg-primary/10" : "bg-muted"}`}>
                        <Clock className={`h-5 w-5 ${upcoming ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold font-heading" data-testid={`text-notice-title-${notice.id}`}>
                              {notice.title}
                            </h3>
                          </div>
                          <div className="flex items-center gap-2">
                            {notice.repeat !== "none" && (
                              <Badge
                                variant="outline"
                                className={`${getRepeatColor(notice.repeat)} font-mono text-xs flex items-center gap-1`}
                                data-testid={`badge-repeat-${notice.id}`}
                              >
                                <Repeat className="h-3 w-3" />
                                {getRepeatLabel(notice.repeat)}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {notice.notes && (
                          <p className="text-sm text-muted-foreground mb-3" data-testid={`text-notice-notes-${notice.id}`}>
                            {notice.notes}
                          </p>
                        )}

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 text-xs font-mono">
                            <span
                              className={upcoming ? "text-primary font-medium" : "text-muted-foreground"}
                              data-testid={`text-notice-time-${notice.id}`}
                            >
                              {formatDateTime(notice.at)}
                            </span>
                            {upcoming && (
                              <Badge variant="outline" className="bg-chart-3/10 text-chart-3 border-chart-3/20">
                                UPCOMING
                              </Badge>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingNotice(notice)}
                              data-testid={`button-edit-notice-${notice.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeletingId(notice.id)}
                              data-testid={`button-delete-notice-${notice.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <Dialog open={!!editingNotice} onOpenChange={() => setEditingNotice(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Op Notice</DialogTitle>
            <DialogDescription>
              Update the notice details below
            </DialogDescription>
          </DialogHeader>
          {editingNotice && (
            <NoticeForm
              notice={editingNotice}
              onSubmit={(data) => {
                updateMutation.mutate({
                  id: editingNotice.id,
                  updates: data,
                });
              }}
              onCancel={() => setEditingNotice(null)}
              isPending={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Op Notice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this operational notice? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-delete-notice-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingId && deleteMutation.mutate(deletingId)}
              className="bg-destructive hover:bg-destructive/90"
              data-testid="button-delete-notice-confirm"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
