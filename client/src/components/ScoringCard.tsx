import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
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
  Activity,
  Trophy,
  Target,
  Rocket,
  Crown,
  Heart,
  Factory,
  Leaf,
  Package,
  Building2,
  Star,
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
  icon: React.ReactNode;
  jerseyColor: string;
  jerseyGradientFrom: string;
  jerseyGradientTo: string;
  glowColor: string;
  patternType: 'stripes' | 'chevron' | 'dots' | 'waves' | 'diamond';
}> = {
  manufacturer: { 
    label: "HERSTELLER", 
    icon: <Factory className="w-5 h-5" />,
    jerseyColor: "#3b82f6",
    jerseyGradientFrom: "#3b82f6",
    jerseyGradientTo: "#1d4ed8",
    glowColor: "rgba(59, 130, 246, 0.5)",
    patternType: 'stripes',
  },
  cannabis_strain: { 
    label: "STRAIN", 
    icon: <Leaf className="w-5 h-5" />,
    jerseyColor: "#a855f7",
    jerseyGradientFrom: "#a855f7",
    jerseyGradientTo: "#7c3aed",
    glowColor: "rgba(168, 85, 247, 0.5)",
    patternType: 'waves',
  },
  product: { 
    label: "PRODUKT", 
    icon: <Package className="w-5 h-5" />,
    jerseyColor: "#ec4899",
    jerseyGradientFrom: "#ec4899",
    jerseyGradientTo: "#db2777",
    glowColor: "rgba(236, 72, 153, 0.5)",
    patternType: 'chevron',
  },
  pharmacy: { 
    label: "APOTHEKE", 
    icon: <Building2 className="w-5 h-5" />,
    jerseyColor: "#10b981",
    jerseyGradientFrom: "#10b981",
    jerseyGradientTo: "#059669",
    glowColor: "rgba(16, 185, 129, 0.5)",
    patternType: 'dots',
  },
  brand: { 
    label: "BRAND", 
    icon: <Star className="w-5 h-5" />,
    jerseyColor: "#eab308",
    jerseyGradientFrom: "#eab308",
    jerseyGradientTo: "#ca8a04",
    glowColor: "rgba(234, 179, 8, 0.5)",
    patternType: 'diamond',
  },
};

