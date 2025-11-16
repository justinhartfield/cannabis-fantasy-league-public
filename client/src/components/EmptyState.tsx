import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
  illustration?: "empty" | "celebration" | "loading";
}

/**
 * EmptyState Component - Weed.de 2026 Reskin
 * 
 * Playful empty state with optional illustration and CTA
 */
export function EmptyState({
  title,
  description,
  icon: Icon,
  actionLabel,
  onAction,
  illustration = "empty",
}: EmptyStateProps) {
  const illustrationPath = `/assets/illustrations/${illustration}-state.svg`;

  return (
    <Card className="border-2 border-dashed border-muted-foreground/20">
      <CardContent className="py-16">
        <div className="text-center space-y-6 max-w-md mx-auto">
          {/* Illustration or Icon */}
          {illustration ? (
            <div className="flex justify-center">
              <img
                src={illustrationPath}
                alt={title}
                className="w-64 h-48 object-contain"
              />
            </div>
          ) : Icon ? (
            <div className="w-20 h-20 rounded-2xl bg-weed-green mx-auto flex items-center justify-center">
              <Icon className="w-10 h-10 text-black" />
            </div>
          ) : null}

          {/* Text Content */}
          <div>
            <h4 className="headline-secondary text-2xl text-foreground mb-3">
              {title}
            </h4>
            <p className="body-text text-muted-foreground">
              {description}
            </p>
          </div>

          {/* Action Button */}
          {actionLabel && onAction && (
            <Button onClick={onAction} size="lg">
              {actionLabel}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
