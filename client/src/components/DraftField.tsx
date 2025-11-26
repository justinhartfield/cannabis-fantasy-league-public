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
  /** Current position being drafted (0-9 index into CHALLENGE_DRAFT_ORDER) */
  currentDraftIndex?: number;
  /** Whether this is the user's own field (for styling) */
  isUserTeam?: boolean;
  /** Whether it's this team's turn to pick */
  isOnTheClock?: boolean;
  /** Callback when a position is clicked */
  onPositionClick?: (position: DraftPosition) => void;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Optional className */
  className?: string;
}

/**
 * DraftField - Futuristic soccer field visualization for the challenge draft
 * 
 * Displays a stylized dark pitch with 10 position slots arranged in a
 * 2-2-1-2-2-1 formation (strikers at top, FLEX in center, goalkeeper at bottom).
 * 
 * Position mapping:
 * - ST1, ST2 (Strikers) → Manufacturers
 * - LW, RW (Wings) → Pharmacies
 * - CM1, CM2 (Midfield) → Products
 * - FLEX (Center) → Any type
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
      assetType: player.assetType,
    };
  };

  const isPositionActive = (position: DraftPosition) => {
    return currentPosition === position;
  };

  const handlePositionClick = (position: DraftPosition) => {
    onPositionClick?.(position);
  };

  // Increased field height to accommodate larger player slots with more spacing
  const fieldHeight = size === "lg" ? "h-[650px]" : size === "md" ? "h-[500px]" : "h-[420px]";
  const playerSize = size === "lg" ? "lg" : size === "md" ? "md" : "sm";

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Team Header */}
      <div
        className={cn(
          "flex items-center justify-between px-3 py-2 rounded-t-xl border-b backdrop-blur-sm",
          isUserTeam
            ? "bg-gradient-to-r from-[#cfff4d]/20 via-[#1a1d29] to-[#cfff4d]/10 border-[#cfff4d]/30"
            : "bg-gradient-to-r from-[#ff6b6b]/20 via-[#1a1d29] to-[#ff6b6b]/10 border-[#ff6b6b]/30"
        )}
      >
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2",
              isUserTeam
                ? "bg-[#cfff4d]/20 border-[#cfff4d] text-[#cfff4d]"
                : "bg-[#ff6b6b]/20 border-[#ff6b6b] text-[#ff6b6b]"
            )}
          >
            {teamName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="text-xs font-semibold text-white">{teamName}</div>
            {userName && (
              <div className="text-[10px] text-white/50">@{userName}</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-white/50 uppercase tracking-wider">
            {filledCount}/10
          </span>
          {isOnTheClock && (
            <span className="px-1.5 py-0.5 rounded-full bg-[#cfff4d] text-black text-[9px] font-bold uppercase animate-pulse shadow-[0_0_15px_rgba(207,255,77,0.5)]">
              Drafting
            </span>
          )}
        </div>
      </div>

      {/* Futuristic Dark Field */}
      <div
        className={cn(
          "relative overflow-hidden rounded-b-xl",
          fieldHeight,
          "bg-gradient-to-b from-[#0a0a0f] via-[#0f1015] to-[#0a0a0f]"
        )}
      >
        {/* Futuristic field markings - Taller field with 5 rows of players */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 200 400"
          preserveAspectRatio="none"
        >
          {/* Grid pattern effect */}
          <defs>
            <pattern id="grid-pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <rect x="0" y="0" width="20" height="20" fill="none" stroke="rgba(207,255,77,0.03)" strokeWidth="0.5" />
            </pattern>
            <linearGradient id="field-glow" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(207,255,77,0.1)" />
              <stop offset="50%" stopColor="rgba(207,255,77,0.02)" />
              <stop offset="100%" stopColor="rgba(207,255,77,0.1)" />
            </linearGradient>
            <radialGradient id="center-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(207,255,77,0.15)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
          </defs>

          {/* Background grid */}
          <rect x="0" y="0" width="200" height="400" fill="url(#grid-pattern)" />

          {/* Field border with glow */}
          <rect
            x="10"
            y="10"
            width="180"
            height="380"
            fill="none"
            stroke="rgba(207,255,77,0.2)"
            strokeWidth="1.5"
            rx="4"
          />

          {/* Center line */}
          <line
            x1="10"
            y1="200"
            x2="190"
            y2="200"
            stroke="rgba(207,255,77,0.15)"
            strokeWidth="1"
          />

          {/* Center circle with glow */}
          <circle
            cx="100"
            cy="200"
            r="40"
            fill="url(#center-glow)"
            stroke="rgba(207,255,77,0.2)"
            strokeWidth="1"
          />

          {/* Center dot */}
          <circle cx="100" cy="200" r="4" fill="rgba(207,255,77,0.4)" />

          {/* Top penalty area */}
          <rect
            x="35"
            y="10"
            width="130"
            height="65"
            fill="none"
            stroke="rgba(207,255,77,0.12)"
            strokeWidth="1"
            rx="2"
          />

          {/* Top goal area */}
          <rect
            x="55"
            y="10"
            width="90"
            height="30"
            fill="none"
            stroke="rgba(207,255,77,0.12)"
            strokeWidth="1"
            rx="2"
          />

          {/* Bottom penalty area */}
          <rect
            x="35"
            y="325"
            width="130"
            height="65"
            fill="none"
            stroke="rgba(207,255,77,0.12)"
            strokeWidth="1"
            rx="2"
          />

          {/* Bottom goal area */}
          <rect
            x="55"
            y="360"
            width="90"
            height="30"
            fill="none"
            stroke="rgba(207,255,77,0.12)"
            strokeWidth="1"
            rx="2"
          />

          {/* Penalty arcs */}
          <path
            d="M 50 75 Q 100 100 150 75"
            fill="none"
            stroke="rgba(207,255,77,0.12)"
            strokeWidth="1"
          />
          <path
            d="M 50 325 Q 100 300 150 325"
            fill="none"
            stroke="rgba(207,255,77,0.12)"
            strokeWidth="1"
          />

          {/* Corner arcs */}
          <path d="M 10 25 Q 25 10 40 10" fill="none" stroke="rgba(207,255,77,0.1)" strokeWidth="1" />
          <path d="M 160 10 Q 175 10 190 25" fill="none" stroke="rgba(207,255,77,0.1)" strokeWidth="1" />
          <path d="M 10 375 Q 25 390 40 390" fill="none" stroke="rgba(207,255,77,0.1)" strokeWidth="1" />
          <path d="M 160 390 Q 175 390 190 375" fill="none" stroke="rgba(207,255,77,0.1)" strokeWidth="1" />
        </svg>

        {/* Ambient glow effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-20 bg-[#cfff4d]/5 blur-3xl" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-40 h-20 bg-[#cfff4d]/5 blur-3xl" />
        </div>

        {/* Position slots - Arranged in formation with FLEX in center */}
        {/* Increased padding and gap values to prevent text overlap */}
        <div className={cn(
          "absolute inset-0 flex flex-col items-center justify-between px-4",
          size === "lg" ? "py-6" : "py-4"
        )}>
          {/* Strikers Row (Manufacturers) */}
          <div className={cn(
            "flex items-center justify-center",
            size === "lg" ? "gap-24" : "gap-16"
          )}>
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

          {/* Wings Row (Pharmacies) - wider spread */}
          <div className={cn(
            "flex items-center justify-between w-full",
            size === "lg" ? "max-w-[480px]" : "max-w-[320px]"
          )}>
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

          {/* Midfield Row (Products) with FLEX in center */}
          <div className={cn(
            "flex items-center justify-center",
            size === "lg" ? "gap-12" : "gap-8"
          )}>
            <DraftFieldPlayer
              position="CM1"
              player={getPlayer("CM1")}
              isActive={isPositionActive("CM1")}
              isMyTurn={isOnTheClock}
              onClick={onPositionClick ? () => handlePositionClick("CM1") : undefined}
              size={playerSize}
            />
            <DraftFieldPlayer
              position="FLEX"
              player={getPlayer("FLEX")}
              isActive={isPositionActive("FLEX")}
              isMyTurn={isOnTheClock}
              onClick={onPositionClick ? () => handlePositionClick("FLEX") : undefined}
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
          <div className={cn(
            "flex items-center justify-center",
            size === "lg" ? "gap-28" : "gap-20"
          )}>
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

        {/* Decorative corner markers */}
        <div className="absolute top-3 left-3 w-3 h-3 border-l-2 border-t-2 border-[#cfff4d]/30 rounded-tl" />
        <div className="absolute top-3 right-3 w-3 h-3 border-r-2 border-t-2 border-[#cfff4d]/30 rounded-tr" />
        <div className="absolute bottom-3 left-3 w-3 h-3 border-l-2 border-b-2 border-[#cfff4d]/30 rounded-bl" />
        <div className="absolute bottom-3 right-3 w-3 h-3 border-r-2 border-b-2 border-[#cfff4d]/30 rounded-br" />
      </div>
    </div>
  );
}

/**
 * Helper to convert a roster array to the position-based player map
 * Handles overflow players by placing them in FLEX position
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

  // Position mapping for each type (primary slots)
  const positionMap: Record<AssetType, DraftPosition[]> = {
    manufacturer: ["ST1", "ST2"],
    pharmacy: ["LW", "RW"],
    product: ["CM1", "CM2"],
    cannabis_strain: ["CB1", "CB2"],
    brand: ["GK"],
  };

  // Overflow players go to FLEX
  const overflowPlayers: Array<{ assetType: AssetType; assetId: number; name: string; imageUrl?: string | null }> = [];

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
    } else {
      // This player overflows their position, add to flex candidates
      overflowPlayers.push(player);
    }
  });

  // Place the first overflow player in FLEX if not already filled
  if (!result["FLEX"] && overflowPlayers.length > 0) {
    const flexPlayer = overflowPlayers[0];
    result["FLEX"] = {
      id: flexPlayer.assetId,
      name: flexPlayer.name,
      imageUrl: flexPlayer.imageUrl,
      assetType: flexPlayer.assetType,
    };
  }

  return result;
}

