import { cn } from "@/lib/utils";

interface ComparisonBarProps {
  leftValue: number;
  rightValue: number;
  leftLabel?: string;
  rightLabel?: string;
  leftColor?: string;
  rightColor?: string;
  maxValue?: number;
  className?: string;
}

export function ComparisonBar({
  leftValue,
  rightValue,
  leftLabel,
  rightLabel,
  leftColor = "#FF2D55",
  rightColor = "#00D9FF",
  maxValue,
  className,
}: ComparisonBarProps) {
  const max = maxValue || Math.max(leftValue, rightValue) * 1.2;
  const leftPercent = (leftValue / max) * 100;
  const rightPercent = (rightValue / max) * 100;

  return (
    <div className={cn("w-full", className)}>
      {/* Labels and Values */}
      <div className="flex items-center justify-between mb-2 text-xs sm:text-sm">
        <div className="flex items-center gap-2">
          {leftLabel && <span className="text-muted-foreground">{leftLabel}</span>}
          <span className="font-bold text-foreground">{leftValue}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-bold text-foreground">{rightValue}</span>
          {rightLabel && <span className="text-muted-foreground">{rightLabel}</span>}
        </div>
      </div>

      {/* Comparison Bars */}
      <div className="flex items-center gap-1">
        {/* Left bar */}
        <div className="flex-1 h-3 bg-muted rounded-l-full overflow-hidden flex justify-end">
          <div
            className="h-full rounded-l-full transition-all duration-500"
            style={{
              width: `${leftPercent}%`,
              backgroundColor: leftColor,
            }}
          />
        </div>

        {/* Center divider */}
        <div className="w-0.5 h-6 bg-border" />

        {/* Right bar */}
        <div className="flex-1 h-3 bg-muted rounded-r-full overflow-hidden">
          <div
            className="h-full rounded-r-full transition-all duration-500"
            style={{
              width: `${rightPercent}%`,
              backgroundColor: rightColor,
            }}
          />
        </div>
      </div>
    </div>
  );
}

