import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrendIndicatorProps {
  value: number;
  percentage?: number;
  showPercentage?: boolean;
  className?: string;
}

export function TrendIndicator({
  value,
  percentage,
  showPercentage = true,
  className,
}: TrendIndicatorProps) {
  const isPositive = value > 0;
  const isNegative = value < 0;
  const isNeutral = value === 0;

  const colorClass = isPositive
    ? "text-green-400"
    : isNegative
    ? "text-red-400"
    : "text-gray-400";

  const Icon = isPositive
    ? TrendingUp
    : isNegative
    ? TrendingDown
    : Minus;

  const animationClass = isPositive
    ? "trending-up"
    : isNegative
    ? "trending-down"
    : "";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 font-semibold",
        colorClass,
        animationClass,
        className
      )}
    >
      <Icon className="w-4 h-4" />
      {showPercentage && percentage !== undefined ? (
        <span>{Math.abs(percentage).toFixed(1)}%</span>
      ) : (
        <span>{isPositive ? "+" : ""}{value}</span>
      )}
    </div>
  );
}

