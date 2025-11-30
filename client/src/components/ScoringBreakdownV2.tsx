import { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Trophy, BarChart3, Flame, Zap, Target, TrendingUpDown, Crown, Heart } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DraftFieldPlayer } from "./DraftFieldPlayer";

interface ScoringComponent {
  category: string;
  value: number | string;
  formula: string;
  points: number;
}

interface ScoringBonus {
  type: string;
  condition: string;
  points: number;
}



interface ScoringBreakdownData {
  assetName: string;
  assetType: "manufacturer" | "cannabis_strain" | "product" | "pharmacy" | "brand";
  imageUrl?: string | null;
  components: ScoringComponent[];
  bonuses: ScoringBonus[];
  penalties?: ScoringBonus[];
  subtotal: number;
  total: number;
  // New trend-based fields
  trendMultiplier?: number;
  streakDays?: number;
  marketSharePercent?: number;
  consistencyScore?: number;
  velocityScore?: number;
  // Additional fields for bonus tooltips
  currentRank?: number;
  captainMultiplier?: number;
}

interface ScoringBreakdownProps {
  data: ScoringBreakdownData;
  leagueAverage?: number;
  weeklyTrend?: number[];
  useTrendDisplay?: boolean; // Toggle between old and new display
  variant?: "classic" | "app";
  // Optional ISO week context (season-long leagues)
  weekContext?: {
    year: number;
    week: number;
  };
}

type ComponentTooltipDetails = {
  context: string;
  calculation: string;
  example?: string;
};

const ORDER_POINTS_PER_UNIT: Record<ScoringBreakdownData["assetType"], number> = {
  manufacturer: 10,
  cannabis_strain: 8,
  product: 15,
  pharmacy: 10,
  brand: 10,
};

const TREND_BASE_POINTS: Record<ScoringBreakdownData["assetType"], number> = {
  manufacturer: 100,
  cannabis_strain: 80,
  product: 120,
  pharmacy: 100,
  brand: 100,
};

const WEEKDAY_LABELS_DE = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

const getWeekDateRange = (
  year: number,
  week: number
): { startDate: string; endDate: string } => {
  const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
  const dow = simple.getUTCDay();
  const isoWeekStart = new Date(simple);

  if (dow <= 4) {
    isoWeekStart.setUTCDate(simple.getUTCDate() - simple.getUTCDay() + 1);
  } else {
    isoWeekStart.setUTCDate(simple.getUTCDate() + 8 - simple.getUTCDay());
  }

  const startDate = isoWeekStart.toISOString().split("T")[0];

  const isoWeekEnd = new Date(isoWeekStart);
  isoWeekEnd.setUTCDate(isoWeekEnd.getUTCDate() + 6);
  const endDate = isoWeekEnd.toISOString().split("T")[0];

  return { startDate, endDate };
};

const enumerateWeekDates = (startDate: string, endDate: string): string[] => {
  const dates: string[] = [];
  const current = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);

  while (current <= end) {
    dates.push(current.toISOString().split("T")[0]);
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
};

const formatStatDateLabel = (isoDate: string): string => {
  const date = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return isoDate;

  const weekday = WEEKDAY_LABELS_DE[date.getUTCDay()] ?? "";
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");

  return `${weekday} ${day}.${month}.`;
};

const parseMultiplierValue = (value: number | string): number => {
  if (typeof value === "number") return value;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 1;
};

const formatAssetDescriptor = (
  type: ScoringBreakdownData["assetType"]
): string => {
  switch (type) {
    case "cannabis_strain":
      return "strain";
    case "manufacturer":
      return "manufacturer";
    case "pharmacy":
      return "pharmacy";
    case "product":
      return "product";
    case "brand":
      return "brand";
    default:
      return "asset";
  }
};

// Helper functions moved from server/trendScoringEngine.ts to avoid server-side imports in client
const getStreakTierName = (streakDays: number): string => {
  if (streakDays >= 21) return '🔥🔥🔥🔥🔥 God Mode';
  if (streakDays >= 14) return '🔥🔥🔥🔥 Legendary';
  if (streakDays >= 7) return '🔥🔥🔥 Unstoppable';
  if (streakDays >= 4) return '🔥🔥 On Fire';
  if (streakDays >= 2) return '🔥 Hot Streak';
  return 'No Streak';
};

const calculateStreakMultiplier = (streakDays: number): number => {
  if (streakDays < 2) return 1.0; // No streak bonus

  // Progressive streak tiers with increasing multipliers
  if (streakDays >= 21) return 3.0;  // 🔥🔥🔥🔥🔥 God Mode: 3x multiplier
  if (streakDays >= 14) return 2.0;  // 🔥🔥🔥🔥 Legendary: 2x multiplier
  if (streakDays >= 7) return 1.5;   // 🔥🔥🔥 Unstoppable: 1.5x multiplier
  if (streakDays >= 4) return 1.25;  // 🔥🔥 On Fire: 1.25x multiplier
  return 1.1;                         // 🔥 Hot Streak: 1.1x multiplier (2-3 days)
};

