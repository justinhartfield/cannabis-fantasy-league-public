import { useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { DraftField, rosterToFieldPlayers } from "./DraftField";
import { SleeperPlayerPanel } from "./SleeperPlayerPanel";
import { LeagueChat } from "./LeagueChat";
import {
  DraftPosition,
  CHALLENGE_DRAFT_ORDER,
  POSITION_ASSET_MAP,
  type AssetType,
} from "./DraftFieldPlayer";
import { ChevronDown, ChevronUp, MessageCircle, Users } from "lucide-react";

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

/**
 * ChallengeDraftBoard - Main container for the Daily Challenge draft
 * 
 * Features:
 * - Side-by-side soccer field visualization for user and opponent
 * - Real-time updates as picks are made
 * - Bottom panel with available players (reuses SleeperPlayerPanel)
 * - Integrated chat component
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
  const [activeBottomTab, setActiveBottomTab] = useState<"players" | "chat">("players");
  const [playerPanelTab, setPlayerPanelTab] = useState<"players" | "team">("players");

  // Calculate current draft index (0-8 for 9 total picks per team)
  // In a 2-player challenge, picks alternate: my pick 1, opp pick 1, my pick 2, etc.
  const myDraftIndex = useMemo(() => {
    // Each team drafts 9 players total
    // My picks are at positions 1, 3, 5, 7, 9, 11, 13, 15, 17 (odd numbers)
    // Opponent picks are at positions 2, 4, 6, 8, 10, 12, 14, 16, 18 (even numbers)
    // We need to figure out which position I'm drafting based on my roster count
    return myRoster.length;
  }, [myRoster.length]);

  const opponentDraftIndex = useMemo(() => {
    return opponentRoster.length;
  }, [opponentRoster.length]);

  // Convert rosters to field player maps
  const myFieldPlayers = useMemo(() => rosterToFieldPlayers(myRoster), [myRoster]);
  const opponentFieldPlayers = useMemo(() => rosterToFieldPlayers(opponentRoster), [opponentRoster]);

  // Check if it's opponent's turn
  const isOpponentTurn = opponentTeam && currentTurnTeamId === opponentTeam.id;

  // Calculate roster counts for the player panel
  const rosterCounts = useMemo(() => ({
    manufacturer: myRoster.filter((r) => r.assetType === "manufacturer").length,
    cannabis_strain: myRoster.filter((r) => r.assetType === "cannabis_strain").length,
    product: myRoster.filter((r) => r.assetType === "product").length,
    pharmacy: myRoster.filter((r) => r.assetType === "pharmacy").length,
    brand: myRoster.filter((r) => r.assetType === "brand").length,
  }), [myRoster]);

  // Determine which position is next to draft (based on draft order)
  const getNextPositionToDraft = useCallback((roster: RosterItem[]): DraftPosition | null => {
    const filledPositions = new Set<DraftPosition>();
    
    // Map roster to positions
    const counts: Record<AssetType, number> = {
      manufacturer: 0,
      pharmacy: 0,
      product: 0,
      cannabis_strain: 0,
      brand: 0,
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

    // Find the next position in draft order that isn't filled
    for (const position of CHALLENGE_DRAFT_ORDER) {
      if (!filledPositions.has(position)) {
        return position;
      }
    }

    return null;
  }, []);

  // Get the active position for each team
  const myActivePosition = isMyTurn ? getNextPositionToDraft(myRoster) : null;
  const myActiveDraftIndex = myActivePosition 
    ? CHALLENGE_DRAFT_ORDER.indexOf(myActivePosition) 
    : -1;
    
  const opponentActivePosition = isOpponentTurn ? getNextPositionToDraft(opponentRoster) : null;
  const opponentActiveDraftIndex = opponentActivePosition 
    ? CHALLENGE_DRAFT_ORDER.indexOf(opponentActivePosition) 
    : -1;

  // Handle draft pick - map to the correct asset type based on current position
  const handleDraftPick = useCallback((assetType: AssetType, assetId: number) => {
    onDraftPick(assetType, assetId);
  }, [onDraftPick]);

  return (
    <div className="flex flex-col h-full bg-[#0f0f16]">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#1a0a2e] via-[#0f0f16] to-[#1a0a2e] border-b border-white/10">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-white/60" />
          <span className="text-sm font-semibold text-white">Live Draft</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-white/10 text-xs text-white/70">
            Pick #{currentPickNumber}
          </span>
          {isMyTurn && (
            <span className="px-3 py-1 rounded-full bg-[#cfff4d] text-xs font-bold text-black animate-pulse">
              Your Turn!
            </span>
          )}
        </div>
      </div>

      {/* Fields Container - Side by Side */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-5xl mx-auto">
          {/* My Field */}
          <DraftField
            teamName={myTeam.name}
            userName={myTeam.userName}
            players={myFieldPlayers}
            currentDraftIndex={myActiveDraftIndex}
            isUserTeam={true}
            isOnTheClock={isMyTurn}
            size="md"
            className="shadow-[0_20px_50px_rgba(16,185,129,0.1)]"
          />

          {/* Opponent Field */}
          {opponentTeam ? (
            <DraftField
              teamName={opponentTeam.name}
              userName={opponentTeam.userName}
              players={opponentFieldPlayers}
              currentDraftIndex={opponentActiveDraftIndex}
              isUserTeam={false}
              isOnTheClock={isOpponentTurn}
              size="md"
              className="shadow-[0_20px_50px_rgba(244,63,94,0.1)]"
            />
          ) : (
            <div className="flex flex-col rounded-2xl bg-white/5 border border-dashed border-white/20">
              <div className="flex items-center justify-center h-full min-h-[420px]">
                <div className="text-center space-y-2 p-8">
                  <div className="w-16 h-16 mx-auto rounded-full bg-white/10 flex items-center justify-center">
                    <Users className="w-8 h-8 text-white/40" />
                  </div>
                  <p className="text-sm text-white/50">Waiting for opponent...</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Panel Tabs */}
      <div className="flex border-t border-white/10 bg-[#1a1d29]">
        <button
          onClick={() => setActiveBottomTab("players")}
          className={cn(
            "flex-1 py-3 text-sm font-semibold uppercase tracking-wider transition-colors flex items-center justify-center gap-2",
            activeBottomTab === "players"
              ? "text-white border-b-2 border-[#cfff4d] bg-white/5"
              : "text-white/50 hover:text-white/70"
          )}
        >
          <Users className="w-4 h-4" />
          Draft Players
        </button>
        <button
          onClick={() => setActiveBottomTab("chat")}
          className={cn(
            "flex-1 py-3 text-sm font-semibold uppercase tracking-wider transition-colors flex items-center justify-center gap-2",
            activeBottomTab === "chat"
              ? "text-white border-b-2 border-[#cfff4d] bg-white/5"
              : "text-white/50 hover:text-white/70"
          )}
        >
          <MessageCircle className="w-4 h-4" />
          Smack Talk
        </button>
      </div>

      {/* Bottom Panel Content */}
      <div className="bg-[#1a1d29]">
        {activeBottomTab === "players" ? (
          <SleeperPlayerPanel
            rosterCounts={rosterCounts}
            manufacturers={manufacturers}
            cannabisStrains={cannabisStrains}
            products={products}
            pharmacies={pharmacies}
            brands={brands}
            onDraftPick={handleDraftPick}
            onSearchChange={onSearchChange}
            searchQuery={searchQuery}
            isMyTurn={isMyTurn}
            isLoading={isLoading}
            draftedAssets={draftedAssets}
            myRoster={myRoster}
            activeTab={playerPanelTab}
            onTabChange={setPlayerPanelTab}
          />
        ) : (
          <div className="h-[320px]">
            <LeagueChat leagueId={leagueId} variant="dark" />
          </div>
        )}
      </div>
    </div>
  );
}