const BONUS_CONFIG: Record<BonusType, {
  emoji: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  description: string;
}> = {
  rank: {
    emoji: "🏆",
    icon: <Trophy className="w-4 h-4" />,
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/20",
    description: "Points for current market position ranking",
  },
  streak: {
    emoji: "🔥",
    icon: <Flame className="w-4 h-4" />,
    color: "text-orange-400",
    bgColor: "bg-orange-500/20",
    description: "Consecutive days performing in top 10",
  },
  velocity: {
    emoji: "⚡",
    icon: <Zap className="w-4 h-4" />,
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/20",
    description: "Accelerating growth rate bonus",
  },
  consistency: {
    emoji: "🎯",
    icon: <Target className="w-4 h-4" />,
    color: "text-green-400",
    bgColor: "bg-green-500/20",
    description: "Stable daily performance reward",
  },
  marketShare: {
    emoji: "📈",
    icon: <TrendingUp className="w-4 h-4" />,
    color: "text-indigo-400",
    bgColor: "bg-indigo-500/20",
    description: "Significant market share position",
  },
  captain: {
    emoji: "👑",
    icon: <Crown className="w-4 h-4" />,
    color: "text-yellow-300",
    bgColor: "bg-yellow-500/30",
    description: "2.5x momentum multiplier as team captain",
  },
  fan: {
    emoji: "❤️",
    icon: <Heart className="w-4 h-4" />,
    color: "text-pink-400",
    bgColor: "bg-pink-500/20",
    description: "Bonus for playing a favorite asset",
  },
  positionGain: {
    emoji: "🚀",
    icon: <Rocket className="w-4 h-4" />,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/20",
    description: "Gained ranking positions this period",
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

const getTrendTier = (multiplier: number): { label: string; emoji: string; color: string } => {
  if (multiplier >= 5) return { label: "EXPLOSIVE", emoji: "💥", color: "text-red-400" };
  if (multiplier >= 3) return { label: "Surging", emoji: "🚀", color: "text-orange-400" };
  if (multiplier >= 1.5) return { label: "Rising", emoji: "📈", color: "text-green-400" };
  if (multiplier >= 0.8) return { label: "Stable", emoji: "➡️", color: "text-blue-400" };
  return { label: "Cooling", emoji: "❄️", color: "text-cyan-400" };
};

const getStreakTier = (days: number): { label: string; fires: string; tier: string } => {
  if (days >= 21) return { label: "God Mode", fires: "🔥🔥🔥🔥🔥", tier: "LEGENDARY" };
  if (days >= 14) return { label: "Legendary", fires: "🔥🔥🔥🔥", tier: "EPIC" };
  if (days >= 7) return { label: "Unstoppable", fires: "🔥🔥🔥", tier: "RARE" };
  if (days >= 4) return { label: "On Fire", fires: "🔥🔥", tier: "UNCOMMON" };
  if (days >= 2) return { label: "Hot", fires: "🔥", tier: "COMMON" };
  return { label: "", fires: "", tier: "" };
};

const getRankDisplay = (rank?: number): { label: string; emoji: string; style: string } => {
  if (!rank) return { label: "UNRANKED", emoji: "➖", style: "bg-white/20 text-white/80" };
  if (rank === 1) return { label: "#1", emoji: "🥇", style: "bg-gradient-to-r from-yellow-400 to-amber-500 text-black" };
  if (rank === 2) return { label: "#2", emoji: "🥈", style: "bg-gradient-to-r from-gray-300 to-gray-400 text-black" };
  if (rank === 3) return { label: "#3", emoji: "🥉", style: "bg-gradient-to-r from-amber-600 to-amber-700 text-white" };
  if (rank <= 10) return { label: `#${rank}`, emoji: "🏅", style: "bg-white/20 text-white" };
  return { label: `#${rank}`, emoji: "", style: "bg-white/10 text-white/70" };
};

// ============================================================================
// Sub-Components
// ============================================================================

/** Fancy Jersey SVG with pattern and wrapped logo */
function JerseyHero({ 
  assetType, 
  imageUrl, 
  assetName,
  rank,
  isCaptain,
  onClick,
}: { 
  assetType: AssetType;
  imageUrl?: string | null;
  assetName: string;
  rank?: number;
  isCaptain?: boolean;
  onClick?: () => void;
}) {
  const [imgError, setImgError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const config = ASSET_CONFIG[assetType];
  const initials = assetName.slice(0, 2).toUpperCase();
  const showImage = imageUrl && !imgError;
  const uniqueId = `jersey-${assetName.replace(/\s/g, '-')}-${Math.random().toString(36).substr(2, 9)}`;
  const rankDisplay = getRankDisplay(rank);

  // Pattern generators for different asset types
  const getPattern = () => {
    switch (config.patternType) {
      case 'stripes':
        return (
          <pattern id={`${uniqueId}-pattern`} patternUnits="userSpaceOnUse" width="8" height="8">
            <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(255,255,255,0.1)" strokeWidth="2"/>
          </pattern>
        );
      case 'chevron':
        return (
          <pattern id={`${uniqueId}-pattern`} patternUnits="userSpaceOnUse" width="16" height="16">
            <path d="M0 8 L8 0 L16 8 L8 16 Z" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>
          </pattern>
        );
      case 'dots':
        return (
          <pattern id={`${uniqueId}-pattern`} patternUnits="userSpaceOnUse" width="10" height="10">
            <circle cx="5" cy="5" r="1.5" fill="rgba(255,255,255,0.1)"/>
          </pattern>
        );
      case 'waves':
        return (
          <pattern id={`${uniqueId}-pattern`} patternUnits="userSpaceOnUse" width="20" height="10">
            <path d="M0 5 Q5 0 10 5 Q15 10 20 5" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5"/>
          </pattern>
        );
      case 'diamond':
        return (
          <pattern id={`${uniqueId}-pattern`} patternUnits="userSpaceOnUse" width="12" height="12">
            <path d="M6 0 L12 6 L6 12 L0 6 Z" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
          </pattern>
        );
    }
  };

  return (
    <div 
      className="relative flex flex-col items-center group cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* Rank Badge */}
      <div className="absolute top-2 left-2 z-10">
        <div className={cn(
          "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all duration-300",
          rankDisplay.style,
          isHovered && "scale-110"
        )}>
          {rankDisplay.emoji && <span>{rankDisplay.emoji}</span>}
          {rankDisplay.label}
        </div>
      </div>

      {/* Position Icon Badge */}
      <div className="absolute top-2 right-2 z-10">
        <div 
          className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300",
            "bg-white/10 backdrop-blur-sm border border-white/20",
            isHovered && "scale-110 bg-white/20"
          )}
          style={{ 
            boxShadow: isHovered ? `0 0 20px ${config.glowColor}` : 'none' 
          }}
        >
          <span className="text-white">{config.icon}</span>
        </div>
      </div>

      {/* Captain Badge */}
      {isCaptain && (
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-20">
          <div className="px-3 py-1 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 text-black text-xs font-bold flex items-center gap-1 shadow-lg animate-pulse">
            <Crown className="w-3 h-3" />
            CAPTAIN
          </div>
        </div>
      )}

      {/* Jersey SVG with fancy patterns */}
      <svg
        viewBox="0 0 140 160"
        className={cn(
          "w-52 h-60 transition-all duration-500",
          isHovered && "scale-105"
        )}
        style={{
          filter: isHovered 
            ? `drop-shadow(0 0 30px ${config.glowColor}) drop-shadow(0 10px 20px rgba(0,0,0,0.4))`
            : 'drop-shadow(0 8px 16px rgba(0,0,0,0.3))'
        }}
      >
        <defs>
          <linearGradient id={`${uniqueId}-gradient`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={config.jerseyGradientFrom} />
            <stop offset="50%" stopColor={config.jerseyColor} />
            <stop offset="100%" stopColor={config.jerseyGradientTo} />
          </linearGradient>
          <linearGradient id={`${uniqueId}-shine`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.3)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.1)" />
          </linearGradient>
          {getPattern()}
          <clipPath id={`${uniqueId}-jersey-clip`}>
            <path d={`
              M 35 0
              L 0 35
              L 12 48
              L 24 35
              L 24 150
              Q 24 160 35 160
              L 105 160
              Q 116 160 116 150
              L 116 35
              L 128 48
              L 140 35
              L 105 0
              Q 98 12 70 18
              Q 42 12 35 0
              Z
            `}/>
          </clipPath>
          <clipPath id={`${uniqueId}-logo-clip`}>
            <ellipse cx="70" cy="75" rx="28" ry="32" />
          </clipPath>
        </defs>

        {/* Jersey base shape */}
        <path
          d={`
            M 35 0
            L 0 35
            L 12 48
            L 24 35
            L 24 150
            Q 24 160 35 160
            L 105 160
            Q 116 160 116 150
            L 116 35
            L 128 48
            L 140 35
            L 105 0
            Q 98 12 70 18
            Q 42 12 35 0
            Z
          `}
          fill={`url(#${uniqueId}-gradient)`}
        />

        {/* Jersey pattern overlay */}
        <path
          d={`
            M 35 0
            L 0 35
            L 12 48
            L 24 35
            L 24 150
            Q 24 160 35 160
            L 105 160
            Q 116 160 116 150
            L 116 35
            L 128 48
            L 140 35
            L 105 0
            Q 98 12 70 18
            Q 42 12 35 0
            Z
          `}
          fill={`url(#${uniqueId}-pattern)`}
        />

        {/* Jersey shine overlay */}
        <path
          d={`
            M 35 0
            L 0 35
            L 12 48
            L 24 35
            L 24 150
            Q 24 160 35 160
            L 105 160
            Q 116 160 116 150
            L 116 35
            L 128 48
            L 140 35
            L 105 0
            Q 98 12 70 18
            Q 42 12 35 0
            Z
          `}
          fill={`url(#${uniqueId}-shine)`}
        />

        {/* Jersey outline */}
        <path
          d={`
            M 35 0
            L 0 35
            L 12 48
            L 24 35
            L 24 150
            Q 24 160 35 160
            L 105 160
            Q 116 160 116 150
            L 116 35
            L 128 48
            L 140 35
            L 105 0
            Q 98 12 70 18
            Q 42 12 35 0
            Z
          `}
          fill="none"
          stroke={isHovered ? "white" : config.jerseyColor}
          strokeWidth={isHovered ? "3" : "2"}
          className="transition-all duration-300"
        />

        {/* Collar detail */}
        <path
          d="M 48 0 Q 70 18 92 0"
          fill="none"
          stroke="rgba(0,0,0,0.4)"
          strokeWidth="5"
        />

        {/* Logo area - wrapped around jersey curve */}
        <g>
          {/* Logo background with jersey curve */}
          <ellipse
            cx="70"
            cy="75"
            rx="30"
            ry="34"
            fill="white"
            stroke={config.jerseyColor}
            strokeWidth="3"
            className="transition-all duration-300"
            style={{
              filter: isHovered ? `drop-shadow(0 0 10px ${config.glowColor})` : 'none'
            }}
          />

          {/* Logo image or initials */}
          {showImage ? (
            <image
              href={imageUrl!}
              x="42"
              y="43"
              width="56"
              height="64"
              clipPath={`url(#${uniqueId}-logo-clip)`}
              preserveAspectRatio="xMidYMid slice"
              onError={() => setImgError(true)}
            />
          ) : (
            <text
              x="70"
              y="85"
              textAnchor="middle"
              fontSize="28"
              fontWeight="bold"
              fill={config.jerseyColor}
            >
              {initials}
            </text>
          )}
        </g>

      </svg>

      {/* Hover glow effect */}
      <div 
        className={cn(
          "absolute inset-0 rounded-full blur-3xl transition-opacity duration-500 pointer-events-none",
          isHovered ? "opacity-30" : "opacity-0"
        )}
        style={{ backgroundColor: config.glowColor }}
      />
    </div>
  );
}

/** Enhanced Stat card with better icons and effects */
function StatCard({
  icon,
  emoji,
  label,
  value,
  subtitle,
  glowColor,
  accentColor,
}: {
  icon: React.ReactNode;
  emoji: string;
  label: string;
  value: string | number;
  subtitle?: string;
  glowColor?: string;
  accentColor?: string;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className={cn(
        "relative rounded-2xl bg-gradient-to-br from-[#1a1035] to-[#0f0820] border border-white/10 p-4 overflow-hidden transition-all duration-300",
        isHovered && "border-white/30 scale-[1.02]"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        boxShadow: isHovered && glowColor ? `0 0 30px ${glowColor}` : 'none'
      }}
    >
      {/* Background icon decoration */}
      <div 
        className={cn(
          "absolute -right-2 -top-2 opacity-10 transition-all duration-300",
          isHovered && "opacity-20 scale-110"
        )}
      >
        <span className="text-5xl">{emoji}</span>
      </div>

      {/* Animated gradient overlay on hover */}
      <div 
        className={cn(
          "absolute inset-0 opacity-0 transition-opacity duration-300",
          isHovered && "opacity-100"
        )}
        style={{
          background: glowColor 
            ? `radial-gradient(circle at 80% 20%, ${glowColor}30 0%, transparent 50%)`
            : undefined
        }}
      />
      
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-2">
          <div 
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300",
              isHovered ? "scale-110" : ""
            )}
            style={{ 
              backgroundColor: accentColor ? `${accentColor}30` : 'rgba(255,255,255,0.1)',
              color: accentColor || 'white'
            }}
          >
            {icon}
          </div>
          <span className="text-[10px] uppercase tracking-wider text-white/50 font-bold">
            {label}
          </span>
        </div>
        <div 
          className="text-2xl font-black transition-all duration-300"
          style={{ color: isHovered && accentColor ? accentColor : 'white' }}
        >
          {value}
        </div>
        {subtitle && (
          <div className="text-xs text-white/50 mt-1 font-medium">{subtitle}</div>
        )}
      </div>
    </div>
  );
}

