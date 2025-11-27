import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Zap, TrendingUp, Flame, Target, Star, type LucideIcon } from "lucide-react";
import type { ScoringPlayData } from "./ScoringPlayOverlay";

export interface ScoringPlayAnnouncementProps {
  /** The scoring play to announce */
  play: ScoringPlayData | null;
  /** Duration to show the announcement in ms (default: 5000) */
  duration?: number;
  /** Callback when announcement completes */
  onComplete?: () => void;
}

const PLAYER_TYPE_CONFIG: Record<string, { 
  label: string; 
  icon: LucideIcon; 
  color: string;
  bgGradient: string;
}> = {
  manufacturer: { 
    label: "Manufacturer", 
    icon: Target, 
    color: "text-orange-400",
    bgGradient: "from-orange-500/20 via-orange-600/10 to-transparent"
  },
  cannabis_strain: { 
    label: "Genetics", 
    icon: Flame, 
    color: "text-green-400",
    bgGradient: "from-green-500/20 via-green-600/10 to-transparent"
  },
  product: { 
    label: "Product", 
    icon: Star, 
    color: "text-purple-400",
    bgGradient: "from-purple-500/20 via-purple-600/10 to-transparent"
  },
  pharmacy: { 
    label: "Pharmacy", 
    icon: TrendingUp, 
    color: "text-blue-400",
    bgGradient: "from-blue-500/20 via-blue-600/10 to-transparent"
  },
  brand: { 
    label: "Brand", 
    icon: Zap, 
    color: "text-pink-400",
    bgGradient: "from-pink-500/20 via-pink-600/10 to-transparent"
  },
};

/**
 * ScoringPlayAnnouncement Component
 * 
 * A prominent ticker/banner that announces each scoring play with:
 * - Who scored (team name)
 * - What scored (player/asset name and type)
 * - How much damage was dealt
 * - Visual countdown progress bar
 */
export function ScoringPlayAnnouncement({
  play,
  duration = 5000,
  onComplete,
}: ScoringPlayAnnouncementProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(100);

  const config = play ? PLAYER_TYPE_CONFIG[play.playerType] || PLAYER_TYPE_CONFIG.manufacturer : null;
  const Icon = config?.icon || Zap;
  const isBigHit = (play?.pointsScored ?? 0) >= 10;

  useEffect(() => {
    if (!play) {
      setIsVisible(false);
      setProgress(100);
      return;
    }

    // Show announcement
    setIsVisible(true);
    setProgress(100);

    // Animate progress bar
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 50);

    // Complete after duration
    const timer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, duration);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [play, duration, onComplete]);

  if (!isVisible || !play || !config) return null;

  return (
    <div className="fixed top-4 sm:top-20 left-1/2 -translate-x-1/2 z-[100] w-full max-w-lg px-2 sm:px-4 animate-slide-in-top hidden sm:block">
      <div 
        className={cn(
          "relative overflow-hidden rounded-xl sm:rounded-2xl border shadow-2xl",
          "bg-gradient-to-r from-black/95 to-black/90 backdrop-blur-xl",
          "border-white/20",
          isBigHit && "ring-2 ring-yellow-400/50 animate-pulse"
        )}
      >
        {/* Background gradient based on player type */}
        <div className={cn(
          "absolute inset-0 bg-gradient-to-r opacity-50",
          config.bgGradient
        )} />

        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
          <div 
            className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Mobile: Compact single-row layout */}
        <div className="relative p-3 sm:hidden">
          <div className="flex items-center gap-3">
            {/* Icon */}
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
              "bg-gradient-to-br from-white/20 to-white/5"
            )}>
              <Icon className={cn("w-4 h-4", config.color)} />
            </div>
            
            {/* Player name - truncated */}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-black text-white truncate">
                {play.playerName}
              </div>
              <div className="text-xs text-white/50 truncate">
                {play.attackingTeamName}
              </div>
            </div>

            {/* Points - prominent */}
            <div className={cn(
              "text-2xl font-black tabular-nums shrink-0",
              isBigHit ? "text-yellow-400" : "text-primary",
              "drop-shadow-[0_0_8px_currentColor]"
            )}>
              +{play.pointsScored.toFixed(1)}
            </div>
          </div>
        </div>

        {/* Desktop: Full layout */}
        <div className="relative p-5 hidden sm:block">
          {/* Header with attack indicator */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center",
                "bg-gradient-to-br from-white/20 to-white/5"
              )}>
                <Icon className={cn("w-4 h-4", config.color)} />
              </div>
              <span className={cn("text-xs font-bold uppercase tracking-wider", config.color)}>
                {config.label} Attack!
              </span>
            </div>
            
            {/* Big hit indicator */}
            {isBigHit && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-500/20 border border-yellow-500/30">
                <Flame className="w-3 h-3 text-yellow-400" />
                <span className="text-xs font-bold text-yellow-400">BIG HIT!</span>
              </div>
            )}
          </div>

          {/* Main content */}
          <div className="flex items-center gap-4">
            {/* Asset image */}
            {play.imageUrl && (
              <div className="shrink-0">
                <img
                  src={play.imageUrl}
                  alt={play.playerName}
                  className={cn(
                    "w-14 h-14 rounded-xl object-cover border-2",
                    "shadow-lg",
                    config.color.replace("text-", "border-")
                  )}
                />
              </div>
            )}

            {/* Text content */}
            <div className="flex-1 min-w-0">
              {/* Player name */}
              <div className="text-xl font-black text-white truncate">
                {play.playerName}
              </div>
              
              {/* Team attribution */}
              <div className="text-sm text-white/60 truncate">
                scored for <span className="font-semibold text-white/80">{play.attackingTeamName}</span>
              </div>
            </div>

            {/* Damage amount */}
            <div className="shrink-0 text-right">
              <div className={cn(
                "text-4xl font-black tabular-nums",
                isBigHit ? "text-yellow-400" : "text-primary",
                "drop-shadow-[0_0_10px_currentColor]"
              )}>
                +{play.pointsScored.toFixed(1)}
              </div>
              <div className="text-xs text-white/50 uppercase tracking-wide">
                points
              </div>
            </div>
          </div>

          {/* Score update */}
          <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-sm">
            <div className="text-white/60">
              <span className="font-semibold text-primary">{play.attackingTeamName}</span>
              <span className="mx-2">→</span>
              <span className="font-bold text-white">{play.attackerNewTotal.toFixed(1)} pts</span>
            </div>
            <div className="text-white/40">
              vs {play.defenderTotal.toFixed(1)} pts
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

