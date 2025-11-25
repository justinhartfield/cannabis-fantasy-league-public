import { useAuth } from "@/_core/hooks/useAuth";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import DraftBoard, { type AssetType } from "@/components/DraftBoard";
// import { DraftPicksGrid } from "@/components/DraftPicksGrid";
import { MyRoster } from "@/components/MyRoster";
import { DraftClock } from "@/components/DraftClock";
import { toast } from "sonner";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useEffect, useState, useMemo, useCallback } from "react";
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

  const { data: roster = [], isLoading: rosterLoading, refetch: refetchRoster } = trpc.roster.getMyRoster.useQuery(
    { leagueId },
    { enabled: !!id && isAuthenticated }
  );

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

  const { data: draftStatus } = trpc.draft.getDraftStatus.useQuery(
    { leagueId },
    { enabled: !!id && isAuthenticated, refetchInterval: 5000 }
  );

  const currentYear = league?.seasonYear || new Date().getFullYear();
  const currentWeek = league?.currentWeek || 1;

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
        }
        // invalidateAvailableByType(assetType);
      } else if (message.type === 'next_pick') {
        setCurrentTurnTeamId(message.teamId);
        setCurrentTurnTeamName(message.teamName);
        setCurrentPickNumber(message.pickNumber);
        setCurrentRound(message.round);
        toast.info(`It's ${message.teamName}'s turn to pick!`);
      } else if (message.type === 'draft_complete') {
        toast.success('🎉 Draft complete! All roster slots filled.');
        setTimerSeconds(null);
        // Show the draft completion dialog for season leagues, redirect for challenges
        if (league?.leagueType === 'challenge') {
          setTimeout(() => {
            setLocation(`/challenge/${leagueId}`);
          }, 2000);
        } else {
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
        // invalidateAvailableByType(message.assetType as AssetType);
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
    },
    onError: (error) => {
      toast.error(`Draft Pick fehlgeschlagen: ${error.message}`);
      // If error is "Roster is full", check if draft should be complete
      if (error.message.includes("Roster is full") || error.message.includes("Draft is complete")) {
        checkDraftCompletionMutation.mutate({ leagueId });
      }
    },
  });

  // Redirect to login if not authenticated
  if (!authLoading && !isAuthenticated) {
    const loginUrl = getLoginUrl(); if (loginUrl) window.location.href = loginUrl; else window.location.href = "/login";
    return null;
  }

  if (authLoading || leagueLoading || teamLoading || rosterLoading) {
    return (
      <div className="min-h-screen bg-weed-cream flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!league || !myTeam) {
    return (
      <div className="min-h-screen bg-weed-cream flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-foreground">Liga oder Team nicht gefunden</h2>
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

  // Check if it's the user's turn
  const isMyTurn = currentTurnTeamId === myTeam.id;

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fdf6e9] via-[#f8eedb] to-[#f4e4c9] relative">
      {/* Draft Complete Dialog */}
      <Dialog open={showDraftCompleteDialog} onOpenChange={setShowDraftCompleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl">🎉 Draft Complete!</DialogTitle>
            <DialogDescription className="text-base pt-2">
              All roster slots filled (10/10). Go to your Lineup Editor to review and adjust your starting lineup.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="default"
              onClick={() => {
                setShowDraftCompleteDialog(false);
                setLocation(`/challenge/${leagueId}/lineup`);
              }}
              className="w-full sm:w-auto"
            >
              Go to Lineup Editor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="relative z-20">
        <div className="w-full max-w-[1600px] mx-auto px-4 md:px-6 lg:px-8 py-8">
          <div className="rounded-[36px] bg-white/85 backdrop-blur shadow-[0_20px_60px_rgba(20,15,45,0.12)] px-6 py-6 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4 w-full">
              <button
                onClick={() => window.history.back()}
                className="inline-flex items-center gap-2 rounded-full bg-[#f0e8d5] px-4 py-2 text-sm font-semibold text-[#3c2c53] transition hover:bg-[#e7ddc5]"
              >
                <ArrowLeft className="w-4 h-4" />
                Zurück
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-xs uppercase tracking-[0.4em] text-[#c38eff]">Live Draft</p>
                <h1 className="text-2xl md:text-3xl font-bold text-[#2c1941] leading-tight">
                  {league.name}
                </h1>
                <p className="text-sm text-[#6c5b7b]">
                  Draft • {myTeam.name}
                </p>
              </div>
            </div>
            {/* Desktop Timer Display */}
            <div className="hidden lg:flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end w-full">
              {timerSeconds !== null && !isNaN(timerSeconds) && timerSeconds >= 0 && (
                <div className="rounded-[18px] bg-[#2f1546] text-white px-4 py-3 shadow-inner flex items-center gap-2 text-sm font-semibold">
                  ⏱️ {Math.floor(timerSeconds / 60)}:{String(timerSeconds % 60).padStart(2, "0")}
                </div>
              )}
              {currentTurnTeamName && (
                <div
                  className={`rounded-[18px] px-5 py-3 text-center text-sm font-semibold ${isMyTurn
                    ? "bg-gradient-to-r from-[#cfff4d] to-[#8dff8c] text-black shadow-[0_10px_30px_rgba(207,255,77,0.5)]"
                    : "bg-[#f1d9ff] text-[#8d4bff]"
                    }`}
                >
                  {isMyTurn ? "🎯 Dein Zug!" : `${currentTurnTeamName} ist dran`}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Mobile Draft Clock */}
      <div className="lg:hidden fixed top-4 right-4 z-50 pointer-events-none">
        {timerSeconds !== null && currentTurnTeamName && (
          <div className="pointer-events-auto shadow-2xl">
            <DraftClock
              pickNumber={currentPickNumber}
              round={currentRound}
              teamName={currentTurnTeamName}
              isYourTurn={isMyTurn}
              timeLimit={timeLimit}
              remainingTime={timerSeconds}
              isPaused={isPaused}
              compact={true}
              onTimerExpired={() => {
                toast.warning('Time expired! Auto-pick will be triggered.');
              }}
            />
          </div>
        )}
      </div>

      {/* Draft Board */}
      <div className="w-full max-w-[1600px] mx-auto px-4 md:px-6 lg:px-8 pb-12 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-[2.4fr_1fr] gap-6">

          {/* Mobile: Wähle deine Picks first */}
          <div className="lg:hidden order-1">
            <DraftBoard
              leagueId={leagueId}
              currentPick={currentPick}
              isMyTurn={isMyTurn}
              myRoster={mergedRoster}
              draftedAssets={draftedAssets}
              onDraftPick={handleDraftPick}
            />
          </div>

          {/* Mobile: My Roster (Player's Team) second */}
          <div className="lg:hidden order-2">
            <MyRoster
              roster={mergedRoster}
              teamName={myTeam.name || "My Team"}
            />
          </div>

          {/* Mobile: Recent Picks third */}
          <div className="lg:hidden order-3">
            <div className="bg-weed-purple border-2 border-weed-green shadow-xl rounded-lg p-4">
              <h3 className="headline-secondary text-lg text-white uppercase mb-4">
                Draft Board
              </h3>
              {recentPicks.length === 0 ? (
                <p className="text-sm text-white/70 text-center py-8">
                  Noch keine Picks
                </p>
              ) : (
                <div className="space-y-2">
                  {recentPicks.map((pick, index) => (
                    <div
                      key={`${pick.pickNumber}-${index}`}
                      className="p-3 bg-white/10 rounded-lg border-2 border-white/20"
                    >
                      <div className="flex items-start justify-between mb-1">
                        <span className="text-xs font-medium text-white/70">
                          Pick #{pick.pickNumber}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-white mb-1">
                        {pick.assetName}
                      </p>
                      <p className="text-xs text-white/70">
                        {pick.teamName}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Desktop: Draft Board (Recent Picks) + Draft Board - 3 cols on desktop */}
          <div className="hidden lg:block lg:order-1">
            <div className="space-y-6">
              {/* Draft Board - Reskinned Recent Picks */}
              <div className="bg-weed-purple border-2 border-weed-green shadow-xl rounded-lg p-4">
                <h3 className="headline-secondary text-lg text-white uppercase mb-4">
                  Draft Board
                </h3>
                {recentPicks.length === 0 ? (
                  <p className="text-sm text-white/70 text-center py-8">
                    Noch keine Picks
                  </p>
                ) : (
                  <div className="space-y-2">
                    {recentPicks.map((pick, index) => (
                      <div
                        key={`${pick.pickNumber}-${index}`}
                        className="p-3 bg-white/10 rounded-lg border-2 border-white/20"
                      >
                        <div className="flex items-start justify-between mb-1">
                          <span className="text-xs font-medium text-white/70">
                            Pick #{pick.pickNumber}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-white mb-1">
                          {pick.assetName}
                        </p>
                        <p className="text-xs text-white/70">
                          {pick.teamName}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <DraftBoard
                leagueId={leagueId}
                currentPick={currentPick}
                isMyTurn={isMyTurn}
                myRoster={mergedRoster}
                draftedAssets={draftedAssets}
                onDraftPick={handleDraftPick}
              />
            </div>
          </div>

          {/* Desktop: Sidebar - 1 col on desktop */}
          <div className="hidden lg:block lg:order-2 space-y-6">
            {/* Draft Clock */}
            {timerSeconds !== null && currentTurnTeamName && (
              <DraftClock
                pickNumber={currentPickNumber}
                round={currentRound}
                teamName={currentTurnTeamName}
                isYourTurn={isMyTurn}
                timeLimit={timeLimit}
                remainingTime={timerSeconds}
                isPaused={isPaused}
                onTimerExpired={() => {
                  toast.warning('Time expired! Auto-pick will be triggered.');
                }}
              />
            )}

            {/* My Roster */}
            <MyRoster
              roster={mergedRoster}
              teamName={myTeam.name || "My Team"}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
