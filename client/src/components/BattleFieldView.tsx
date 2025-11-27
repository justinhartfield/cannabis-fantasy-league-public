import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { LiveIndicator } from "@/components/LiveIndicator";
import {
  DraftFieldPlayer,
  DraftPosition,
  POSITION_ASSET_MAP,
  type AssetType,
} from "./DraftFieldPlayer";

interface PlayerWithScore {
  id: number;
  name: string;
  imageUrl?: string | null;
  assetType: AssetType;
  score?: number | null;
}

interface TeamData {
  teamId: number;
  teamName: string;
  userName?: string | null;
  userAvatarUrl?: string | null;
  points: number;
  players: Partial<Record<DraftPosition, PlayerWithScore | null>>;
}

interface BattleFieldViewProps {
  leftTeam: TeamData | null;
  rightTeam: TeamData | null;
  isLive?: boolean;
  challengeDate?: string;
  userTeamId?: number;
  selectedTeamId?: number | null;
  onTeamClick?: (teamId: number) => void;
  className?: string;
}

/**
 * BattleFieldView - Single soccer field visualization showing selected team's lineup
 * 
 * Shows one team's lineup on a soccer field with player scores displayed above each jersey.
 * Defaults to user's team, can switch to opponent when their team is selected in BattleArena.
 */
