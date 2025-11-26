import { useState, useMemo } from "react";
import { Search, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

type AssetType = "manufacturer" | "cannabis_strain" | "product" | "pharmacy" | "brand";

interface RosterItem {
  assetType: AssetType;
  assetId: number;
  name: string;
}

interface AvailablePlayer {
  id: number;
  name: string;
  imageUrl?: string | null;
  logoUrl?: string | null;
  yesterdayPoints?: number | null;
  todayPoints?: number | null;
  // Additional stats depending on type
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

interface SleeperPlayerPanelProps {
  // Roster counts for filter pills
  rosterCounts: {
    manufacturer: number;
    cannabis_strain: number;
    product: number;
    pharmacy: number;
    brand: number;
  };
  // Available players per category
  manufacturers: AvailablePlayer[];
  cannabisStrains: AvailablePlayer[];
  products: AvailablePlayer[];
  pharmacies: AvailablePlayer[];
  brands: AvailablePlayer[];
  // Callbacks
  onDraftPick: (assetType: AssetType, assetId: number) => void;
  onSearchChange: (query: string) => void;
  searchQuery: string;
  // State
  isMyTurn: boolean;
  isLoading: boolean;
  draftedAssets?: Record<AssetType, Set<number>>;
  myRoster: RosterItem[];
  // Active tab
  activeTab?: "players" | "team";
  onTabChange?: (tab: "players" | "team") => void;
}

// Position limits
const POSITION_LIMITS: Record<AssetType, number> = {
  manufacturer: 2,
  cannabis_strain: 2,
  product: 2,
  pharmacy: 2,
  brand: 1,
};

// Position config for pills
const POSITION_PILLS: { key: AssetType | "all"; label: string; color: string }[] = [
  { key: "all", label: "ALL", color: "bg-white/20" },
  { key: "manufacturer", label: "MFG", color: "bg-blue-500" },
  { key: "cannabis_strain", label: "STR", color: "bg-purple-500" },
  { key: "product", label: "PRD", color: "bg-pink-500" },
  { key: "pharmacy", label: "PHM", color: "bg-green-500" },
  { key: "brand", label: "BRD", color: "bg-yellow-500" },
];

/**
 * SleeperPlayerPanel
 * 
 * Bottom panel for player selection in Sleeper-style draft.
 * Features tabbed interface, position filter pills, and scrollable player list.
 */
export function SleeperPlayerPanel({
  rosterCounts,
  manufacturers,
  cannabisStrains,
  products,
  pharmacies,
  brands,
  onDraftPick,
  onSearchChange,
  searchQuery,
  isMyTurn,
  isLoading,
  draftedAssets,
  myRoster,
  activeTab = "players",
  onTabChange,
}: SleeperPlayerPanelProps) {
  const [selectedPosition, setSelectedPosition] = useState<AssetType | "all">("all");
  const [isPanelExpanded, setIsPanelExpanded] = useState(true);

  // Check if asset is drafted
  const isAssetDrafted = (assetType: AssetType, assetId: number) => {
    if (!draftedAssets) return false;
    return draftedAssets[assetType]?.has(assetId) ?? false;
  };

  // Check if position is full
  const isPositionFull = (assetType: AssetType) => {
    return rosterCounts[assetType] >= POSITION_LIMITS[assetType];
  };

  // Filter players based on selected position and remove drafted ones
  const filteredPlayers = useMemo(() => {
    const filterAndMap = (
      players: AvailablePlayer[],
      assetType: AssetType
    ): Array<AvailablePlayer & { assetType: AssetType }> => {
      return players
        .filter((p) => !isAssetDrafted(assetType, p.id))
        .map((p) => ({ ...p, assetType }));
    };

    if (selectedPosition === "all") {
      return [
        ...filterAndMap(manufacturers.slice(0, 5), "manufacturer"),
        ...filterAndMap(cannabisStrains.slice(0, 5), "cannabis_strain"),
        ...filterAndMap(products.slice(0, 5), "product"),
        ...filterAndMap(pharmacies.slice(0, 5), "pharmacy"),
        ...filterAndMap(brands.slice(0, 5), "brand"),
      ];
    }

    switch (selectedPosition) {
      case "manufacturer":
        return filterAndMap(manufacturers, "manufacturer");
      case "cannabis_strain":
        return filterAndMap(cannabisStrains, "cannabis_strain");
      case "product":
        return filterAndMap(products, "product");
      case "pharmacy":
        return filterAndMap(pharmacies, "pharmacy");
      case "brand":
        return filterAndMap(brands, "brand");
      default:
        return [];
    }
  }, [
    selectedPosition,
    manufacturers,
    cannabisStrains,
    products,
    pharmacies,
    brands,
    draftedAssets,
  ]);

  // Calculate total roster slots
  const totalRoster = Object.values(rosterCounts).reduce((a, b) => a + b, 0);
  const maxRoster = Object.values(POSITION_LIMITS).reduce((a, b) => a + b, 0) + 1; // +1 for flex

  const handleDraft = (player: AvailablePlayer & { assetType: AssetType }) => {
    if (!isMyTurn) return;
    if (isPositionFull(player.assetType)) return;
    onDraftPick(player.assetType, player.id);
  };

  return (
    <div className="bg-[#1a1d29] border-t border-white/10 flex flex-col">
      {/* Collapse/Expand Handle */}
      <button
        onClick={() => setIsPanelExpanded(!isPanelExpanded)}
        className="w-full py-1 flex items-center justify-center hover:bg-white/5"
      >
        {isPanelExpanded ? (
          <ChevronDown className="w-5 h-5 text-white/40" />
        ) : (
          <ChevronUp className="w-5 h-5 text-white/40" />
        )}
      </button>

      {isPanelExpanded && (
        <>
          {/* Tab Bar */}
          <div className="flex border-b border-white/10">
            <button
              onClick={() => onTabChange?.("players")}
              className={cn(
                "flex-1 py-3 text-sm font-semibold uppercase tracking-wider transition-colors",
                activeTab === "players"
                  ? "text-white border-b-2 border-[#00d4aa]"
                  : "text-white/50 hover:text-white/70"
              )}
            >
              Players
            </button>
            <button
              onClick={() => onTabChange?.("team")}
              className={cn(
                "flex-1 py-3 text-sm font-semibold uppercase tracking-wider transition-colors",
                activeTab === "team"
                  ? "text-white border-b-2 border-[#00d4aa]"
                  : "text-white/50 hover:text-white/70"
              )}
            >
              Team
            </button>
          </div>

          {activeTab === "players" ? (
            <>
              {/* Position Filter Pills */}
              <div className="flex gap-2 px-3 py-2 overflow-x-auto">
                <button
                  onClick={() => setSelectedPosition("all")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap",
                    selectedPosition === "all"
                      ? "bg-white text-black"
                      : "bg-white/10 text-white/70 hover:bg-white/20"
                  )}
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>ALL</span>
                  <span className="text-white/50">
                    {totalRoster}/{maxRoster}
                  </span>
                </button>

                {POSITION_PILLS.slice(1).map((pill) => {
                  const key = pill.key as AssetType;
                  const count = rosterCounts[key];
                  const max = POSITION_LIMITS[key];
                  const isFull = count >= max;

                  return (
                    <button
                      key={pill.key}
                      onClick={() => setSelectedPosition(key)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap",
                        selectedPosition === pill.key
                          ? "bg-white text-black"
                          : isFull
                          ? "bg-white/5 text-white/30"
                          : "bg-white/10 text-white/70 hover:bg-white/20"
                      )}
                    >
                      <span
                        className={cn(
                          "w-2 h-2 rounded-full",
                          isFull ? "bg-green-500" : pill.color
                        )}
                      />
                      <span>{pill.label}</span>
                      <span className={cn(isFull ? "text-green-400" : "text-white/50")}>
                        {count}/{max}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Search */}
              <div className="px-3 pb-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <Input
                    placeholder="Search players..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/40 rounded-lg h-9 text-sm"
                  />
                </div>
              </div>

              {/* Player List */}
              <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1.5 max-h-64">
                {isLoading ? (
                  <div className="text-center py-8 text-white/50 text-sm">Loading...</div>
                ) : filteredPlayers.length === 0 ? (
                  <div className="text-center py-8 text-white/50 text-sm">No players found</div>
                ) : (
                  filteredPlayers.map((player) => {
                    const posConfig = POSITION_PILLS.find((p) => p.key === player.assetType);
                    const isFull = isPositionFull(player.assetType);
                    const points = player.yesterdayPoints ?? player.todayPoints ?? 0;

                    return (
                      <div
                        key={`${player.assetType}-${player.id}`}
                        className="flex items-center gap-3 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                      >
                        {/* Draft Button */}
                        <button
                          onClick={() => handleDraft(player)}
                          disabled={!isMyTurn || isFull}
                          className={cn(
                            "px-3 py-1.5 rounded-md text-xs font-bold uppercase transition-colors",
                            !isMyTurn || isFull
                              ? "bg-white/10 text-white/30 cursor-not-allowed"
                              : "bg-[#00d4aa] text-black hover:bg-[#00e4b8]"
                          )}
                        >
                          Draft
                        </button>

                        {/* Rank/ADP placeholder */}
                        <span className="text-xs text-white/40 w-6 text-right">
                          {player.id % 100}
                        </span>

                        {/* Player Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-white truncate">
                              {player.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-white/50">
                            <span
                              className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                posConfig?.color || "bg-gray-500"
                              )}
                            />
                            <span>{posConfig?.label || "?"}</span>
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="text-right">
                          <div className="text-xs text-white/40">PTS</div>
                          <div className="text-sm font-semibold text-white">
                            {points.toFixed(1)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          ) : (
            /* Team Tab - My Roster View */
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 max-h-64">
              <div className="text-xs text-white/50 uppercase tracking-wider mb-2">
                My Roster ({totalRoster}/{maxRoster})
              </div>
              {myRoster.length === 0 ? (
                <div className="text-center py-8 text-white/50 text-sm">
                  No players drafted yet
                </div>
              ) : (
                myRoster.map((item, idx) => {
                  const posConfig = POSITION_PILLS.find((p) => p.key === item.assetType);
                  return (
                    <div
                      key={`${item.assetType}-${item.assetId}-${idx}`}
                      className="flex items-center gap-3 p-2 rounded-lg bg-white/5"
                    >
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold text-white",
                          posConfig?.color || "bg-gray-500"
                        )}
                      >
                        {posConfig?.label || "?"}
                      </span>
                      <span className="text-sm text-white flex-1 truncate">{item.name}</span>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