type SubtotalTooltipDetails = {
  title: string;
  explanation: string;
  formula: string;
};

const getSubtotalTooltipContent = (
  type: 'components' | 'bonuses' | 'penalties' | 'total',
  data: ScoringBreakdownData,
  visibleComponentsCount: number
): SubtotalTooltipDetails => {
  const componentsSum = data.components?.reduce((sum, c) => sum + (c.points || 0), 0) || 0;
  const bonusesSum = data.bonuses?.reduce((sum, b) => sum + (b.points || 0), 0) || 0;
  const penaltiesSum = data.penalties?.reduce((sum, p) => sum + (p.points || 0), 0) || 0;

  switch (type) {
    case 'components':
      return {
        title: 'Components Subtotal',
        explanation: 'Sum of all scoring components (Order Activity + Momentum Score). Each component represents a different way this asset earned points.',
        formula: `${visibleComponentsCount} components summed = ${componentsSum.toFixed(0)} pts`,
      };
    case 'bonuses':
      return {
        title: 'Bonuses Total',
        explanation: 'Extra points awarded for exceptional performance like hot streaks, high velocity, or market dominance.',
        formula: `${data.bonuses?.length || 0} bonus(es) = +${bonusesSum.toFixed(0)} pts`,
      };
    case 'penalties':
      return {
        title: 'Penalties Total',
        explanation: 'Point deductions for negative performance indicators.',
        formula: `${data.penalties?.length || 0} penalty(ies) = -${Math.abs(penaltiesSum).toFixed(0)} pts`,
      };
    case 'total':
      const parts: string[] = [];
      if (componentsSum > 0) parts.push(`Components: ${componentsSum.toFixed(0)}`);
      if (bonusesSum > 0) parts.push(`Bonuses: +${bonusesSum.toFixed(0)}`);
      if (penaltiesSum !== 0) parts.push(`Penalties: ${penaltiesSum.toFixed(0)}`);

      return {
        title: 'Total Score',
        explanation: 'Final score combining all components, bonuses, and penalties for this asset.',
        formula: parts.length > 0
          ? `${parts.join(' + ')} = ${data.total.toFixed(0)} pts`
          : `Total: ${data.total.toFixed(0)} pts`,
      };
    default:
      return {
        title: 'Subtotal',
        explanation: 'Sum of related scoring items.',
        formula: '—',
      };
  }
};

const getComponentTooltipContent = (
  component: ScoringComponent,
  assetType: ScoringBreakdownData["assetType"]
): ComponentTooltipDetails => {
  const assetDescriptor = formatAssetDescriptor(assetType);

  if (component.category === "Order Activity") {
    const pointsPerOrder = ORDER_POINTS_PER_UNIT[assetType] ?? 10;
    const derivedOrders =
      pointsPerOrder > 0 ? component.points / pointsPerOrder : undefined;
    const orderCount =
      typeof derivedOrders === "number" && Number.isFinite(derivedOrders)
        ? Math.round(derivedOrders)
        : component.value;

    return {
      context: `Base demand score from recent orders for this ${assetDescriptor}. Sustained orders keep the asset competitive even without a breakout trend.`,
      calculation: `${orderCount} orders × ${pointsPerOrder} pts per order = ${component.points} pts`,
    };
  }

  if (component.category === "Trend Bonus" || component.category === "Momentum Score") {
    const basePoints = TREND_BASE_POINTS[assetType] ?? 100;
    const multiplier = parseMultiplierValue(component.value);

    return {
      context:
        "Momentum boost comparing today's volume to the trailing 7-day average. Above 1× means the asset is surging; below 1× shows a cooldown.",
      calculation: `${multiplier.toFixed(2)}× momentum × ${basePoints} base pts = ${component.points} pts`,
      example: `Example: 70 units today vs 10-unit avg ⇒ 7.0× × ${basePoints} = ${7 * basePoints
        } pts`,
    };
  }

  return {
    context: `${component.category} combines ${component.value} with ${component.formula}.`,
    calculation: `${component.value} → ${component.formula}`,
  };
};

type BonusTooltipDetails = {
  title: string;
  explanation: string;
  formula: string;
  calculation: string;
};

/**
 * Parse numeric values from bonus condition strings
 * Examples: "(27/100)" -> 27, "(+56)" -> 56, "2 days" -> 2, "×1.10" -> 1.10
 */
