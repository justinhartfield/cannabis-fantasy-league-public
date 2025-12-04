import React, { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Search,
  Leaf,
  TrendingUp,
  Sparkles,
  Droplet,
  FlaskConical,
  Info,
  Star,
  Award,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

// Public Mode Position Types
export type PublicPosition = 
  | "legendary_strain"
  | "trending_strain"
  | "effect_category"
  | "consumption_type"
  | "terpene_profile";

interface PublicEntity {
  id: number;
  name: string;
  slug: string;
  imageUrl?: string | null;
  description?: string | null;
  // Scoring data
  todayOrders?: number;
  weekOverWeekGrowth?: number;
  uniqueUsers?: number;
  trendScore?: number;
  totalPoints?: number;
  // Additional metadata
  tier?: string; // For legendary strains
  isViral?: boolean; // For trending strains
  popularityRank?: number; // For effects and terpenes
  marketShare?: number; // For consumption types
}

interface LineupSlot {
  position: PublicPosition;
  entity: PublicEntity | null;
}

interface PublicDraftBoardProps {
  leagueId: number;
  teamId: number;
  teamName: string;
  lineup: LineupSlot[];
  // Available entities for drafting
  legendaryStrains: PublicEntity[];
  trendingStrains: PublicEntity[];
  effectCategories: PublicEntity[];
  consumptionTypes: PublicEntity[];
  terpeneProfiles: PublicEntity[];
  // Callbacks
  onDraftPick: (position: PublicPosition, entityId: number) => void;
  onRemovePick: (position: PublicPosition) => void;
  isLoading: boolean;
  // Draft state
  isMyTurn?: boolean;
  draftPending?: boolean;
}

// Position configuration
const POSITION_CONFIG: Record<PublicPosition, {
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
  color: string;
  description: string;
}> = {
  legendary_strain: {
    label: "Legendary Strain",
    shortLabel: "LEG",
    icon: <Award className="w-4 h-4" />,
    color: "bg-amber-500",
    description: "Classic strains with proven track records",
  },
  trending_strain: {
    label: "Trending Strain",
    shortLabel: "TRD",
    icon: <TrendingUp className="w-4 h-4" />,
    color: "bg-rose-500",
    description: "High momentum plays with viral potential",
  },
  effect_category: {
    label: "Effect Category",
    shortLabel: "EFF",
    icon: <Sparkles className="w-4 h-4" />,
    color: "bg-purple-500",
    description: "Aggregate performance by effect type",
  },
  consumption_type: {
    label: "Consumption Type",
    shortLabel: "CON",
    icon: <FlaskConical className="w-4 h-4" />,
    color: "bg-blue-500",
    description: "Macro trend betting on genetics/THC/product types",
  },
  terpene_profile: {
    label: "Terpene Profile",
    shortLabel: "TRP",
    icon: <Droplet className="w-4 h-4" />,
    color: "bg-emerald-500",
    description: "Deep knowledge play on terpene popularity",
  },
};

// Filter pills for entity browsing
const FILTER_PILLS: { key: PublicPosition | "all"; label: string; icon: React.ReactNode }[] = [
  { key: "all", label: "All", icon: <Search className="w-3 h-3" /> },
  { key: "legendary_strain", label: "Legendary", icon: <Award className="w-3 h-3" /> },
  { key: "trending_strain", label: "Trending", icon: <TrendingUp className="w-3 h-3" /> },
  { key: "effect_category", label: "Effects", icon: <Sparkles className="w-3 h-3" /> },
  { key: "consumption_type", label: "Consumption", icon: <FlaskConical className="w-3 h-3" /> },
  { key: "terpene_profile", label: "Terpenes", icon: <Droplet className="w-3 h-3" /> },
];

export function PublicDraftBoard({
  teamName,
  lineup,
  legendaryStrains,
  trendingStrains,
  effectCategories,
  consumptionTypes,
  terpeneProfiles,
  onDraftPick,
  onRemovePick,
  isLoading,
  isMyTurn = true,
  draftPending = false,
}: PublicDraftBoardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<PublicPosition | "all">("all");
  const [selectedPosition, setSelectedPosition] = useState<PublicPosition | null>(null);

  // Combine all entities for browsing
  const allEntities = useMemo(() => {
    const entities: Array<PublicEntity & { position: PublicPosition }> = [];

    legendaryStrains.forEach(e => entities.push({ ...e, position: "legendary_strain" }));
    trendingStrains.forEach(e => entities.push({ ...e, position: "trending_strain" }));
    effectCategories.forEach(e => entities.push({ ...e, position: "effect_category" }));
    consumptionTypes.forEach(e => entities.push({ ...e, position: "consumption_type" }));
    terpeneProfiles.forEach(e => entities.push({ ...e, position: "terpene_profile" }));

    return entities;
  }, [legendaryStrains, trendingStrains, effectCategories, consumptionTypes, terpeneProfiles]);

  // Filter entities based on search and position filter
  const filteredEntities = useMemo(() => {
    let filtered = allEntities;

    // Apply position filter
    if (selectedFilter !== "all") {
      filtered = filtered.filter(e => e.position === selectedFilter);
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(e =>
        e.name.toLowerCase().includes(query) ||
        e.description?.toLowerCase().includes(query)
      );
    }

    // Sort by total points (descending)
    filtered.sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));

    return filtered;
  }, [allEntities, selectedFilter, searchQuery]);

  // Check if an entity is already drafted
  const isDrafted = (entityId: number) => {
    return lineup.some(slot => slot.entity?.id === entityId);
  };

  // Get available positions (positions without an entity)
  const availablePositions = useMemo(() => {
    return lineup.filter(slot => !slot.entity).map(slot => slot.position);
  }, [lineup]);

  // Handle entity selection
  const handleSelectEntity = (entity: PublicEntity & { position: PublicPosition }) => {
    if (draftPending) {
      toast.error("Draft in progress, please wait...");
      return;
    }

    if (!isMyTurn) {
      toast.error("It's not your turn!");
      return;
    }

    if (isDrafted(entity.id)) {
      toast.error("This entity is already in your lineup");
      return;
    }

    // Check if the position is filled
    const positionSlot = lineup.find(slot => slot.position === entity.position);
    if (positionSlot?.entity) {
      toast.error(`${POSITION_CONFIG[entity.position].label} position is already filled`);
      return;
    }

    onDraftPick(entity.position, entity.id);
    toast.success(`Drafted ${entity.name} as ${POSITION_CONFIG[entity.position].label}`);
  };

  // Handle removing an entity from lineup
  const handleRemoveEntity = (position: PublicPosition) => {
    if (draftPending) {
      toast.error("Draft in progress, please wait...");
      return;
    }

    onRemovePick(position);
    toast.success(`Removed ${POSITION_CONFIG[position].label} from lineup`);
  };

  return (
    <div className="flex flex-col h-full gap-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{teamName}</h2>
          <p className="text-sm text-muted-foreground">Build your 5-position lineup</p>
        </div>
        {!isMyTurn && (
          <Badge variant="secondary">Waiting for opponent...</Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0">
        {/* Left Panel: Lineup */}
        <div className="lg:col-span-1 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Leaf className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Your Lineup</h3>
          </div>

          <div className="space-y-2">
            {lineup.map((slot) => {
              const config = POSITION_CONFIG[slot.position];
              const entity = slot.entity;

              return (
                <div
                  key={slot.position}
                  className={cn(
                    "p-3 rounded-lg border-2 transition-all",
                    entity
                      ? "bg-card border-primary/20"
                      : "bg-muted/30 border-dashed border-muted-foreground/30"
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={cn("p-1.5 rounded", config.color)}>
                      {config.icon}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{config.label}</div>
                      <div className="text-xs text-muted-foreground">{config.shortLabel}</div>
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="w-4 h-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">{config.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  {entity ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {entity.imageUrl && (
                          <img
                            src={entity.imageUrl}
                            alt={entity.name}
                            className="w-10 h-10 rounded object-cover"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{entity.name}</div>
                          {entity.totalPoints !== undefined && (
                            <div className="text-xs text-muted-foreground">
                              {entity.totalPoints} pts
                            </div>
                          )}
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={() => handleRemoveEntity(slot.position)}
                        disabled={draftPending}
                      >
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-sm text-muted-foreground">
                      Empty slot
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Lineup Summary */}
          <div className="mt-auto p-3 bg-primary/10 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Projected Points</span>
              <span className="text-lg font-bold">
                {lineup.reduce((sum, slot) => sum + (slot.entity?.totalPoints || 0), 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Right Panel: Available Entities */}
        <div className="lg:col-span-2 flex flex-col gap-3 min-h-0">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Available Entities</h3>
          </div>

          {/* Search and Filters */}
          <div className="space-y-2">
            <Input
              placeholder="Search entities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />

            <div className="flex flex-wrap gap-2">
              {FILTER_PILLS.map((pill) => (
                <Button
                  key={pill.key}
                  variant={selectedFilter === pill.key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedFilter(pill.key)}
                  className="gap-1"
                >
                  {pill.icon}
                  {pill.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Entity List */}
          <ScrollArea className="flex-1">
            <div className="space-y-2 pr-4">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading entities...
                </div>
              ) : filteredEntities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No entities found
                </div>
              ) : (
                filteredEntities.map((entity) => {
                  const config = POSITION_CONFIG[entity.position];
                  const alreadyDrafted = isDrafted(entity.id);
                  const positionFilled = lineup.find(
                    slot => slot.position === entity.position && slot.entity
                  );

                  return (
                    <div
                      key={`${entity.position}-${entity.id}`}
                      className={cn(
                        "p-3 rounded-lg border transition-all cursor-pointer",
                        alreadyDrafted
                          ? "bg-muted/50 border-muted opacity-50 cursor-not-allowed"
                          : positionFilled
                          ? "bg-card border-muted hover:border-muted-foreground/30"
                          : "bg-card border-border hover:border-primary hover:shadow-md"
                      )}
                      onClick={() => !alreadyDrafted && handleSelectEntity(entity)}
                    >
                      <div className="flex items-start gap-3">
                        {entity.imageUrl && (
                          <img
                            src={entity.imageUrl}
                            alt={entity.name}
                            className="w-12 h-12 rounded object-cover"
                          />
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge
                              variant="secondary"
                              className={cn("text-xs", config.color)}
                            >
                              {config.shortLabel}
                            </Badge>
                            <span className="font-medium truncate">{entity.name}</span>
                            {entity.isViral && (
                              <Zap className="w-4 h-4 text-yellow-500" />
                            )}
                          </div>

                          {entity.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                              {entity.description}
                            </p>
                          )}

                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {entity.totalPoints !== undefined && (
                              <span className="font-medium text-primary">
                                {entity.totalPoints} pts
                              </span>
                            )}
                            {entity.weekOverWeekGrowth !== undefined && (
                              <span className={cn(
                                entity.weekOverWeekGrowth > 0 ? "text-green-600" : "text-red-600"
                              )}>
                                {entity.weekOverWeekGrowth > 0 ? "+" : ""}
                                {entity.weekOverWeekGrowth}% WoW
                              </span>
                            )}
                            {entity.uniqueUsers !== undefined && (
                              <span>{entity.uniqueUsers} users</span>
                            )}
                          </div>
                        </div>

                        {alreadyDrafted && (
                          <Badge variant="secondary" className="text-xs">
                            Drafted
                          </Badge>
                        )}
                        {positionFilled && !alreadyDrafted && (
                          <Badge variant="outline" className="text-xs">
                            Position Filled
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
