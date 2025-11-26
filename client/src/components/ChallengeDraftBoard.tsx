import { useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { DraftField, rosterToFieldPlayers } from "./DraftField";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DraftPosition,
  CHALLENGE_DRAFT_ORDER,
  POSITION_COLORS,
  POSITION_ASSET_MAP,
  ASSET_TYPE_LABELS,
  type AssetType,
} from "./DraftFieldPlayer";
import { Search, Users, Building2, Leaf, Package, Tag, TrendingUp, SortAsc, Zap, Info } from "lucide-react";
import { toast } from "sonner";

interface RosterItem {
  assetType: AssetType;
  assetId: number;
  name: string;
  imageUrl?: string | null;
}

interface AvailablePlayer {
  id: number;
  name: string;
  imageUrl?: string | null;
  logoUrl?: string | null;
  yesterdayPoints?: number | null;
  todayPoints?: number | null;
  productCount?: number;
  type?: string;
  effects?: string[];
  manufacturer?: string;
  thcContent?: number | string;
  favoriteCount?: number;
  city?: string;
  totalFavorites?: number;
  totalViews?: number;
}

interface TeamInfo {
  id: number;
  name: string;
  userName?: string | null;
}

interface ChallengeDraftBoardProps {
  leagueId: number;
  myTeam: TeamInfo;
  opponentTeam: TeamInfo | null;
  myRoster: RosterItem[];
  opponentRoster: RosterItem[];
  currentPickNumber: number;
  currentTurnTeamId: number | null;
  isMyTurn: boolean;
  // Available players for drafting
  manufacturers: AvailablePlayer[];
  cannabisStrains: AvailablePlayer[];
  products: AvailablePlayer[];
  pharmacies: AvailablePlayer[];
  brands: AvailablePlayer[];
  // Callbacks
  onDraftPick: (assetType: AssetType, assetId: number) => void;
  onSearchChange: (query: string) => void;
  searchQuery: string;
  isLoading: boolean;
  draftedAssets: Record<AssetType, Set<number>>;
  // Auto-pick settings
  autoDraftEnabled?: boolean;
  onAutoDraftChange?: (enabled: boolean) => void;
  // Timer display
  timerSeconds?: number | null;
}

// Position filter pills configuration
const POSITION_PILLS: { key: AssetType | "all"; label: string; icon: React.ReactNode; color: string }[] = [
  { key: "all", label: "All", icon: <Search className="w-3 h-3" />, color: "bg-white/20" },
  { key: "manufacturer", label: "MFG", icon: <Building2 className="w-3 h-3" />, color: "bg-blue-500" },
  { key: "pharmacy", label: "PHM", icon: <Building2 className="w-3 h-3" />, color: "bg-emerald-500" },
  { key: "product", label: "PRD", icon: <Package className="w-3 h-3" />, color: "bg-pink-500" },
  { key: "cannabis_strain", label: "STR", icon: <Leaf className="w-3 h-3" />, color: "bg-purple-500" },
  { key: "brand", label: "BRD", icon: <Tag className="w-3 h-3" />, color: "bg-yellow-500" },
];

// Position limits (base slots, not including FLEX)
const POSITION_LIMITS: Record<AssetType, number> = {
  manufacturer: 2,
  cannabis_strain: 2,
  product: 2,
  pharmacy: 2,
  brand: 1,
};

// Max allowed including FLEX (base + 1 for flex possibility)
const POSITION_MAX_WITH_FLEX: Record<AssetType, number> = {
  manufacturer: 3,
  cannabis_strain: 3,
  product: 3,
  pharmacy: 3,
  brand: 2,
};

/**
 * ChallengeDraftBoard - Main container for the Daily Challenge draft
 * 
 * Features:
 * - Side-by-side soccer field visualization for user and opponent
 * - Real-time updates as picks are made
 * - 3 panels across: My Team, Available Players, Recent Picks
 */
