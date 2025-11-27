import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

export type DraftPosition = 
  | "ST1" | "ST2"           // Strikers (Manufacturers)
  | "LW" | "RW"             // Wings (Pharmacies)
  | "CM1" | "CM2"           // Midfield (Products)
  | "FLEX"                  // Flex (Any type - center of pitch)
  | "CB1" | "CB2"           // Defense (Strains)
  | "GK";                   // Goalkeeper (Brand)

export type AssetType = "manufacturer" | "cannabis_strain" | "product" | "pharmacy" | "brand";

// Maps positions to their asset types (FLEX can be any)
export const POSITION_ASSET_MAP: Record<DraftPosition, AssetType | "flex"> = {
  ST1: "manufacturer",
  ST2: "manufacturer",
  LW: "pharmacy",
  RW: "pharmacy",
  CM1: "product",
  CM2: "product",
  FLEX: "flex",
  CB1: "cannabis_strain",
  CB2: "cannabis_strain",
  GK: "brand",
};

// Draft order for challenge mode (10 picks total)
export const CHALLENGE_DRAFT_ORDER: DraftPosition[] = [
  "ST1", "ST2",   // Manufacturers first
  "LW", "RW",     // Pharmacies
  "CM1", "CM2",   // Products
  "CB1", "CB2",   // Strains
  "GK",           // Brand
  "FLEX",         // Flex last
];

// Position display labels - Cannabis Fantasy League roles
export const POSITION_LABELS: Record<DraftPosition, string> = {
  ST1: "Manufacturer",
  ST2: "Manufacturer",
  LW: "Pharmacy",
  RW: "Pharmacy",
  CM1: "Product",
  CM2: "Product",
  FLEX: "Flex",
  CB1: "Strain",
  CB2: "Strain",
  GK: "Brand",
};

// Short position codes for jersey display
export const POSITION_CODES: Record<DraftPosition, string> = {
  ST1: "MFG",
  ST2: "MFG",
  LW: "PHM",
  RW: "PHM",
  CM1: "PRD",
  CM2: "PRD",
  FLEX: "FLX",
  CB1: "STR",
  CB2: "STR",
  GK: "BRD",
};

// Position colors matching the asset types
export const POSITION_COLORS: Record<AssetType | "flex", { bg: string; border: string; text: string; jersey: string; glow: string }> = {
  manufacturer: { 
    bg: "bg-blue-500/20", 
    border: "border-blue-400", 
    text: "text-blue-300",
    jersey: "#3b82f6",
    glow: "rgba(59, 130, 246, 0.5)"
  },
  pharmacy: { 
    bg: "bg-emerald-500/20", 
    border: "border-emerald-400", 
    text: "text-emerald-300",
    jersey: "#10b981",
    glow: "rgba(16, 185, 129, 0.5)"
  },
  product: { 
    bg: "bg-pink-500/20", 
    border: "border-pink-400", 
    text: "text-pink-300",
    jersey: "#ec4899",
    glow: "rgba(236, 72, 153, 0.5)"
  },
  cannabis_strain: { 
    bg: "bg-purple-500/20", 
    border: "border-purple-400", 
    text: "text-purple-300",
    jersey: "#a855f7",
    glow: "rgba(168, 85, 247, 0.5)"
  },
  brand: { 
    bg: "bg-yellow-500/20", 
    border: "border-yellow-400", 
    text: "text-yellow-300",
    jersey: "#eab308",
    glow: "rgba(234, 179, 8, 0.5)"
  },
  flex: { 
    bg: "bg-orange-500/20", 
    border: "border-orange-400", 
    text: "text-orange-300",
    jersey: "#f97316",
    glow: "rgba(249, 115, 22, 0.5)"
  },
};

// Role labels for display
export const ASSET_TYPE_LABELS: Record<AssetType | "flex", string> = {
  manufacturer: "Hersteller",
  pharmacy: "Apotheke",
  product: "Produkt",
  cannabis_strain: "Strain",
  brand: "Brand",
  flex: "Flex",
};

