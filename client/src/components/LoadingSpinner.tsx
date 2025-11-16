import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  fullScreen?: boolean;
}

/**
 * LoadingSpinner Component - Weed.de 2026 Reskin
 * 
 * Branded loading spinner with cannabis leaf animation
 */
export function LoadingSpinner({ 
  size = "md", 
  className,
  fullScreen = false 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
    xl: "w-24 h-24",
  };

  const spinner = (
    <div className={cn("relative", sizeClasses[size], className)}>
      {/* Outer ring */}
      <div className="absolute inset-0 rounded-full border-4 border-weed-green/20"></div>
      
      {/* Spinning segment */}
      <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-weed-green animate-spin"></div>
      
      {/* Center dot */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-2 h-2 rounded-full bg-weed-green"></div>
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        {spinner}
      </div>
    );
  }

  return spinner;
}
