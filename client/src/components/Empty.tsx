import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function Empty({ icon: Icon, title, description, action }: EmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4" data-testid="container-empty">
      <div className="rounded-full bg-muted/50 p-4 mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold font-heading mb-2" data-testid="text-empty-title">{title}</h3>
      <p className="text-sm text-muted-foreground text-center max-w-sm mb-6" data-testid="text-empty-description">
        {description}
      </p>
      {action && (
        <Button onClick={action.onClick} data-testid="button-empty-action">
          {action.label}
        </Button>
      )}
    </div>
  );
}
