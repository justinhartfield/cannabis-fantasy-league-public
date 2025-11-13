import { cn } from "@/lib/utils";

interface LiveIndicatorProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function LiveIndicator({ className, size = "md" }: LiveIndicatorProps) {
  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-3 py-1",
    lg: "text-base px-4 py-1.5",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full font-bold uppercase tracking-wide",
        "gradient-primary text-white",
        sizeClasses[size],
        className
      )}
    >
      <span className="w-2 h-2 rounded-full bg-white pulse-live" />
      Live
    </div>
  );
}

