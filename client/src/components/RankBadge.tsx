import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Crown, Award, Medal } from "lucide-react";

interface RankBadgeProps {
  rank: number;
  previousRank?: number;
  size?: "sm" | "md" | "lg";
  showTrend?: boolean;
  className?: string;
}

export function RankBadge({ 
  rank, 
  previousRank, 
  size = "md", 
  showTrend = true,
  className 
}: RankBadgeProps) {
  const rankChange = previousRank ? previousRank - rank : 0;
  
  const sizeClasses = {
    sm: "w-8 h-8 text-sm",
    md: "w-12 h-12 text-lg",
    lg: "w-16 h-16 text-2xl",
  };

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-6 h-6",
  };

  // Special styling for top 3
  const getTopRankStyle = () => {
    if (rank === 1) {
      return "bg-gradient-to-br from-yellow-400 via-yellow-500 to-amber-600 text-black shadow-lg shadow-yellow-500/30";
    }
    if (rank === 2) {
      return "bg-gradient-to-br from-slate-300 via-slate-400 to-slate-500 text-black shadow-lg shadow-slate-400/30";
    }
    if (rank === 3) {
      return "bg-gradient-to-br from-amber-600 via-amber-700 to-amber-800 text-white shadow-lg shadow-amber-700/30";
    }
    if (rank <= 10) {
      return "bg-gradient-to-br from-emerald-500/20 to-emerald-600/30 text-emerald-400 border border-emerald-500/40";
    }
    return "bg-card border border-border text-muted-foreground";
  };

  const getTopRankIcon = () => {
    if (rank === 1) return <Crown className={cn(iconSizes[size], "text-black")} />;
    if (rank === 2) return <Award className={cn(iconSizes[size], "text-black")} />;
    if (rank === 3) return <Medal className={cn(iconSizes[size], "text-white")} />;
    return null;
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn(
          "relative flex items-center justify-center rounded-xl font-bold transition-all",
          sizeClasses[size],
          getTopRankStyle()
        )}
      >
        {rank <= 3 ? (
          <div className="flex flex-col items-center">
            {getTopRankIcon()}
            <span className="text-xs font-black">#{rank}</span>
          </div>
        ) : (
          <span>#{rank}</span>
        )}
      </div>
      
      {showTrend && previousRank && rankChange !== 0 && (
        <div
          className={cn(
            "flex items-center gap-0.5 text-xs font-medium",
            rankChange > 0 ? "text-emerald-400" : "text-red-400"
          )}
        >
          {rankChange > 0 ? (
            <>
              <TrendingUp className="w-3 h-3" />
              <span>+{rankChange}</span>
            </>
          ) : (
            <>
              <TrendingDown className="w-3 h-3" />
              <span>{rankChange}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

interface RankBadgeInlineProps {
  rank: number;
  className?: string;
}

export function RankBadgeInline({ rank, className }: RankBadgeInlineProps) {
  const getBadgeStyle = () => {
    if (rank === 1) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/40";
    if (rank === 2) return "bg-slate-400/20 text-slate-300 border-slate-400/40";
    if (rank === 3) return "bg-amber-600/20 text-amber-400 border-amber-500/40";
    if (rank <= 10) return "bg-emerald-500/20 text-emerald-400 border-emerald-500/40";
    return "bg-muted text-muted-foreground border-border";
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border",
        getBadgeStyle(),
        className
      )}
    >
      #{rank}
    </span>
  );
}

