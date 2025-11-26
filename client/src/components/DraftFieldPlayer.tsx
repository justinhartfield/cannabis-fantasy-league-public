import { cn } from "@/lib/utils";

export type DraftPosition = 
  | "ST1" | "ST2"           // Strikers (Manufacturers)
  | "LW" | "RW"             // Wings (Pharmacies)
  | "CM1" | "CM2"           // Midfield (Products)
  | "CB1" | "CB2"           // Defense (Strains)
  | "GK";                   // Goalkeeper (Brand)

export type AssetType = "manufacturer" | "cannabis_strain" | "product" | "pharmacy" | "brand";

// Maps positions to their asset types
export const POSITION_ASSET_MAP: Record<DraftPosition, AssetType> = {
  ST1: "manufacturer",
  ST2: "manufacturer",
  LW: "pharmacy",
  RW: "pharmacy",
  CM1: "product",
  CM2: "product",
  CB1: "cannabis_strain",
  CB2: "cannabis_strain",
  GK: "brand",
};

// Draft order for challenge mode
export const CHALLENGE_DRAFT_ORDER: DraftPosition[] = [
  "ST1", "ST2",   // Manufacturers first
  "LW", "RW",     // Pharmacies
  "CM1", "CM2",   // Products
  "CB1", "CB2",   // Strains
  "GK",           // Brand last
];

// Position display labels
export const POSITION_LABELS: Record<DraftPosition, string> = {
  ST1: "Striker",
  ST2: "Striker",
  LW: "Left Wing",
  RW: "Right Wing",
  CM1: "Midfield",
  CM2: "Midfield",
  CB1: "Defense",
  CB2: "Defense",
  GK: "Keeper",
};

// Position colors matching the asset types
export const POSITION_COLORS: Record<AssetType, { bg: string; border: string; text: string; jersey: string }> = {
  manufacturer: { 
    bg: "bg-blue-500/20", 
    border: "border-blue-400", 
    text: "text-blue-300",
    jersey: "#3b82f6"
  },
  pharmacy: { 
    bg: "bg-emerald-500/20", 
    border: "border-emerald-400", 
    text: "text-emerald-300",
    jersey: "#10b981"
  },
  product: { 
    bg: "bg-pink-500/20", 
    border: "border-pink-400", 
    text: "text-pink-300",
    jersey: "#ec4899"
  },
  cannabis_strain: { 
    bg: "bg-purple-500/20", 
    border: "border-purple-400", 
    text: "text-purple-300",
    jersey: "#a855f7"
  },
  brand: { 
    bg: "bg-yellow-500/20", 
    border: "border-yellow-400", 
    text: "text-yellow-300",
    jersey: "#eab308"
  },
};

// Role labels for display
export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  manufacturer: "Hersteller",
  pharmacy: "Apotheke",
  product: "Produkt",
  cannabis_strain: "Strain",
  brand: "Brand",
};

interface DraftFieldPlayerProps {
  position: DraftPosition;
  player?: {
    id: number;
    name: string;
    imageUrl?: string | null;
  } | null;
  isActive?: boolean;
  isMyTurn?: boolean;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
}

/**
 * DraftFieldPlayer - Individual jersey/position slot on the draft field
 * 
 * Displays a jersey shape with:
 * - Position color coding based on asset type
 * - Player thumbnail and name when filled
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
}: DraftFieldPlayerProps) {
  const assetType = POSITION_ASSET_MAP[position];
  const colors = POSITION_COLORS[assetType];
  const positionLabel = POSITION_LABELS[position];
  const roleLabel = ASSET_TYPE_LABELS[assetType];

  const sizeClasses = {
    sm: "w-16 h-20",
    md: "w-20 h-24",
    lg: "w-24 h-28",
  };

  const jerseySizes = {
    sm: { width: 48, height: 56 },
    md: { width: 60, height: 70 },
    lg: { width: 72, height: 84 },
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
            className={cn(
              "absolute inset-0 rounded-lg blur-xl opacity-60 animate-pulse",
              colors.bg
            )}
          />
        )}

        {/* Jersey SVG */}
        <svg
          width={jerseySize.width}
          height={jerseySize.height}
          viewBox="0 0 60 70"
          className={cn(
            "relative z-10 drop-shadow-lg transition-all duration-300",
            isActive && "drop-shadow-[0_0_12px_rgba(255,255,255,0.5)]"
          )}
        >
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
            fill={player ? colors.jersey : "rgba(255,255,255,0.1)"}
            stroke={isActive ? "#fff" : colors.jersey}
            strokeWidth={isActive ? 2 : 1}
            className="transition-all duration-300"
          />

          {/* Collar */}
          <path
            d="M 20 0 Q 30 8 40 0"
            fill="none"
            stroke={player ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.2)"}
            strokeWidth="2"
          />

          {/* Player thumbnail or position text */}
          {player?.imageUrl ? (
            <clipPath id={`avatar-clip-${position}`}>
              <circle cx="30" cy="32" r="14" />
            </clipPath>
          ) : null}
        </svg>

        {/* Player thumbnail overlay */}
        {player?.imageUrl && (
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/3 w-7 h-7 rounded-full overflow-hidden border-2 border-white/50 shadow-md z-20"
          >
            <img
              src={player.imageUrl}
              alt={player.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Position badge when empty */}
        {!player && (
          <div className="absolute inset-0 flex items-center justify-center z-20">
            <span
              className={cn(
                "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded",
                colors.bg,
                colors.text,
                isActive && "bg-white/20"
              )}
            >
              {positionLabel.slice(0, 3)}
            </span>
          </div>
        )}
      </div>

      {/* Player name or role label */}
      <div className="text-center max-w-20">
        {player ? (
          <>
            <div className="text-[11px] font-semibold text-white truncate leading-tight">
              {player.name}
            </div>
            <div className={cn("text-[9px] uppercase tracking-wide", colors.text)}>
              {roleLabel}
            </div>
          </>
        ) : (
          <div className={cn("text-[10px] uppercase tracking-wide", colors.text)}>
            {roleLabel}
          </div>
        )}
      </div>
    </div>
  );
}

