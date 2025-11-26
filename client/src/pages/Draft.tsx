import { useAuth } from "@/_core/hooks/useAuth";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Loader2, ArrowLeft, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { getLoginUrl } from "@/const";
import DraftBoard, { type AssetType } from "@/components/DraftBoard";
import { MyRoster } from "@/components/MyRoster";
import { DraftClock } from "@/components/DraftClock";
import { SleeperDraftHeader } from "@/components/SleeperDraftHeader";
import { SleeperDraftGrid } from "@/components/SleeperDraftGrid";
import { SleeperPlayerPanel } from "@/components/SleeperPlayerPanel";
import { SleeperDraftSettings } from "@/components/SleeperDraftSettings";
import { ChallengeDraftBoard } from "@/components/ChallengeDraftBoard";
import { toast } from "sonner";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Draft() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [recentPicks, setRecentPicks] = useState<Array<{
    teamName: string;
    assetName: string;
    assetType: string;
    pickNumber: number;
  }>>([]);
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null);
  const [timeLimit, setTimeLimit] = useState<number>(90);
  const [isPaused, setIsPaused] = useState(false);
  const [currentTurnTeamId, setCurrentTurnTeamId] = useState<number | null>(null);
  const [currentTurnTeamName, setCurrentTurnTeamName] = useState<string>("");
  const [currentPickNumber, setCurrentPickNumber] = useState<number>(1);
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [showDraftCompleteDialog, setShowDraftCompleteDialog] = useState(false);
  const [autoDraftEnabled, setAutoDraftEnabled] = useState(false);
  const autoDraftInProgressRef = useRef(false);

  // Sleeper-style state
  const [showSettings, setShowSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Queue state for draft queue feature
  type QueuedPlayer = {
    assetType: AssetType;
    assetId: number;
    name: string;
    points: number;
  };
  const [draftQueue, setDraftQueue] = useState<QueuedPlayer[]>([]);
  const [autoPickFromQueue, setAutoPickFromQueue] = useState(false);

  // Optimistic tracking of my drafted assets
  const [myDraftedAssets, setMyDraftedAssets] = useState<Array<{
    assetType: AssetType;
    assetId: number;
    name: string;
    imageUrl?: string | null;
  }>>([]);

  type DraftedAssetMap = Record<AssetType, Set<number>>;
  const createDraftedAssetState = (): DraftedAssetMap => ({
    manufacturer: new Set<number>(),
    cannabis_strain: new Set<number>(),
    product: new Set<number>(),
    pharmacy: new Set<number>(),
    brand: new Set<number>(),
  });

  const [draftedAssets, setDraftedAssets] = useState<DraftedAssetMap>(() =>
    createDraftedAssetState()
  );

  const markAssetDrafted = useCallback((assetType: AssetType, assetId: number) => {
    setDraftedAssets((prev) => {
      const next: DraftedAssetMap = {
        manufacturer: new Set(prev.manufacturer),
        cannabis_strain: new Set(prev.cannabis_strain),
        product: new Set(prev.product),
        pharmacy: new Set(prev.pharmacy),
        brand: new Set(prev.brand),
      };
      next[assetType].add(assetId);
      return next;
    });
  }, []);

  const leagueId = parseInt(id!);

  useEffect(() => {
    setDraftedAssets(createDraftedAssetState());
    setMyDraftedAssets([]); // Reset local state on league change
  }, [leagueId]);

  const { data: league, isLoading: leagueLoading } = trpc.league.getById.useQuery(
    { leagueId },
    { enabled: !!id && isAuthenticated }
  );

  const { data: myTeam, isLoading: teamLoading } = trpc.league.getMyTeam.useQuery(
    { leagueId },
    { enabled: !!id && isAuthenticated }
  );

  // Fetch auto-pick status for our team
  const { data: autoPickStatus } = trpc.draft.getAutoPickStatus.useQuery(
    { teamId: myTeam?.id ?? 0 },
    { enabled: !!myTeam?.id && isAuthenticated }
  );

  // Sync server auto-pick status with local state on load
  useEffect(() => {
    if (autoPickStatus?.autoPickEnabled !== undefined) {
      setAutoDraftEnabled(autoPickStatus.autoPickEnabled);
    }
  }, [autoPickStatus?.autoPickEnabled]);

  const { data: roster = [], isLoading: rosterLoading } = trpc.roster.getMyRoster.useQuery(
    { leagueId },
    { enabled: !!id && isAuthenticated, staleTime: 0 }
  );

  // Determine if this is a season league (for Sleeper-style) or challenge (existing style)
  const isSeasonLeague = league?.leagueType === "season";
  const isChallengeLeague = league?.leagueType === "challenge";

  // Fetch available players (enabled for challenge leagues, auto-draft, or season leagues)
  const { data: availableManufacturers = [] } = trpc.draft.getAvailableManufacturers.useQuery(
    { leagueId, limit: 200, search: searchQuery || undefined },
    { enabled: !!id && isAuthenticated && (autoDraftEnabled || isSeasonLeague || isChallengeLeague) }
  );

  const { data: availableCannabisStrains = [] } = trpc.draft.getAvailableCannabisStrains.useQuery(
    { leagueId, limit: 200, search: searchQuery || undefined },
    { enabled: !!id && isAuthenticated && (autoDraftEnabled || isSeasonLeague || isChallengeLeague) }
  );

  const { data: availableProducts = [] } = trpc.draft.getAvailableProducts.useQuery(
    { leagueId, limit: 200, search: searchQuery || undefined },
    { enabled: !!id && isAuthenticated && (autoDraftEnabled || isSeasonLeague || isChallengeLeague) }
  );

  const { data: availablePharmacies = [] } = trpc.draft.getAvailablePharmacies.useQuery(
    { leagueId, limit: 200, search: searchQuery || undefined },
    { enabled: !!id && isAuthenticated && (autoDraftEnabled || isSeasonLeague || isChallengeLeague) }
  );

  const { data: availableBrands = [] } = trpc.draft.getAvailableBrands.useQuery(
    { leagueId, limit: 200, search: searchQuery || undefined },
    { enabled: !!id && isAuthenticated && (autoDraftEnabled || isSeasonLeague || isChallengeLeague) }
  );

  // Fetch all draft picks for the grid (season leagues only)
  const currentYear = league?.seasonYear || new Date().getFullYear();
  const currentWeek = league?.currentWeek || 1;

  const { data: allDraftPicks = [] } = trpc.draft.getAllDraftPicks.useQuery(
    { leagueId, year: currentYear, week: currentWeek, includeStats: false },
    { enabled: !!id && isAuthenticated && isSeasonLeague }
  );

  // For challenge leagues: derive opponent team from league teams
  const opponentTeam = useMemo(() => {
    if (!isChallengeLeague || !league?.teams || !myTeam) return null;
    const teams = league.teams as Array<{ id: number; name: string; userId?: number; userName?: string | null }>;
    return teams.find(t => t.id !== myTeam.id) || null;
  }, [isChallengeLeague, league?.teams, myTeam]);

  // Fetch opponent roster for challenge leagues
  const { data: opponentRoster = [] } = trpc.roster.getTeamRoster.useQuery(
    { teamId: opponentTeam?.id ?? 0 },
    { enabled: !!opponentTeam?.id && isChallengeLeague }
  );

  // Track opponent drafted assets (derived from WebSocket updates)
  const [opponentDraftedAssets, setOpponentDraftedAssets] = useState<Array<{
    assetType: AssetType;
    assetId: number;
    name: string;
    imageUrl?: string | null;
  }>>([]);

  // Merge opponent roster
  const mergedOpponentRoster = useMemo(() => {
    const serverRosterIds = new Set(opponentRoster.map((r: any) => `${r.assetType}-${r.assetId}`));
    const newOpponentAssets = opponentDraftedAssets.filter(
      asset => !serverRosterIds.has(`${asset.assetType}-${asset.assetId}`)
    );

    return [
      ...opponentRoster.map((r: any) => ({
        assetType: r.assetType as AssetType,
        assetId: r.assetId,
        name: r.name || "Unknown",
        imageUrl: r.imageUrl,
      })),
      ...newOpponentAssets
    ];
  }, [opponentRoster, opponentDraftedAssets]);

  // Merge server roster with local optimistic updates
  const mergedRoster = useMemo(() => {
    const serverRosterIds = new Set(roster.map((r: any) => `${r.assetType}-${r.assetId}`));
    const newLocalAssets = myDraftedAssets.filter(
      local => !serverRosterIds.has(`${local.assetType}-${local.assetId}`)
    );

    return [
      ...roster.map((r: any) => ({
        assetType: r.assetType as AssetType,
        assetId: r.assetId,
        name: r.name || "Unknown",
        imageUrl: r.imageUrl,
      })),
      ...newLocalAssets
    ];
  }, [roster, myDraftedAssets]);

  // Check if it's the user's turn (computed early for hooks)
  const isMyTurn = useMemo(() => {
    return currentTurnTeamId !== null && myTeam?.id !== undefined && currentTurnTeamId === myTeam.id;
  }, [currentTurnTeamId, myTeam?.id]);

  const { data: draftStatus } = trpc.draft.getDraftStatus.useQuery(
    { leagueId },
    { enabled: !!id && isAuthenticated, refetchInterval: 5000 }
  );

  // Initialize current turn from draft status
  useEffect(() => {
    if (draftStatus?.nextPick) {
      setCurrentTurnTeamId(draftStatus.nextPick.teamId);
      setCurrentTurnTeamName(draftStatus.nextPick.teamName);
      setCurrentPickNumber(draftStatus.nextPick.pickNumber);
      setCurrentRound(draftStatus.nextPick.round);
    }
  }, [draftStatus]);

  // WebSocket connection for real-time draft updates
  const { isConnected, joinDraft, leaveDraft } = useWebSocket({
    userId: user?.id || 0,
    leagueId,
    teamId: myTeam?.id,
    autoConnect: isAuthenticated && !!user,
    onMessage: (message) => {
      if (import.meta.env.MODE !== "production") {
        console.log('[DraftTiming] ws_message', {
          type: message.type,
          time: Date.now(),
          leagueId,
        });
      }

      if (message.type === 'player_picked') {
        const assetType = message.assetType as AssetType;
        markAssetDrafted(assetType, message.assetId);

        // Add to recent picks
        setRecentPicks(prev => [
          {
            teamName: message.teamName,
            assetName: message.assetName,
            assetType: message.assetType,
            pickNumber: message.pickNumber,
          },
          ...prev.slice(0, 9), // Keep last 10 picks
        ]);

        // Show toast notification
        toast.success(`${message.teamName} drafted ${message.assetName}`);

        if (message.teamId === myTeam?.id) {
          // Optimistically add to my roster
          setMyDraftedAssets(prev => [
            ...prev,
            {
              assetType,
              assetId: message.assetId,
              name: message.assetName,
              imageUrl: null // We might not have the image URL immediately, but that's okay
            }
          ]);
          refetchRoster();
        } else if (opponentTeam && message.teamId === opponentTeam.id) {
          // Track opponent's pick for challenge leagues
          setOpponentDraftedAssets(prev => [
            ...prev,
            {
              assetType,
              assetId: message.assetId,
              name: message.assetName,
              imageUrl: null
            }
          ]);
        }
      } else if (message.type === 'next_pick') {
        setCurrentTurnTeamId(message.teamId);
        setCurrentTurnTeamName(message.teamName);
        setCurrentPickNumber(message.pickNumber);
        setCurrentRound(message.round);
        toast.info(`It's ${message.teamName}'s turn to pick!`);
      } else if (message.type === 'draft_complete') {
        setTimerSeconds(null);
        // For challenge leagues: Show countdown toast and redirect all players to live matchup
        if (league?.leagueType === 'challenge') {
          toast.success('🎉 Draft complete! Starting live matchup...', { duration: 3000 });
          // Redirect after a short delay to show the toast
          setTimeout(() => {
            setLocation(`/challenge/${leagueId}`);
          }, 1500);
        } else {
          // For season leagues: Show completion dialog
          toast.success('🎉 Draft complete! All roster slots filled.');
          setShowDraftCompleteDialog(true);
        }
      } else if (message.type === 'timer_start') {
        setTimerSeconds(message.timeLimit);
        setTimeLimit(message.timeLimit);
        setIsPaused(false);
        setCurrentPickNumber(message.pickNumber);
      } else if (message.type === 'timer_tick') {
        setTimerSeconds(message.remaining);
      } else if (message.type === 'timer_stop') {
        setTimerSeconds(null);
        setIsPaused(false);
      } else if (message.type === 'timer_pause') {
        setIsPaused(true);
      } else if (message.type === 'timer_resume') {
        setIsPaused(false);
        setTimerSeconds(message.remaining);
      } else if (message.type === 'auto_pick') {
        toast.warning(`Auto-picked ${message.assetName} for ${message.teamName}`);
        if (message.teamId === myTeam?.id) {
          refetchRoster();
        }
      } else if (message.type === 'auto_pick_enabled') {
        // Auto-pick has been enabled for a team (due to timer expiration)
        if (message.teamId === myTeam?.id) {
          // It's our team - enable auto-draft locally and show warning
          setAutoDraftEnabled(true);
          toast.warning(
            "⚠️ Auto-Pick aktiviert! Dein Timer ist abgelaufen. Auto-Pick bleibt für den Rest des Drafts aktiv.",
            { duration: 8000 }
          );
        } else {
          // Another team has auto-pick enabled
          toast.info(`${message.teamName} hat jetzt Auto-Pick aktiviert (Timer abgelaufen)`);
        }
      } else if (message.type === 'auto_pick_disabled') {
        // Auto-pick has been manually disabled for a team
        if (message.teamId === myTeam?.id) {
          setAutoDraftEnabled(false);
          toast.success("Auto-Pick deaktiviert.");
        }
      }
    },
    onConnect: () => {
      console.log('[Draft] WebSocket connected');
      toast.success('Connected to live draft');
    },
    onDisconnect: () => {
      console.log('[Draft] WebSocket disconnected');
      toast.error('Disconnected from live draft');
    },
  });

  // Join draft room when component mounts
  useEffect(() => {
    if (isConnected && leagueId) {
      console.log('[Draft] Joining draft room for league', leagueId);
      joinDraft(leagueId);
    }

    return () => {
      if (isConnected) {
        console.log('[Draft] Leaving draft room');
        leaveDraft();
      }
    };
  }, [isConnected, leagueId]); // Remove joinDraft and leaveDraft from dependencies

  const checkDraftCompletionMutation = trpc.draft.checkDraftCompletion.useMutation({
    onSuccess: (data) => {
      if (data.completed) {
        toast.success("Draft abgeschlossen!");
        setShowDraftCompleteDialog(true);
      }
    },
  });

  // Mutation to persist auto-pick status to server
  const setAutoPickStatusMutation = trpc.draft.setAutoPickStatus.useMutation({
    onError: (error) => {
      console.error("Failed to update auto-pick status:", error);
      toast.error("Fehler beim Ändern des Auto-Pick Status");
    },
  });

  // Handler for auto-draft toggle that persists to server
  const handleAutoDraftChange = useCallback((enabled: boolean) => {
    setAutoDraftEnabled(enabled);
    if (myTeam?.id) {
      setAutoPickStatusMutation.mutate({
        teamId: myTeam.id,
        enabled,
      });
    }
  }, [myTeam?.id, setAutoPickStatusMutation]);

  const utils = trpc.useUtils();

  const invalidateAvailableByType = useCallback((assetType: AssetType) => {
    switch (assetType) {
      case "manufacturer":
        utils.draft.getAvailableManufacturers.invalidate();
        break;
      case "cannabis_strain":
        utils.draft.getAvailableCannabisStrains.invalidate();
        break;
      case "product":
        utils.draft.getAvailableProducts.invalidate();
        break;
      case "pharmacy":
        utils.draft.getAvailablePharmacies.invalidate();
        break;
      case "brand":
        utils.draft.getAvailableBrands.invalidate();
        break;
    }
  }, [utils]);

  const makeDraftPickMutation = trpc.draft.makeDraftPick.useMutation({
    onSuccess: (_data, variables) => {
      toast.success("Draft Pick erfolgreich!");
      invalidateAvailableByType(variables.assetType as AssetType);
      // Refetch all draft picks for grid update
      if (isSeasonLeague) {
        utils.draft.getAllDraftPicks.invalidate();
      }
    },
    onError: (error) => {
      toast.error(`Draft Pick fehlgeschlagen: ${error.message}`);
      // If error is "Roster is full", check if draft should be complete
      if (error.message.includes("Roster is full") || error.message.includes("Draft is complete")) {
        checkDraftCompletionMutation.mutate({ leagueId });
      }
    },
  });

  // Auto-draft logic: when enabled and it's my turn, automatically pick best available
  // Also handles auto-pick from queue when that setting is enabled
  useEffect(() => {
    // Check if we should auto-draft (either via autoDraftEnabled or autoPickFromQueue)
    const shouldAutoDraft = autoDraftEnabled || autoPickFromQueue;
    
    if (!shouldAutoDraft || !isMyTurn || !myTeam || autoDraftInProgressRef.current) {
      return;
    }

    // Calculate roster counts from merged roster
    const localRosterCounts = {
      manufacturer: mergedRoster.filter((r) => r.assetType === "manufacturer").length,
      cannabis_strain: mergedRoster.filter((r) => r.assetType === "cannabis_strain").length,
      product: mergedRoster.filter((r) => r.assetType === "product").length,
      pharmacy: mergedRoster.filter((r) => r.assetType === "pharmacy").length,
      brand: mergedRoster.filter((r) => r.assetType === "brand").length,
    };

    // Position limits (max 2 of each, 1 for brand)
    const positionLimits: Record<AssetType, number> = {
      manufacturer: 2,
      cannabis_strain: 2,
      product: 2,
      pharmacy: 2,
      brand: 1,
    };

    // Find positions that still need to be filled
    const neededPositions: AssetType[] = [];
    if (localRosterCounts.manufacturer < positionLimits.manufacturer) neededPositions.push("manufacturer");
    if (localRosterCounts.cannabis_strain < positionLimits.cannabis_strain) neededPositions.push("cannabis_strain");
    if (localRosterCounts.product < positionLimits.product) neededPositions.push("product");
    if (localRosterCounts.pharmacy < positionLimits.pharmacy) neededPositions.push("pharmacy");
    if (localRosterCounts.brand < positionLimits.brand) neededPositions.push("brand");

    if (neededPositions.length === 0) {
      console.log('[AutoDraft] All positions filled');
      return;
    }

    // Helper to filter out already drafted assets
    const filterUndrafted = <T extends { id: number }>(assets: T[], assetType: AssetType): T[] => {
      const draftedSet = draftedAssets[assetType];
      if (!draftedSet || draftedSet.size === 0) return assets;
      return assets.filter((asset) => !draftedSet.has(asset.id));
    };

    // Check if position is available for a given asset type
    const isPositionAvailable = (assetType: AssetType): boolean => {
      return localRosterCounts[assetType] < positionLimits[assetType];
    };

    type PlayerCandidate = { assetType: AssetType; id: number; name: string; points: number };
    let bestPick: PlayerCandidate | null = null;

    // PRIORITY 1: If autoPickFromQueue is enabled, try to pick from queue first
    if (autoPickFromQueue && draftQueue.length > 0) {
      // Find first available player in queue that hasn't been drafted and has an open position
      for (const queuedPlayer of draftQueue) {
        const isDrafted = draftedAssets[queuedPlayer.assetType]?.has(queuedPlayer.assetId);
        const hasOpenPosition = isPositionAvailable(queuedPlayer.assetType);
        
        if (!isDrafted && hasOpenPosition) {
          bestPick = {
            assetType: queuedPlayer.assetType,
            id: queuedPlayer.assetId,
            name: queuedPlayer.name,
            points: queuedPlayer.points,
          };
          console.log('[AutoDraft] Picking from queue:', bestPick);
          // Remove from queue after picking
          setDraftQueue(prev => prev.filter(p => 
            !(p.assetType === queuedPlayer.assetType && p.assetId === queuedPlayer.assetId)
          ));
          break;
        }
      }
    }

    // PRIORITY 2: If no queue pick available and autoDraftEnabled, use best available algorithm
    if (!bestPick && autoDraftEnabled) {
      const candidates: PlayerCandidate[] = [];

      for (const position of neededPositions) {
        let bestPlayer: PlayerCandidate | null = null;

        if (position === "manufacturer") {
          const undrafted = filterUndrafted(availableManufacturers, "manufacturer");
          const sorted = [...undrafted].sort((a, b) => (b.yesterdayPoints ?? 0) - (a.yesterdayPoints ?? 0));
          if (sorted.length > 0) {
            bestPlayer = { assetType: "manufacturer", id: sorted[0].id, name: sorted[0].name, points: sorted[0].yesterdayPoints ?? 0 };
          }
        } else if (position === "cannabis_strain") {
          const undrafted = filterUndrafted(availableCannabisStrains, "cannabis_strain");
          const sorted = [...undrafted].sort((a, b) => (b.yesterdayPoints ?? 0) - (a.yesterdayPoints ?? 0));
          if (sorted.length > 0) {
            bestPlayer = { assetType: "cannabis_strain", id: sorted[0].id, name: sorted[0].name, points: sorted[0].yesterdayPoints ?? 0 };
          }
        } else if (position === "product") {
          const undrafted = filterUndrafted(availableProducts, "product");
          const sorted = [...undrafted].sort((a, b) => (b.yesterdayPoints ?? 0) - (a.yesterdayPoints ?? 0));
          if (sorted.length > 0) {
            bestPlayer = { assetType: "product", id: sorted[0].id, name: sorted[0].name, points: sorted[0].yesterdayPoints ?? 0 };
          }
        } else if (position === "pharmacy") {
          const undrafted = filterUndrafted(availablePharmacies, "pharmacy");
          const sorted = [...undrafted].sort((a, b) => (b.yesterdayPoints ?? 0) - (a.yesterdayPoints ?? 0));
          if (sorted.length > 0) {
            bestPlayer = { assetType: "pharmacy", id: sorted[0].id, name: sorted[0].name, points: sorted[0].yesterdayPoints ?? 0 };
          }
        } else if (position === "brand") {
          const undrafted = filterUndrafted(availableBrands, "brand");
          const sorted = [...undrafted].sort((a, b) => (b.yesterdayPoints ?? 0) - (a.yesterdayPoints ?? 0));
          if (sorted.length > 0) {
            bestPlayer = { assetType: "brand", id: sorted[0].id, name: sorted[0].name, points: sorted[0].yesterdayPoints ?? 0 };
          }
        }

        if (bestPlayer) {
          candidates.push(bestPlayer);
        }
      }

      if (candidates.length > 0) {
        // Sort candidates by points (highest first) and pick the best one
        candidates.sort((a, b) => b.points - a.points);
        bestPick = candidates[0];
        console.log('[AutoDraft] Best available pick:', bestPick);
      }
    }

    if (!bestPick) {
      console.log('[AutoDraft] No available players found');
      return;
    }

    console.log('[AutoDraft] Auto-picking:', bestPick);
    
    // Prevent multiple picks
    autoDraftInProgressRef.current = true;

    // Small delay to ensure UI updates and prevent race conditions
    const timerId = setTimeout(async () => {
      try {
        toast.info(`⚡ Auto-Draft: ${bestPick.name} wird gedraftet...`);
        await makeDraftPickMutation.mutateAsync({
          leagueId,
          teamId: myTeam.id,
          assetType: bestPick.assetType,
          assetId: bestPick.id,
        });
        markAssetDrafted(bestPick.assetType, bestPick.id);
        toast.success(`⚡ Auto-Draft: ${bestPick.name} erfolgreich gedraftet!`);
      } catch (error) {
        console.error('[AutoDraft] Error:', error);
        toast.error('Auto-Draft fehlgeschlagen');
      } finally {
        autoDraftInProgressRef.current = false;
      }
    }, 500);

    return () => {
      clearTimeout(timerId);
      // Reset the flag when effect cleans up, so next auto-draft can proceed
      autoDraftInProgressRef.current = false;
    };
  }, [
    autoDraftEnabled,
    autoPickFromQueue,
    draftQueue,
    isMyTurn,
    myTeam,
    mergedRoster,
    draftedAssets,
    availableManufacturers,
    availableCannabisStrains,
    availableProducts,
    availablePharmacies,
    availableBrands,
    leagueId,
    makeDraftPickMutation,
    markAssetDrafted,
  ]);

  // Calculate roster counts for player panel (must be before early returns to maintain hook order)
  const rosterCounts = useMemo(() => ({
    manufacturer: mergedRoster.filter((r) => r.assetType === "manufacturer").length,
    cannabis_strain: mergedRoster.filter((r) => r.assetType === "cannabis_strain").length,
    product: mergedRoster.filter((r) => r.assetType === "product").length,
    pharmacy: mergedRoster.filter((r) => r.assetType === "pharmacy").length,
    brand: mergedRoster.filter((r) => r.assetType === "brand").length,
  }), [mergedRoster]);

  // Build teams array for the grid from league teams (must be before early returns to maintain hook order)
  const teamsForGrid = useMemo(() => {
    if (!league?.teams || !Array.isArray(league.teams)) return [];
    return league.teams.map((t: any) => ({
      id: t.id,
      name: t.name,
      userName: t.userName || null,
      userAvatarUrl: t.userAvatarUrl || null,
    }));
  }, [league?.teams]);

  // Redirect to login if not authenticated
  if (!authLoading && !isAuthenticated) {
    const loginUrl = getLoginUrl(); if (loginUrl) window.location.href = loginUrl; else window.location.href = "/login";
    return null;
  }

  if (authLoading || leagueLoading || teamLoading || rosterLoading) {
    return (
      <div className="min-h-screen bg-[#1a1d29] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#00d4aa]" />
      </div>
    );
  }

  if (!league || !myTeam) {
    return (
      <div className="min-h-screen bg-[#1a1d29] flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-white">Liga oder Team nicht gefunden</h2>
          <Button onClick={() => setLocation("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Zurück zum Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Use current pick from draft status (WebSocket state)
  const currentPick = currentPickNumber || 1;

  const handleDraftPick = async (assetType: AssetType, assetId: number) => {
    try {
      const clickTime = Date.now();
      if (import.meta.env.MODE !== "production") {
        console.log("[DraftTiming] draft_click", {
          time: clickTime,
          leagueId,
          teamId: myTeam.id,
          assetType,
          assetId,
        });
      }

      await makeDraftPickMutation.mutateAsync({
        leagueId,
        teamId: myTeam.id,
        assetType,
        assetId,
      });
      markAssetDrafted(assetType, assetId);

      if (import.meta.env.MODE !== "production") {
        console.log("[DraftTiming] draft_mutation_success", {
          leagueId,
          teamId: myTeam.id,
          assetType,
          assetId,
          durationMs: Date.now() - clickTime,
        });
      }
    } catch (error) {
      // Error is handled by mutation callbacks
      console.error("Draft pick error:", error);
      if (import.meta.env.MODE !== "production") {
        console.log("[DraftTiming] draft_mutation_error", {
          leagueId,
          teamId: myTeam.id,
          assetType,
          assetId,
          error,
        });
      }
    }
  };

  // Total rounds = 10 picks per team (2+2+2+2+1+1 = 10 roster slots)
  const totalRounds = 10;

  // ============================================
  // SEASON LEAGUE - SLEEPER STYLE DRAFT
  // ============================================
  if (isSeasonLeague) {
    return (
      <div className="h-screen flex flex-col bg-[#1a1d29]">
        {/* Draft Complete Dialog */}
        <Dialog open={showDraftCompleteDialog} onOpenChange={setShowDraftCompleteDialog}>
          <DialogContent className="sm:max-w-md bg-[#1a1d29] border-white/10 text-white">
            <DialogHeader>
              <DialogTitle className="text-2xl">🎉 Draft Complete!</DialogTitle>
              <DialogDescription className="text-base pt-2 text-white/70">
                All roster slots filled (10/10). Go to your Lineup Editor to review and adjust your starting lineup.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                variant="default"
                onClick={() => {
                  setShowDraftCompleteDialog(false);
                  setLocation(`/league/${leagueId}/lineup`);
                }}
                className="w-full sm:w-auto bg-[#00d4aa] text-black hover:bg-[#00e4b8]"
              >
                Go to Lineup Editor
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Settings Modal */}
        <SleeperDraftSettings
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          autoDraftEnabled={autoDraftEnabled}
          onAutoDraftChange={handleAutoDraftChange}
        />

        {/* Header */}
        <SleeperDraftHeader
          isYourTurn={isMyTurn}
          currentTeamName={currentTurnTeamName || "Waiting..."}
          timerSeconds={timerSeconds}
          onClose={() => window.history.back()}
          onSettingsClick={() => setShowSettings(true)}
          autoDraftEnabled={autoDraftEnabled}
        />

        {/* Draft Grid */}
        <SleeperDraftGrid
          teams={teamsForGrid}
          picks={allDraftPicks}
          currentPickNumber={currentPickNumber}
          currentRound={currentRound}
          currentTeamId={currentTurnTeamId}
          totalRounds={totalRounds}
          myTeamId={myTeam.id}
        />

        {/* Player Panel */}
        <SleeperPlayerPanel
          leagueId={leagueId}
          rosterCounts={rosterCounts}
          manufacturers={availableManufacturers}
          cannabisStrains={availableCannabisStrains}
          products={availableProducts}
          pharmacies={availablePharmacies}
          brands={availableBrands}
          onDraftPick={handleDraftPick}
          onSearchChange={setSearchQuery}
          searchQuery={searchQuery}
          isMyTurn={isMyTurn}
          isLoading={false}
          draftedAssets={draftedAssets}
          myRoster={mergedRoster}
          queue={draftQueue}
          onAddToQueue={(player) => {
            setDraftQueue(prev => [...prev, player]);
            toast.success(`${player.name} added to queue`);
          }}
          onRemoveFromQueue={(assetType, assetId) => {
            setDraftQueue(prev => prev.filter(p => !(p.assetType === assetType && p.assetId === assetId)));
          }}
          onReorderQueue={setDraftQueue}
          autoPickFromQueue={autoPickFromQueue}
          onAutoPickFromQueueChange={setAutoPickFromQueue}
        />
      </div>
    );
  }

  // ============================================
  // CHALLENGE LEAGUE - FIELD DRAFT STYLE
  // ============================================
  return (
    <div className="h-screen flex flex-col bg-[#0f0f16]">
      {/* Draft Complete Dialog */}
      <Dialog open={showDraftCompleteDialog} onOpenChange={setShowDraftCompleteDialog}>
        <DialogContent className="sm:max-w-md bg-[#1a1d29] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl">🎉 Draft Complete!</DialogTitle>
            <DialogDescription className="text-base pt-2 text-white/70">
              All roster slots filled (9/9). Your challenge lineup is ready!
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="default"
              onClick={() => {
                setShowDraftCompleteDialog(false);
                setLocation(`/challenge/${leagueId}`);
              }}
              className="w-full sm:w-auto bg-[#cfff4d] text-black hover:bg-[#cfff4d]/90"
            >
              View Challenge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Header - Simplified, controls moved to ChallengeDraftBoard */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#1a0a2e] via-[#0f0f16] to-[#1a0a2e] border-b border-white/10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.history.back()}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white">{league.name}</h1>
            <p className="text-xs text-white/50">{myTeam.name}</p>
          </div>
        </div>
      </div>

      {/* Challenge Draft Board with Fields */}
      <ChallengeDraftBoard
        leagueId={leagueId}
        myTeam={{
          id: myTeam.id,
          name: myTeam.name,
          userName: user?.name || null,
        }}
        opponentTeam={opponentTeam ? {
          id: opponentTeam.id,
          name: opponentTeam.name,
          userName: opponentTeam.userName || null,
        } : null}
        myRoster={mergedRoster}
        opponentRoster={mergedOpponentRoster}
        currentPickNumber={currentPickNumber}
        currentTurnTeamId={currentTurnTeamId}
        isMyTurn={isMyTurn}
        manufacturers={availableManufacturers}
        cannabisStrains={availableCannabisStrains}
        products={availableProducts}
        pharmacies={availablePharmacies}
        brands={availableBrands}
        onDraftPick={handleDraftPick}
        onSearchChange={setSearchQuery}
        searchQuery={searchQuery}
        isLoading={false}
        draftedAssets={draftedAssets}
        autoDraftEnabled={autoDraftEnabled}
        onAutoDraftChange={handleAutoDraftChange}
        timerSeconds={timerSeconds}
      />
    </div>
  );
}
