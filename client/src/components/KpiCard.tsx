import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  delay?: number;
}

export function KpiCard({ title, value, icon: Icon, subtitle, delay = 0 }: KpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
    >
      <Card className="p-6 hover-elevate" data-testid={`card-kpi-${title.toLowerCase().replace(/\s+/g, '-')}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
            <p className="text-3xl font-bold font-heading" data-testid={`text-kpi-value-${title.toLowerCase().replace(/\s+/g, '-')}`}>
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1" data-testid={`text-kpi-subtitle-${title.toLowerCase().replace(/\s+/g, '-')}`}>
                {subtitle}
              </p>
            )}
          </div>
          <div className="rounded-md bg-primary/10 p-3">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
