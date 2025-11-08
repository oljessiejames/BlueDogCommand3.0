import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Activity, CheckCircle2, Clock, ListChecks } from "lucide-react";
import { KpiCard } from "@/components/KpiCard";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Status } from "@shared/schema";

export default function SituationRoom() {
  const { data: status, isLoading } = useQuery<Status>({
    queryKey: ['/api/status'],
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-32" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const completionRate = status?.directives.total
    ? Math.round((status.directives.completed / status.directives.total) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            title="Active Directives"
            value={status?.directives.active || 0}
            icon={Activity}
            subtitle="Currently in progress"
            delay={0}
          />
          <KpiCard
            title="Completed"
            value={status?.directives.completed || 0}
            icon={CheckCircle2}
            subtitle={`${completionRate}% completion rate`}
            delay={0.1}
          />
          <KpiCard
            title="Total Directives"
            value={status?.directives.total || 0}
            icon={ListChecks}
            subtitle="All time missions"
            delay={0.2}
          />
          <KpiCard
            title="Upcoming Notices"
            value={status?.notices.upcomingCount || 0}
            icon={Clock}
            subtitle="Scheduled operations"
            delay={0.3}
          />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <Card className="p-6">
          <h3 className="text-lg font-semibold font-heading mb-4">Command Status</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
              <div>
                <p className="text-sm font-medium">Operational Status</p>
                <p className="text-xs text-muted-foreground">All systems nominal</p>
              </div>
              <div className="px-3 py-1 rounded-md bg-chart-3/10 text-chart-3 text-xs font-mono">
                ACTIVE
              </div>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
              <div>
                <p className="text-sm font-medium">Mission Readiness</p>
                <p className="text-xs text-muted-foreground">
                  {status?.directives.active || 0} active directive{status?.directives.active !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="px-3 py-1 rounded-md bg-primary/10 text-primary text-xs font-mono">
                {completionRate}%
              </div>
            </div>
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium">Alert Level</p>
                <p className="text-xs text-muted-foreground">
                  {status?.notices.upcomingCount || 0} scheduled notice{status?.notices.upcomingCount !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="px-3 py-1 rounded-md bg-chart-2/10 text-chart-2 text-xs font-mono">
                NORMAL
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
