import { useAuth } from "@/_core/hooks/useAuth";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import DraftBoard from "@/components/DraftBoard";
import { MyRoster } from "@/components/MyRoster";
import { DraftClock } from "@/components/DraftClock";
import { toast } from "sonner";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useEffect, useState } from "react";

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

        // Refetch roster to update UI
        refetchRoster();
      } else if (message.type === 'next_pick') {
        setCurrentTurnTeamId(message.teamId);
        setCurrentTurnTeamName(message.teamName);
        setCurrentPickNumber(message.pickNumber);
        setCurrentRound(message.round);
        toast.info(`It's ${message.teamName}'s turn to pick!`);
      } else if (message.type === 'draft_complete') {
        toast.success('🎉 Draft complete! Redirecting to league page...');
        setTimerSeconds(null);
        // Redirect to league page after 3 seconds
        setTimeout(() => {
          setLocation(`/league/${leagueId}`);
        }, 3000);
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

  const makeDraftPickMutation = trpc.draft.makeDraftPick.useMutation({
    onSuccess: () => {
      toast.success("Draft Pick erfolgreich!");
    },
    onError: (error) => {
      toast.error(`Draft Pick fehlgeschlagen: ${error.message}`);
    },
  });

  // Redirect to login if not authenticated
  if (!authLoading && !isAuthenticated) {
    const loginUrl = getLoginUrl(); if (loginUrl) window.location.href = loginUrl; else window.location.href = "/login";
    return null;
  }

  if (authLoading || leagueLoading || teamLoading || rosterLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!league || !myTeam) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
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
      await makeDraftPickMutation.mutateAsync({
        leagueId,
        teamId: myTeam.id,
        assetType,
        assetId,
      });
    } catch (error) {
      // Error is handled by mutation callbacks
      console.error("Draft pick error:", error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation(`/league/${leagueId}`)}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Zurück zur Liga
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{league.name}</h1>
                <p className="text-sm text-muted-foreground">
                  Draft - {myTeam.name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {/* Timer Display */}
              {timerSeconds !== null && !isNaN(timerSeconds) && timerSeconds >= 0 && (
                <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                    ⏱️ {Math.floor(timerSeconds / 60)}:{String(timerSeconds % 60).padStart(2, '0')}
                  </span>
                </div>
              )}
              {/* Turn Indicator */}
              {currentTurnTeamName && (
                <div className={`px-4 py-2 rounded-lg border ${
                  isMyTurn 
                    ? 'bg-green-500/10 border-green-500/20' 
                    : 'bg-blue-500/10 border-blue-500/20'
                }`}>
                  <span className={`text-sm font-medium ${
                    isMyTurn 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-blue-600 dark:text-blue-400'
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
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Draft Board */}
          <div className="lg:col-span-3">
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

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
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

            {/* Recent Picks */}
            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="text-lg font-semibold text-foreground mb-4">
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
                      className="p-3 bg-muted/50 rounded-lg border border-border"
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
