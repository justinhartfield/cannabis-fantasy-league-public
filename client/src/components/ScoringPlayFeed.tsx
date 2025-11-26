import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, Flame, Trophy, Zap, Star, Package, Building2, Pill } from "lucide-react";
import type { ScoringPlay } from "@/hooks/useScoringPlayAnimation";

/**
 * ScoringPlayFeed Component
 * 
 * A dramatic, game-show style vertical ticker displaying scoring plays
 * with staggered reveal animations and color-coded entries.
 */

interface ScoringPlayFeedProps {
  plays: ScoringPlay[];
  currentPlay: ScoringPlay | null;
  className?: string;
  maxVisible?: number;
}

const getAssetIcon = (assetType: string) => {
  switch (assetType) {
    case "manufacturer":
      return Building2;
    case "cannabis_strain":
      return Flame;
    case "product":
      return Package;
    case "pharmacy":
      return Pill;
    case "brand":
      return Star;
    default:
      return Zap;
  }
};

const getAssetColor = (assetType: string) => {
  switch (assetType) {
    case "manufacturer":
      return "from-blue-500 to-blue-600";
    case "cannabis_strain":
      return "from-green-500 to-emerald-600";
    case "product":
      return "from-purple-500 to-violet-600";
    case "pharmacy":
      return "from-orange-500 to-amber-600";
    case "brand":
      return "from-yellow-500 to-yellow-600";
    default:
      return "from-gray-500 to-gray-600";
  }
};

const getPointsColor = (points: number, isBonus: boolean) => {
  if (isBonus) return "text-[#cfff4d]"; // Weed green for bonuses
  if (points >= 50) return "text-[#ff744d]"; // Coral for massive plays
  if (points >= 20) return "text-[#cfff4d]"; // Green for big plays
  return "text-white"; // Normal
};

const getPointsBg = (points: number, isBonus: boolean) => {
  if (isBonus) return "bg-[#cfff4d]/20 border-[#cfff4d]/50";
  if (points >= 50) return "bg-[#ff744d]/20 border-[#ff744d]/50";
  if (points >= 20) return "bg-[#cfff4d]/20 border-[#cfff4d]/50";
  return "bg-white/10 border-white/20";
};

function ScoringPlayEntry({
  play,
  isNew,
  index,
}: {
  play: ScoringPlay;
  isNew: boolean;
  index: number;
}) {
  const Icon = getAssetIcon(play.assetType);
  const colorGradient = getAssetColor(play.assetType);
  const pointsColor = getPointsColor(play.points, play.isBonus ?? false);
  const pointsBg = getPointsBg(play.points, play.isBonus ?? false);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border transition-all duration-500",
        "bg-gradient-to-br from-[#1a0a1f]/90 to-[#0f0f16]/90",
        "border-white/10 backdrop-blur-sm",
        isNew && "scoring-play-entry-new",
        play.isBigPlay && "scoring-play-big-play",
        play.isBonus && "border-[#cfff4d]/30"
      )}
      style={{
        animationDelay: `${index * 100}ms`,
      }}
    >
      {/* Big Play Glow Effect */}
      {play.isBigPlay && (
        <div className="absolute inset-0 scoring-play-glow opacity-50" />
      )}

      {/* Shimmer Effect for New Entries */}
      {isNew && (
        <div className="absolute inset-0 scoring-play-shimmer" />
      )}

      <div className="relative p-4 flex items-center gap-4">
        {/* Asset Icon/Image */}
        <div
          className={cn(
            "relative w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center",
            "bg-gradient-to-br shadow-lg",
            colorGradient
          )}
        >
          {play.assetImageUrl ? (
            <img
              src={play.assetImageUrl}
              alt={play.assetName}
              className="w-full h-full rounded-xl object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <Icon className="w-6 h-6 text-white" />
          )}
          
          {/* Bonus Badge */}
          {play.isBonus && (
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#cfff4d] flex items-center justify-center">
              <Trophy className="w-3 h-3 text-black" />
            </div>
          )}
        </div>

        {/* Play Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-white/60">
              {play.category}
            </span>
            {play.isStreakBonus && (
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-orange-400">
                <Flame className="w-3 h-3" /> STREAK
              </span>
            )}
            {play.isRankBonus && (
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-yellow-400">
                <Trophy className="w-3 h-3" /> RANK
              </span>
            )}
          </div>
          <div className="text-sm font-semibold text-white truncate">
            {play.assetName}
          </div>
          {play.formula && (
            <div className="text-xs text-white/50 truncate">
              {play.value} · {play.formula}
            </div>
          )}
        </div>

        {/* Points */}
        <div
          className={cn(
            "flex-shrink-0 px-4 py-2 rounded-xl border",
            "flex flex-col items-center justify-center",
            pointsBg
          )}
        >
          <div className={cn("text-2xl font-black tabular-nums", pointsColor)}>
            +{play.points}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-white/50">
            pts
          </div>
        </div>
      </div>

      {/* Team Attribution */}
      <div className="px-4 pb-3 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        <span className="text-xs text-white/40">{play.teamName}</span>
      </div>
    </div>
  );
}

export function ScoringPlayFeed({
  plays,
  currentPlay,
  className,
  maxVisible = 5,
}: ScoringPlayFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to top when new play arrives
  useEffect(() => {
    if (currentPlay && containerRef.current) {
      containerRef.current.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  }, [currentPlay]);

  const visiblePlays = plays.slice(0, maxVisible);

  if (plays.length === 0) {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-[0.3em] text-white/40">
            Live Scoring
          </span>
        </div>
        <div className="rounded-2xl bg-white/5 border border-white/10 p-8 text-center">
          <TrendingUp className="w-8 h-8 text-white/30 mx-auto mb-3" />
          <p className="text-sm text-white/50">
            Waiting for scoring plays...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#cfff4d] animate-pulse shadow-[0_0_8px_rgba(207,255,77,0.6)]" />
          <span className="text-xs font-bold uppercase tracking-[0.3em] text-white/60">
            Live Scoring
          </span>
        </div>
        <span className="text-xs text-white/40">
          {plays.length} plays
        </span>
      </div>

      {/* Feed Container */}
      <div
        ref={containerRef}
        className="space-y-3 max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
      >
        {visiblePlays.map((play, index) => (
          <ScoringPlayEntry
            key={play.id}
            play={play}
            isNew={currentPlay?.id === play.id}
            index={index}
          />
        ))}
      </div>

      {/* Show More Indicator */}
      {plays.length > maxVisible && (
        <div className="text-center py-2">
          <span className="text-xs text-white/40">
            +{plays.length - maxVisible} more plays
          </span>
        </div>
      )}
    </div>
  );
}

export default ScoringPlayFeed;

