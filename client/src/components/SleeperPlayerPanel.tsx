import { useState, useMemo, useEffect, useCallback } from "react";
import { Search, ChevronUp, ChevronDown, Plus, X, ArrowUpDown, Building2, Leaf, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { LeagueChat } from "@/components/LeagueChat";

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

interface QueuedPlayer {
  assetType: AssetType;
  assetId: number;
  name: string;
  points: number;
}

interface SleeperPlayerPanelProps {
  leagueId?: number;
  rosterCounts: {
    manufacturer: number;
    cannabis_strain: number;
    product: number;
    pharmacy: number;
    brand: number;
  };
  manufacturers: AvailablePlayer[];
  cannabisStrains: AvailablePlayer[];
  products: AvailablePlayer[];
  pharmacies: AvailablePlayer[];
  brands: AvailablePlayer[];
  onDraftPick: (assetType: AssetType, assetId: number) => void;
  onSearchChange: (query: string) => void;
  searchQuery: string;
  isMyTurn: boolean;
  isLoading: boolean;
  draftedAssets?: Record<AssetType, Set<number>>;
  myRoster: RosterItem[];
  // Queue (optional - for season leagues)
  queue?: QueuedPlayer[];
  onAddToQueue?: (player: QueuedPlayer) => void;
  onRemoveFromQueue?: (assetType: AssetType, assetId: number) => void;
  onReorderQueue?: (queue: QueuedPlayer[]) => void;
  autoPickFromQueue?: boolean;
  onAutoPickFromQueueChange?: (enabled: boolean) => void;
  // Legacy props for backwards compatibility
  activeTab?: "players" | "team";
  onTabChange?: (tab: "players" | "team") => void;
}

// Position limits (regular slots only)
const POSITION_LIMITS: Record<AssetType, number> = {
  manufacturer: 2,
  cannabis_strain: 2,
  product: 2,
  pharmacy: 2,
  brand: 1,
};

// Total slots including flex
const TOTAL_ROSTER_SLOTS = 10; // 9 regular + 1 flex

// Position config for pills
const POSITION_PILLS: { key: AssetType | "all" | "flex"; label: string; color: string }[] = [
  { key: "all", label: "ALL", color: "bg-white/20" },
  { key: "manufacturer", label: "MFG", color: "bg-blue-500" },
  { key: "cannabis_strain", label: "STR", color: "bg-purple-500" },
  { key: "product", label: "PRD", color: "bg-pink-500" },
  { key: "pharmacy", label: "PHM", color: "bg-green-500" },
  { key: "brand", label: "BRD", color: "bg-yellow-500" },
  { key: "flex", label: "FLEX", color: "bg-orange-500" },
];

type TabType = "players" | "queue" | "team" | "chat";
type SortBy = "stats" | "name";
type SortOrder = "asc" | "desc";

/**
 * SleeperPlayerPanel
 * 
 * Bottom panel for player selection in Sleeper-style draft.
 * Features: PLAYERS, QUEUE, TEAM, CHAT tabs with expandable panel.
 */
export function SleeperPlayerPanel({
  leagueId,
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
  queue = [],
  onAddToQueue,
  onRemoveFromQueue,
  onReorderQueue,
  autoPickFromQueue = false,
  onAutoPickFromQueueChange,
  activeTab: externalActiveTab,
  onTabChange: externalOnTabChange,
}: SleeperPlayerPanelProps) {
  const [selectedPosition, setSelectedPosition] = useState<AssetType | "all" | "flex">("all");
  const [isPanelExpanded, setIsPanelExpanded] = useState(true);
  const [internalActiveTab, setInternalActiveTab] = useState<TabType>("players");
  const [sortBy, setSortBy] = useState<SortBy>("stats");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Support both internal and external tab control for backwards compatibility
  const hasQueueFeature = !!onAddToQueue;
  const hasChatFeature = !!leagueId;
  const activeTab = externalActiveTab ? (externalActiveTab as TabType) : internalActiveTab;
  const setActiveTab = (tab: TabType) => {
    if (externalOnTabChange && (tab === "players" || tab === "team")) {
      externalOnTabChange(tab);
    }
    setInternalActiveTab(tab);
  };

  // Determine which tabs to show
  const availableTabs: TabType[] = ["players"];
  if (hasQueueFeature) availableTabs.push("queue");
  availableTabs.push("team");
  if (hasChatFeature) availableTabs.push("chat");

  // When TEAM tab is selected, minimize the panel
  useEffect(() => {
    if (activeTab === "team") {
      setIsPanelExpanded(false);
    } else if (activeTab === "players" || activeTab === "queue" || activeTab === "chat") {
      setIsPanelExpanded(true);
    }
  }, [activeTab]);

  // Check if asset is drafted - use useCallback to ensure proper memoization
  const isAssetDrafted = useCallback((assetType: AssetType, assetId: number) => {
    if (!draftedAssets) return false;
    return draftedAssets[assetType]?.has(assetId) ?? false;
  }, [draftedAssets]);

  // Check if asset is in queue
  const isInQueue = (assetType: AssetType, assetId: number) => {
    return queue.some(q => q.assetType === assetType && q.assetId === assetId);
  };

  // Calculate total roster count
  const totalRosterCount = Object.values(rosterCounts).reduce((a, b) => a + b, 0);
  
  // Regular slots total = 9 (2+2+2+2+1)
  const regularSlotsTotal = Object.values(POSITION_LIMITS).reduce((a, b) => a + b, 0);
  
  // Flex is used when total roster > regular slots
  const flexUsed = totalRosterCount > regularSlotsTotal ? 1 : 0;
  
  // Check if flex slot is available (total roster < 10 means flex is open)
  const isFlexAvailable = totalRosterCount < TOTAL_ROSTER_SLOTS;
  
  // Check if position is full (considering flex)
  // A position can still accept a player if:
  // 1. Regular slots for that position are not full, OR
  // 2. Flex slot is available
  const isPositionFull = (assetType: AssetType) => {
    const regularFull = rosterCounts[assetType] >= POSITION_LIMITS[assetType];
    // If regular is not full, position is open
    if (!regularFull) return false;
    // If regular is full, check if flex is still available
    return !isFlexAvailable;
  };

  // Sort function
  const sortPlayers = <T extends { name: string; yesterdayPoints?: number | null; todayPoints?: number | null }>(
    players: T[]
  ): T[] => {
    return [...players].sort((a, b) => {
      if (sortBy === "name") {
        const comparison = a.name.localeCompare(b.name);
        return sortOrder === "asc" ? comparison : -comparison;
      } else {
        const aPoints = a.yesterdayPoints ?? a.todayPoints ?? 0;
        const bPoints = b.yesterdayPoints ?? b.todayPoints ?? 0;
        return sortOrder === "asc" ? aPoints - bPoints : bPoints - aPoints;
      }
    });
  };

  // Filter and sort players based on selected position
  const filteredPlayers = useMemo(() => {
    const filterAndMap = (
      players: AvailablePlayer[],
      assetType: AssetType
    ): Array<AvailablePlayer & { assetType: AssetType }> => {
      return players
        .filter((p) => !isAssetDrafted(assetType, p.id))
        .map((p) => ({ ...p, assetType }));
    };

    let allPlayers: Array<AvailablePlayer & { assetType: AssetType }> = [];

    // "all" and "flex" both show all players (flex is just a filter for showing all available)
    if (selectedPosition === "all" || selectedPosition === "flex") {
      allPlayers = [
        ...filterAndMap(manufacturers, "manufacturer"),
        ...filterAndMap(cannabisStrains, "cannabis_strain"),
        ...filterAndMap(products, "product"),
        ...filterAndMap(pharmacies, "pharmacy"),
        ...filterAndMap(brands, "brand"),
      ];
    } else {
      switch (selectedPosition) {
        case "manufacturer":
          allPlayers = filterAndMap(manufacturers, "manufacturer");
          break;
        case "cannabis_strain":
          allPlayers = filterAndMap(cannabisStrains, "cannabis_strain");
          break;
        case "product":
          allPlayers = filterAndMap(products, "product");
          break;
        case "pharmacy":
          allPlayers = filterAndMap(pharmacies, "pharmacy");
          break;
        case "brand":
          allPlayers = filterAndMap(brands, "brand");
          break;
      }
    }

    return sortPlayers(allPlayers);
  }, [
    selectedPosition,
    manufacturers,
    cannabisStrains,
    products,
    pharmacies,
    brands,
    isAssetDrafted,
    sortBy,
    sortOrder,
  ]);

  // Calculate total roster slots
  const totalRoster = totalRosterCount;
  const maxRoster = TOTAL_ROSTER_SLOTS;

  const handleDraft = (player: AvailablePlayer & { assetType: AssetType }) => {
    if (!isMyTurn) return;
    if (isPositionFull(player.assetType)) return;
    onDraftPick(player.assetType, player.id);
  };

  const handleAddToQueue = (player: AvailablePlayer & { assetType: AssetType }) => {
    if (!onAddToQueue) return;
    if (isInQueue(player.assetType, player.id)) return;
    onAddToQueue({
      assetType: player.assetType,
      assetId: player.id,
      name: player.name,
      points: player.yesterdayPoints ?? player.todayPoints ?? 0,
    });
  };

  const moveQueueItem = (index: number, direction: "up" | "down") => {
    if (!onReorderQueue) return;
    const newQueue = [...queue];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= queue.length) return;
    [newQueue[index], newQueue[newIndex]] = [newQueue[newIndex], newQueue[index]];
    onReorderQueue(newQueue);
  };

  const toggleSort = () => {
    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
  };

  return (
    <div 
      className={cn(
        "bg-[#1a1d29] border-t border-white/10 flex flex-col transition-all duration-300",
        isPanelExpanded ? "h-[65vh]" : "h-auto"
      )}
    >
      {/* Collapse/Expand Handle - Always visible */}
      <button
        onClick={() => setIsPanelExpanded(!isPanelExpanded)}
        className="w-full py-2 flex items-center justify-center hover:bg-white/5 transition-colors shrink-0"
      >
        {isPanelExpanded ? (
          <ChevronDown className="w-5 h-5 text-white/40" />
        ) : (
          <ChevronUp className="w-5 h-5 text-white/40" />
        )}
      </button>

      {/* Tab Bar - Always visible */}
      <div className="flex border-b border-white/10 shrink-0">
        {availableTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              // Auto-expand when clicking a tab while collapsed
              if (!isPanelExpanded && tab !== "team") {
                setIsPanelExpanded(true);
              }
            }}
            className={cn(
              "flex-1 py-3 text-sm font-semibold uppercase tracking-wider transition-colors",
              activeTab === tab
                ? "text-white border-b-2 border-[#00d4aa]"
                : "text-white/50 hover:text-white/70"
            )}
          >
            {tab === "queue" ? `Queue (${queue.length})` : tab}
          </button>
        ))}
      </div>

      {/* Content Area - Only visible when expanded */}
      {isPanelExpanded && (
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {/* PLAYERS TAB */}
          {activeTab === "players" && (
            <>
              {/* Position Filter Pills + Sort Controls */}
              <div className="flex items-center gap-2 px-3 py-2 overflow-x-auto shrink-0">
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
                </button>

                {/* Regular position pills (skip "all" which is index 0 and "flex" which is last) */}
                {POSITION_PILLS.slice(1, -1).map((pill) => {
                  const key = pill.key as AssetType;
                  const count = rosterCounts[key];
                  const max = POSITION_LIMITS[key];
                  const regularFull = count >= max;

                  return (
                    <button
                      key={pill.key}
                      onClick={() => setSelectedPosition(key)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap",
                        selectedPosition === pill.key
                          ? "bg-white text-black"
                          : regularFull
                          ? "bg-white/5 text-white/30"
                          : "bg-white/10 text-white/70 hover:bg-white/20"
                      )}
                    >
                      <span
                        className={cn(
                          "w-2 h-2 rounded-full",
                          regularFull ? "bg-green-500" : pill.color
                        )}
                      />
                      <span>{pill.label}</span>
                      <span className={cn(regularFull ? "text-green-400" : "text-white/50")}>
                        {count}/{max}
                      </span>
                    </button>
                  );
                })}

                {/* FLEX pill - shows all players, tracks the flex slot */}
                <button
                  onClick={() => setSelectedPosition("flex")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap",
                    selectedPosition === "flex"
                      ? "bg-white text-black"
                      : !isFlexAvailable
                      ? "bg-white/5 text-white/30"
                      : "bg-white/10 text-white/70 hover:bg-white/20"
                  )}
                >
                  <span
                    className={cn(
                      "w-2 h-2 rounded-full",
                      !isFlexAvailable ? "bg-green-500" : "bg-orange-500"
                    )}
                  />
                  <span>FLEX</span>
                  <span className={cn(!isFlexAvailable ? "text-green-400" : "text-white/50")}>
                    {flexUsed}/1
                  </span>
                </button>

                {/* Sort Controls */}
                <div className="flex items-center gap-1 ml-auto">
                  <button
                    onClick={() => setSortBy("stats")}
                    className={cn(
                      "px-2 py-1 rounded text-xs font-semibold transition-colors",
                      sortBy === "stats" ? "bg-[#00d4aa] text-black" : "bg-white/10 text-white/60"
                    )}
                  >
                    Stats
                  </button>
                  <button
                    onClick={() => setSortBy("name")}
                    className={cn(
                      "px-2 py-1 rounded text-xs font-semibold transition-colors",
                      sortBy === "name" ? "bg-[#00d4aa] text-black" : "bg-white/10 text-white/60"
                    )}
                  >
                    Name
                  </button>
                  <button
                    onClick={toggleSort}
                    className="p-1 rounded bg-white/10 text-white/60 hover:bg-white/20"
                    title={sortOrder === "asc" ? "Ascending" : "Descending"}
                  >
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Search */}
              <div className="px-3 pb-2 shrink-0">
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
              <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1.5 min-h-0">
                {isLoading ? (
                  <div className="text-center py-8 text-white/50 text-sm">Loading...</div>
                ) : filteredPlayers.length === 0 ? (
                  <div className="text-center py-8 text-white/50 text-sm">No players found</div>
                ) : (
                  filteredPlayers.map((player) => {
                    const posConfig = POSITION_PILLS.find((p) => p.key === player.assetType);
                    const isFull = isPositionFull(player.assetType);
                    const inQueue = isInQueue(player.assetType, player.id);
                    const points = player.yesterdayPoints ?? player.todayPoints ?? 0;
                    const imageUrl = player.imageUrl || player.logoUrl;
                    const isValidImage = imageUrl && imageUrl.length > 5 && !imageUrl.includes("undefined");

                    // Get icon for fallback
                    const getIcon = () => {
                      switch (player.assetType) {
                        case "manufacturer":
                          return <Building2 className="w-5 h-5 text-blue-400" />;
                        case "cannabis_strain":
                          return <Leaf className="w-5 h-5 text-purple-400" />;
                        case "product":
                          return <Package className="w-5 h-5 text-pink-400" />;
                        case "pharmacy":
                          return <Building2 className="w-5 h-5 text-green-400" />;
                        case "brand":
                          return <Building2 className="w-5 h-5 text-yellow-400" />;
                        default:
                          return <Building2 className="w-5 h-5 text-gray-400" />;
                      }
                    };

                    return (
                      <div
                        key={`${player.assetType}-${player.id}`}
                        className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                      >
                        {/* Draft Button */}
                        <button
                          onClick={() => handleDraft(player)}
                          disabled={!isMyTurn || isFull}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-colors shrink-0",
                            !isMyTurn || isFull
                              ? "bg-white/10 text-white/30 cursor-not-allowed"
                              : "bg-[#00d4aa] text-black hover:bg-[#00e4b8]"
                          )}
                        >
                          Draft
                        </button>

                        {/* Queue Button - only show if queue feature is enabled */}
                        {hasQueueFeature && (
                          <button
                            onClick={() => handleAddToQueue(player)}
                            disabled={inQueue}
                            className={cn(
                              "p-1.5 rounded-lg transition-colors shrink-0",
                              inQueue
                                ? "bg-[#00d4aa]/20 text-[#00d4aa]"
                                : "bg-white/10 text-white/50 hover:bg-white/20 hover:text-white"
                            )}
                            title={inQueue ? "In Queue" : "Add to Queue"}
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        )}

                        {/* Thumbnail */}
                        <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center overflow-hidden shrink-0">
                          {isValidImage ? (
                            <img
                              src={imageUrl}
                              alt={player.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                          ) : null}
                          <div className={cn("flex items-center justify-center", isValidImage && "hidden")}>
                            {getIcon()}
                          </div>
                        </div>

                        {/* Player Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-white truncate">
                              {player.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-white/50">
                            <span
                              className={cn(
                                "px-1.5 py-0.5 rounded text-[10px] font-bold",
                                posConfig?.color || "bg-gray-500",
                                "text-white"
                              )}
                            >
                              {posConfig?.label || "?"}
                            </span>
                            {player.manufacturer && (
                              <span className="truncate">{player.manufacturer}</span>
                            )}
                            {player.city && (
                              <span className="truncate">{player.city}</span>
                            )}
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="text-right shrink-0 min-w-[60px]">
                          <div className="text-[10px] text-white/40 uppercase">Yesterday</div>
                          <div className={cn(
                            "text-lg font-bold",
                            points > 0 ? "text-[#00d4aa]" : "text-white/50"
                          )}>
                            {points.toFixed(1)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}

          {/* QUEUE TAB */}
          {activeTab === "queue" && hasQueueFeature && (
            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
              {/* Auto-Draft from Queue Toggle */}
              {onAutoPickFromQueueChange && (
                <div className="px-3 py-3 border-b border-white/10 shrink-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-white">Auto-Draft from Queue</div>
                      <div className="text-xs text-white/50">Automatically pick top player from queue</div>
                    </div>
                    <Switch
                      checked={autoPickFromQueue}
                      onCheckedChange={onAutoPickFromQueueChange}
                      className="data-[state=checked]:bg-[#00d4aa]"
                    />
                  </div>
                </div>
              )}

              {/* Queue List */}
              <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5 min-h-0">
                {queue.length === 0 ? (
                  <div className="text-center py-8 text-white/50 text-sm">
                    <p>No players in queue</p>
                    <p className="text-xs mt-1">Add players from the PLAYERS tab</p>
                  </div>
                ) : (
                  queue.map((item, idx) => {
                    const posConfig = POSITION_PILLS.find((p) => p.key === item.assetType);
                    const isDrafted = isAssetDrafted(item.assetType, item.assetId);

                    return (
                      <div
                        key={`queue-${item.assetType}-${item.assetId}`}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded-lg transition-colors",
                          isDrafted ? "bg-red-500/10 opacity-50" : "bg-white/5"
                        )}
                      >
                        {/* Rank */}
                        <span className="text-sm font-bold text-white/40 w-6 text-center">
                          {idx + 1}
                        </span>

                        {/* Reorder Buttons */}
                        <div className="flex flex-col gap-0.5">
                          <button
                            onClick={() => moveQueueItem(idx, "up")}
                            disabled={idx === 0}
                            className="p-0.5 text-white/40 hover:text-white disabled:opacity-30"
                          >
                            <ChevronUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => moveQueueItem(idx, "down")}
                            disabled={idx === queue.length - 1}
                            className="p-0.5 text-white/40 hover:text-white disabled:opacity-30"
                          >
                            <ChevronDown className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Player Info */}
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-white truncate block">
                            {item.name}
                          </span>
                          <div className="flex items-center gap-2 text-xs text-white/50">
                            <span
                              className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                posConfig?.color || "bg-gray-500"
                              )}
                            />
                            <span>{posConfig?.label || "?"}</span>
                            {isDrafted && <span className="text-red-400">• Drafted</span>}
                          </div>
                        </div>

                        {/* Points */}
                        <div className="text-sm font-semibold text-white shrink-0">
                          {item.points.toFixed(1)}
                        </div>

                        {/* Remove Button */}
                        {onRemoveFromQueue && (
                          <button
                            onClick={() => onRemoveFromQueue(item.assetType, item.assetId)}
                            className="p-1.5 rounded text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TEAM TAB */}
          {activeTab === "team" && (
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 min-h-0">
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

          {/* CHAT TAB */}
          {activeTab === "chat" && (
            <div className="flex-1 overflow-hidden min-h-0">
              <LeagueChat leagueId={leagueId} variant="dark" className="h-full" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
