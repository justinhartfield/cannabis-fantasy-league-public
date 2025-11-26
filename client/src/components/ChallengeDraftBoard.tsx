import { useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { DraftField, rosterToFieldPlayers } from "./DraftField";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DraftPosition,
  CHALLENGE_DRAFT_ORDER,
  POSITION_COLORS,
  POSITION_ASSET_MAP,
  ASSET_TYPE_LABELS,
  type AssetType,
} from "./DraftFieldPlayer";
import { Search, Users, Clock, TrendingUp, Building2, Leaf, Package, Tag } from "lucide-react";
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
}: ChallengeDraftBoardProps) {
  const [selectedPosition, setSelectedPosition] = useState<AssetType | "all">("all");

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

  // Filter players
  const filteredPlayers = useMemo(() => {
    const filterAndMap = (players: AvailablePlayer[], assetType: AssetType) => {
      return players
        .filter((p) => !isAssetDrafted(assetType, p.id))
        .map((p) => ({ ...p, assetType, imageUrl: p.imageUrl || p.logoUrl }));
    };

    if (selectedPosition === "all") {
      return [
        ...filterAndMap(manufacturers.slice(0, 5), "manufacturer"),
        ...filterAndMap(pharmacies.slice(0, 5), "pharmacy"),
        ...filterAndMap(products.slice(0, 5), "product"),
        ...filterAndMap(cannabisStrains.slice(0, 5), "cannabis_strain"),
        ...filterAndMap(brands.slice(0, 3), "brand"),
      ];
    }

    switch (selectedPosition) {
      case "manufacturer": return filterAndMap(manufacturers, "manufacturer");
      case "pharmacy": return filterAndMap(pharmacies, "pharmacy");
      case "product": return filterAndMap(products, "product");
      case "cannabis_strain": return filterAndMap(cannabisStrains, "cannabis_strain");
      case "brand": return filterAndMap(brands, "brand");
      default: return [];
    }
  }, [selectedPosition, manufacturers, pharmacies, products, cannabisStrains, brands, draftedAssets]);

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
    <div className="flex flex-col h-full bg-[#0a0a0f] overflow-y-auto">
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

      {/* Bottom Panels - 2 Across */}
      <div className="border-t border-white/10 bg-[#0f1015]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-white/5">
          {/* Panel 1: Available Players */}
          <div className="bg-[#0f1015] p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[10px] font-semibold text-white/70 uppercase tracking-wider">Available</h3>
              {isMyTurn && (
                <span className="px-1.5 py-0.5 rounded-full bg-[#cfff4d] text-black text-[9px] font-bold animate-pulse">
                  Pick Now
                </span>
              )}
            </div>

            {/* Position Filter Pills */}
            <div className="flex gap-1 mb-2 overflow-x-auto pb-1">
              {POSITION_PILLS.map((pill) => {
                const key = pill.key;
                const isFull = key !== "all" && isPositionFull(key as AssetType);
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedPosition(key)}
                    className={cn(
                      "flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold transition-colors whitespace-nowrap",
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
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-7 h-7 text-xs bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-lg"
              />
            </div>

            {/* Player List */}
            <ScrollArea className="h-[120px]">
              <div className="space-y-1 pr-2">
                {isLoading ? (
                  <p className="text-xs text-white/30 text-center py-4">Loading...</p>
                ) : filteredPlayers.length === 0 ? (
                  <p className="text-xs text-white/30 text-center py-4">No players found</p>
                ) : (
                  filteredPlayers.map((player) => {
                    const colors = POSITION_COLORS[player.assetType];
                    const isFull = isPositionFull(player.assetType);
                    const points = player.yesterdayPoints ?? player.todayPoints ?? 0;

                    return (
                      <div
                        key={`${player.assetType}-${player.id}`}
                        className="flex items-center gap-2 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                      >
                        <button
                          onClick={() => handleDraft(player)}
                          disabled={!isMyTurn || isFull}
                          className={cn(
                            "px-2 py-1 rounded text-[9px] font-bold uppercase transition-colors",
                            !isMyTurn || isFull
                              ? "bg-white/5 text-white/20 cursor-not-allowed"
                              : "bg-[#cfff4d] text-black hover:bg-[#dfff6d]"
                          )}
                        >
                          Draft
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-medium text-white truncate">{player.name}</p>
                          <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colors.jersey }} />
                            <span className="text-[9px]" style={{ color: colors.jersey }}>
                              {ASSET_TYPE_LABELS[player.assetType]}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-semibold text-white">{points.toFixed(1)}</p>
                          <p className="text-[8px] text-white/40">pts</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Panel 2: Recent Picks */}
          <div className="bg-[#0f1015] p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider">Recent Picks</h3>
              <span className="flex items-center gap-1 text-[10px] text-white/40">
                <Clock className="w-3 h-3" />
                Pick #{currentPickNumber}
              </span>
            </div>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2 pr-2">
                {/* Show combined roster picks as recent history */}
                {[...myRoster, ...opponentRoster].length === 0 ? (
                  <p className="text-xs text-white/30 text-center py-4">No picks yet</p>
                ) : (
                  [...myRoster].reverse().slice(0, 5).map((item, idx) => {
                    const colors = POSITION_COLORS[item.assetType];
                    return (
                      <div
                        key={`recent-${item.assetType}-${item.assetId}-${idx}`}
                        className="flex items-center gap-2 p-2 rounded-lg bg-[#cfff4d]/5 border border-[#cfff4d]/10"
                      >
                        <div className="w-6 h-6 rounded-full flex items-center justify-center bg-[#cfff4d]/20">
                          <span className="text-[9px] font-bold text-[#cfff4d]">
                            {myRoster.length - idx}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-medium text-white truncate">{item.name}</p>
                          <p className="text-[9px] text-[#cfff4d]/70">{myTeam.name}</p>
                        </div>
                        <span
                          className="px-1.5 py-0.5 rounded text-[8px] font-bold"
                          style={{ backgroundColor: colors.jersey + '33', color: colors.jersey }}
                        >
                          {ASSET_TYPE_LABELS[item.assetType].slice(0, 3).toUpperCase()}
                        </span>
                      </div>
                    );
                  })
                )}
                {opponentRoster.length > 0 && (
                  <>
                    <div className="text-[10px] text-white/30 text-center py-1 border-t border-white/5 mt-2">
                      Opponent Picks
                    </div>
                    {[...opponentRoster].reverse().slice(0, 3).map((item, idx) => {
                      const colors = POSITION_COLORS[item.assetType];
                      return (
                        <div
                          key={`opp-${item.assetType}-${item.assetId}-${idx}`}
                          className="flex items-center gap-2 p-2 rounded-lg bg-[#ff6b6b]/5 border border-[#ff6b6b]/10"
                        >
                          <div className="w-6 h-6 rounded-full flex items-center justify-center bg-[#ff6b6b]/20">
                            <span className="text-[9px] font-bold text-[#ff6b6b]">
                              {opponentRoster.length - idx}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-medium text-white truncate">{item.name}</p>
                            <p className="text-[9px] text-[#ff6b6b]/70">{opponentTeam?.name || "Opponent"}</p>
                          </div>
                          <span
                            className="px-1.5 py-0.5 rounded text-[8px] font-bold"
                            style={{ backgroundColor: colors.jersey + '33', color: colors.jersey }}
                          >
                            {ASSET_TYPE_LABELS[item.assetType].slice(0, 3).toUpperCase()}
                          </span>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  );
}
