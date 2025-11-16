import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  badge?: string;
  colorScheme?: "coral" | "green" | "purple" | "pink" | "burgundy";
  className?: string;
}

/**
 * PageHeader Component - Weed.de 2026 Reskin
 * 
 * Bold, colorful page headers with optional icon and badge
 */
export function PageHeader({
  title,
  description,
  icon: Icon,
  badge,
  colorScheme = "coral",
  className,
}: PageHeaderProps) {
  const colorClasses = {
    coral: "bg-weed-coral text-white",
    green: "bg-weed-green text-black",
    purple: "bg-weed-purple text-white",
    pink: "bg-weed-pink text-white",
    burgundy: "bg-weed-burgundy text-white",
  };

  const iconBgClasses = {
    coral: "bg-white text-weed-coral",
    green: "bg-black text-weed-green",
    purple: "bg-weed-green text-black",
    pink: "bg-white text-weed-pink",
    burgundy: "bg-weed-green text-black",
  };

  return (
    <div className={cn("rounded-2xl p-8 mb-8 pattern-dots", colorClasses[colorScheme], className)}>
      <div className="flex items-start gap-6">
        {/* Icon */}
        {Icon && (
          <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0", iconBgClasses[colorScheme])}>
            <Icon className="w-8 h-8" />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="headline-primary text-4xl md:text-5xl">
              {title}
            </h1>
            {badge && (
              <span className="px-3 py-1 rounded-full bg-white/20 text-sm font-semibold uppercase tracking-wide">
                {badge}
              </span>
            )}
          </div>
          {description && (
            <p className="body-text text-lg opacity-90 max-w-2xl">
              {description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
