import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Flame, TrendingUp, Lock } from "lucide-react";
import { TrendIndicator } from "./TrendIndicator";

interface PlayerStatCardProps {
  name: string;
  type: "manufacturer" | "cannabis_strain" | "product" | "pharmacy" | "brand";
  points?: number;
  projectedPoints?: number;
  trend?: number;
  isHot?: boolean;
  isLocked?: boolean;
  imageUrl?: string;
  stats?: { label: string; value: string | number }[];
  onClick?: () => void;
  className?: string;
}

export function PlayerStatCard({
  name,
  type,
  points,
  projectedPoints,
  trend,
  isHot = false,
  isLocked = false,
  imageUrl,
  stats = [],
  onClick,
  className,
}: PlayerStatCardProps) {
  const typeColors = {
    manufacturer: "bg-blue-500/10 border-blue-500/20 text-blue-400",
    cannabis_strain: "bg-green-500/10 border-green-500/20 text-green-400",
    product: "bg-purple-500/10 border-purple-500/20 text-purple-400",
    pharmacy: "bg-orange-500/10 border-orange-500/20 text-orange-400",
    brand: "bg-amber-500/10 border-amber-500/20 text-amber-400",
  };

  const typeLabels = {
    manufacturer: "MFG",
    cannabis_strain: "STRAIN",
    product: "PROD",
    pharmacy: "PHARM",
    brand: "BRAND",
  };

  return (
    <div
      className={cn(
        "gradient-card rounded-xl p-4 border border-border/50 transition-all",
        "card-hover-lift cursor-pointer relative overflow-hidden",
        isLocked && "opacity-60",
        className
      )}
      onClick={onClick}
    >
      {/* Hot Badge */}
      {isHot && !isLocked && (
        <div className="absolute top-2 right-2 z-10">
          <Badge className="gradient-primary gap-1 text-white border-0">
            <Flame className="w-3 h-3" />
            HOT
          </Badge>
        </div>
      )}

      {/* Locked Overlay */}
      {isLocked && (
        <div className="absolute top-2 right-2 z-10">
          <Lock className="w-5 h-5 text-muted-foreground" />
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        {/* Image or Placeholder */}
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className="w-16 h-16 rounded-lg object-cover"
          />
        ) : (
          <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center text-2xl font-bold">
            {name.charAt(0)}
          </div>
        )}

        {/* Name and Type */}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-foreground truncate mb-1">{name}</h3>
          <Badge
            variant="outline"
            className={cn("text-xs uppercase", typeColors[type])}
          >
            {typeLabels[type]}
          </Badge>
        </div>
      </div>

      {/* Points Display */}
      {(points !== undefined || projectedPoints !== undefined) && (
        <div className="mb-3 pb-3 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Points</div>
              <div className="text-2xl font-bold text-foreground">
                {points?.toFixed(1) || "0.0"}
              </div>
            </div>
            {projectedPoints !== undefined && (
              <div className="text-right">
                <div className="text-xs text-muted-foreground mb-1">Proj.</div>
                <div className="text-lg font-semibold text-[#00D9FF]">
                  {projectedPoints.toFixed(1)}
                </div>
              </div>
            )}
          </div>
          {trend !== undefined && trend !== 0 && (
            <div className="mt-2">
              <TrendIndicator value={trend} percentage={trend} />
            </div>
          )}
        </div>
      )}

      {/* Additional Stats */}
      {stats.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {stats.map((stat, index) => (
            <div key={index} className="text-center p-2 rounded bg-muted/50">
              <div className="text-xs text-muted-foreground mb-1">
                {stat.label}
              </div>
              <div className="text-sm font-semibold text-foreground">
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

