import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getPriorityConfig, type PriorityLevel } from "@/lib/priority";

interface PriorityBadgeProps {
  priority: PriorityLevel;
  showIcon?: boolean;
  showTooltip?: boolean;
  className?: string;
}

export function PriorityBadge({ 
  priority, 
  showIcon = true, 
  showTooltip = true,
  className = ""
}: PriorityBadgeProps) {
  const config = getPriorityConfig(priority);
  const Icon = config.Icon;

  const badge = (
    <Badge 
      variant="outline"
      className={`${config.bgClass} ${config.textClass} ${config.borderClass} border font-mono text-xs flex items-center gap-1 ${className}`}
      data-testid={`badge-priority-${priority.toLowerCase()}`}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      <span>{config.name}</span>
    </Badge>
  );

  if (!showTooltip) {
    return badge;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {badge}
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <div className="space-y-1">
          <p className="font-semibold">{config.label}</p>
          <p className="text-sm">{config.description}</p>
          <p className="text-xs text-muted-foreground italic">Examples: {config.examples}</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
