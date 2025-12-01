import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  TrendingUp,
  TrendingDown,
  Flame,
  Zap,
  Target,
  Crown,
  Heart,
  ChevronDown,
  Trophy,
  Sparkles,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export type AssetType = "manufacturer" | "cannabis_strain" | "product" | "pharmacy" | "brand";

export type BonusType = 
  | "rank" 
  | "streak" 
  | "velocity" 
  | "consistency" 
  | "marketShare" 
  | "captain" 
  | "fan"
  | "positionGain";

export interface ScoringBonus {
  type: BonusType;
  label: string;
  value: string | number;
  points: number;
}

export interface ScoringCardProps {
  assetName: string;
  assetType: AssetType;
  imageUrl?: string | null;
  totalPoints: number;
  // Core scoring components
  orderPoints?: number;
  orderCount?: number;
  momentumMultiplier?: number;
  momentumPoints?: number;
  // Bonuses (deduplicated)
  bonuses?: ScoringBonus[];
  // Quick stats (shown as pills)
  rank?: number;
  streakDays?: number;
  marketSharePercent?: number;
  // Special flags
  isCaptain?: boolean;
  // Callbacks
  onNameClick?: () => void;
  // Optional styling
  className?: string;
  // Animation control
  animateScore?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const ASSET_TYPE_CONFIG: Record<AssetType, { 
  label: string; 
  emoji: string; 
  color: string;
  bgGradient: string;
}> = {
  manufacturer: { 
    label: "Hersteller", 
    emoji: "🏭", 
    color: "text-blue-400",
    bgGradient: "from-blue-500/20 to-blue-600/10"
  },
  cannabis_strain: { 
    label: "Strain", 
    emoji: "🌿", 
    color: "text-purple-400",
    bgGradient: "from-purple-500/20 to-purple-600/10"
  },
  product: { 
    label: "Produkt", 
    emoji: "📦", 
    color: "text-pink-400",
    bgGradient: "from-pink-500/20 to-pink-600/10"
  },
  pharmacy: { 
    label: "Apotheke", 
    emoji: "💊", 
    color: "text-emerald-400",
    bgGradient: "from-emerald-500/20 to-emerald-600/10"
  },
  brand: { 
    label: "Brand", 
    emoji: "⭐", 
    color: "text-yellow-400",
    bgGradient: "from-yellow-500/20 to-yellow-600/10"
  },
};

const BONUS_CONFIG: Record<BonusType, {
  icon: React.ReactNode;
  emoji: string;
  color: string;
  bgColor: string;
}> = {
  rank: {
    icon: <Trophy className="w-4 h-4" />,
    emoji: "🏆",
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/20",
  },
  streak: {
    icon: <Flame className="w-4 h-4" />,
    emoji: "🔥",
    color: "text-orange-400",
    bgColor: "bg-orange-500/20",
  },
  velocity: {
    icon: <Zap className="w-4 h-4" />,
    emoji: "⚡",
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/20",
  },
  consistency: {
    icon: <Target className="w-4 h-4" />,
    emoji: "🎯",
    color: "text-green-400",
    bgColor: "bg-green-500/20",
  },
  marketShare: {
    icon: <TrendingUp className="w-4 h-4" />,
    emoji: "📈",
    color: "text-indigo-400",
    bgColor: "bg-indigo-500/20",
  },
  captain: {
    icon: <Crown className="w-4 h-4" />,
    emoji: "👑",
    color: "text-yellow-300",
    bgColor: "bg-yellow-500/30",
  },
  fan: {
    icon: <Heart className="w-4 h-4" />,
    emoji: "❤️",
    color: "text-pink-400",
    bgColor: "bg-pink-500/20",
  },
  positionGain: {
    icon: <TrendingUp className="w-4 h-4" />,
    emoji: "📊",
    color: "text-green-400",
    bgColor: "bg-green-500/20",
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

const getMomentumTier = (multiplier: number): { label: string; emoji: string; color: string } => {
  if (multiplier >= 5) return { label: "EXPLOSIVE", emoji: "💥", color: "text-red-400" };
  if (multiplier >= 3) return { label: "SURGING", emoji: "🚀", color: "text-orange-400" };
  if (multiplier >= 1.5) return { label: "RISING", emoji: "📈", color: "text-green-400" };
  if (multiplier >= 1) return { label: "STEADY", emoji: "➡️", color: "text-gray-400" };
  return { label: "COOLING", emoji: "📉", color: "text-blue-400" };
};

const getStreakTier = (days: number): { label: string; fires: string } => {
  if (days >= 21) return { label: "GOD MODE", fires: "🔥🔥🔥🔥🔥" };
  if (days >= 14) return { label: "LEGENDARY", fires: "🔥🔥🔥🔥" };
  if (days >= 7) return { label: "UNSTOPPABLE", fires: "🔥🔥🔥" };
  if (days >= 4) return { label: "ON FIRE", fires: "🔥🔥" };
  if (days >= 2) return { label: "HOT", fires: "🔥" };
  return { label: "", fires: "" };
};

const getRankBadge = (rank: number): { label: string; emoji: string; style: string } => {
  if (rank === 1) return { label: "#1", emoji: "🥇", style: "bg-gradient-to-r from-yellow-400 to-amber-500 text-black" };
  if (rank === 2) return { label: "#2", emoji: "🥈", style: "bg-gradient-to-r from-gray-300 to-gray-400 text-black" };
  if (rank === 3) return { label: "#3", emoji: "🥉", style: "bg-gradient-to-r from-amber-600 to-amber-700 text-white" };
  if (rank <= 10) return { label: `#${rank}`, emoji: "🏅", style: "bg-white/10 text-white" };
  return { label: `#${rank}`, emoji: "", style: "bg-white/5 text-white/70" };
};

// ============================================================================
// Sub-Components
// ============================================================================

/** Animated score counter with slot-machine effect */
function AnimatedScore({ 
  value, 
  animate = true,
  className 
}: { 
  value: number; 
  animate?: boolean;
  className?: string;
}) {
  const [displayValue, setDisplayValue] = useState(animate ? 0 : value);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (!animate) {
      setDisplayValue(value);
      return;
    }

    setIsAnimating(true);
    const duration = 1200;
    const steps = 30;
    const stepDuration = duration / steps;
    const increment = value / steps;
    
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        setIsAnimating(false);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.round(current));
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [value, animate]);

  return (
    <div 
      className={cn(
        "font-black tabular-nums transition-all",
        isAnimating && "score-glow-pulse",
        className
      )}
      style={{
        ["--score-glow-color" as string]: "#A3FF12",
      }}
    >
      {Math.round(displayValue)}
    </div>
  );
}

/** Avatar with fallback initials */
function AssetAvatar({ 
  name, 
  imageUrl, 
  assetType,
  isCaptain,
  size = "md"
}: { 
  name: string; 
  imageUrl?: string | null;
  assetType: AssetType;
  isCaptain?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const [imgError, setImgError] = useState(false);
  const config = ASSET_TYPE_CONFIG[assetType];
  
  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-16 h-16",
    lg: "w-20 h-20",
  };

  const initials = name.slice(0, 2).toUpperCase();

  return (
    <div className="relative">
      <div 
        className={cn(
          "rounded-2xl overflow-hidden border-2 border-white/20 shadow-lg",
          `bg-gradient-to-br ${config.bgGradient}`,
          sizeClasses[size]
        )}
      >
        {imageUrl && !imgError ? (
          <img
            src={imageUrl}
            alt={name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className={cn("font-bold", config.color, size === "lg" ? "text-2xl" : "text-xl")}>
              {initials}
            </span>
          </div>
        )}
      </div>
      {/* Captain crown badge */}
      {isCaptain && (
        <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg border-2 border-black/20">
          <span className="text-sm">👑</span>
        </div>
      )}
    </div>
  );
}

/** Quick stat pill for momentum, rank, streak, etc. */
function QuickStatPill({ 
  label, 
  value, 
  emoji,
  tooltip,
  highlight = false,
}: {
  label: string;
  value: string | number;
  emoji?: string;
  tooltip?: string;
  highlight?: boolean;
}) {
  const content = (
    <div 
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
        highlight 
          ? "bg-[#A3FF12]/20 text-[#A3FF12] border border-[#A3FF12]/30" 
          : "bg-white/5 text-white/80 border border-white/10"
      )}
    >
      {emoji && <span>{emoji}</span>}
      <span className="uppercase tracking-wide text-[10px] opacity-70">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="bottom" className="bg-black/90 border-white/20">
            <p className="text-xs">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
}

/** Stacked progress bar showing points breakdown */
function PointsBreakdownBar({
  orderPoints,
  momentumPoints,
  bonusPoints,
  totalPoints,
}: {
  orderPoints: number;
  momentumPoints: number;
  bonusPoints: number;
  totalPoints: number;
}) {
  const segments = [
    { value: orderPoints, color: "bg-blue-500", label: "Orders" },
    { value: momentumPoints, color: "bg-purple-500", label: "Momentum" },
    { value: bonusPoints, color: "bg-[#A3FF12]", label: "Bonuses" },
  ].filter(s => s.value > 0);

  return (
    <div className="space-y-2">
      {/* Stacked bar */}
      <div className="h-3 rounded-full overflow-hidden bg-white/5 flex">
        {segments.map((segment, idx) => {
          const width = totalPoints > 0 ? (segment.value / totalPoints) * 100 : 0;
          return (
            <div
              key={idx}
              className={cn(segment.color, "transition-all duration-500 relative group")}
              style={{ width: `${width}%` }}
            >
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/20 transition-colors" />
            </div>
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="flex flex-wrap gap-3 justify-center">
        {segments.map((segment, idx) => (
          <div key={idx} className="flex items-center gap-1.5 text-xs text-white/60">
            <div className={cn("w-2 h-2 rounded-full", segment.color)} />
            <span>{segment.label}</span>
            <span className="font-medium text-white/80">{segment.value.toFixed(0)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Individual bonus item with emoji and animation */
function BonusItem({ bonus }: { bonus: ScoringBonus }) {
  const config = BONUS_CONFIG[bonus.type] || BONUS_CONFIG.rank;
  
  return (
    <div 
      className={cn(
        "flex items-center justify-between p-3 rounded-xl border border-white/10 transition-all hover:border-white/20",
        config.bgColor
      )}
    >
      <div className="flex items-center gap-3">
        <div className="text-xl">{config.emoji}</div>
        <div>
          <div className={cn("font-semibold text-sm", config.color)}>
            {bonus.label}
          </div>
          <div className="text-xs text-white/50">
            {typeof bonus.value === 'number' ? bonus.value.toFixed(0) : bonus.value}
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-lg font-bold text-[#A3FF12]">+{bonus.points}</div>
        <div className="text-[10px] uppercase tracking-wider text-white/40">PTS</div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function ScoringCard({
  assetName,
  assetType,
  imageUrl,
  totalPoints,
  orderPoints = 0,
  orderCount,
  momentumMultiplier,
  momentumPoints = 0,
  bonuses = [],
  rank,
  streakDays,
  marketSharePercent,
  isCaptain = false,
  onNameClick,
  className,
  animateScore = true,
}: ScoringCardProps) {
  const [bonusesOpen, setBonusesOpen] = useState(true);
  
  const assetConfig = ASSET_TYPE_CONFIG[assetType];
  const momentumTier = momentumMultiplier ? getMomentumTier(momentumMultiplier) : null;
  const streakTier = streakDays ? getStreakTier(streakDays) : null;
  const rankBadge = rank ? getRankBadge(rank) : null;

  // Calculate total bonus points
  const totalBonusPoints = useMemo(() => 
    bonuses.reduce((sum, b) => sum + b.points, 0), 
    [bonuses]
  );

  // Build quick stats array (only shown once each)
  const quickStats = useMemo(() => {
    const stats: Array<{key: string; label: string; value: string; emoji: string; tooltip: string; highlight: boolean}> = [];
    
    if (momentumMultiplier && momentumTier) {
      stats.push({
        key: "momentum",
        label: "Momentum",
        value: `${momentumMultiplier.toFixed(1)}x`,
        emoji: momentumTier.emoji,
        tooltip: `${momentumTier.label} - Your momentum multiplier based on recent growth`,
        highlight: momentumMultiplier >= 1.5,
      });
    }
    
    if (rank && rankBadge) {
      stats.push({
        key: "rank",
        label: "Rank",
        value: rankBadge.label,
        emoji: rankBadge.emoji,
        tooltip: `Current market position`,
        highlight: rank <= 3,
      });
    }
    
    if (streakDays && streakDays >= 2 && streakTier) {
      stats.push({
        key: "streak",
        label: "Streak",
        value: `${streakDays}d`,
        emoji: streakTier.fires.slice(0, 2) || "🔥",
        tooltip: `${streakTier.label} - ${streakDays} consecutive days in top 10`,
        highlight: streakDays >= 7,
      });
    }
    
    if (marketSharePercent && marketSharePercent > 0) {
      stats.push({
        key: "share",
        label: "Share",
        value: `${marketSharePercent.toFixed(1)}%`,
        emoji: "📊",
        tooltip: `Market share percentage`,
        highlight: marketSharePercent >= 8,
      });
    }
    
    return stats;
  }, [momentumMultiplier, momentumTier, rank, rankBadge, streakDays, streakTier, marketSharePercent]);

  return (
    <div 
      className={cn(
        "relative overflow-hidden rounded-3xl",
        "bg-gradient-to-br from-[#2b1f47] via-[#1f1a3d] to-[#1a1530]",
        "border border-white/10 shadow-2xl",
        className
      )}
    >
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#A3FF12]/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 p-5 space-y-5">
        {/* ===== HERO SECTION ===== */}
        <div className="flex items-start gap-4">
          <AssetAvatar
            name={assetName}
            imageUrl={imageUrl}
            assetType={assetType}
            isCaptain={isCaptain}
            size="md"
          />
          
          <div className="flex-1 min-w-0">
            {/* Asset type badge */}
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm">{assetConfig.emoji}</span>
              <span className={cn("text-[10px] uppercase tracking-[0.2em] font-medium", assetConfig.color)}>
                {assetConfig.label}
              </span>
              {isCaptain && (
                <Badge className="text-[9px] px-1.5 py-0 bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                  CAPTAIN
                </Badge>
              )}
            </div>
            
            {/* Asset name */}
            {onNameClick ? (
              <button
                onClick={onNameClick}
                className="text-xl font-bold text-white text-left hover:text-[#A3FF12] transition-colors truncate block w-full"
              >
                {assetName}
              </button>
            ) : (
              <h3 className="text-xl font-bold text-white truncate">{assetName}</h3>
            )}
            
            {/* Streak indicator (if active) */}
            {streakTier && streakTier.fires && (
              <div className="flex items-center gap-1 mt-1">
                <span className="text-sm">{streakTier.fires}</span>
                <span className="text-[10px] uppercase tracking-wide text-orange-400/80 font-medium">
                  {streakTier.label}
                </span>
              </div>
            )}
          </div>
          
          {/* Total Score - Hero display */}
          <div className="text-right flex-shrink-0">
            <AnimatedScore 
              value={totalPoints} 
              animate={animateScore}
              className="text-4xl text-[#A3FF12]"
            />
            <div className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-medium">
              PUNKTE
            </div>
          </div>
        </div>

        {/* ===== QUICK STATS PILLS ===== */}
        {quickStats.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-start">
            {quickStats.map((stat) => (
              <QuickStatPill
                key={stat.key}
                label={stat.label}
                value={stat.value}
                emoji={stat.emoji}
                tooltip={stat.tooltip}
                highlight={stat.highlight}
              />
            ))}
          </div>
        )}

        {/* ===== POINTS BREAKDOWN BAR ===== */}
        {(orderPoints > 0 || momentumPoints > 0 || totalBonusPoints > 0) && (
          <PointsBreakdownBar
            orderPoints={orderPoints}
            momentumPoints={momentumPoints}
            bonusPoints={totalBonusPoints}
            totalPoints={totalPoints}
          />
        )}

        {/* ===== SCORING DETAILS ===== */}
        <div className="space-y-3 pt-2">
          {/* Order Activity */}
          {orderPoints > 0 && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-3">
                <span className="text-lg">📦</span>
                <div>
                  <div className="font-semibold text-sm text-white">Order Activity</div>
                  <div className="text-xs text-white/50">
                    {orderCount ? `${orderCount} orders` : 'Base demand score'}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-blue-400">{orderPoints.toFixed(0)}</div>
                <div className="text-[10px] uppercase tracking-wider text-white/40">PTS</div>
              </div>
            </div>
          )}

          {/* Momentum Score */}
          {momentumPoints > 0 && momentumMultiplier && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
              <div className="flex items-center gap-3">
                <span className="text-lg">{momentumTier?.emoji || "📈"}</span>
                <div>
                  <div className="font-semibold text-sm text-purple-400">Momentum Score</div>
                  <div className="text-xs text-white/50">
                    {momentumMultiplier.toFixed(2)}× multiplier
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-purple-400">{momentumPoints.toFixed(0)}</div>
                <div className="text-[10px] uppercase tracking-wider text-white/40">PTS</div>
              </div>
            </div>
          )}
        </div>

        {/* ===== BONUSES SECTION (Collapsible) ===== */}
        {bonuses.length > 0 && (
          <Collapsible open={bonusesOpen} onOpenChange={setBonusesOpen}>
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#A3FF12]/10 border border-[#A3FF12]/20 hover:bg-[#A3FF12]/15 transition-colors">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#A3FF12]" />
                  <span className="font-semibold text-sm text-[#A3FF12]">
                    Bonuses Unlocked
                  </span>
                  <Badge className="text-[10px] px-2 py-0 bg-[#A3FF12]/20 text-[#A3FF12] border-[#A3FF12]/30">
                    {bonuses.length}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#A3FF12]">+{totalBonusPoints}</span>
                  <ChevronDown 
                    className={cn(
                      "w-4 h-4 text-[#A3FF12] transition-transform",
                      bonusesOpen && "rotate-180"
                    )} 
                  />
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 space-y-2">
              {bonuses.map((bonus, idx) => (
                <BonusItem key={`${bonus.type}-${idx}`} bonus={bonus} />
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* ===== TOTAL FOOTER ===== */}
        <div className="pt-3 border-t border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-white/40 font-medium">
                Gesamtpunktzahl
              </div>
              <div className="text-xs text-white/30 mt-0.5">
                {orderPoints > 0 && "Orders"}
                {orderPoints > 0 && momentumPoints > 0 && " + "}
                {momentumPoints > 0 && "Momentum"}
                {(orderPoints > 0 || momentumPoints > 0) && bonuses.length > 0 && " + "}
                {bonuses.length > 0 && `${bonuses.length} Bonus${bonuses.length > 1 ? 'es' : ''}`}
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-black text-white">
                {totalPoints.toFixed(0)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Adapter function to convert old ScoringBreakdownData to new props
// ============================================================================

export interface LegacyScoringBreakdownData {
  assetName: string;
  assetType: AssetType;
  imageUrl?: string | null;
  components: Array<{
    category: string;
    value: number | string;
    formula: string;
    points: number;
  }>;
  bonuses: Array<{
    type: string;
    condition: string;
    points: number;
  }>;
  penalties?: Array<{
    type: string;
    condition: string;
    points: number;
  }>;
  subtotal: number;
  total: number;
  trendMultiplier?: number;
  streakDays?: number;
  marketSharePercent?: number;
  consistencyScore?: number;
  velocityScore?: number;
  currentRank?: number;
  captainMultiplier?: number;
}

export function adaptLegacyData(data: LegacyScoringBreakdownData): ScoringCardProps {
  // Extract order points from components
  const orderComponent = data.components.find(c => c.category === "Order Activity");
  const orderPoints = orderComponent?.points || 0;
  const orderCount = typeof orderComponent?.value === 'number' ? orderComponent.value : 
    (typeof orderComponent?.value === 'string' ? parseInt(orderComponent.value) : undefined);

  // Extract momentum points from components
  const momentumComponent = data.components.find(c => 
    c.category === "Momentum Score" || c.category === "Trend Bonus"
  );
  const momentumPoints = momentumComponent?.points || 0;

  // Map legacy bonuses to new format
  const bonuses: ScoringBonus[] = data.bonuses.map(b => {
    const typeLower = b.type.toLowerCase();
    let type: BonusType = "rank";
    
    if (typeLower.includes("streak")) type = "streak";
    else if (typeLower.includes("velocity")) type = "velocity";
    else if (typeLower.includes("consistency")) type = "consistency";
    else if (typeLower.includes("market") && typeLower.includes("share")) type = "marketShare";
    else if (typeLower.includes("captain")) type = "captain";
    else if (typeLower.includes("fan") || typeLower.includes("favorite")) type = "fan";
    else if (typeLower.includes("position") && typeLower.includes("gain")) type = "positionGain";
    else if (typeLower.includes("rank")) type = "rank";

    return {
      type,
      label: b.type.replace(/Hot Streak Streak/i, 'Hot Streak'),
      value: b.condition,
      points: b.points,
    };
  });

  // Check if captain
  const isCaptain = data.bonuses.some(b => 
    b.type.toLowerCase().includes('captain')
  );

  return {
    assetName: data.assetName,
    assetType: data.assetType,
    imageUrl: data.imageUrl,
    totalPoints: data.total,
    orderPoints,
    orderCount,
    momentumMultiplier: data.trendMultiplier,
    momentumPoints,
    bonuses,
    rank: data.currentRank,
    streakDays: data.streakDays,
    marketSharePercent: data.marketSharePercent,
    isCaptain,
  };
}