const parseValueFromCondition = (condition: string, pattern: RegExp): number | null => {
  const match = condition.match(pattern);
  if (match && match[1]) {
    const parsed = parseFloat(match[1]);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

/**
 * Get detailed tooltip content for bonus items
 * Shows explanation, formula, and specific math for the current asset
 */
const getBonusTooltipContent = (
  bonus: ScoringBonus,
  data: ScoringBreakdownData
): BonusTooltipDetails => {
  const bonusType = bonus.type.toLowerCase();
  const condition = bonus.condition || '';
  
  // Consistency Bonus - parse from "(X/100)" in condition
  if (bonusType.includes('consistency')) {
    // Try to get from data first, then parse from condition like "(27/100)"
    let score = data.consistencyScore;
    if (!score || score === 0) {
      score = parseValueFromCondition(condition, /\((\d+)\/100\)/) ?? 0;
    }
    return {
      title: 'Consistency Bonus',
      explanation: 'Rewards stable daily performance. Lower variance in daily activity = higher consistency score.',
      formula: 'consistencyScore × 0.20 (max 20 pts)',
      calculation: `${score} × 0.20 = ${bonus.points} pts`,
    };
  }
  
  // Velocity Bonus - parse from "(+X)" or "(-X)" in condition
  if (bonusType.includes('velocity')) {
    // Try to get from data first, then parse from condition like "(+56)"
    let score = data.velocityScore;
    if (score === undefined || score === 0) {
      score = parseValueFromCondition(condition, /\(([+-]?\d+)\)/) ?? 0;
    }
    return {
      title: 'Velocity Bonus',
      explanation: 'Rewards accelerating growth trends. Measures the change in growth rate (acceleration).',
      formula: 'velocityScore × 0.15 (max 15 pts)',
      calculation: `${score} × 0.15 = ${bonus.points} pts`,
    };
  }
  
  // Rank Bonus - parse from "Rank #X" or infer tier from points
  if (bonusType.includes('rank') && !bonusType.includes('market')) {
    let rank = data.currentRank;
    if (!rank || rank === 0) {
      rank = parseValueFromCondition(condition, /[Rr]ank\s*#?(\d+)/) ?? 0;
    }
    // Infer rank tier from points if rank not found
    let tierText: string;
    if (rank > 0) {
      tierText = rank === 1 ? '#1' : 
                 rank <= 3 ? '#2-3' : 
                 rank <= 5 ? '#4-5' : 
                 rank <= 10 ? '#6-10' : `#${rank}`;
    } else {
      // Infer from bonus points
      tierText = bonus.points === 30 ? '#1' :
                 bonus.points === 20 ? '#2-3' :
                 bonus.points === 15 ? '#4-5' :
                 bonus.points === 10 ? '#6-10' : 'Top 10';
    }
    return {
      title: 'Rank Bonus',
      explanation: 'Points for current market position. Higher ranks earn more bonus points.',
      formula: '#1 = 30 pts, #2-3 = 20 pts, #4-5 = 15 pts, #6-10 = 10 pts',
      calculation: `Rank ${tierText} → ${bonus.points} pts`,
    };
  }
  
  // Market Share Bonus - infer tier from points
  if (bonusType.includes('market') && bonusType.includes('share')) {
    let share = data.marketSharePercent;
    if (!share || share === 0) {
      // Try to parse percentage from condition
      share = parseValueFromCondition(condition, /(\d+(?:\.\d+)?)\s*%/) ?? 0;
    }
    // Infer tier from bonus points if share not found
    let tierText: string;
    if (share > 0) {
      tierText = share >= 15 ? '15%+ (Dominant)' :
                 share >= 8 ? '8-14% (Major)' :
                 share >= 4 ? '4-7% (Significant)' :
                 share >= 2 ? '2-3% (Notable)' : `${share.toFixed(1)}%`;
    } else {
      // Infer from bonus points
      tierText = bonus.points === 20 ? '15%+ (Dominant)' :
                 bonus.points === 15 ? '8-14% (Major)' :
                 bonus.points === 10 ? '4-7% (Significant)' :
                 bonus.points === 5 ? '2-3% (Notable)' : 'Notable';
    }
    const shareDisplay = share > 0 ? `${share.toFixed(1)}% share` : tierText;
    return {
      title: 'Market Share Bonus',
      explanation: 'Points for holding significant market share relative to competitors.',
      formula: '15%+ = 20 pts, 8-14% = 15 pts, 4-7% = 10 pts, 2-3% = 5 pts',
      calculation: `${shareDisplay} → ${bonus.points} pts`,
    };
  }
  
  // Hot Streak Bonus - parse from "X days" in condition
  if (bonusType.includes('streak')) {
    let days = data.streakDays;
    if (!days || days === 0) {
      days = parseValueFromCondition(condition, /(\d+)\s*days?/) ?? 0;
    }
    // Try to parse multiplier from condition like "×1.10 multiplier"
    const multiplier = parseValueFromCondition(condition, /[×x](\d+(?:\.\d+)?)\s*mult/i);
    const tierName = days > 0 ? getStreakTierName(days) : '';
    const multiplierText = multiplier ? ` (${multiplier}x)` : '';
    return {
      title: 'Hot Streak',
      explanation: 'Consecutive days ranking in the top 10. Longer streaks earn more bonus points.',
      formula: 'streakDays × 2 pts (max 15 pts)',
      calculation: `${days} days × 2 = ${bonus.points} pts${tierName ? ` ${tierName}` : ''}${multiplierText}`,
    };
  }
  
  // Captain Boost - parse multiplier from condition
  if (bonusType.includes('captain')) {
    let multiplier = data.captainMultiplier;
    if (!multiplier || multiplier === 0) {
      multiplier = parseValueFromCondition(condition, /(\d+(?:\.\d+)?)\s*[×x]/i) ?? 1.25;
    }
    // Calculate base points from the bonus (bonus = base * (mult - 1))
    const basePoints = multiplier > 1 ? bonus.points / (multiplier - 1) : bonus.points * 4;
    return {
      title: 'Captain Boost',
      explanation: 'Multiplier bonus applied to the designated team captain\'s points.',
      formula: 'basePoints × (multiplier - 1)',
      calculation: `${basePoints.toFixed(0)} base × (${multiplier}x - 1) = +${bonus.points} pts`,
    };
  }
  
  // Fan Buff
  if (bonusType.includes('fan') || bonusType.includes('favorite')) {
    return {
      title: 'Fan Buff',
      explanation: 'Flat bonus for playing one of your favorite assets in your lineup.',
      formula: 'Flat +5 pts bonus',
      calculation: `Favorite asset → +${bonus.points} pts`,
    };
  }
  
  // Default fallback for unknown bonus types
  return {
    title: bonus.type,
    explanation: bonus.condition,
    formula: 'Bonus calculation',
    calculation: `+${bonus.points} pts`,
  };
};

/**
 * ScoringBreakdownV2 Component
 * 
 * Enhanced scoring breakdown with trend-based metrics display.
 * Shows relative performance indicators instead of explicit sales data.
 */
export default function ScoringBreakdownV2({
  data,
  leagueAverage,
  weeklyTrend,
  useTrendDisplay = true,
  variant = "classic",
  weekContext,
}: ScoringBreakdownProps) {
  const getAssetTypeColor = (type: string) => {
    switch (type) {
      case "manufacturer":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "cannabis_strain":
        return "bg-green-500/10 text-green-600 border-green-500/20";
      case "product":
        return "bg-purple-500/10 text-purple-600 border-purple-500/20";
      case "pharmacy":
        return "bg-orange-500/10 text-orange-600 border-orange-500/20";
      case "brand":
        return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
      default:
        return "bg-gray-500/10 text-gray-600 border-gray-500/20";
    }
  };

  const getAssetTypeLabel = (type: string) => {
    switch (type) {
      case "manufacturer":
        return "Hersteller";
      case "cannabis_strain":
        return "Cannabis Strain";
      case "product":
        return "Produkt";
      case "pharmacy":
        return "Apotheke";
      case "brand":
        return "Brand";
      default:
        return type;
    }
  };

  const getTrendIcon = (multiplier?: number) => {
    if (!multiplier) return null;
    if (multiplier >= 5) return <Flame className="w-4 h-4 text-orange-500" />;
    if (multiplier >= 2) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (multiplier >= 1) return <Minus className="w-4 h-4 text-gray-500" />;
    return <TrendingDown className="w-4 h-4 text-red-500" />;
  };

  const getTrendColor = (multiplier?: number) => {
    if (!multiplier) return "text-gray-500";
    if (multiplier >= 5) return "text-orange-500";
    if (multiplier >= 2) return "text-green-500";
    if (multiplier >= 1) return "text-gray-500";
    return "text-red-500";
  };

  const getBonusIcon = (type: string) => {
    if (type.includes("Streak")) return <Flame className="w-4 h-4" />;
    if (type.includes("Velocity")) return <Zap className="w-4 h-4" />;
    if (type.includes("Consistency")) return <Target className="w-4 h-4" />;
    if (type.includes("Market")) return <TrendingUpDown className="w-4 h-4" />;
    if (type.includes("Captain")) return <Crown className="w-4 h-4 text-yellow-400" />;
    if (type.includes("Fan") || type.includes("Favorite")) return <Heart className="w-4 h-4 text-pink-400" />;
    return <TrendingUp className="w-4 h-4" />;
  };

  const vsLeagueAverage = leagueAverage ? data.total - leagueAverage : null;

  const orderActivityDateLabels = useMemo(() => {
    if (!weekContext) return null;
    const { startDate, endDate } = getWeekDateRange(weekContext.year, weekContext.week);
    const dates = enumerateWeekDates(startDate, endDate);
    return dates.map(formatStatDateLabel);
  }, [weekContext?.year, weekContext?.week]);

  // For season-long league views (identified by weekContext) we want to hide
  // components that don't contribute meaningful information:
  // - Brand trend-only components (New Ratings Momentum, Rating Trend) with 0 points
  // - "No Data" placeholder components that appear when daily stats were missing
  // - Any component with 0 points and a "Weekly aggregate" value (empty day aggregates)
  const visibleComponents = useMemo(() => {
    const base = data.components || [];

    if (!weekContext) {
      return base;
    }

    return base.filter((component) => {
      // Filter out brand momentum/trend components with 0 points
      if (data.assetType === "brand") {
        const isBrandTrendComponent =
          component.category === "New Ratings Momentum" ||
          component.category === "Rating Trend";

        if (isBrandTrendComponent && (!component.points || component.points === 0)) {
          return false;
        }
      }

      // Filter out "No Data" placeholder components with 0 points
      const isNoDataComponent =
        component.category === "No Data" ||
        component.category.toLowerCase().includes("no data") ||
        (typeof component.value === "string" && component.value.toLowerCase().includes("no stats"));

      if (isNoDataComponent && (!component.points || component.points === 0)) {
        return false;
      }

      // Filter out empty weekly aggregate components with 0 points
      // These appear when a day had no stats for an asset
      const isEmptyAggregate =
        typeof component.value === "string" &&
        component.value === "Weekly aggregate" &&
        (!component.points || component.points === 0);

      if (isEmptyAggregate) {
        return false;
      }

      // Also filter out components with "No stats available" in the formula
      const hasNoStatsFormula =
        typeof component.formula === "string" &&
        component.formula.toLowerCase().includes("no stats available");

      if (hasNoStatsFormula && (!component.points || component.points === 0)) {
        return false;
      }

      return true;
    });
  }, [data.components, data.assetType, weekContext?.year, weekContext?.week]);

  if (variant === "app") {
    return (
      <div className="rounded-[28px] bg-[#2b0d3f] text-white p-5 space-y-4 border border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.35)]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              {(() => {
                // Map asset type to a representative position for jersey color
                const getPositionForType = (type: string): "ST1" | "LW" | "CM1" | "CB1" | "GK" => {
                  switch (type) {
                    case "manufacturer": return "ST1";
                    case "pharmacy": return "LW";
                    case "product": return "CM1";
                    case "cannabis_strain": return "CB1";
                    case "brand": return "GK";
                    default: return "ST1";
                  }
                };

                const position = getPositionForType(data.assetType);
                // Check for both legacy snake_case and new Title Case bonus types
                const isCaptain = data.bonuses?.some(b => b.type === 'captain_boost' || b.type === 'Captain Boost');

                return (
                  <DraftFieldPlayer
                    position={position}
                    player={{
                      id: 0, // Dummy ID
                      name: data.assetName,
                      imageUrl: data.imageUrl,
                      assetType: data.assetType
                    }}
                    isCaptain={isCaptain}
                    size="sm"
                    className="w-[70px] h-[88px] transform scale-90 origin-left"
                    showScore={false}
                  />
                );
              })()}
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.35em] text-white/50">
                {getAssetTypeLabel(data.assetType)}
              </div>
              <div className="text-2xl font-semibold">{data.assetName}</div>
              {useTrendDisplay && data.trendMultiplier && (
                <div className="mt-1 inline-flex items-center gap-2 text-xs text-white/70">
                  <span className="px-2 py-0.5 rounded-full bg-white/10 flex items-center gap-1">
                    {getTrendIcon(data.trendMultiplier)}
                    {data.trendMultiplier.toFixed(2)}x Momentum
                  </span>
                  {data.streakDays && (
                    <span className="px-2 py-0.5 rounded-full bg-white/10 flex items-center gap-1">
                      <Flame className="w-3 h-3 text-orange-300" />
                      {data.streakDays}d Streak
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-4xl font-black">{Number(data.total).toFixed(0)}</div>
            <div className="text-xs uppercase tracking-[0.3em] text-white/50">
              Punkte
            </div>
          </div>
        </div>

        {useTrendDisplay && (data.consistencyScore || data.velocityScore || data.marketSharePercent) && (
          <div className="grid grid-cols-3 gap-3">
            {data.consistencyScore !== undefined && (
              <div className="rounded-2xl bg-white/5 border border-white/10 p-3 text-center">
                <div className="text-[11px] uppercase tracking-wide text-white/50">Consistency</div>
                <div className="text-lg font-bold">{data.consistencyScore ?? "--"}</div>
              </div>
            )}
            {data.velocityScore !== undefined && (
              <div className="rounded-2xl bg-white/5 border border-white/10 p-3 text-center">
                <div className="text-[11px] uppercase tracking-wide text-white/50">Velocity</div>
                <div className="text-lg font-bold">
                  {data.velocityScore && data.velocityScore > 0 ? "+" : ""}
                  {data.velocityScore ?? "--"}
                </div>
              </div>
            )}
            {data.marketSharePercent !== undefined && (
              <div className="rounded-2xl bg-white/5 border border-white/10 p-3 text-center">
                <div className="text-[11px] uppercase tracking-wide text-white/50">Share</div>
                <div className="text-lg font-bold">{data.marketSharePercent?.toFixed(1)}%</div>
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-xs uppercase tracking-[0.35em] text-white/45 cursor-help inline-flex items-center gap-1.5">
                  Scoring-Komponenten
                  <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-white/10 text-white/60 text-[10px]">?</span>
                  <span className="text-white/30 ml-1">{data.components?.reduce((sum, c) => sum + (c.points || 0), 0) || 0} pts</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs bg-[#1a1a2e] border-white/20">
                {(() => {
                  const tooltip = getSubtotalTooltipContent('components', data, visibleComponents.length);
                  return (
                    <div className="space-y-1.5">
                      <p className="font-semibold text-white">{tooltip.title}</p>
                      <p className="text-xs text-white/70">{tooltip.explanation}</p>
                      <p className="text-xs text-white/50 font-mono">{tooltip.formula}</p>
                    </div>
                  );
                })()}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <div className="grid gap-2">
            {visibleComponents.map((component, idx) => {
              const orderActivityIndex =
                component.category === "Order Activity"
                  ? visibleComponents
                    .slice(0, idx)
                    .filter((c) => c.category === "Order Activity").length
                  : null;

              const dateLabel =
                orderActivityIndex !== null &&
                  orderActivityDateLabels &&
                  orderActivityDateLabels[orderActivityIndex] !== undefined
                  ? orderActivityDateLabels[orderActivityIndex]
                  : null;

              // Format display text based on component type
              const displayCategory = component.category === "Trend Bonus" ? "Momentum Score" : component.category;

              // For Momentum Score (Trend Bonus), show cleaner format without redundancy
              const isMomentumScore = component.category === "Trend Bonus" || component.category === "Momentum Score";
              const displayValue = isMomentumScore
                ? `${parseMultiplierValue(component.value).toFixed(2)}× multiplier`
                : `${component.value} · ${component.formula}`;

              return (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-2xl bg-white/5 border border-white/10 px-4 py-3"
                >
                  <div>
                    <div className="text-sm font-semibold">
                      {displayCategory}
                      {dateLabel && (
                        <span className="ml-2 text-xs font-normal text-white/60">
                          {dateLabel}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-white/70">
                      {displayValue}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{component.points}</div>
                    <div className="text-[11px] uppercase tracking-wider text-white/60">
                      pts
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {data.bonuses.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-[0.35em] text-white/45 inline-flex items-center gap-1.5">
              Boni
              <span className="text-white/30 ml-1">+{data.bonuses.reduce((sum, b) => sum + b.points, 0)} pts</span>
            </div>
            <div className="space-y-2">
              {data.bonuses.map((bonus, idx) => {
                const tooltipContent = getBonusTooltipContent(bonus, data);
                // Normalize display name: "Hot Streak Streak" -> "Hot Streak"
                const displayName = bonus.type.replace(/Hot Streak Streak/i, 'Hot Streak');
                return (
                  <TooltipProvider key={idx}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="rounded-2xl border border-white/10 bg-white/3 px-4 py-3 flex items-center justify-between cursor-help">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
                              {getBonusIcon(bonus.type)}
                            </div>
                            <div>
                              <div className="font-semibold text-sm flex items-center gap-1.5">
                                {displayName}
                                <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-white/10 text-white/60 text-[10px]">?</span>
                              </div>
                              <div className="text-xs text-white/60">{bonus.condition}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-bold text-green-300">
                              +{bonus.points}
                            </div>
                            <div className="text-[11px] uppercase text-white/60">
                              pts
                            </div>
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs bg-[#1a1a2e] border-white/20">
                        <div className="space-y-1.5">
                          <p className="font-semibold text-white">{tooltipContent.title}</p>
                          <p className="text-xs text-white/70">{tooltipContent.explanation}</p>
                          <p className="text-xs text-white/50">Formula: {tooltipContent.formula}</p>
                          <p className="text-xs text-green-300 font-mono">{tooltipContent.calculation}</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="cursor-help">
                  <div className="text-xs uppercase tracking-[0.35em] text-white/45 flex items-center gap-1.5">
                    Gesamtpunktzahl
                    <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-white/10 text-white/60 text-[10px]">?</span>
                  </div>
                  <div className="text-sm text-white/60">
                    {visibleComponents.length} Komponenten
                    {data.bonuses.length > 0 && ` + ${data.bonuses.length} Boni`}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs bg-[#1a1a2e] border-white/20">
                {(() => {
                  const tooltip = getSubtotalTooltipContent('total', data, visibleComponents.length);
                  return (
                    <div className="space-y-1.5">
                      <p className="font-semibold text-white">{tooltip.title}</p>
                      <p className="text-xs text-white/70">{tooltip.explanation}</p>
                      <p className="text-xs text-white/50 font-mono">{tooltip.formula}</p>
                    </div>
                  );
                })()}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <div className="text-3xl font-black">{Number(data.total).toFixed(0)}</div>
        </div>
      </div>
    );
  }

  return (
    <Card className="bg-card border-border text-sm shadow-sm">
      <CardHeader className="px-4 py-3 pb-2">
        <div className="flex flex-col sm:flex-row items-start sm:items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-1 w-full sm:w-auto">
            {data.imageUrl && (
              <img
                src={data.imageUrl}
                alt={data.assetName}
                className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-border"
                onError={(e) => e.currentTarget.style.display = 'none'}
              />
            )}
            <div>
              <CardTitle className="text-card-foreground flex items-center gap-2 text-base">
                {!data.imageUrl && <BarChart3 className="w-5 h-5" />}
                {data.assetName}
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={getAssetTypeColor(data.assetType)}>
                  {getAssetTypeLabel(data.assetType)}
                </Badge>
                {/* Trend indicator badge */}
                {useTrendDisplay && data.trendMultiplier && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge variant="outline" className={`${getTrendColor(data.trendMultiplier)} border-current`}>
                          {getTrendIcon(data.trendMultiplier)}
                          <span className="ml-1">{data.trendMultiplier.toFixed(1)}x</span>
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Trend Bonus: {data.trendMultiplier.toFixed(2)}x growth</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {/* Streak indicator */}
                {useTrendDisplay && data.streakDays && data.streakDays > 1 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge variant="outline" className="text-orange-500 border-orange-500/20">
                          <Flame className="w-3 h-3 mr-1" />
                          {data.streakDays}d
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{data.streakDays} consecutive days in top 10</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </CardDescription>
            </div>
          </div>
          <div className="text-left sm:text-right w-full sm:w-auto">
            <div className="text-2xl font-bold text-foreground">{data.total}</div>
            <div className="text-xs text-muted-foreground">Punkte</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-4 py-3">
        {/* Trend Metrics Summary (New) */}
        {useTrendDisplay && (data.trendMultiplier || data.consistencyScore || data.velocityScore || data.marketSharePercent) && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-2 rounded-lg bg-muted/30 border border-border">
            {data.trendMultiplier && (
              <div className="text-center">
                <div className="text-[11px] text-muted-foreground mb-0.5">Momentum</div>
                <div className={`text-base font-bold ${getTrendColor(data.trendMultiplier)}`}>
                  {data.trendMultiplier.toFixed(1)}x
                </div>
              </div>
            )}
            {data.consistencyScore !== undefined && data.consistencyScore > 0 && (
              <div className="text-center">
                <div className="text-[11px] text-muted-foreground mb-0.5">Consistency</div>
                <div className="text-base font-bold text-blue-500">
                  {data.consistencyScore}/100
                </div>
              </div>
            )}
            {data.velocityScore !== undefined && data.velocityScore !== 0 && (
              <div className="text-center">
                <div className="text-[11px] text-muted-foreground mb-0.5">Velocity</div>
                <div className={`text-base font-bold ${data.velocityScore > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {data.velocityScore > 0 ? '+' : ''}{data.velocityScore}
                </div>
              </div>
            )}
            {data.marketSharePercent !== undefined && data.marketSharePercent > 0 && (
              <div className="text-center">
                <div className="text-[11px] text-muted-foreground mb-0.5">Market Share</div>
                <div className="text-base font-bold text-purple-500">
                  {data.marketSharePercent.toFixed(1)}%
                </div>
              </div>
            )}
          </div>
        )}

        {/* Components */}
        <div className="space-y-1.5">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wide cursor-help inline-flex items-center gap-1.5">
                  Scoring-Komponenten
                  <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-muted text-muted-foreground text-[10px]">?</span>
                  <span className="text-muted-foreground font-normal ml-1">
                    ({data.components?.reduce((sum, c) => sum + (c.points || 0), 0) || 0} pts)
                  </span>
                </h4>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                {(() => {
                  const tooltip = getSubtotalTooltipContent('components', data, visibleComponents.length);
                  return (
                    <div className="space-y-1.5">
                      <p className="font-semibold">{tooltip.title}</p>
                      <p className="text-xs text-muted-foreground">{tooltip.explanation}</p>
                      <p className="text-xs font-mono">{tooltip.formula}</p>
                    </div>
                  );
                })()}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <div className="space-y-1">
            {visibleComponents.map((component, idx) => {
              const tooltipContent = getComponentTooltipContent(
                component,
                data.assetType
              );

              const orderActivityIndex =
                component.category === "Order Activity"
                  ? visibleComponents
                    .slice(0, idx)
                    .filter((c) => c.category === "Order Activity").length
                  : null;

              const dateLabel =
                orderActivityIndex !== null &&
                  orderActivityDateLabels &&
                  orderActivityDateLabels[orderActivityIndex] !== undefined
                  ? orderActivityDateLabels[orderActivityIndex]
                  : null;

              // Format display text based on component type
              const displayCategory = component.category === "Trend Bonus" ? "Momentum Score" : component.category;

              // For Momentum Score (Trend Bonus), show cleaner format without redundancy
              const isMomentumScore = component.category === "Trend Bonus" || component.category === "Momentum Score";
              const displayFormula = isMomentumScore
                ? `${parseMultiplierValue(component.value).toFixed(2)}× multiplier → ${component.points} pts`
                : `${component.value} → ${component.formula}`;

              return (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-2 py-1.5 rounded-md bg-muted/50 gap-2"
                >
                  <div className="flex-1 w-full sm:w-auto">
                    <div className="text-sm font-medium text-foreground mb-1 flex items-center gap-2">
                      {displayCategory}
                      {dateLabel && (
                        <span className="ml-2 text-[11px] font-normal text-muted-foreground">
                          {dateLabel}
                        </span>
                      )}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors">
                              <span className="text-xs font-bold">i</span>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-xs space-y-1.5">
                            <p className="font-semibold">{displayCategory}</p>
                            <p className="text-xs">{tooltipContent.context}</p>
                            <p className="text-xs text-muted-foreground">
                              Calculation: {tooltipContent.calculation}
                            </p>
                            {tooltipContent.example && (
                              <p className="text-xs text-muted-foreground">
                                {tooltipContent.example}
                              </p>
                            )}
                            <p className="text-xs font-medium text-foreground">
                              Result: {component.points} pts
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {displayFormula}
                    </div>
                  </div>
                  <div className="text-left sm:text-right w-full sm:w-auto">
                    <div className="text-base font-bold text-foreground">
                      {component.points}
                    </div>
                    <div className="text-xs text-muted-foreground">pts</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bonuses */}
        {data.bonuses.length > 0 && (
          <div className="space-y-1.5">
            <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5 uppercase tracking-wide">
              <TrendingUp className="w-4 h-4 text-green-600" />
              Boni
              <span className="text-green-600/70 font-normal ml-1">
                (+{data.bonuses.reduce((sum, b) => sum + b.points, 0)} pts)
              </span>
            </h4>
            <div className="space-y-1">
              {data.bonuses.map((bonus, idx) => {
                const tooltipContent = getBonusTooltipContent(bonus, data);
                // Normalize display name: "Hot Streak Streak" -> "Hot Streak"
                const displayName = bonus.type.replace(/Hot Streak Streak/i, 'Hot Streak');
                return (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-2 py-1.5 rounded-md bg-green-500/5 border border-green-500/20 gap-2"
                  >
                    <div className="flex items-center gap-2">
                      {getBonusIcon(bonus.type)}
                      <div>
                        <div className="text-sm font-medium text-foreground flex items-center gap-2">
                          {displayName}
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-500/10 hover:bg-green-500/20 text-green-600 transition-colors">
                                  <span className="text-xs font-bold">?</span>
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="right" className="max-w-xs">
                                <div className="space-y-1.5">
                                  <p className="font-semibold">{tooltipContent.title}</p>
                                  <p className="text-xs text-muted-foreground">{tooltipContent.explanation}</p>
                                  <p className="text-xs text-muted-foreground">Formula: {tooltipContent.formula}</p>
                                  <p className="text-xs font-mono text-green-600">{tooltipContent.calculation}</p>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {bonus.condition}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs font-semibold text-green-600">
                      +{bonus.points}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}


        <div className="border-t border-border pt-2 mt-2">
          <div className="flex items-center justify-between p-2 rounded-md bg-muted/70">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="cursor-help">
                    <div className="text-sm font-semibold text-foreground leading-tight flex items-center gap-1.5">
                      Gesamtpunktzahl
                      <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-muted text-muted-foreground text-[10px]">?</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {visibleComponents.length} Komponenten + {data.bonuses.length} Boni
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  {(() => {
                    const tooltip = getSubtotalTooltipContent('total', data, visibleComponents.length);
                    return (
                      <div className="space-y-1.5">
                        <p className="font-semibold">{tooltip.title}</p>
                        <p className="text-xs text-muted-foreground">{tooltip.explanation}</p>
                        <p className="text-xs font-mono">{tooltip.formula}</p>
                      </div>
                    );
                  })()}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <div className="text-xl font-bold text-foreground">{data.total}</div>
          </div>
        </div>

        {/* League Average Comparison */}
        {vsLeagueAverage !== null && (
          <div className="flex items-center justify-between p-2 rounded-md bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-primary" />
              <div className="text-xs font-medium text-foreground uppercase tracking-wide">
                vs. Liga-Durchschnitt
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              {vsLeagueAverage > 0 ? (
                <>
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-semibold text-green-600">
                    +{vsLeagueAverage.toFixed(1)}
                  </span>
                </>
              ) : vsLeagueAverage < 0 ? (
                <>
                  <TrendingDown className="w-4 h-4 text-red-600" />
                  <span className="text-sm font-semibold text-red-600">
                    {vsLeagueAverage.toFixed(1)}
                  </span>
                </>
              ) : (
                <>
                  <Minus className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-semibold text-muted-foreground">
                    0.0
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Weekly Trend */}
        {weeklyTrend && weeklyTrend.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wide">Wöchentlicher Trend</h4>
            <div className="flex items-end gap-1 h-14">
              {weeklyTrend.map((points, idx) => {
                const maxPoints = Math.max(...weeklyTrend);
                const height = maxPoints > 0 ? (points / maxPoints) * 100 : 0;

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-primary/20 rounded-t"
                      style={{ height: `${height}%` }}
                    />
                    <div className="text-xs text-muted-foreground">
                      W{idx + 1}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
