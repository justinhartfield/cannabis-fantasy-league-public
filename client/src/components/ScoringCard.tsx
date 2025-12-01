import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
  Activity,
  Trophy,
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
  // Core scoring
  orderPoints?: number;
  momentumMultiplier?: number;
  momentumPoints?: number;
  // Bonuses
  bonuses?: ScoringBonus[];
  // Stats
  rank?: number;
  streakDays?: number;
  marketSharePercent?: number;
  // Flags
  isCaptain?: boolean;
  // Callbacks
  onNameClick?: () => void;
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const ASSET_CONFIG: Record<AssetType, { 
  label: string; 
  jerseyColor: string;
  jerseyGradientFrom: string;
  jerseyGradientTo: string;
}> = {
  manufacturer: { 
    label: "MANUFACTURER", 
    jerseyColor: "#3b82f6",
    jerseyGradientFrom: "#3b82f6",
    jerseyGradientTo: "#1d4ed8",
  },
  cannabis_strain: { 
    label: "STRAIN", 
    jerseyColor: "#a855f7",
    jerseyGradientFrom: "#a855f7",
    jerseyGradientTo: "#7c3aed",
  },
  product: { 
    label: "PRODUCT", 
    jerseyColor: "#ec4899",
    jerseyGradientFrom: "#ec4899",
    jerseyGradientTo: "#db2777",
  },
  pharmacy: { 
    label: "PHARMACY", 
    jerseyColor: "#10b981",
    jerseyGradientFrom: "#10b981",
    jerseyGradientTo: "#059669",
  },
  brand: { 
    label: "BRAND", 
    jerseyColor: "#eab308",
    jerseyGradientFrom: "#eab308",
    jerseyGradientTo: "#ca8a04",
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

const getTrendTier = (multiplier: number): { label: string; color: string } => {
  if (multiplier >= 3) return { label: "Surging", color: "text-orange-400" };
  if (multiplier >= 1.5) return { label: "Rising", color: "text-green-400" };
  if (multiplier >= 0.8) return { label: "Stable", color: "text-blue-400" };
  return { label: "Cooling", color: "text-cyan-400" };
};

const getStreakTier = (days: number): { label: string; fires: string } => {
  if (days >= 21) return { label: "God Mode", fires: "🔥🔥🔥🔥🔥" };
  if (days >= 14) return { label: "Legendary", fires: "🔥🔥🔥🔥" };
  if (days >= 7) return { label: "Unstoppable", fires: "🔥🔥🔥" };
  if (days >= 4) return { label: "On Fire", fires: "🔥🔥" };
  if (days >= 2) return { label: "Hot", fires: "🔥" };
  return { label: "", fires: "" };
};

const getRankLabel = (rank?: number): string => {
  if (!rank) return "UNRANKED";
  if (rank === 1) return "#1";
  if (rank === 2) return "#2";
  if (rank === 3) return "#3";
  return `#${rank}`;
};

const getBonusEmoji = (type: BonusType): string => {
  switch (type) {
    case "rank": return "🏆";
    case "streak": return "🔥";
    case "velocity": return "⚡";
    case "consistency": return "🎯";
    case "marketShare": return "📈";
    case "captain": return "👑";
    case "fan": return "❤️";
    case "positionGain": return "📊";
    default: return "●";
  }
};

// ============================================================================
// Sub-Components
// ============================================================================

/** Jersey SVG with embedded avatar */
function JerseyHero({ 
  assetType, 
  imageUrl, 
  assetName,
  rank,
  isCaptain,
}: { 
  assetType: AssetType;
  imageUrl?: string | null;
  assetName: string;
  rank?: number;
  isCaptain?: boolean;
}) {
  const [imgError, setImgError] = useState(false);
  const config = ASSET_CONFIG[assetType];
  const initials = assetName.slice(0, 2).toUpperCase();
  const showImage = imageUrl && !imgError;
  const uniqueId = `jersey-${assetName.replace(/\s/g, '-')}-${Date.now()}`;

  return (
    <div className="relative flex flex-col items-center">
      {/* Rank Badge */}
      <div className="absolute top-2 left-2 z-10">
        <div className={cn(
          "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
          rank === 1 ? "bg-gradient-to-r from-yellow-400 to-amber-500 text-black" :
          rank && rank <= 3 ? "bg-gradient-to-r from-gray-300 to-gray-400 text-black" :
          "bg-white/20 text-white/80"
        )}>
          {getRankLabel(rank)}
        </div>
      </div>

      {/* Captain Badge */}
      {isCaptain && (
        <div className="absolute top-2 right-2 z-10">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg">
            <span className="text-lg">👑</span>
          </div>
        </div>
      )}

      {/* Decorative background swoosh */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <svg viewBox="0 0 200 200" className="absolute -right-10 -top-10 w-40 h-40 text-white">
          <path d="M50 0 L200 150 L200 200 L0 200 L0 50 Z" fill="currentColor" opacity="0.3"/>
        </svg>
      </div>

      {/* Jersey SVG */}
      <svg
        viewBox="0 0 120 140"
        className="w-48 h-56 drop-shadow-2xl"
      >
        <defs>
          <linearGradient id={`${uniqueId}-gradient`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={config.jerseyGradientFrom} />
            <stop offset="100%" stopColor={config.jerseyGradientTo} />
          </linearGradient>
          <clipPath id={`${uniqueId}-avatar-clip`}>
            <circle cx="60" cy="60" r="22" />
          </clipPath>
        </defs>

        {/* Jersey shape */}
        <path
          d={`
            M 30 0
            L 0 30
            L 10 40
            L 20 30
            L 20 130
            Q 20 140 30 140
            L 90 140
            Q 100 140 100 130
            L 100 30
            L 110 40
            L 120 30
            L 90 0
            Q 84 10 60 16
            Q 36 10 30 0
            Z
          `}
          fill={`url(#${uniqueId}-gradient)`}
          stroke={config.jerseyColor}
          strokeWidth="2"
        />

        {/* Collar detail */}
        <path
          d="M 40 0 Q 60 16 80 0"
          fill="none"
          stroke="rgba(0,0,0,0.3)"
          strokeWidth="4"
        />

        {/* Avatar background circle */}
        <circle
          cx="60"
          cy="60"
          r="26"
          fill="white"
          stroke={config.jerseyColor}
          strokeWidth="3"
        />

        {/* Avatar image or initials */}
        {showImage ? (
          <image
            href={imageUrl!}
            x="38"
            y="38"
            width="44"
            height="44"
            clipPath={`url(#${uniqueId}-avatar-clip)`}
            preserveAspectRatio="xMidYMid slice"
            onError={() => setImgError(true)}
          />
        ) : (
          <text
            x="60"
            y="68"
            textAnchor="middle"
            fontSize="20"
            fontWeight="bold"
            fill={config.jerseyColor}
          >
            {initials}
          </text>
        )}
      </svg>
    </div>
  );
}

/** Stat card for the 2x2 grid */
function StatCard({
  icon,
  label,
  value,
  subtitle,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtitle?: string;
  className?: string;
}) {
  return (
    <div className={cn(
      "relative rounded-2xl bg-[#1a1035]/80 border border-white/10 p-4 overflow-hidden",
      className
    )}>
      {/* Background decoration */}
      <div className="absolute right-2 top-2 opacity-10">
        <TrendingUp className="w-12 h-12" />
      </div>
      
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-white/60">{icon}</span>
          <span className="text-[10px] uppercase tracking-wider text-white/50 font-semibold">
            {label}
          </span>
        </div>
        <div className="text-2xl font-bold text-white">{value}</div>
        {subtitle && (
          <div className="text-xs text-white/50 mt-1">{subtitle}</div>
        )}
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
  momentumMultiplier,
  momentumPoints = 0,
  bonuses = [],
  rank,
  streakDays,
  marketSharePercent,
  isCaptain = false,
  onNameClick,
  className,
}: ScoringCardProps) {
  const config = ASSET_CONFIG[assetType];
  const trendTier = momentumMultiplier ? getTrendTier(momentumMultiplier) : null;
  const streakTier = streakDays ? getStreakTier(streakDays) : null;

  // Calculate status points (market presence bonuses)
  const statusPoints = useMemo(() => {
    return bonuses
      .filter(b => b.type === 'rank' || b.type === 'marketShare' || b.type === 'positionGain')
      .reduce((sum, b) => sum + b.points, 0);
  }, [bonuses]);

  // Get streak bonus points
  const streakPoints = useMemo(() => {
    const streakBonus = bonuses.find(b => b.type === 'streak');
    return streakBonus?.points || 0;
  }, [bonuses]);

  return (
    <div 
      className={cn(
        "rounded-3xl overflow-hidden",
        "bg-gradient-to-br from-[#2d1b4e] via-[#1f1a3d] to-[#1a1530]",
        "border border-white/10 shadow-2xl",
        className
      )}
    >
      {/* Jersey Hero Section */}
      <div 
        className="relative p-6 pb-4"
        style={{
          background: `linear-gradient(135deg, ${config.jerseyGradientFrom}20 0%, transparent 50%)`,
        }}
      >
        <JerseyHero
          assetType={assetType}
          imageUrl={imageUrl}
          assetName={assetName}
          rank={rank}
          isCaptain={isCaptain}
        />

        {/* Name and Type */}
        <div className="text-center mt-4">
          {onNameClick ? (
            <button
              onClick={onNameClick}
              className="text-xl font-bold text-white hover:text-primary transition-colors"
            >
              {assetName}
            </button>
          ) : (
            <h3 className="text-xl font-bold text-white">{assetName}</h3>
          )}
          <div className="text-xs uppercase tracking-[0.2em] text-white/50 mt-1">
            {config.label}
          </div>
        </div>

        {/* Total Points */}
        <div className="text-center mt-4">
          <div 
            className="text-6xl font-black"
            style={{ color: config.jerseyColor }}
          >
            {Math.round(totalPoints)}
          </div>
          <div className="text-xs uppercase tracking-[0.3em] text-white/40 font-semibold mt-1">
            TOTAL POINTS
          </div>
        </div>
      </div>

      {/* Asset Name Banner */}
      <div className="bg-[#0f0a1a] py-3 px-6 text-center border-t border-b border-white/5">
        <div className="text-lg font-bold text-white">{assetName}</div>
        <div className="text-xs uppercase tracking-wider text-white/40">{config.label}</div>
      </div>

      {/* 4-Stat Grid */}
      <div className="p-4 grid grid-cols-2 gap-3">
        {/* TREND */}
        <StatCard
          icon={
            momentumMultiplier && momentumMultiplier >= 1 
              ? <TrendingUp className="w-4 h-4" />
              : <TrendingDown className="w-4 h-4" />
          }
          label="TREND"
          value={`+${momentumPoints}`}
          subtitle={trendTier ? `${trendTier.label} (${momentumMultiplier?.toFixed(2)}x)` : "No trend data"}
        />

        {/* STREAK */}
        <StatCard
          icon={<Zap className="w-4 h-4" />}
          label="STREAK"
          value={`+${streakPoints}`}
          subtitle={streakTier && streakDays ? `${streakDays} Days • ${streakTier.label}` : "No streak"}
        />

        {/* ACTIVITY */}
        <StatCard
          icon={<Activity className="w-4 h-4" />}
          label="ACTIVITY"
          value={orderPoints}
          subtitle="Base Volume Score"
        />

        {/* STATUS */}
        <StatCard
          icon={<Trophy className="w-4 h-4" />}
          label="STATUS"
          value={`+${statusPoints}`}
          subtitle="Market Presence"
        />
      </div>

      {/* Detailed Breakdown */}
      {bonuses.length > 0 && (
        <div className="px-6 pb-6">
          <div className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-semibold mb-3">
            DETAILED BREAKDOWN
          </div>
          <div className="space-y-2">
            {bonuses.map((bonus, idx) => (
              <div 
                key={`${bonus.type}-${idx}`}
                className="flex items-center justify-between py-2"
              >
                <div className="flex items-center gap-3">
                  <span className="text-green-400">●</span>
                  <span className="text-white/90 text-sm">
                    {bonus.type === 'streak' && streakTier?.fires 
                      ? `${streakTier.fires} ${bonus.label}`
                      : bonus.label
                    }
                  </span>
                </div>
                <span className="text-green-400 font-bold">+{bonus.points}</span>
              </div>
            ))}
          </div>
        </div>
      )}
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
    momentumMultiplier: data.trendMultiplier,
    momentumPoints,
    bonuses,
    rank: data.currentRank,
    streakDays: data.streakDays,
    marketSharePercent: data.marketSharePercent,
    isCaptain,
  };
}
