import { useMemo, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Building2, Leaf, Package, Tag } from "lucide-react";

type AssetType = "manufacturer" | "cannabis_strain" | "product" | "pharmacy" | "brand";

interface DraftPick {
  pickNumber: number;
  round: number;
  teamId: number;
  teamName: string;
  userName: string | null;
  userAvatarUrl: string | null;
  assetType: string; // Will be cast to AssetType when needed
  assetId: number;
  assetName: string;
  imageUrl: string | null;
  lastWeekPoints: number | null;
  trendPercent: number | null;
  pickTime?: string;
}

interface Team {
  id: number;
  name: string;
  userName: string | null;
  userAvatarUrl: string | null;
}

interface SleeperDraftGridProps {
  teams: Team[];
  picks: DraftPick[];
  currentPickNumber: number;
  currentRound: number;
  currentTeamId: number | null;
  totalRounds: number;
  myTeamId?: number;
}

// Team colors for visual differentiation
const TEAM_COLORS = [
  { bg: "bg-blue-600/20", border: "border-blue-500/40", text: "text-blue-300" },
  { bg: "bg-teal-600/20", border: "border-teal-500/40", text: "text-teal-300" },
  { bg: "bg-purple-600/20", border: "border-purple-500/40", text: "text-purple-300" },
  { bg: "bg-pink-600/20", border: "border-pink-500/40", text: "text-pink-300" },
  { bg: "bg-orange-600/20", border: "border-orange-500/40", text: "text-orange-300" },
  { bg: "bg-green-600/20", border: "border-green-500/40", text: "text-green-300" },
  { bg: "bg-cyan-600/20", border: "border-cyan-500/40", text: "text-cyan-300" },
  { bg: "bg-yellow-600/20", border: "border-yellow-500/40", text: "text-yellow-300" },
  { bg: "bg-red-600/20", border: "border-red-500/40", text: "text-red-300" },
  { bg: "bg-indigo-600/20", border: "border-indigo-500/40", text: "text-indigo-300" },
];

// Position abbreviation and icon mapping
const POSITION_CONFIG: Record<AssetType, { abbr: string; color: string }> = {
  manufacturer: { abbr: "MFG", color: "bg-blue-500" },
  cannabis_strain: { abbr: "STR", color: "bg-purple-500" },
  product: { abbr: "PRD", color: "bg-pink-500" },
  pharmacy: { abbr: "PHM", color: "bg-green-500" },
  brand: { abbr: "BRD", color: "bg-yellow-500" },
};

/**
 * SleeperDraftGrid
 * 
 * Horizontal scrolling draft board with team columns.
 * Shows all picks in a snake-draft order with "ON THE CLOCK" highlighting.
 */
