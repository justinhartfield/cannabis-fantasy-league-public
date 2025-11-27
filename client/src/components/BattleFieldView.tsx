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
 * BattleFieldView - Side-by-side soccer field visualization for battle mode
 * 
 * Shows both teams' lineups on mirrored soccer fields with player scores
 * displayed above each jersey position.
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
  const isUserTeam = (teamId: number | undefined) => teamId && teamId === userTeamId;

  return (
    <div className={cn(
      "relative overflow-hidden rounded-[32px] bg-gradient-to-b from-[#0a0a12] via-[#0f1018] to-[#050508] border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.5)]",
      className
    )}>
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Arena lights */}
        <div className="absolute top-0 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute top-0 right-1/4 w-64 h-64 bg-secondary/10 rounded-full blur-[100px] animate-pulse delay-500" />
        
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: `linear-gradient(rgba(207,255,77,0.1) 1px, transparent 1px), 
                            linear-gradient(90deg, rgba(207,255,77,0.1) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }} />
      </div>

      {/* Content */}
      <div className="relative z-10 px-4 py-6 sm:px-6">
        {/* Header with status */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="border-white/20 text-white/80 bg-white/5">
              Daily Challenge
            </Badge>
            {isLive && <LiveIndicator size="sm" />}
          </div>
          {challengeDate && (
            <span className="text-xs text-white/50">{challengeDate}</span>
          )}
        </div>

        {/* Score Display */}
        <div className="flex items-center justify-center gap-4 mb-4">
          <div className="text-center">
            <div className="text-3xl sm:text-4xl font-black text-[#cfff4d] tabular-nums">
              {(leftTeam?.points ?? 0).toFixed(1)}
            </div>
            <div className="text-xs text-white/50 uppercase tracking-wider mt-1">
              {leftTeam?.teamName || "Team 1"}
            </div>
          </div>
          <div className="px-4 py-2 rounded-full bg-white/5 border border-white/10">
            <span className="text-xl font-bold text-white/60">VS</span>
          </div>
          <div className="text-center">
            <div className="text-3xl sm:text-4xl font-black text-[#ff5c47] tabular-nums">
              {(rightTeam?.points ?? 0).toFixed(1)}
            </div>
            <div className="text-xs text-white/50 uppercase tracking-wider mt-1">
              {rightTeam?.teamName || "Team 2"}
            </div>
          </div>
        </div>

        {/* Score Bar */}
        <div className="relative h-2 bg-white/10 rounded-full overflow-hidden mb-6">
          {leftTeam && rightTeam && (leftTeam.points > 0 || rightTeam.points > 0) && (
            <>
              <div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#cfff4d] to-[#a8e600] transition-all duration-500"
                style={{
                  width: `${
                    (leftTeam.points / (leftTeam.points + rightTeam.points)) * 100
                  }%`,
                }}
              />
              <div
                className="absolute top-0 right-0 h-full bg-gradient-to-l from-[#ff5c47] to-[#ff8a78] transition-all duration-500"
                style={{
                  width: `${
                    (rightTeam.points / (leftTeam.points + rightTeam.points)) * 100
                  }%`,
                }}
              />
            </>
          )}
        </div>

        {/* Fields Container - Side by Side */}
        <div className="grid grid-cols-2 gap-4">
          {/* Left Team Field */}
          <div
            className={cn(
              "transition-all duration-200 rounded-xl",
              onTeamClick && leftTeam && "cursor-pointer hover:scale-[1.01]",
              selectedTeamId === leftTeam?.teamId && "ring-2 ring-[#cfff4d] ring-offset-2 ring-offset-[#0a0a12]"
            )}
            onClick={() => leftTeam && onTeamClick?.(leftTeam.teamId)}
          >
            <BattleTeamField
              team={leftTeam}
              side="left"
              isUserTeam={isUserTeam(leftTeam?.teamId)}
              isSelected={selectedTeamId === leftTeam?.teamId}
            />
          </div>

          {/* Right Team Field */}
          <div
            className={cn(
              "transition-all duration-200 rounded-xl",
              onTeamClick && rightTeam && "cursor-pointer hover:scale-[1.01]",
              selectedTeamId === rightTeam?.teamId && "ring-2 ring-[#ff5c47] ring-offset-2 ring-offset-[#0a0a12]"
            )}
            onClick={() => rightTeam && onTeamClick?.(rightTeam.teamId)}
          >
            <BattleTeamField
              team={rightTeam}
              side="right"
              isUserTeam={isUserTeam(rightTeam?.teamId)}
              isSelected={selectedTeamId === rightTeam?.teamId}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

interface BattleTeamFieldProps {
  team: TeamData | null;
  side: "left" | "right";
  isUserTeam?: boolean;
  isSelected?: boolean;
}

function BattleTeamField({ team, side, isUserTeam, isSelected }: BattleTeamFieldProps) {
  const accentColor = side === "left" ? "#cfff4d" : "#ff5c47";
  
  const getPlayer = (position: DraftPosition) => {
    const player = team?.players[position];
    if (!player) return null;
    return {
      id: player.id,
      name: player.name,
      imageUrl: player.imageUrl,
      assetType: player.assetType,
    };
  };

  const getScore = (position: DraftPosition) => {
    const player = team?.players[position];
    return player?.score ?? null;
  };

  // Calculate filled positions count
  const filledCount = team?.players ? Object.values(team.players).filter(Boolean).length : 0;

  if (!team) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] opacity-50">
        <div className="text-sm text-white/50">Waiting for opponent...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Team Header */}
      <div
        className={cn(
          "flex items-center justify-between px-3 py-2 rounded-t-xl border-b backdrop-blur-sm",
          side === "left"
            ? "bg-gradient-to-r from-[#cfff4d]/20 via-[#1a1d29] to-[#cfff4d]/10 border-[#cfff4d]/30"
            : "bg-gradient-to-r from-[#ff5c47]/20 via-[#1a1d29] to-[#ff5c47]/10 border-[#ff5c47]/30"
        )}
      >
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2",
              side === "left"
                ? "bg-[#cfff4d]/20 border-[#cfff4d] text-[#cfff4d]"
                : "bg-[#ff5c47]/20 border-[#ff5c47] text-[#ff5c47]"
            )}
          >
            {team.teamName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="text-xs font-semibold text-white truncate max-w-[80px]">{team.teamName}</div>
            {team.userName && (
              <div className="text-[9px] text-white/50">@{team.userName}</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-white/50 uppercase tracking-wider">
            {filledCount}/10
          </span>
        </div>
      </div>

      {/* Futuristic Dark Field */}
      <div
        className={cn(
          "relative overflow-hidden rounded-b-xl h-[380px]",
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
            <pattern id={`grid-pattern-${side}`} x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <rect x="0" y="0" width="20" height="20" fill="none" stroke={`${accentColor}08`} strokeWidth="0.5" />
            </pattern>
            <linearGradient id={`field-glow-${side}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={`${accentColor}15`} />
              <stop offset="50%" stopColor={`${accentColor}05`} />
              <stop offset="100%" stopColor={`${accentColor}15`} />
            </linearGradient>
            <radialGradient id={`center-glow-${side}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={`${accentColor}20`} />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
          </defs>

          {/* Background grid */}
          <rect x="0" y="0" width="200" height="400" fill={`url(#grid-pattern-${side})`} />

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
            fill={`url(#center-glow-${side})`}
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
        <div className="absolute inset-0 flex flex-col items-center justify-between px-2 py-3">
          {/* Strikers Row (Manufacturers) */}
          <div className="flex items-center justify-center gap-8">
            <DraftFieldPlayer
              position="ST1"
              player={getPlayer("ST1")}
              score={getScore("ST1")}
              showScore={true}
              size="sm"
            />
            <DraftFieldPlayer
              position="ST2"
              player={getPlayer("ST2")}
              score={getScore("ST2")}
              showScore={true}
              size="sm"
            />
          </div>

          {/* Wings Row (Pharmacies) */}
          <div className="flex items-center justify-between w-full max-w-[240px]">
            <DraftFieldPlayer
              position="LW"
              player={getPlayer("LW")}
              score={getScore("LW")}
              showScore={true}
              size="sm"
            />
            <DraftFieldPlayer
              position="RW"
              player={getPlayer("RW")}
              score={getScore("RW")}
              showScore={true}
              size="sm"
            />
          </div>

          {/* Midfield Row (Products) with FLEX */}
          <div className="flex items-center justify-center gap-4">
            <DraftFieldPlayer
              position="CM1"
              player={getPlayer("CM1")}
              score={getScore("CM1")}
              showScore={true}
              size="sm"
            />
            <DraftFieldPlayer
              position="FLEX"
              player={getPlayer("FLEX")}
              score={getScore("FLEX")}
              showScore={true}
              size="sm"
            />
            <DraftFieldPlayer
              position="CM2"
              player={getPlayer("CM2")}
              score={getScore("CM2")}
              showScore={true}
              size="sm"
            />
          </div>

          {/* Defense Row (Strains) */}
          <div className="flex items-center justify-center gap-12">
            <DraftFieldPlayer
              position="CB1"
              player={getPlayer("CB1")}
              score={getScore("CB1")}
              showScore={true}
              size="sm"
            />
            <DraftFieldPlayer
              position="CB2"
              player={getPlayer("CB2")}
              score={getScore("CB2")}
              showScore={true}
              size="sm"
            />
          </div>

          {/* Goalkeeper Row (Brand) */}
          <div className="flex items-center justify-center">
            <DraftFieldPlayer
              position="GK"
              player={getPlayer("GK")}
              score={getScore("GK")}
              showScore={true}
              size="sm"
            />
          </div>
        </div>

        {/* Decorative corner markers */}
        <div className="absolute top-3 left-3 w-2 h-2 border-l-2 border-t-2 rounded-tl" style={{ borderColor: `${accentColor}40` }} />
        <div className="absolute top-3 right-3 w-2 h-2 border-r-2 border-t-2 rounded-tr" style={{ borderColor: `${accentColor}40` }} />
        <div className="absolute bottom-3 left-3 w-2 h-2 border-l-2 border-b-2 rounded-bl" style={{ borderColor: `${accentColor}40` }} />
        <div className="absolute bottom-3 right-3 w-2 h-2 border-r-2 border-b-2 rounded-br" style={{ borderColor: `${accentColor}40` }} />
      </div>
    </div>
  );
}

/**
 * Helper to convert a lineup array with scores to the position-based player map
 */
export function lineupToFieldPlayersWithScores(
  lineup: Array<{ 
    assetType: AssetType; 
    assetId: number; 
    name: string; 
    imageUrl?: string | null;
    points?: number | null;
    totalPoints?: number | null;
  }>
): Partial<Record<DraftPosition, PlayerWithScore | null>> {
  const result: Partial<Record<DraftPosition, PlayerWithScore | null>> = {};

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
  const overflowPlayers: Array<typeof lineup[0]> = [];

  lineup.forEach((player) => {
    const positions = positionMap[player.assetType];
    const count = counts[player.assetType];
    
    if (count < positions.length) {
      const position = positions[count];
      result[position] = {
        id: player.assetId,
        name: player.name,
        imageUrl: player.imageUrl,
        assetType: player.assetType,
        score: player.points ?? player.totalPoints ?? null,
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
      score: flexPlayer.points ?? flexPlayer.totalPoints ?? null,
    };
  }

  return result;
}

