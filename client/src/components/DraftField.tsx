import { cn } from "@/lib/utils";
import {
  DraftFieldPlayer,
  DraftPosition,
  CHALLENGE_DRAFT_ORDER,
  POSITION_ASSET_MAP,
  type AssetType,
} from "./DraftFieldPlayer";

interface DraftedPlayer {
  id: number;
  name: string;
  imageUrl?: string | null;
  assetType: AssetType;
}

interface DraftFieldProps {
  /** Team name displayed above the field */
  teamName: string;
  /** User name or handle */
  userName?: string | null;
  /** Drafted players mapped by position */
  players: Partial<Record<DraftPosition, DraftedPlayer | null>>;
  /** Current position being drafted (0-8 index into CHALLENGE_DRAFT_ORDER) */
  currentDraftIndex?: number;
  /** Whether this is the user's own field (for styling) */
  isUserTeam?: boolean;
  /** Whether it's this team's turn to pick */
  isOnTheClock?: boolean;
  /** Callback when a position is clicked */
  onPositionClick?: (position: DraftPosition) => void;
  /** Size variant */
  size?: "sm" | "md";
  /** Optional className */
  className?: string;
}

/**
 * DraftField - Soccer field visualization for the challenge draft
 * 
 * Displays a stylized soccer pitch with 9 position slots arranged in a
 * 2-2-2-2-1 formation (strikers at top, goalkeeper at bottom).
 * 
 * Position mapping:
 * - ST1, ST2 (Strikers) → Manufacturers
 * - LW, RW (Wings) → Pharmacies
 * - CM1, CM2 (Midfield) → Products
 * - CB1, CB2 (Defense) → Strains
 * - GK (Goalkeeper) → Brand
 */