export function BattleFieldView({
  leftTeam,
  rightTeam,
  isLive = false,
  challengeDate,
  userTeamId,
  selectedTeamId,
  onTeamClick,
  className,
}: BattleFieldViewProps) {
  // Determine which team to display:
  // 1. If selectedTeamId matches a team, show that team
  // 2. Otherwise default to user's team
  // 3. Fallback to leftTeam if neither matches
  const getDisplayTeam = (): TeamData | null => {
    if (selectedTeamId) {
      if (leftTeam?.teamId === selectedTeamId) return leftTeam;
      if (rightTeam?.teamId === selectedTeamId) return rightTeam;
    }
    // Default to user's team
    if (userTeamId) {
      if (leftTeam?.teamId === userTeamId) return leftTeam;
      if (rightTeam?.teamId === userTeamId) return rightTeam;
    }
    // Fallback to leftTeam
    return leftTeam;
  };

  const displayTeam = getDisplayTeam();
  const isUserTeam = displayTeam?.teamId === userTeamId;
  const accentColor = isUserTeam ? "#cfff4d" : "#ff5c47";

  const getPlayer = (position: DraftPosition) => {
    const player = displayTeam?.players[position];
    if (!player) return null;
    return {
      id: player.id,
      name: player.name,
      imageUrl: player.imageUrl,
      assetType: player.assetType,
    };
  };

  const getScore = (position: DraftPosition) => {
    const player = displayTeam?.players[position];
    return player?.score ?? null;
  };

  // Calculate filled positions count
  const filledCount = displayTeam?.players ? Object.values(displayTeam.players).filter(Boolean).length : 0;

  if (!displayTeam) {
    return (
      <div className={cn(
        "relative overflow-hidden rounded-[32px] bg-gradient-to-b from-[#0a0a12] via-[#0f1018] to-[#050508] border border-white/10 p-8",
        className
      )}>
        <div className="flex flex-col items-center justify-center h-[300px] opacity-50">
          <div className="text-sm text-white/50">No team data available</div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "relative overflow-hidden rounded-[32px] bg-gradient-to-b from-[#0a0a12] via-[#0f1018] to-[#050508] border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.5)]",
      className
    )}>
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Arena lights */}
        <div className="absolute top-0 left-1/4 w-64 h-64 rounded-full blur-[100px] animate-pulse" style={{ backgroundColor: `${accentColor}15` }} />
        <div className="absolute top-0 right-1/4 w-64 h-64 rounded-full blur-[100px] animate-pulse delay-500" style={{ backgroundColor: `${accentColor}10` }} />
        
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: `linear-gradient(${accentColor}20 1px, transparent 1px), 
                            linear-gradient(90deg, ${accentColor}20 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }} />
      </div>

      {/* Content */}
      <div className="relative z-10 px-4 py-6 sm:px-6">
        {/* Header with team info */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="border-white/20 text-white/80 bg-white/5">
              Team Lineup
            </Badge>
            {isLive && <LiveIndicator size="sm" />}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/50">{filledCount}/10 Players</span>
          </div>
        </div>

        {/* Team Header */}
        <div
          className={cn(
            "flex items-center justify-between px-4 py-3 rounded-xl border backdrop-blur-sm mb-4",
            isUserTeam
              ? "bg-gradient-to-r from-[#cfff4d]/20 via-[#1a1d29] to-[#cfff4d]/10 border-[#cfff4d]/30"
              : "bg-gradient-to-r from-[#ff5c47]/20 via-[#1a1d29] to-[#ff5c47]/10 border-[#ff5c47]/30"
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2",
                isUserTeam
                  ? "bg-[#cfff4d]/20 border-[#cfff4d] text-[#cfff4d]"
                  : "bg-[#ff5c47]/20 border-[#ff5c47] text-[#ff5c47]"
              )}
            >
              {displayTeam.teamName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="text-sm font-semibold text-white">{displayTeam.teamName}</div>
              {displayTeam.userName && (
                <div className="text-xs text-white/50">@{displayTeam.userName}</div>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black tabular-nums" style={{ color: accentColor }}>
              {displayTeam.points.toFixed(1)}
            </div>
            <div className="text-[10px] text-white/50 uppercase tracking-wider">Points</div>
          </div>
        </div>

        {/* Single Field */}
        <div className="max-w-lg mx-auto">
          <div
            className={cn(
              "relative overflow-hidden rounded-xl h-[480px]",
              "bg-gradient-to-b from-[#0a0a0f] via-[#0f1015] to-[#0a0a0f]"
            )}
          >
            {/* Futuristic field markings */}
            <svg
              className="absolute inset-0 w-full h-full"
              viewBox="0 0 200 400"
              preserveAspectRatio="none"
            >
              {/* Grid pattern effect */}
              <defs>
                <pattern id="grid-pattern-single" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                  <rect x="0" y="0" width="20" height="20" fill="none" stroke={`${accentColor}08`} strokeWidth="0.5" />
                </pattern>
                <linearGradient id="field-glow-single" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={`${accentColor}15`} />
                  <stop offset="50%" stopColor={`${accentColor}05`} />
                  <stop offset="100%" stopColor={`${accentColor}15`} />
                </linearGradient>
                <radialGradient id="center-glow-single" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor={`${accentColor}20`} />
                  <stop offset="100%" stopColor="transparent" />
                </radialGradient>
              </defs>

              {/* Background grid */}
              <rect x="0" y="0" width="200" height="400" fill="url(#grid-pattern-single)" />

              {/* Field border with glow */}
              <rect
                x="10"
                y="10"
                width="180"
                height="380"
                fill="none"
                stroke={`${accentColor}30`}
                strokeWidth="1.5"
                rx="4"
              />

              {/* Center line */}
              <line
                x1="10"
                y1="200"
                x2="190"
                y2="200"
                stroke={`${accentColor}20`}
                strokeWidth="1"
              />

              {/* Center circle with glow */}
              <circle
                cx="100"
                cy="200"
                r="40"
                fill="url(#center-glow-single)"
                stroke={`${accentColor}25`}
                strokeWidth="1"
              />

              {/* Center dot */}
              <circle cx="100" cy="200" r="4" fill={`${accentColor}50`} />

              {/* Top penalty area */}
              <rect
                x="35"
                y="10"
                width="130"
                height="65"
                fill="none"
                stroke={`${accentColor}15`}
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
                stroke={`${accentColor}15`}
                strokeWidth="1"
                rx="2"
              />
            </svg>

            {/* Ambient glow effects */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-20 blur-3xl" style={{ backgroundColor: `${accentColor}08` }} />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-40 h-20 blur-3xl" style={{ backgroundColor: `${accentColor}08` }} />
            </div>

            {/* Position slots - Arranged in formation */}
            <div className="absolute inset-0 flex flex-col items-center justify-between px-4 py-4">
              {/* Strikers Row (Manufacturers) */}
              <div className="flex items-center justify-center gap-12">
                <DraftFieldPlayer
                  position="ST1"
                  player={getPlayer("ST1")}
                  score={getScore("ST1")}
                  showScore={true}
                  size="md"
                />
                <DraftFieldPlayer
                  position="ST2"
                  player={getPlayer("ST2")}
                  score={getScore("ST2")}
                  showScore={true}
                  size="md"
                />
              </div>

              {/* Wings Row (Pharmacies) */}
              <div className="flex items-center justify-between w-full max-w-[360px]">
                <DraftFieldPlayer
                  position="LW"
                  player={getPlayer("LW")}
                  score={getScore("LW")}
                  showScore={true}
                  size="md"
                />
                <DraftFieldPlayer
                  position="RW"
                  player={getPlayer("RW")}
                  score={getScore("RW")}
                  showScore={true}
                  size="md"
                />
              </div>

              {/* Midfield Row (Products) with FLEX */}
              <div className="flex items-center justify-center gap-6">
                <DraftFieldPlayer
                  position="CM1"
                  player={getPlayer("CM1")}
                  score={getScore("CM1")}
                  showScore={true}
                  size="md"
                />
                <DraftFieldPlayer
                  position="FLEX"
                  player={getPlayer("FLEX")}
                  score={getScore("FLEX")}
                  showScore={true}
                  size="md"
                />
                <DraftFieldPlayer
                  position="CM2"
                  player={getPlayer("CM2")}
                  score={getScore("CM2")}
                  showScore={true}
                  size="md"
                />
              </div>

              {/* Defense Row (Strains) */}
              <div className="flex items-center justify-center gap-16">
                <DraftFieldPlayer
                  position="CB1"
                  player={getPlayer("CB1")}
                  score={getScore("CB1")}
                  showScore={true}
                  size="md"
                />
                <DraftFieldPlayer
                  position="CB2"
                  player={getPlayer("CB2")}
                  score={getScore("CB2")}
                  showScore={true}
                  size="md"
                />
              </div>

              {/* Goalkeeper Row (Brand) */}
              <div className="flex items-center justify-center">
                <DraftFieldPlayer
                  position="GK"
                  player={getPlayer("GK")}
                  score={getScore("GK")}
                  showScore={true}
                  size="md"
                />
              </div>
            </div>

            {/* Decorative corner markers */}
            <div className="absolute top-3 left-3 w-3 h-3 border-l-2 border-t-2 rounded-tl" style={{ borderColor: `${accentColor}40` }} />
            <div className="absolute top-3 right-3 w-3 h-3 border-r-2 border-t-2 rounded-tr" style={{ borderColor: `${accentColor}40` }} />
            <div className="absolute bottom-3 left-3 w-3 h-3 border-l-2 border-b-2 rounded-bl" style={{ borderColor: `${accentColor}40` }} />
            <div className="absolute bottom-3 right-3 w-3 h-3 border-r-2 border-b-2 rounded-br" style={{ borderColor: `${accentColor}40` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Helper to convert a lineup array with scores to the position-based player map
 */
export function lineupToFieldPlayersWithScores(
  lineup: Array<{ 
    assetType: AssetType | string | null | undefined; 
    assetId: number | null | undefined; 
    name: string | null | undefined; 
    imageUrl?: string | null;
    points?: number | null;
    totalPoints?: number | null;
  }> | null | undefined
): Partial<Record<DraftPosition, PlayerWithScore | null>> {
  const result: Partial<Record<DraftPosition, PlayerWithScore | null>> = {};

  // Guard against null/undefined input
  if (!lineup || !Array.isArray(lineup)) {
    return result;
  }

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

  // Valid asset types
  const validAssetTypes = new Set<string>(['manufacturer', 'pharmacy', 'product', 'cannabis_strain', 'brand']);

  // Overflow players go to FLEX
  const overflowPlayers: Array<typeof lineup[0]> = [];

  lineup.forEach((player) => {
    // Skip invalid players (null assetType or invalid type)
    if (!player || !player.assetType || !player.assetId || !player.name) {
      return;
    }
    
    // Ensure assetType is valid
    const assetType = player.assetType as AssetType;
    if (!validAssetTypes.has(assetType)) {
      return;
    }

    const positions = positionMap[assetType];
    const count = counts[assetType];
    
    if (positions && count < positions.length) {
      const position = positions[count];
      result[position] = {
        id: player.assetId,
        name: player.name,
        imageUrl: player.imageUrl,
        assetType: assetType,
        score: player.points ?? player.totalPoints ?? null,
      };
      counts[assetType]++;
    } else {
      // This player overflows their position, add to flex candidates
      overflowPlayers.push(player);
    }
  });

  // Place the first overflow player in FLEX if not already filled
  if (!result["FLEX"] && overflowPlayers.length > 0) {
    const flexPlayer = overflowPlayers[0];
    if (flexPlayer.assetId && flexPlayer.name && flexPlayer.assetType && validAssetTypes.has(flexPlayer.assetType as string)) {
      result["FLEX"] = {
        id: flexPlayer.assetId,
        name: flexPlayer.name,
        imageUrl: flexPlayer.imageUrl,
        assetType: flexPlayer.assetType as AssetType,
        score: flexPlayer.points ?? flexPlayer.totalPoints ?? null,
      };
    }
  }

  return result;
}