export function SleeperDraftGrid({
  teams,
  picks,
  currentPickNumber,
  currentRound,
  currentTeamId,
  totalRounds,
  myTeamId,
}: SleeperDraftGridProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const onTheClockRef = useRef<HTMLDivElement>(null);

  // Build a map of picks by round and team for snake draft order
  const picksByRoundAndTeam = useMemo(() => {
    const map = new Map<string, DraftPick>();
    picks.forEach((pick) => {
      map.set(`${pick.round}-${pick.teamId}`, pick);
    });
    return map;
  }, [picks]);

  // Calculate which team is at which position for each round (snake draft)
  const getTeamOrderForRound = (round: number): Team[] => {
    // Odd rounds: normal order (1, 2, 3, ...)
    // Even rounds: reverse order (..., 3, 2, 1)
    if (round % 2 === 1) {
      return teams;
    } else {
      return [...teams].reverse();
    }
  };

  // Get overall pick number for a position
  const getPickNumberForPosition = (round: number, positionInRound: number): number => {
    return (round - 1) * teams.length + positionInRound + 1;
  };

  // Scroll to "on the clock" cell when it changes
  useEffect(() => {
    if (onTheClockRef.current && scrollContainerRef.current) {
      onTheClockRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "center",
      });
    }
  }, [currentPickNumber, currentRound]);

  return (
    <div className="flex-1 overflow-hidden bg-[#1a1d29]">
      {/* Team Headers - Fixed */}
      <div className="flex border-b border-white/10 bg-[#1a1d29] sticky top-0 z-10">
        {teams.map((team, idx) => {
          const isOnTheClock = team.id === currentTeamId;
          const isMyTeam = team.id === myTeamId;
          const teamColor = TEAM_COLORS[idx % TEAM_COLORS.length];

          return (
            <div
              key={team.id}
              className={cn(
                "flex-shrink-0 w-28 p-2 flex flex-col items-center gap-1 border-r border-white/10",
                isOnTheClock && "bg-[#00d4aa]/10"
              )}
            >
              {/* Avatar */}
              <div
                className={cn(
                  "w-10 h-10 rounded-full overflow-hidden border-2 flex items-center justify-center text-sm font-bold",
                  isOnTheClock ? "border-[#00d4aa]" : "border-white/20",
                  isMyTeam && "ring-2 ring-[#00d4aa] ring-offset-2 ring-offset-[#1a1d29]"
                )}
              >
                {team.userAvatarUrl ? (
                  <img
                    src={team.userAvatarUrl}
                    alt={team.userName || team.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className={cn("w-full h-full flex items-center justify-center", teamColor.bg, teamColor.text)}>
                    {(team.userName || team.name).slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              {/* Team Name */}
              <span className="text-xs text-white/70 text-center truncate w-full">
                {team.userName || team.name}
              </span>
            </div>
          );
        })}
      </div>

      {/* Draft Grid - Scrollable */}
      <div
        ref={scrollContainerRef}
        className="overflow-x-auto overflow-y-auto"
        style={{ maxHeight: "calc(100vh - 280px)" }}
      >
        {Array.from({ length: totalRounds }, (_, roundIdx) => {
          const round = roundIdx + 1;
          const teamOrder = getTeamOrderForRound(round);

          return (
            <div key={round} className="flex border-b border-white/5">
              {teamOrder.map((team, posIdx) => {
                const pickNum = getPickNumberForPosition(round, posIdx);
                const pick = picksByRoundAndTeam.get(`${round}-${team.id}`);
                const isOnTheClock = round === currentRound && team.id === currentTeamId && !pick;
                const teamColor = TEAM_COLORS[teams.findIndex(t => t.id === team.id) % TEAM_COLORS.length];

                return (
                  <div
                    key={`${round}-${team.id}`}
                    ref={isOnTheClock ? onTheClockRef : undefined}
                    className={cn(
                      "flex-shrink-0 w-28 h-20 p-1.5 border-r border-white/5 relative",
                      isOnTheClock && "bg-pink-600/30 animate-pulse"
                    )}
                  >
                    {/* Pick Number Badge */}
                    <div className="absolute top-1 left-1.5 text-[10px] text-white/40 font-medium">
                      {round}.{posIdx + 1}
                    </div>

                    {pick ? (
                      /* Filled Cell */
                      <div
                        className={cn(
                          "h-full rounded-lg border flex flex-col justify-center items-start p-1.5 overflow-hidden",
                          teamColor.bg,
                          teamColor.border
                        )}
                      >
                        {/* Position Badge */}
                        <div
                          className={cn(
                            "text-[9px] font-bold px-1.5 py-0.5 rounded text-white mb-0.5",
                            POSITION_CONFIG[pick.assetType as AssetType]?.color || "bg-gray-500"
                          )}
                        >
                          {POSITION_CONFIG[pick.assetType as AssetType]?.abbr || "?"}
                        </div>
                        {/* Asset Name */}
                        <div className="text-xs font-semibold text-white leading-tight line-clamp-2">
                          {pick.assetName}
                        </div>
                      </div>
                    ) : isOnTheClock ? (
                      /* On The Clock Cell */
                      <div className="h-full rounded-lg border-2 border-pink-500 border-dashed flex flex-col items-center justify-center">
                        <span className="text-[10px] font-bold text-pink-400 uppercase tracking-wider">
                          On The
                        </span>
                        <span className="text-xs font-bold text-pink-300 uppercase">
                          Clock
                        </span>
                      </div>
                    ) : (
                      /* Empty Cell */
                      <div className="h-full rounded-lg border border-white/10 border-dashed flex items-center justify-center">
                        <span className="text-xs text-white/20">{pickNum}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