export function DraftField({
  teamName,
  userName,
  players,
  currentDraftIndex = -1,
  isUserTeam = false,
  isOnTheClock = false,
  onPositionClick,
  size = "md",
  className,
}: DraftFieldProps) {
  // Get the current position being drafted
  const currentPosition = currentDraftIndex >= 0 && currentDraftIndex < CHALLENGE_DRAFT_ORDER.length
    ? CHALLENGE_DRAFT_ORDER[currentDraftIndex]
    : null;

  // Calculate filled positions count
  const filledCount = Object.values(players).filter(Boolean).length;

  const getPlayer = (position: DraftPosition) => {
    const player = players[position];
    if (!player) return null;
    return {
      id: player.id,
      name: player.name,
      imageUrl: player.imageUrl,
    };
  };

  const isPositionActive = (position: DraftPosition) => {
    return currentPosition === position;
  };

  const handlePositionClick = (position: DraftPosition) => {
    onPositionClick?.(position);
  };

  const fieldHeight = size === "sm" ? "h-[320px]" : "h-[420px]";
  const playerSize = size === "sm" ? "sm" : "md";

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Team Header */}
      <div
        className={cn(
          "flex items-center justify-between px-4 py-3 rounded-t-2xl border-b",
          isUserTeam
            ? "bg-gradient-to-r from-emerald-600/30 to-emerald-500/10 border-emerald-500/30"
            : "bg-gradient-to-r from-rose-600/30 to-rose-500/10 border-rose-500/30"
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2",
              isUserTeam
                ? "bg-emerald-500/20 border-emerald-400 text-emerald-300"
                : "bg-rose-500/20 border-rose-400 text-rose-300"
            )}
          >
            {teamName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="text-sm font-semibold text-white">{teamName}</div>
            {userName && (
              <div className="text-xs text-white/50">@{userName}</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/50 uppercase tracking-wider">
            {filledCount}/9
          </span>
          {isOnTheClock && (
            <span className="px-2 py-1 rounded-full bg-[#cfff4d] text-black text-[10px] font-bold uppercase animate-pulse">
              Drafting
            </span>
          )}
        </div>
      </div>

      {/* Soccer Field */}
      <div
        className={cn(
          "relative overflow-hidden rounded-b-2xl",
          fieldHeight,
          "bg-gradient-to-b from-[#1a5f2c] via-[#1a7034] to-[#1a5f2c]"
        )}
      >
        {/* Field markings */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 200 300"
          preserveAspectRatio="none"
        >
          {/* Grass stripes effect */}
          <defs>
            <pattern id="grass-pattern" x="0" y="0" width="200" height="40" patternUnits="userSpaceOnUse">
              <rect x="0" y="0" width="200" height="20" fill="rgba(255,255,255,0.02)" />
              <rect x="0" y="20" width="200" height="20" fill="transparent" />
            </pattern>
          </defs>
          <rect x="0" y="0" width="200" height="300" fill="url(#grass-pattern)" />

          {/* Field border */}
          <rect
            x="10"
            y="10"
            width="180"
            height="280"
            fill="none"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth="1"
          />

          {/* Center line */}
          <line
            x1="10"
            y1="150"
            x2="190"
            y2="150"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="1"
          />

          {/* Center circle */}
          <circle
            cx="100"
            cy="150"
            r="30"
            fill="none"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="1"
          />

          {/* Center dot */}
          <circle cx="100" cy="150" r="3" fill="rgba(255,255,255,0.2)" />

          {/* Top penalty area */}
          <rect
            x="40"
            y="10"
            width="120"
            height="50"
            fill="none"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="1"
          />

          {/* Top goal area */}
          <rect
            x="60"
            y="10"
            width="80"
            height="20"
            fill="none"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="1"
          />

          {/* Bottom penalty area */}
          <rect
            x="40"
            y="240"
            width="120"
            height="50"
            fill="none"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="1"
          />

          {/* Bottom goal area */}
          <rect
            x="60"
            y="270"
            width="80"
            height="20"
            fill="none"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="1"
          />

          {/* Penalty arcs */}
          <path
            d="M 55 60 Q 100 80 145 60"
            fill="none"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="1"
          />
          <path
            d="M 55 240 Q 100 220 145 240"
            fill="none"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="1"
          />
        </svg>

        {/* Position slots - Arranged in formation */}
        <div className="absolute inset-0 flex flex-col items-center justify-between py-4 px-2">
          {/* Strikers Row (Manufacturers) */}
          <div className="flex items-center justify-center gap-8">
            <DraftFieldPlayer
              position="ST1"
              player={getPlayer("ST1")}
              isActive={isPositionActive("ST1")}
              isMyTurn={isOnTheClock}
              onClick={onPositionClick ? () => handlePositionClick("ST1") : undefined}
              size={playerSize}
            />
            <DraftFieldPlayer
              position="ST2"
              player={getPlayer("ST2")}
              isActive={isPositionActive("ST2")}
              isMyTurn={isOnTheClock}
              onClick={onPositionClick ? () => handlePositionClick("ST2") : undefined}
              size={playerSize}
            />
          </div>

          {/* Wings Row (Pharmacies) */}
          <div className="flex items-center justify-between w-full max-w-[280px]">
            <DraftFieldPlayer
              position="LW"
              player={getPlayer("LW")}
              isActive={isPositionActive("LW")}
              isMyTurn={isOnTheClock}
              onClick={onPositionClick ? () => handlePositionClick("LW") : undefined}
              size={playerSize}
            />
            <DraftFieldPlayer
              position="RW"
              player={getPlayer("RW")}
              isActive={isPositionActive("RW")}
              isMyTurn={isOnTheClock}
              onClick={onPositionClick ? () => handlePositionClick("RW") : undefined}
              size={playerSize}
            />
          </div>

          {/* Midfield Row (Products) */}
          <div className="flex items-center justify-center gap-12">
            <DraftFieldPlayer
              position="CM1"
              player={getPlayer("CM1")}
              isActive={isPositionActive("CM1")}
              isMyTurn={isOnTheClock}
              onClick={onPositionClick ? () => handlePositionClick("CM1") : undefined}
              size={playerSize}
            />
            <DraftFieldPlayer
              position="CM2"
              player={getPlayer("CM2")}
              isActive={isPositionActive("CM2")}
              isMyTurn={isOnTheClock}
              onClick={onPositionClick ? () => handlePositionClick("CM2") : undefined}
              size={playerSize}
            />
          </div>

          {/* Defense Row (Strains) */}
          <div className="flex items-center justify-center gap-16">
            <DraftFieldPlayer
              position="CB1"
              player={getPlayer("CB1")}
              isActive={isPositionActive("CB1")}
              isMyTurn={isOnTheClock}
              onClick={onPositionClick ? () => handlePositionClick("CB1") : undefined}
              size={playerSize}
            />
            <DraftFieldPlayer
              position="CB2"
              player={getPlayer("CB2")}
              isActive={isPositionActive("CB2")}
              isMyTurn={isOnTheClock}
              onClick={onPositionClick ? () => handlePositionClick("CB2") : undefined}
              size={playerSize}
            />
          </div>

          {/* Goalkeeper Row (Brand) */}
          <div className="flex items-center justify-center">
            <DraftFieldPlayer
              position="GK"
              player={getPlayer("GK")}
              isActive={isPositionActive("GK")}
              isMyTurn={isOnTheClock}
              onClick={onPositionClick ? () => handlePositionClick("GK") : undefined}
              size={playerSize}
            />
          </div>
        </div>

        {/* Decorative corner flags */}
        <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-white/20" />
        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-white/20" />
        <div className="absolute bottom-2 left-2 w-2 h-2 rounded-full bg-white/20" />
        <div className="absolute bottom-2 right-2 w-2 h-2 rounded-full bg-white/20" />
      </div>
    </div>
  );
}

/**
 * Helper to convert a roster array to the position-based player map
 */
export function rosterToFieldPlayers(
  roster: Array<{ assetType: AssetType; assetId: number; name: string; imageUrl?: string | null }>
): Partial<Record<DraftPosition, DraftedPlayer | null>> {
  const result: Partial<Record<DraftPosition, DraftedPlayer | null>> = {};

  // Track how many of each type we've placed
  const counts: Record<AssetType, number> = {
    manufacturer: 0,
    pharmacy: 0,
    product: 0,
    cannabis_strain: 0,
    brand: 0,
  };

  // Position mapping for each type
  const positionMap: Record<AssetType, DraftPosition[]> = {
    manufacturer: ["ST1", "ST2"],
    pharmacy: ["LW", "RW"],
    product: ["CM1", "CM2"],
    cannabis_strain: ["CB1", "CB2"],
    brand: ["GK"],
  };

  roster.forEach((player) => {
    const positions = positionMap[player.assetType];
    const count = counts[player.assetType];
    
    if (count < positions.length) {
      const position = positions[count];
      result[position] = {
        id: player.assetId,
        name: player.name,
        imageUrl: player.imageUrl,
        assetType: player.assetType,
      };
      counts[player.assetType]++;
    }
  });

  return result;
}

