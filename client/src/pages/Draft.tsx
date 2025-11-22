import { useAuth } from "@/_core/hooks/useAuth";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import DraftBoard from "@/components/DraftBoard";
// import { DraftPicksGrid } from "@/components/DraftPicksGrid";
import { MyRoster } from "@/components/MyRoster";
import { DraftClock } from "@/components/DraftClock";
import { toast } from "sonner";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useEffect, useState, useMemo } from "react";
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

  const leagueId = parseInt(id!);

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

  const { data: draftStatus } = trpc.draft.getDraftStatus.useQuery(
    { leagueId },
    { enabled: !!id && isAuthenticated, refetchInterval: 5000 }
  );

  const currentYear = league?.seasonYear || new Date().getFullYear();
  const currentWeek = league?.currentWeek || 1;

  // Draft Board (DraftPicksGrid) removed - using Recent Picks instead
  // const { data: allPicks = [], refetch: refetchAllPicks } = trpc.draft.getAllDraftPicks.useQuery(
  //   {
  //     leagueId,
  //     year: currentYear,
  //     week: currentWeek,
  //     // During live drafts we prioritize responsiveness over heavy scoring stats
  //     includeStats: league?.status !== "draft",
  //   },
  //   { enabled: !!league && isAuthenticated }
  // );

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
      console.log('[Draft] WebSocket message:', message);
      if (import.meta.env.MODE !== "production") {
        console.log('[DraftTiming] ws_message', {
          type: message.type,
          time: Date.now(),
          leagueId,
        });
      }
      
      if (message.type === 'player_picked') {
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

        // Refetch roster to update UI (Draft Board now uses Recent Picks from WebSocket)
        refetchRoster();
        // refetchAllPicks(); // Removed - using Recent Picks instead
        // Invalidate available players queries to remove drafted player
        utils.draft.getAvailableManufacturers.invalidate();
        utils.draft.getAvailableCannabisStrains.invalidate();
        utils.draft.getAvailableProducts.invalidate();
        utils.draft.getAvailablePharmacies.invalidate();
        utils.draft.getAvailableBrands.invalidate();
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
        refetchRoster();
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

  const makeDraftPickMutation = trpc.draft.makeDraftPick.useMutation({
    onSuccess: () => {
      toast.success("Draft Pick erfolgreich!");
      // Invalidate all available players queries to remove drafted player
      utils.draft.getAvailableManufacturers.invalidate();
      utils.draft.getAvailableCannabisStrains.invalidate();
      utils.draft.getAvailableProducts.invalidate();
      utils.draft.getAvailablePharmacies.invalidate();
      utils.draft.getAvailableBrands.invalidate();
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
          <Button onClick={() => setLocation("/dashboard")}>
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

  const handleDraftPick = async (assetType: "manufacturer" | "cannabis_strain" | "product" | "pharmacy", assetId: number) => {
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
    <div className="min-h-screen bg-weed-cream pattern-dots relative">
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
      <div className="border-b-4 border-weed-green bg-white/90 backdrop-blur-lg shadow-lg relative z-20">
        <div className="w-full max-w-[1600px] mx-auto px-4 md:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4 w-full md:w-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.history.back()}
                className="shrink-0 mt-1"
              >
                <ArrowLeft className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">Zurück zur Liga</span>
              </Button>
              <div className="min-w-0 flex-1">
                <h1 className="headline-secondary text-lg md:text-2xl text-weed-coral break-words leading-tight">{league.name}</h1>
                <p className="text-sm text-muted-foreground font-medium truncate">
                  Draft - {myTeam.name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-4 w-full md:w-auto justify-between md:justify-end">
              {/* Timer Display */}
              {timerSeconds !== null && !isNaN(timerSeconds) && timerSeconds >= 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-weed-purple/20 border-2 border-weed-purple rounded-lg shadow-md shrink-0">
                  <span className="text-sm font-bold text-weed-purple whitespace-nowrap">
                    ⏱️ {Math.floor(timerSeconds / 60)}:{String(timerSeconds % 60).padStart(2, '0')}
                  </span>
                </div>
              )}
              {/* Turn Indicator */}
              {currentTurnTeamName && (
                <div className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg border-2 shadow-md flex-1 md:flex-none text-center truncate ${
                  isMyTurn 
                    ? 'bg-weed-green border-weed-green' 
                    : 'bg-weed-coral/20 border-weed-coral'
                }`}>
                  <span className={`text-sm font-bold truncate block ${
                    isMyTurn 
                      ? 'text-black' 
                      : 'text-weed-coral'
                  }`}>
                    {isMyTurn ? '🎯 Dein Zug!' : `${currentTurnTeamName} ist dran`}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Draft Board */}
      <div className="w-full max-w-[1600px] mx-auto px-4 md:px-6 lg:px-8 py-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Mobile: Draft Clock first */}
          <div className="lg:hidden order-1">
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
          </div>

          {/* Mobile: Verfügbare Spieler second */}
          <div className="lg:hidden order-2">
            <DraftBoard
              leagueId={leagueId}
              currentPick={currentPick}
              isMyTurn={isMyTurn}
              myRoster={roster.map((r: any) => ({
                assetType: r.assetType,
                assetId: r.assetId,
                name: r.name || "Unknown",
              }))}
              remainingTime={timerSeconds}
              onDraftPick={handleDraftPick}
            />
          </div>

          {/* Mobile: My Roster (Player's Team) third */}
          <div className="lg:hidden order-3">
            <MyRoster 
              roster={roster.map((r: any) => ({
                assetType: r.assetType,
                assetId: r.assetId,
                name: r.name || "Unknown",
              }))}
              teamName={myTeam.name || "My Team"}
            />
          </div>

          {/* Mobile: Recent Picks - moved to replace Draft Board */}
          <div className="lg:hidden order-5">
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
          <div className="hidden lg:block lg:col-span-3 lg:order-1">
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
                myRoster={roster.map((r: any) => ({
                  assetType: r.assetType,
                  assetId: r.assetId,
                  name: r.name || "Unknown",
                }))}
                remainingTime={timerSeconds}
                onDraftPick={handleDraftPick}
              />
            </div>
          </div>

          {/* Desktop: Sidebar - 1 col on desktop */}
          <div className="hidden lg:block lg:col-span-1 lg:order-2 space-y-6">
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
              roster={roster.map((r: any) => ({
                assetType: r.assetType,
                assetId: r.assetId,
                name: r.name || "Unknown",
              }))}
              teamName={myTeam.name || "My Team"}
            />

            {/* Recent Picks - Moved to Draft Board position */}
            {/* <div className="bg-white border-0 shadow-xl rounded-lg p-4">
              <h3 className="headline-secondary text-lg text-foreground mb-4">
                📄 Recent Picks
              </h3>
              {recentPicks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No picks yet
                </p>
              ) : (
                <div className="space-y-2">
                  {recentPicks.map((pick, index) => (
                    <div
                      key={`${pick.pickNumber}-${index}`}
                      className="p-3 bg-weed-cream rounded-lg border-2 border-weed-green/30"
                    >
                      <div className="flex items-start justify-between mb-1">
                        <span className="text-xs font-medium text-muted-foreground">
                          Pick #{pick.pickNumber}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-foreground mb-1">
                        {pick.assetName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {pick.teamName}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div> */}
          </div>
        </div>
      </div>
    </div>
  );
}
