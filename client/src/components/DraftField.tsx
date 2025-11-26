import { cn } from "@/lib/utils";
import {
  DraftFieldPlayer,
  DraftPosition,
  CHALLENGE_DRAFT_ORDER,
  POSITION_ASSET_MAP,
  type AssetType,
} from "./DraftFieldPlayer";
import { Leaf } from "lucide-react";

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
 * DraftField - Grow Room visualization for the cannabis fantasy draft
 * 
 * Displays a stylized indoor grow room with 10 position slots arranged as grow stations.
 * Each station has a pot, LED light indicator, and displays the drafted player's avatar.
 * 
 * Layout (top to bottom):
 * - Back wall: ST1, ST2 (Manufacturers) - tall plants at back
 * - Side benches: LW, RW (Pharmacies)
 * - Center row: CM1, FLEX, CM2 (Products + Flex)
 * - Front row: CB1, CB2 (Strains)
 * - Entrance: GK (Brand)
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

  // Increased field height to accommodate grow stations with more spacing
  const fieldHeight = size === "lg" ? "h-[680px]" : size === "md" ? "h-[540px]" : "h-[450px]";
  const playerSize = size === "lg" ? "lg" : size === "md" ? "md" : "sm";

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Team Header - Grow Room Style */}
      <div
        className={cn(
          "flex items-center justify-between px-4 py-3 rounded-t-xl border-b backdrop-blur-sm",
          isUserTeam
            ? "bg-gradient-to-r from-[#1a4d1a]/40 via-[#0f1f0f] to-[#1a4d1a]/20 border-[#4ade80]/30"
            : "bg-gradient-to-r from-[#4d1a1a]/40 via-[#1f0f0f] to-[#4d1a1a]/20 border-[#f87171]/30"
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold border-2",
              isUserTeam
                ? "bg-[#4ade80]/20 border-[#4ade80] text-[#4ade80]"
                : "bg-[#f87171]/20 border-[#f87171] text-[#f87171]"
            )}
          >
            <Leaf className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">{teamName}</div>
            {userName && (
              <div className="text-[10px] text-white/50">@{userName}</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-white/50 uppercase tracking-wider">
            {filledCount}/10
          </span>
          {isOnTheClock && (
            <span className="px-2 py-1 rounded-lg bg-[#4ade80] text-black text-[10px] font-bold uppercase animate-pulse shadow-[0_0_20px_rgba(74,222,128,0.5)]">
              Cultivating
            </span>
          )}
        </div>
      </div>

      {/* Grow Room Environment */}
      <div
        className={cn(
          "relative overflow-hidden rounded-b-xl",
          fieldHeight,
          "bg-gradient-to-b from-[#0a0f0a] via-[#0d120d] to-[#080a08]"
        )}
      >
        {/* Grow Room SVG Background */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 200 400"
          preserveAspectRatio="none"
        >
          {/* Definitions */}
          <defs>
            {/* Floor tile pattern */}
            <pattern id="floor-grid" x="0" y="0" width="25" height="25" patternUnits="userSpaceOnUse">
              <rect x="0" y="0" width="25" height="25" fill="none" stroke="rgba(74,222,128,0.04)" strokeWidth="0.5" />
            </pattern>
            
            {/* LED panel glow gradient */}
            <linearGradient id="led-panel-glow" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(74,222,128,0.2)" />
              <stop offset="30%" stopColor="rgba(74,222,128,0.05)" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
            
            {/* Fog/humidity effect */}
            <radialGradient id="fog-effect" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="rgba(74,222,128,0.08)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
            
            {/* Wall gradient */}
            <linearGradient id="wall-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(30,40,30,0.8)" />
              <stop offset="100%" stopColor="rgba(15,20,15,0.4)" />
            </linearGradient>
          </defs>

          {/* Floor grid pattern */}
          <rect x="0" y="0" width="200" height="400" fill="url(#floor-grid)" />

          {/* Room walls - outer border */}
          <rect
            x="8"
            y="8"
            width="184"
            height="384"
            fill="none"
            stroke="rgba(74,222,128,0.15)"
            strokeWidth="2"
            rx="4"
          />

          {/* LED Panel Bar at top (back wall) */}
          <rect
            x="20"
            y="15"
            width="160"
            height="8"
            fill="rgba(74,222,128,0.3)"
            rx="2"
          />
          <rect
            x="20"
            y="15"
            width="160"
            height="8"
            fill="url(#led-panel-glow)"
            rx="2"
          />
          
          {/* LED panel glow effect */}
          <rect
            x="10"
            y="15"
            width="180"
            height="80"
            fill="url(#led-panel-glow)"
          />

          {/* Grow benches/tables - left side */}
          <rect
            x="12"
            y="100"
            width="35"
            height="120"
            fill="none"
            stroke="rgba(74,222,128,0.08)"
            strokeWidth="1"
            rx="2"
          />
          
          {/* Grow benches/tables - right side */}
          <rect
            x="153"
            y="100"
            width="35"
            height="120"
            fill="none"
            stroke="rgba(74,222,128,0.08)"
            strokeWidth="1"
            rx="2"
          />

          {/* Center grow area */}
          <rect
            x="45"
            y="160"
            width="110"
            height="100"
            fill="none"
            stroke="rgba(74,222,128,0.06)"
            strokeWidth="1"
            rx="3"
          />

          {/* Ventilation duct outlines at top */}
          <rect
            x="30"
            y="28"
            width="40"
            height="6"
            fill="rgba(40,50,40,0.5)"
            rx="1"
          />
          <rect
            x="130"
            y="28"
            width="40"
            height="6"
            fill="rgba(40,50,40,0.5)"
            rx="1"
          />

          {/* Floor drain/circle in center */}
          <circle
            cx="100"
            cy="210"
            r="25"
            fill="none"
            stroke="rgba(74,222,128,0.06)"
            strokeWidth="1"
          />

          {/* Door/entrance at bottom */}
          <rect
            x="70"
            y="370"
            width="60"
            height="22"
            fill="rgba(20,30,20,0.6)"
            stroke="rgba(74,222,128,0.12)"
            strokeWidth="1"
            rx="2"
          />
          <line
            x1="100"
            y1="375"
            x2="100"
            y2="387"
            stroke="rgba(74,222,128,0.2)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          
          {/* Fog/humidity overlay */}
          <ellipse
            cx="100"
            cy="200"
            rx="90"
            ry="150"
            fill="url(#fog-effect)"
          />
          
          {/* Reflective floor highlights */}
          <ellipse
            cx="50"
            cy="300"
            rx="30"
            ry="40"
            fill="rgba(74,222,128,0.02)"
          />
          <ellipse
            cx="150"
            cy="300"
            rx="30"
            ry="40"
            fill="rgba(74,222,128,0.02)"
          />
        </svg>

        {/* Ambient glow effects */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Top LED glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-gradient-to-b from-[#4ade80]/10 to-transparent blur-2xl" />
          
          {/* Side ambient glows */}
          <div className="absolute top-1/4 left-0 w-16 h-32 bg-[#4ade80]/5 blur-3xl" />
          <div className="absolute top-1/4 right-0 w-16 h-32 bg-[#4ade80]/5 blur-3xl" />
          
          {/* Animated humidity particles effect */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-1/3 left-1/4 w-1 h-1 bg-[#4ade80]/40 rounded-full animate-[float_8s_ease-in-out_infinite]" />
            <div className="absolute top-1/2 left-1/3 w-0.5 h-0.5 bg-[#4ade80]/30 rounded-full animate-[float_6s_ease-in-out_infinite_1s]" />
            <div className="absolute top-2/3 right-1/4 w-1 h-1 bg-[#4ade80]/40 rounded-full animate-[float_7s_ease-in-out_infinite_2s]" />
            <div className="absolute top-1/4 right-1/3 w-0.5 h-0.5 bg-[#4ade80]/30 rounded-full animate-[float_9s_ease-in-out_infinite_0.5s]" />
          </div>
        </div>

        {/* Position slots - Arranged in grow room formation */}
        <div className={cn(
          "absolute inset-0 flex flex-col items-center justify-between px-4",
          size === "lg" ? "py-8" : "py-6"
        )}>
          {/* Back Row - Manufacturers (tall plants at back of room) */}
          <div className={cn(
            "flex items-center justify-center",
            size === "lg" ? "gap-28" : "gap-20"
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

          {/* Side Benches Row - Pharmacies (wider spread on side tables) */}
          <div className={cn(
            "flex items-center justify-between w-full",
            size === "lg" ? "max-w-[520px]" : "max-w-[360px]"
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

          {/* Center Row - Products with FLEX in center */}
          <div className={cn(
            "flex items-center justify-center",
            size === "lg" ? "gap-14" : "gap-10"
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

          {/* Front Row - Strains */}
          <div className={cn(
            "flex items-center justify-center",
            size === "lg" ? "gap-32" : "gap-24"
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

          {/* Entrance Row - Brand (at the door) */}
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

        {/* Decorative corner brackets */}
        <div className="absolute top-3 left-3 w-4 h-4 border-l-2 border-t-2 border-[#4ade80]/25 rounded-tl" />
        <div className="absolute top-3 right-3 w-4 h-4 border-r-2 border-t-2 border-[#4ade80]/25 rounded-tr" />
        <div className="absolute bottom-3 left-3 w-4 h-4 border-l-2 border-b-2 border-[#4ade80]/25 rounded-bl" />
        <div className="absolute bottom-3 right-3 w-4 h-4 border-r-2 border-b-2 border-[#4ade80]/25 rounded-br" />
        
        {/* CSS for floating animation */}
        <style>{`
          @keyframes float {
            0%, 100% { 
              transform: translateY(0) translateX(0); 
              opacity: 0.3;
            }
            25% { 
              transform: translateY(-10px) translateX(5px); 
              opacity: 0.5;
            }
            50% { 
              transform: translateY(-5px) translateX(-5px); 
              opacity: 0.4;
            }
            75% { 
              transform: translateY(-15px) translateX(3px); 
              opacity: 0.5;
            }
          }
        `}</style>
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