/** Enhanced Bonus Item with tooltips and rich visuals */
function BonusItem({ bonus, streakTier }: { bonus: ScoringBonus; streakTier?: { fires: string; label: string } }) {
  const config = BONUS_CONFIG[bonus.type] || BONUS_CONFIG.rank;
  const isStreak = bonus.type === 'streak';
  
  // Extract calculation details from the condition/value
  const getCalculationDetails = () => {
    const condition = typeof bonus.value === 'string' ? bonus.value : '';
    
    switch (bonus.type) {
      case 'rank':
        return {
          formula: '#1 = 30pts, #2-3 = 20pts, #4-5 = 15pts, #6-10 = 10pts',
          calculation: condition || `Rank bonus → ${bonus.points} pts`,
        };
      case 'streak':
        return {
          formula: 'streakDays × 2 pts (max 15 pts)',
          calculation: condition || `Streak bonus → ${bonus.points} pts`,
        };
      case 'velocity':
        return {
          formula: 'velocityScore × 0.15 (max 15 pts)',
          calculation: condition || `Velocity × 0.15 = ${bonus.points} pts`,
        };
      case 'consistency':
        return {
          formula: 'consistencyScore × 0.20 (max 20 pts)',
          calculation: condition || `Consistency × 0.20 = ${bonus.points} pts`,
        };
      case 'marketShare':
        return {
          formula: '15%+ = 20pts, 8-14% = 15pts, 4-7% = 10pts, 2-3% = 5pts',
          calculation: condition || `Market share → ${bonus.points} pts`,
        };
      case 'captain':
        return {
          formula: 'momentumScore × (2.5 - 1)',
          calculation: condition || `Captain boost = +${bonus.points} pts`,
        };
      case 'positionGain':
        return {
          formula: 'positionsGained × 8 pts',
          calculation: condition || `Position gain → ${bonus.points} pts`,
        };
      default:
        return {
          formula: 'Bonus calculation',
          calculation: condition || `+${bonus.points} pts`,
        };
    }
  };
  
  const calcDetails = getCalculationDetails();
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className={cn(
              "flex items-center justify-between py-3 px-3 rounded-xl transition-all duration-200 cursor-help",
              "hover:bg-white/5 group"
            )}
          >
            <div className="flex items-center gap-3">
              {/* Emoji indicator with glow */}
              <div 
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200",
                  "group-hover:scale-110",
                  config.bgColor
                )}
              >
                <span className="text-lg">{config.emoji}</span>
              </div>
              
              {/* Label with special treatment for streaks */}
              <div>
                <span className={cn("text-sm font-medium", config.color)}>
                  {isStreak && streakTier?.fires 
                    ? `${streakTier.fires} ${streakTier.label} Streak`
                    : bonus.label
                  }
                </span>
                <div className="text-[10px] text-white/40 mt-0.5">
                  {typeof bonus.value === 'string' ? bonus.value : ''}
                </div>
              </div>
            </div>
            
            {/* Points with animation */}
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-lg font-bold transition-all duration-200",
                "text-[#A3FF12] group-hover:scale-110"
              )}>
                +{bonus.points}
              </span>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent 
          side="left" 
          className="max-w-xs bg-[#1a1035] border-white/20 p-4"
        >
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">{config.emoji}</span>
              <span className={cn("font-bold", config.color)}>{bonus.label}</span>
            </div>
            <p className="text-xs text-white/70">{config.description}</p>
            <div className="pt-2 border-t border-white/10 space-y-1">
              <div>
                <span className="text-[10px] text-white/40 uppercase tracking-wider">Formula: </span>
                <span className="text-xs text-white/60 font-mono">{calcDetails.formula}</span>
              </div>
              <div>
                <span className="text-[10px] text-white/40 uppercase tracking-wider">Calculation: </span>
                <span className="text-xs text-[#A3FF12] font-mono">{calcDetails.calculation}</span>
              </div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
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
          background: `radial-gradient(ellipse at 50% 0%, ${config.glowColor}30 0%, transparent 60%)`,
        }}
      >
        <JerseyHero
          assetType={assetType}
          imageUrl={imageUrl}
          assetName={assetName}
          rank={rank}
          isCaptain={isCaptain}
          onClick={onNameClick}
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
          <div className="flex items-center justify-center gap-2 mt-1">
            <span className="text-white/50">{config.icon}</span>
            <span className="text-xs uppercase tracking-[0.2em] text-white/50">
              {config.label}
            </span>
          </div>
        </div>

        {/* Total Points */}
        <div className="text-center mt-4">
          <div 
            className="text-6xl font-black animate-fade-in"
            style={{ 
              color: config.jerseyColor,
              textShadow: `0 0 40px ${config.glowColor}`
            }}
          >
            {Math.round(totalPoints)}
          </div>
          <div className="text-xs uppercase tracking-[0.3em] text-white/40 font-semibold mt-1">
            TOTAL POINTS
          </div>
        </div>
      </div>

      {/* 4-Stat Grid with enhanced visuals */}
      <div className="p-4 grid grid-cols-2 gap-3">
        {/* TREND */}
        <StatCard
          icon={
            momentumMultiplier && momentumMultiplier >= 1 
              ? <TrendingUp className="w-4 h-4" />
              : <TrendingDown className="w-4 h-4" />
          }
          emoji={trendTier?.emoji || "📊"}
          label="TREND"
          value={`+${momentumPoints}`}
          subtitle={trendTier ? `${trendTier.emoji} ${trendTier.label} (${momentumMultiplier?.toFixed(2)}x)` : "No trend data"}
          glowColor={trendTier?.label === "Surging" ? "rgba(249, 115, 22, 0.3)" : "rgba(59, 130, 246, 0.3)"}
          accentColor={trendTier?.label === "Surging" ? "#f97316" : "#3b82f6"}
        />

        {/* STREAK */}
        <StatCard
          icon={<Flame className="w-4 h-4" />}
          emoji="🔥"
          label="STREAK"
          value={`+${streakPoints}`}
          subtitle={streakTier && streakDays ? `${streakTier.fires} ${streakDays}d • ${streakTier.label}` : "No streak"}
          glowColor="rgba(249, 115, 22, 0.3)"
          accentColor="#f97316"
        />

        {/* ACTIVITY */}
        <StatCard
          icon={<Activity className="w-4 h-4" />}
          emoji="📦"
          label="ACTIVITY"
          value={orderPoints}
          subtitle="Orders Placed Today"
          glowColor="rgba(16, 185, 129, 0.3)"
          accentColor="#10b981"
        />

        {/* STATUS */}
        <StatCard
          icon={<Trophy className="w-4 h-4" />}
          emoji="🏆"
          label="STATUS"
          value={`+${statusPoints}`}
          subtitle="Market Presence"
          glowColor="rgba(234, 179, 8, 0.3)"
          accentColor="#eab308"
        />
      </div>

      {/* Detailed Breakdown with tooltips and rich visuals */}
      {bonuses.length > 0 && (
        <div className="px-4 pb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🎖️</span>
            <span className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-bold">
              DETAILED BREAKDOWN
            </span>
          </div>
          <div className="space-y-1 bg-white/5 rounded-2xl p-2">
            {bonuses.map((bonus, idx) => (
              <BonusItem 
                key={`${bonus.type}-${idx}`} 
                bonus={bonus} 
                streakTier={bonus.type === 'streak' ? streakTier || undefined : undefined}
              />
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

  // Extract rank from currentRank or from rank bonus condition
  let rank = data.currentRank;
  if (!rank) {
    // Try to extract from rank bonus condition like "Rank #3" or "Rank #1"
    const rankBonus = data.bonuses.find(b => b.type.toLowerCase().includes('rank') && !b.type.toLowerCase().includes('market'));
    if (rankBonus?.condition) {
      const rankMatch = rankBonus.condition.match(/[Rr]ank\s*#?(\d+)/);
      if (rankMatch) {
        rank = parseInt(rankMatch[1], 10);
      }
    }
    // Also try to infer rank from bonus points
    if (!rank && rankBonus) {
      if (rankBonus.points === 30) rank = 1;
      else if (rankBonus.points === 20) rank = 2; // Could be 2 or 3
      else if (rankBonus.points === 15) rank = 4; // Could be 4 or 5
      else if (rankBonus.points === 10) rank = 6; // Could be 6-10
    }
  }

  return {
    assetName: data.assetName,
    assetType: data.assetType,
    imageUrl: data.imageUrl,
    totalPoints: data.total,
    orderPoints,
    momentumMultiplier: data.trendMultiplier,
    momentumPoints,
    bonuses,
    rank,
    streakDays: data.streakDays,
    marketSharePercent: data.marketSharePercent,
    isCaptain,
  };
}