export function ChallengeDraftBoard({
  leagueId,
  myTeam,
  opponentTeam,
  myRoster,
  opponentRoster,
  currentPickNumber,
  currentTurnTeamId,
  isMyTurn,
  manufacturers,
  cannabisStrains,
  products,
  pharmacies,
  brands,
  onDraftPick,
  onSearchChange,
  searchQuery,
  isLoading,
  draftedAssets,
  autoDraftEnabled = false,
  onAutoDraftChange,
  timerSeconds,
}: ChallengeDraftBoardProps) {
  const [selectedPosition, setSelectedPosition] = useState<AssetType | "all">("all");
  const [sortBy, setSortBy] = useState<"points" | "name">("points");

  // Convert rosters to field player maps
  const myFieldPlayers = useMemo(() => rosterToFieldPlayers(myRoster), [myRoster]);
  const opponentFieldPlayers = useMemo(() => rosterToFieldPlayers(opponentRoster), [opponentRoster]);

  // Check if it's opponent's turn
  const isOpponentTurn = opponentTeam && currentTurnTeamId === opponentTeam.id;

  // Calculate roster counts
  const rosterCounts = useMemo(() => ({
    manufacturer: myRoster.filter((r) => r.assetType === "manufacturer").length,
    cannabis_strain: myRoster.filter((r) => r.assetType === "cannabis_strain").length,
    product: myRoster.filter((r) => r.assetType === "product").length,
    pharmacy: myRoster.filter((r) => r.assetType === "pharmacy").length,
    brand: myRoster.filter((r) => r.assetType === "brand").length,
  }), [myRoster]);

  // Determine which position is next to draft
  const getNextPositionToDraft = useCallback((roster: RosterItem[]): DraftPosition | null => {
    const filledPositions = new Set<DraftPosition>();
    const counts: Record<AssetType, number> = {
      manufacturer: 0, pharmacy: 0, product: 0, cannabis_strain: 0, brand: 0,
    };
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
        filledPositions.add(positions[count]);
        counts[player.assetType]++;
      }
    });

    for (const position of CHALLENGE_DRAFT_ORDER) {
      if (!filledPositions.has(position)) {
        return position;
      }
    }
    return null;
  }, []);

  const myActivePosition = isMyTurn ? getNextPositionToDraft(myRoster) : null;
  const myActiveDraftIndex = myActivePosition ? CHALLENGE_DRAFT_ORDER.indexOf(myActivePosition) : -1;
  const opponentActivePosition = isOpponentTurn ? getNextPositionToDraft(opponentRoster) : null;
  const opponentActiveDraftIndex = opponentActivePosition ? CHALLENGE_DRAFT_ORDER.indexOf(opponentActivePosition) : -1;

  // Total roster count
  const totalRoster = useMemo(() => 
    Object.values(rosterCounts).reduce((a, b) => a + b, 0),
    [rosterCounts]
  );

  // Check if asset is drafted
  const isAssetDrafted = (assetType: AssetType, assetId: number) => {
    return draftedAssets[assetType]?.has(assetId) ?? false;
  };

  // Check if FLEX slot is filled (total roster > sum of base positions)
  const isFlexFilled = useMemo(() => {
    const baseSlotsFilled = Object.entries(rosterCounts).reduce((sum, [type, count]) => {
      return sum + Math.min(count, POSITION_LIMITS[type as AssetType]);
    }, 0);
    // If we have more players than base slots, FLEX is filled
    return totalRoster > baseSlotsFilled;
  }, [rosterCounts, totalRoster]);

  // Check if position is full (accounts for FLEX)
  const isPositionFull = useCallback((assetType: AssetType) => {
    const currentCount = rosterCounts[assetType];
    const baseLimit = POSITION_LIMITS[assetType];
    const maxWithFlex = POSITION_MAX_WITH_FLEX[assetType];
    
    // If under base limit, not full
    if (currentCount < baseLimit) {
      return false;
    }
    
    // If at base limit, can use FLEX if it's not already filled
    if (currentCount === baseLimit && !isFlexFilled) {
      return false;
    }
    
    // If at max with flex, definitely full
    if (currentCount >= maxWithFlex) {
      return true;
    }
    
    // FLEX is filled and we're at or above base limit
    return true;
  }, [rosterCounts, isFlexFilled]);

  // Filter and sort players
  const filteredPlayers = useMemo(() => {
    const filterAndMap = (players: AvailablePlayer[], assetType: AssetType) => {
      return players
        .filter((p) => !isAssetDrafted(assetType, p.id))
        .map((p) => ({ ...p, assetType, imageUrl: p.imageUrl || p.logoUrl }));
    };

    let result: (AvailablePlayer & { assetType: AssetType })[] = [];

    if (selectedPosition === "all") {
      result = [
        ...filterAndMap(manufacturers.slice(0, 10), "manufacturer"),
        ...filterAndMap(pharmacies.slice(0, 10), "pharmacy"),
        ...filterAndMap(products.slice(0, 10), "product"),
        ...filterAndMap(cannabisStrains.slice(0, 10), "cannabis_strain"),
        ...filterAndMap(brands.slice(0, 5), "brand"),
      ];
    } else {
      switch (selectedPosition) {
        case "manufacturer": result = filterAndMap(manufacturers, "manufacturer"); break;
        case "pharmacy": result = filterAndMap(pharmacies, "pharmacy"); break;
        case "product": result = filterAndMap(products, "product"); break;
        case "cannabis_strain": result = filterAndMap(cannabisStrains, "cannabis_strain"); break;
        case "brand": result = filterAndMap(brands, "brand"); break;
      }
    }

    // Sort results
    if (sortBy === "points") {
      result.sort((a, b) => {
        const pointsA = a.yesterdayPoints ?? a.todayPoints ?? 0;
        const pointsB = b.yesterdayPoints ?? b.todayPoints ?? 0;
        return pointsB - pointsA;
      });
    } else {
      result.sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [selectedPosition, manufacturers, pharmacies, products, cannabisStrains, brands, draftedAssets, sortBy]);

  // Handle draft pick
  const handleDraft = (player: AvailablePlayer & { assetType: AssetType }) => {
    if (!isMyTurn) {
      toast.error("Not your turn!");
      return;
    }
    if (isPositionFull(player.assetType)) {
      toast.error(`Position full! Max ${POSITION_LIMITS[player.assetType]} allowed.`);
      return;
    }
    onDraftPick(player.assetType, player.id);
    toast.success(`Drafted ${player.name}!`);
  };

  return (
    <TooltipProvider>
    <div className="flex flex-col h-full bg-[#0a0a0f] overflow-y-auto">
      {/* Draft Controls Header */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          {/* Timer */}
          {timerSeconds !== null && timerSeconds !== undefined && !isNaN(timerSeconds) && timerSeconds >= 0 && (
            <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
              <span className="text-sm font-mono font-semibold text-white">
                ⏱️ {Math.floor(timerSeconds / 60)}:{String(timerSeconds % 60).padStart(2, "0")}
              </span>
            </div>
          )}
          
          {/* Turn indicator */}
          {isMyTurn ? (
            <span className="px-3 py-1.5 rounded-lg bg-[#cfff4d] text-black text-xs font-bold uppercase animate-pulse">
              Your Turn
            </span>
          ) : (
            <span className="px-3 py-1.5 rounded-lg bg-white/5 text-white/50 text-xs font-medium">
              Opponent's Turn
            </span>
          )}
        </div>
        
        {/* Auto-Pick Toggle with Label and Info */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
            <Zap className={cn(
              "w-4 h-4 transition-colors",
              autoDraftEnabled ? "text-[#cfff4d]" : "text-white/40"
            )} />
            <span className={cn(
              "text-xs font-medium transition-colors",
              autoDraftEnabled ? "text-[#cfff4d]" : "text-white/50"
            )}>
              Auto-Pick
            </span>
            <Switch
              checked={autoDraftEnabled}
              onCheckedChange={onAutoDraftChange}
              className="data-[state=checked]:bg-[#cfff4d] scale-75"
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="p-1 rounded-full hover:bg-white/10 transition-colors">
                  <Info className="w-3.5 h-3.5 text-white/40" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[280px] bg-[#1a1d29] border-white/10 text-white">
                <p className="text-xs leading-relaxed">
                  <strong className="text-[#cfff4d]">Auto-Pick Mode</strong><br/>
                  When enabled, the system will automatically draft the best available player based on yesterday's points when it's your turn.
                  <br/><br/>
                  <span className="text-white/60">💡 If both players enable auto-pick, the entire draft completes in seconds!</span>
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Fields Container - Side by Side on Desktop, Single on Mobile */}
      <div className="p-4 pb-2">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-5xl mx-auto">
          {/* My Field - Always visible */}
          <DraftField
            teamName={myTeam.name}
            userName={myTeam.userName}
            players={myFieldPlayers}
            currentDraftIndex={myActiveDraftIndex}
            isUserTeam={true}
            isOnTheClock={isMyTurn}
            size="sm"
            className="shadow-[0_10px_30px_rgba(207,255,77,0.06)]"
          />

          {/* Opponent Field - Hidden on mobile, visible on lg+ */}
          <div className="hidden lg:block">
            {opponentTeam ? (
              <DraftField
                teamName={opponentTeam.name}
                userName={opponentTeam.userName}
                players={opponentFieldPlayers}
                currentDraftIndex={opponentActiveDraftIndex}
                isUserTeam={false}
                isOnTheClock={isOpponentTurn}
                size="sm"
                className="shadow-[0_10px_30px_rgba(255,107,107,0.06)]"
              />
            ) : (
              <div className="flex flex-col rounded-xl bg-[#0f1015] border border-dashed border-white/10 h-full">
                <div className="flex items-center justify-center h-full min-h-[340px]">
                  <div className="text-center space-y-2 p-6">
                    <div className="w-12 h-12 mx-auto rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                      <Users className="w-6 h-6 text-white/30" />
                    </div>
                    <p className="text-xs text-white/40">Waiting for opponent...</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Panel - Available Players (Expanded to fill remaining space) */}
      <div className="flex-1 border-t border-white/10 bg-[#0f1015] flex flex-col min-h-0">
        <div className="max-w-3xl mx-auto w-full flex flex-col flex-1 min-h-0 px-3 py-3">
          {/* Header Row */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider">Available Players</h3>
              {isMyTurn && (
                <span className="px-2 py-0.5 rounded-full bg-[#cfff4d] text-black text-[10px] font-bold animate-pulse">
                  Your Pick
                </span>
              )}
            </div>
            
            {/* Sort Toggle */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSortBy("points")}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors",
                  sortBy === "points"
                    ? "bg-[#cfff4d]/20 text-[#cfff4d]"
                    : "text-white/40 hover:text-white/60"
                )}
              >
                <TrendingUp className="w-3 h-3" />
                Points
              </button>
              <button
                onClick={() => setSortBy("name")}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors",
                  sortBy === "name"
                    ? "bg-[#cfff4d]/20 text-[#cfff4d]"
                    : "text-white/40 hover:text-white/60"
                )}
              >
                <SortAsc className="w-3 h-3" />
                A-Z
              </button>
            </div>
          </div>

          {/* Position Filter Pills */}
          <div className="flex gap-1.5 mb-2 overflow-x-auto pb-1">
            {POSITION_PILLS.map((pill) => {
              const key = pill.key;
              const isFull = key !== "all" && isPositionFull(key as AssetType);
              return (
                <button
                  key={key}
                  onClick={() => setSelectedPosition(key)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors whitespace-nowrap",
                    selectedPosition === key
                      ? "bg-white text-black"
                      : isFull
                      ? "bg-white/5 text-white/20"
                      : "bg-white/10 text-white/60 hover:bg-white/20"
                  )}
                >
                  {pill.icon}
                  <span>{pill.label}</span>
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <Input
              placeholder="Search players..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 h-9 text-sm bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-lg"
            />
          </div>

          {/* Player List - Scrollable and fills remaining space */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="space-y-1.5 pr-2 pb-4">
              {isLoading ? (
                <p className="text-sm text-white/30 text-center py-8">Loading players...</p>
              ) : filteredPlayers.length === 0 ? (
                <p className="text-sm text-white/30 text-center py-8">No players found</p>
              ) : (
                filteredPlayers.map((player) => {
                  const colors = POSITION_COLORS[player.assetType];
                  const isFull = isPositionFull(player.assetType);
                  const yesterdayPts = player.yesterdayPoints ?? 0;
                  const todayPts = player.todayPoints ?? 0;

                  return (
                    <div
                      key={`${player.assetType}-${player.id}`}
                      className={cn(
                        "flex items-center gap-3 p-2.5 rounded-xl transition-all",
                        isFull 
                          ? "bg-white/[0.02] opacity-50" 
                          : "bg-white/5 hover:bg-white/10"
                      )}
                    >
                      {/* Draft Button */}
                      <button
                        onClick={() => handleDraft(player)}
                        disabled={!isMyTurn || isFull}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all shrink-0",
                          !isMyTurn || isFull
                            ? "bg-white/5 text-white/20 cursor-not-allowed"
                            : "bg-[#cfff4d] text-black hover:bg-[#dfff6d] hover:scale-105"
                        )}
                      >
                        Draft
                      </button>
                      
                      {/* Player Thumbnail */}
                      <Avatar className="w-10 h-10 shrink-0 border-2" style={{ borderColor: colors.jersey }}>
                        <AvatarImage src={player.imageUrl || ""} alt={player.name} />
                        <AvatarFallback 
                          className="text-xs font-bold"
                          style={{ backgroundColor: `${colors.jersey}20`, color: colors.jersey }}
                        >
                          {player.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      {/* Player Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{player.name}</p>
                        <div className="flex items-center gap-1.5">
                          <span 
                            className="w-2 h-2 rounded-full" 
                            style={{ backgroundColor: colors.jersey }} 
                          />
                          <span className="text-[10px] font-medium" style={{ color: colors.jersey }}>
                            {ASSET_TYPE_LABELS[player.assetType]}
                          </span>
                        </div>
                      </div>
                      
                      {/* Yesterday's Points */}
                      <div className="text-right shrink-0">
                        <div className="flex items-baseline gap-1">
                          <p className="text-base font-bold text-white">{yesterdayPts.toFixed(1)}</p>
                          <p className="text-[9px] text-white/40 uppercase">pts</p>
                        </div>
                        <p className="text-[10px] text-white/40">Yesterday</p>
                      </div>
                      
                      {/* Today's Points (if available) */}
                      {todayPts > 0 && (
                        <div className="text-right shrink-0 pl-2 border-l border-white/10">
                          <div className="flex items-baseline gap-1">
                            <p className="text-sm font-semibold text-[#cfff4d]">{todayPts.toFixed(1)}</p>
                          </div>
                          <p className="text-[9px] text-white/40">Today</p>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
    </TooltipProvider>
  );
}
