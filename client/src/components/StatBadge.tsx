import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatBadgeProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  variant?: "primary" | "secondary" | "purple" | "green" | "amber";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function StatBadge({
  label,
  value,
  icon: Icon,
  variant = "primary",
  size = "md",
  className,
}: StatBadgeProps) {
  const variantClasses = {
    primary: "bg-[#FF2D55]/10 border-[#FF2D55]/20 text-[#FF2D55]",
    secondary: "bg-[#00D9FF]/10 border-[#00D9FF]/20 text-[#00D9FF]",
    purple: "bg-purple-500/10 border-purple-500/20 text-purple-400",
    green: "bg-green-500/10 border-green-500/20 text-green-400",
    amber: "bg-amber-500/10 border-amber-500/20 text-amber-400",
  };

  const sizeClasses = {
    sm: "p-2 gap-1",
    md: "p-3 gap-2",
    lg: "p-4 gap-3",
  };

  const textSizes = {
    sm: { label: "text-xs", value: "text-lg" },
    md: { label: "text-sm", value: "text-2xl" },
    lg: { label: "text-base", value: "text-3xl" },
  };

  return (
    <div
      className={cn(
        "rounded-lg border flex flex-col items-center justify-center text-center",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
    >
      {Icon && <Icon className="w-5 h-5 mb-1 opacity-80" />}
      <div className={cn("text-muted-foreground mb-1", textSizes[size].label)}>
        {label}
      </div>
      <div className={cn("font-bold", textSizes[size].value)}>{value}</div>
    </div>
  );
}