interface DraftFieldPlayerProps {
  position: DraftPosition;
  player?: {
    id: number;
    name: string;
    imageUrl?: string | null;
    assetType?: AssetType;
  } | null;
  isActive?: boolean;
  isMyTurn?: boolean;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
  /** Optional score to display above the jersey */
  score?: number | null;
  /** Whether to show the score badge */
  showScore?: boolean;
}

/**
 * DraftFieldPlayer - Individual jersey/position slot on the draft field
 * 
 * Displays a jersey shape with:
 * - Position color coding based on asset type
 * - Player thumbnail embedded in jersey when filled
 * - Pulsing animation when active (being drafted)
 * - Empty state with position label
 */
export function DraftFieldPlayer({
  position,
  player,
  isActive = false,
  isMyTurn = false,
  onClick,
  size = "md",
  score,
  showScore = false,
}: DraftFieldPlayerProps) {
  // Track if the image loaded successfully
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Preload image to check if it's valid
  useEffect(() => {
    if (!player?.imageUrl) {
      setImageLoaded(false);
      setImageError(false);
      return;
    }

    setImageLoaded(false);
    setImageError(false);

    const img = new Image();
    img.onload = () => {
      setImageLoaded(true);
      setImageError(false);
    };
    img.onerror = () => {
      setImageLoaded(false);
      setImageError(true);
    };
    img.src = player.imageUrl;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [player?.imageUrl]);

  // For FLEX position, use the actual asset type if player is drafted, otherwise use "flex"
  const positionAssetType = POSITION_ASSET_MAP[position];
  const assetType = position === "FLEX" && player?.assetType 
    ? player.assetType 
    : positionAssetType;
  const colors = POSITION_COLORS[assetType as AssetType | "flex"];
  const positionLabel = POSITION_LABELS[position];
  const positionCode = POSITION_CODES[position];
  const roleLabel = position === "FLEX" && player?.assetType 
    ? ASSET_TYPE_LABELS[player.assetType] 
    : ASSET_TYPE_LABELS[assetType as AssetType | "flex"];

  // Determine if we should show the image (only if loaded successfully)
  const showImage = player?.imageUrl && imageLoaded && !imageError;

  // Sizes increased by 10%
  const sizeClasses = {
    sm: "w-[70px] h-[88px]",
    md: "w-[88px] h-[106px]",
    lg: "w-[106px] h-[123px]",
  };

  // Outer dimensions scale with size, but SVG viewBox coordinates stay fixed
  const jerseySizes = {
    sm: { width: 53, height: 62 },
    md: { width: 66, height: 77 },
    lg: { width: 79, height: 92 },
  };

  // Fixed viewBox coordinates for avatar (viewBox is 60x70)
  // Avatar positioned in upper-middle chest area of jersey
  const avatarConfig = {
    cx: 30,        // Center X in viewBox
    cy: 32,        // Center Y in viewBox (upper chest area)
    radius: 11,    // Avatar circle radius
  };

  const jerseySize = jerseySizes[size];

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1 transition-all duration-300",
        onClick && "cursor-pointer hover:scale-105",
        isActive && isMyTurn && "animate-pulse"
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* Score Badge - Above Jersey */}
      {showScore && player && score !== undefined && score !== null && (
        <div
          className={cn(
            "px-2.5 py-1 rounded-full text-xs font-bold shadow-lg transition-all duration-300",
            "bg-gradient-to-r from-[#cfff4d] to-[#a8e600] text-black",
            "border border-[#cfff4d]/50",
            "animate-fade-in",
            size === "sm" ? "text-[10px] px-2 py-0.5" : size === "lg" ? "text-sm px-3 py-1.5" : ""
          )}
          style={{
            boxShadow: `0 0 12px rgba(207, 255, 77, 0.4), 0 2px 8px rgba(0, 0, 0, 0.3)`
          }}
        >
          {score.toFixed(1)}
        </div>
      )}

      {/* Jersey Container */}
      <div
        className={cn(
          "relative flex items-center justify-center transition-all duration-300",
          sizeClasses[size],
          isActive && "scale-110"
        )}
      >
        {/* Active glow effect */}
        {isActive && (
          <div
            className="absolute inset-0 rounded-full blur-xl opacity-70 animate-pulse"
            style={{ backgroundColor: colors.glow }}
          />
        )}

        {/* Jersey SVG with embedded avatar */}
        <svg
          width={jerseySize.width}
          height={jerseySize.height}
          viewBox="0 0 60 70"
          className={cn(
            "relative z-10 transition-all duration-300",
            isActive && "drop-shadow-[0_0_20px_rgba(207,255,77,0.6)]",
            player && "drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
          )}
        >
          {/* Definitions for clip path and gradients */}
          <defs>
            <clipPath id={`avatar-clip-${position}`}>
              <circle cx={avatarConfig.cx} cy={avatarConfig.cy} r={avatarConfig.radius} />
            </clipPath>
            <linearGradient id={`jersey-gradient-${position}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={player ? colors.jersey : "rgba(255,255,255,0.15)"} />
              <stop offset="100%" stopColor={player ? `${colors.jersey}cc` : "rgba(255,255,255,0.05)"} />
            </linearGradient>
          </defs>

          {/* Jersey shape */}
          <path
            d={`
              M 15 0
              L 0 15
              L 5 20
              L 10 15
              L 10 65
              Q 10 70 15 70
              L 45 70
              Q 50 70 50 65
              L 50 15
              L 55 20
              L 60 15
              L 45 0
              Q 42 5 30 8
              Q 18 5 15 0
              Z
            `}
            fill={`url(#jersey-gradient-${position})`}
            stroke={isActive ? "#cfff4d" : player ? colors.jersey : "rgba(255,255,255,0.3)"}
            strokeWidth={isActive ? 2.5 : 1.5}
            className="transition-all duration-300"
          />

          {/* Collar detail */}
          <path
            d="M 20 0 Q 30 8 40 0"
            fill="none"
            stroke={player ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.15)"}
            strokeWidth="2"
          />

          {/* Player avatar embedded in jersey - always show for drafted players */}
          {player && (
            <>
              {/* Avatar background circle with glow */}
              <circle
                cx={avatarConfig.cx}
                cy={avatarConfig.cy}
                r={avatarConfig.radius + 2}
                fill="rgba(0,0,0,0.5)"
                stroke={colors.jersey}
                strokeWidth="2"
              />
              {showImage ? (
                /* Avatar image when available and loaded successfully */
                <image
                  href={player.imageUrl!}
                  x={avatarConfig.cx - avatarConfig.radius}
                  y={avatarConfig.cy - avatarConfig.radius}
                  width={avatarConfig.radius * 2}
                  height={avatarConfig.radius * 2}
                  clipPath={`url(#avatar-clip-${position})`}
                  preserveAspectRatio="xMidYMid slice"
                />
              ) : (
                /* Fallback initials when no image or image failed to load */
                <text
                  x={avatarConfig.cx}
                  y={avatarConfig.cy + 4}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="bold"
                  fill="white"
                >
                  {player.name.slice(0, 2).toUpperCase()}
                </text>
              )}
            </>
          )}

          {/* Position code badge when empty - centered in jersey */}
          {!player && (
            <text
              x="30"
              y="38"
              textAnchor="middle"
              fontSize="14"
              fontWeight="bold"
              fill={colors.jersey}
            >
              {positionCode}
            </text>
          )}
        </svg>
      </div>

      {/* Player name or role label */}
      <div className={cn(
        "text-center",
        size === "lg" ? "max-w-[120px]" : "max-w-[88px]"
      )}>
        {player ? (
          <>
            <div className={cn(
              "font-semibold text-white truncate leading-tight drop-shadow-sm",
              size === "lg" ? "text-sm" : "text-[11px]"
            )}>
              {player.name}
            </div>
            <div className={cn(
              "uppercase tracking-wide",
              size === "lg" ? "text-[11px]" : "text-[9px]",
              colors.text
            )}>
              {roleLabel}
            </div>
          </>
        ) : (
          <div className={cn(
            "uppercase tracking-wide opacity-70",
            size === "lg" ? "text-[11px]" : "text-[10px]",
            colors.text
          )}>
            {roleLabel}
          </div>
        )}
      </div>
    </div>
  );
}

