import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LiveIndicator } from "@/components/LiveIndicator";
import ScoringBreakdownV2 from "@/components/ScoringBreakdownV2";
import { CoinFlip } from "@/components/CoinFlip";
import { BattleArena } from "@/components/BattleArena";
import { LeagueChat } from "@/components/LeagueChat";
import { ChallengeInviteLanding } from "@/components/ChallengeInviteLanding";
import type { ScoringPlayData } from "@/components/ScoringPlayOverlay";
import { ScoringPlayAnnouncement } from "@/components/ScoringPlayAnnouncement";

import {
  Loader2,
  ArrowLeft,
  Trophy,
  UserPlus,
  Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useWebSocket } from "@/hooks/useWebSocket";
import { TeamAvatar } from "@/components/TeamAvatar";

interface TeamScore {
  teamId: number;
  teamName: string;
  points: number;
  rank?: number;
  userAvatarUrl?: string | null;
  userName?: string | null;
  fighterIllustration?: string | null;
  battlefieldBackground?: string | null;
}

interface ChallengeSummary {
  id: number;
  name: string;
  status: string;
  currentWeek: number;
  seasonYear: number;
  updatedAt?: string;
  createdAt?: string;
}

export default function DailyChallenge() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const challengeId = parseInt(id || "0", 10);

  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [winner, setWinner] = useState<{ teamId: number; teamName: string; points: number } | null>(null);
  const [showCoinFlip, setShowCoinFlip] = useState(false);
  const [coinFlipWinner, setCoinFlipWinner] = useState<{ teamId: number; teamName: string } | null>(null);

  // Scoring play state for battle animations
  const [currentScoringPlay, setCurrentScoringPlay] = useState<ScoringPlayData | null>(null);
  const scoringPlayQueueRef = useRef<ScoringPlayData[]>([]);
  const isPlayingRef = useRef(false);
  const lastPlayedRef = useRef<ScoringPlayData | null>(null);

  // Recent plays feed (last 3 scoring plays with timestamps)
  const [recentPlays, setRecentPlays] = useState<(ScoringPlayData & { timestamp: Date })[]>([]);

  // Live display scores - updated incrementally with each scoring play for realistic effect
  // Map of teamId -> current display score
  const [liveScores, setLiveScores] = useState<Map<number, number>>(new Map());
  const lastScoreSyncRef = useRef<number>(0);

  // Disable browser's automatic scroll restoration on mount
  useEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
  }, []);

  // Track if we've scrolled to top after content loads
  const hasScrolledRef = useRef(false);

  // Cache scores in localStorage for instant display on page load
  const SCORE_CACHE_KEY = `challenge-${challengeId}-scores`;
  const [cachedScores, setCachedScores] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(SCORE_CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          // Check if cache is less than 1 hour old
          if (Date.now() - parsed.timestamp < 3600000) {
            console.log('[ScoreCache] Loaded cached scores from localStorage');
            return parsed.scores;
          }
        }
      } catch (e) {
        console.error('[ScoreCache] Failed to parse cached scores', e);
      }
    }
    return [];
  });

  const {
    data: league,
    isLoading: leagueLoading,
    isError: leagueError,
    refetch: refetchLeague,
  } = trpc.league.getById.useQuery(
    { leagueId: challengeId },
    { enabled: !!challengeId && isAuthenticated }
  );

  const currentYear = league?.seasonYear || new Date().getFullYear();
  const currentWeek = league?.currentWeek || 1;
  const statDate = useMemo(() => {
    if (!league?.createdAt) return null;
    return new Date(league.createdAt).toISOString().split('T')[0];
  }, [league]);
  const challengeDateLabel = useMemo(() => {
    if (!statDate) return new Date().toLocaleDateString();
    return new Date(statDate).toLocaleDateString();
  }, [statDate]);
  const isTodayChallenge = useMemo(() => {
    if (!statDate) return false;
    const today = new Date().toISOString().split('T')[0];
    return statDate === today;
  }, [statDate]);

  const {
    data: dayScores,
    isLoading: scoresLoading,
    isError: scoresError,
    error: scoresErrorDetails,
    refetch: refetchScores,
  } = trpc.scoring.getChallengeDayScores.useQuery(
    {
      challengeId,
      statDate: statDate || '',
    },
    {
      enabled: !!league && !!statDate,
      retry: 3,
      retryDelay: 1000,
      refetchInterval: 30000, // Poll every 30s as fallback if WS fails
    }
  );

  const {
    data: breakdown,
    isLoading: breakdownLoading,
    refetch: refetchBreakdown,
  } = trpc.scoring.getChallengeDayBreakdown.useQuery(
    {
      challengeId,
      teamId: selectedTeamId || 0,
      statDate: statDate || '',
    },
    {
      enabled: !!selectedTeamId && !!statDate,
    }
  );

  const { data: userLeagues } = trpc.league.list.useQuery(undefined, {
    enabled: !!isAuthenticated,
  });

  const {
    data: teamLineup,
    isLoading: teamLineupLoading,
  } = trpc.lineup.getWeeklyLineup.useQuery(
    {
      teamId: selectedTeamId || 0,
      year: currentYear,
      week: currentWeek,
    },
    {
      enabled: !!selectedTeamId,
    }
  );

  // Scroll to top when content finishes loading (not during loading state)
  const isStillLoading = !challengeId || authLoading || leagueLoading || scoresLoading;

  useEffect(() => {
    // Only scroll once when loading completes
    if (!isStillLoading && !hasScrolledRef.current) {
      hasScrolledRef.current = true;

      // Immediate scroll
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;

      // Backup scroll after a tiny delay (for any async rendering)
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
      });
    }
  }, [isStillLoading]);

  const isAdmin = user?.role === "admin";

  // Score sync mutation - used for both auto-sync and manual sync
  const syncScoresMutation = trpc.scoring.calculateChallengeDay.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        console.log(`[ScoreSync] Synced! ${result.playsQueued || 0} updates queued`);
        // Force liveScores to update from server on next dayScores fetch
        hasReceivedWsUpdateRef.current = false;
        refetchScores();
        if (selectedTeamId) refetchBreakdown();
        // Show toast for user feedback
        toast.success("Scores refreshed!");
      } else {
        console.warn('[ScoreSync] Sync returned unsuccessful:', result.message);
      }
    },
    onError: (error) => {
      console.error('[ScoreSync] Sync failed:', error.message);
      toast.error('Score sync failed');
    },
  });

  const handleManualSync = useCallback(() => {
    if (!statDate || syncScoresMutation.isPending) return;
    syncScoresMutation.mutate({ challengeId, statDate });
  }, [challengeId, statDate, syncScoresMutation]);

  // Auto-sync refs (effect is defined after useWebSocket to access isConnected)
  const hasAutoSyncedRef = useRef(false);
  const lastSyncTimeRef = useRef(0);

  // Get user's team ID for WebSocket
  const userTeamId = useMemo(() => {
    if (!league?.teams || !user?.id) return undefined;
    const team = league.teams.find((t: any) => t.userId === user.id);
    return team?.id;
  }, [league, user]);

  // Function to play next scoring play from queue (single play with extended timing)
  const playNextScoringPlay = useCallback(() => {
    // Move to next play in queue
    if (scoringPlayQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      lastPlayedRef.current = null;
      setCurrentScoringPlay(null);
      return;
    }

    // Get next play from queue
    isPlayingRef.current = true;
    const nextPlay = scoringPlayQueueRef.current.shift()!;
    lastPlayedRef.current = nextPlay;
    setCurrentScoringPlay(nextPlay);
  }, []);

  // Handle scoring play completion (called when announcement finishes)
  const handleScoringPlayComplete = useCallback(() => {
    // Small delay before next play (or repeat) for visual clarity
    setTimeout(() => {
      playNextScoringPlay();
    }, 500);
  }, [playNextScoringPlay]);

  // WebSocket connection for real-time updates
  const { isConnected } = useWebSocket({
    userId: user?.id || 0,
    leagueId: challengeId,
    teamId: userTeamId,
    onMessage: (message) => {
      console.log('[WS] Received message:', message.type);
      if (message.type === 'challenge_score_update') {
        console.log('[WS] challenge_score_update received:', {
          msgStatDate: message.statDate,
          currentStatDate: statDate,
          scores: message.scores,
        });
        if (message.statDate && statDate && message.statDate !== statDate) {
          console.log('[WS] Ignoring update - dates dont match');
          return;
        }
        setLastUpdateTime(new Date(message.updateTime));
        hasReceivedWsUpdateRef.current = false; // Allow server scores to update
        refetchScores();

        // Update liveScores directly from WebSocket message for immediate feedback
        if (message.scores && Array.isArray(message.scores)) {
          const newLiveScores = new Map(liveScores);
          let hasChanges = false;
          message.scores.forEach((s: { teamId: number; points: number }) => {
            const oldScore = newLiveScores.get(s.teamId);
            if (oldScore !== s.points) {
              newLiveScores.set(s.teamId, s.points);
              hasChanges = true;
              console.log(`[WS] Score update: Team ${s.teamId}: ${oldScore} -> ${s.points}`);
            }
          });
          if (hasChanges) {
            setLiveScores(newLiveScores);
            toast.info("Scores updated!");
          } else {
            console.log('[WS] No score changes detected');
          }
        }
      } else if (message.type === 'challenge_finalized') {
        if (message.statDate && statDate && message.statDate !== statDate) {
          return;
        }
        setWinner(message.winner);
        setLastUpdateTime(new Date(message.finalizedAt));
        refetchScores();
        toast.success(`Challenge complete! Winner: ${message.winner.teamName}`);
      } else if (message.type === 'second_player_joined') {
        toast.success("Dein Gegner ist beigetreten! Der Münzwurf beginnt...");
        setShowCoinFlip(true);
      } else if (message.type === 'coin_flip_result') {
        setCoinFlipWinner({
          teamId: message.winnerTeamId,
          teamName: message.winnerTeamName
        });
        // After showing result, redirect to draft
        setTimeout(() => {
          setLocation(`/challenge/${challengeId}/draft`);
        }, 5000);
      } else if (message.type === 'scoring_play') {
        // Mark that we've received WS updates (don't overwrite with server data)
        hasReceivedWsUpdateRef.current = true;

        // Queue the scoring play for battle animation
        const scoringPlay: ScoringPlayData = {
          attackingTeamId: message.attackingTeamId,
          attackingTeamName: message.attackingTeamName,
          defendingTeamId: message.defendingTeamId,
          defendingTeamName: message.defendingTeamName,
          playerName: message.playerName,
          playerType: message.playerType,
          pointsScored: message.pointsScored,
          attackerNewTotal: message.attackerNewTotal,
          defenderTotal: message.defenderTotal,
          imageUrl: message.imageUrl,
          position: message.position,
        };

        scoringPlayQueueRef.current.push(scoringPlay);

        // Add to recent plays feed with timestamp (keep last 10)
        setRecentPlays(prev => [{ ...scoringPlay, timestamp: new Date() }, ...prev].slice(0, 10));

        // Update live display scores incrementally (this is the key for realistic feel!)
        // Don't show final total immediately - let it build up with each play
        setLiveScores(prev => {
          const updated = new Map(prev);
          updated.set(message.attackingTeamId, message.attackerNewTotal);
          updated.set(message.defendingTeamId, message.defenderTotal);
          return updated;
        });

        // Start playing if not already
        if (!isPlayingRef.current) {
          playNextScoringPlay();
        }

        // Update last update time (but don't refetch - we're using live scores!)
        setLastUpdateTime(new Date());

        // Only sync with server every 30 seconds to avoid overwriting live scores
        const now = Date.now();
        if (now - lastScoreSyncRef.current > 30000) {
          lastScoreSyncRef.current = now;
          refetchScores();
        }
      }
    },
    autoConnect: !!challengeId && !!user?.id,
  });

  // Track whether we've received any WebSocket score updates (to avoid overwriting live data)
  const hasReceivedWsUpdateRef = useRef(false);

  // Reset WS update flag when connection drops so polling can take over
  useEffect(() => {
    if (!isConnected) {
      hasReceivedWsUpdateRef.current = false;
    }
  }, [isConnected]);

  // Update cache and live scores when new scores arrive from server
  useEffect(() => {
    if (dayScores && dayScores.length > 0) {
      setCachedScores(dayScores);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(SCORE_CACHE_KEY, JSON.stringify({
            scores: dayScores,
            timestamp: Date.now()
          }));
          console.log('[ScoreCache] Updated cached scores in localStorage');
        } catch (e) {
          console.error('[ScoreCache] Failed to cache scores', e);
        }
      }

      // Initialize or update live scores from server scores
      // - Initialize when empty
      // - Update when server has higher scores and we haven't received WS updates
      //   (WS updates are incremental and should take precedence)
      // Check if server has different scores than local state
      const serverScoresDiffer = dayScores.some(score => {
        const liveScore = liveScores.get(score.teamId);
        return (score.points || 0) !== (liveScore || 0);
      });

      // Update liveScores from server when:
      // 1. We don't have any live scores yet (initial load)
      // 2. Server scores are different AND (we haven't just received a WS update OR we are disconnected)
      //    (WS updates are incremental, so we trust them over server for a brief period, unless WS is down)
      if (liveScores.size === 0 || (serverScoresDiffer && (!hasReceivedWsUpdateRef.current || !isConnected))) {
        const initialScores = new Map<number, number>();
        dayScores.forEach(score => {
          initialScores.set(score.teamId, score.points || 0);
        });
        setLiveScores(initialScores);
        console.log('[LiveScores] Updated from server scores:',
          dayScores.map(s => `${s.teamId}:${s.points}`).join(', '));
      }
    }
  }, [dayScores, SCORE_CACHE_KEY, liveScores]);

  // Auto-sync scores when WebSocket connects to ensure real-time updates flow
  // This triggers a score calculation while the client is in the broadcast channel
  useEffect(() => {
    // Only auto-sync once per mount
    if (hasAutoSyncedRef.current) return;

    // Wait for WebSocket to connect first (most important for receiving broadcasts)
    if (!isConnected) return;

    // Wait for data to load
    if (!league || !statDate || scoresLoading) return;

    // Only sync for active challenges
    if (league.status !== 'active') return;

    // Don't sync if mutation is already running
    if (syncScoresMutation.isPending) return;

    // Check if scores are missing (new game)
    const hasRealScores = dayScores && dayScores.length > 0 &&
      dayScores.some(score => (score.points || 0) > 0);

    // Always sync once when WS connects - this ensures we're in the broadcast channel
    // and will receive the challenge_score_update event
    console.log(`[ScoreSync] Auto-syncing on WS connect (hasScores: ${hasRealScores})`);
    hasAutoSyncedRef.current = true;
    lastSyncTimeRef.current = Date.now();
    syncScoresMutation.mutate({ challengeId, statDate });
  }, [league, statDate, dayScores, scoresLoading, syncScoresMutation, challengeId, isConnected]);

  // Show invite landing page for unauthenticated users
  // (Logged-in users always see the normal challenge page)
  if (!authLoading && !isAuthenticated) {
    return <ChallengeInviteLanding challengeId={challengeId} />;
  }

  // Helper to get fighter illustration from league teams
  const getFighterForTeam = useCallback((teamId: number) => {
    const team = league?.teams?.find((t: any) => t.id === teamId);
    return team?.fighterIllustration || null;
  }, [league?.teams]);

  // Helper to get battlefield background from league teams
  const getBackgroundForTeam = useCallback((teamId: number) => {
    const team = league?.teams?.find((t: any) => t.id === teamId);
    return team?.battlefieldBackground || null;
  }, [league?.teams]);

  // Redirect non-challenges back to league detail
  const baseTeamScores: TeamScore[] = useMemo(() => {
    // Always start with all teams from the league to ensure both teams show
    const allTeams: TeamScore[] = (league?.teams || []).map((team: any, index: number) => ({
      teamId: team.id,
      teamName: team.name || `Team ${index + 1}`,
      points: 0,
      userAvatarUrl: team.userAvatarUrl,
      userName: team.userName,
      fighterIllustration: team.fighterIllustration || null,
      battlefieldBackground: team.battlefieldBackground || null,
    }));

    // If we have day scores, merge them with all teams
    // BUT prefer liveScores when available (they update incrementally with each play)
    if (dayScores && dayScores.length > 0) {
      const scoreMap = new Map(dayScores.map((score) => [score.teamId, score]));
      return allTeams.map((team) => {
        const score = scoreMap.get(team.teamId);
        // Use live score if available (for real-time incremental updates)
        const liveScore = liveScores.get(team.teamId);
        if (score) {
          return {
            teamId: score.teamId,
            teamName: score.teamName || team.teamName,
            // Prefer liveScore for real-time feel, fall back to server score
            points: liveScore !== undefined ? liveScore : (score.points || 0),
            userAvatarUrl: score.userAvatarUrl || team.userAvatarUrl,
            userName: score.userName || team.userName,
            fighterIllustration: getFighterForTeam(score.teamId),
            battlefieldBackground: getBackgroundForTeam(score.teamId),
          };
        }
        return {
          ...team,
          points: liveScore !== undefined ? liveScore : team.points,
          fighterIllustration: getFighterForTeam(team.teamId),
          battlefieldBackground: getBackgroundForTeam(team.teamId),
        };
      });
    }

    // Fall back to cached scores merged with all teams
    if (cachedScores && cachedScores.length > 0) {
      console.log('[ScoreCache] Using cached scores for display');
      const scoreMap = new Map(cachedScores.map((score: any) => [score.teamId, score]));
      return allTeams.map((team) => {
        const score = scoreMap.get(team.teamId);
        const liveScore = liveScores.get(team.teamId);
        if (score) {
          return {
            teamId: score.teamId,
            teamName: score.teamName || team.teamName,
            points: liveScore !== undefined ? liveScore : (score.points || 0),
            userAvatarUrl: score.userAvatarUrl || team.userAvatarUrl,
            userName: score.userName || team.userName,
            fighterIllustration: getFighterForTeam(score.teamId),
            battlefieldBackground: getBackgroundForTeam(score.teamId),
          };
        }
        return {
          ...team,
          points: liveScore !== undefined ? liveScore : team.points,
          fighterIllustration: getFighterForTeam(team.teamId),
          battlefieldBackground: getBackgroundForTeam(team.teamId),
        };
      });
    }

    // Return all teams with live scores if available, otherwise 0 points
    return allTeams.map((team) => {
      const liveScore = liveScores.get(team.teamId);
      return {
        ...team,
        points: liveScore !== undefined ? liveScore : team.points,
        fighterIllustration: getFighterForTeam(team.teamId),
        battlefieldBackground: getBackgroundForTeam(team.teamId),
      };
    });
  }, [dayScores, cachedScores, league, getFighterForTeam, getBackgroundForTeam, liveScores]);

  const sortedScores: TeamScore[] = useMemo(() => {
    if (baseTeamScores.length === 0) return [];

    const hasLiveScores = dayScores && dayScores.length > 0;
    const list = hasLiveScores
      ? [...baseTeamScores].sort((a, b) => (b.points || 0) - (a.points || 0))
      : baseTeamScores;

    return list.map((score, index) => ({
      ...score,
      rank: index + 1,
    }));
  }, [baseTeamScores, dayScores]);

  // Track if scores were just synced for the first time
  const [scoresJustSynced, setScoresJustSynced] = useState(false);

  useEffect(() => {
    if (sortedScores.length > 0 && !selectedTeamId) {
      setSelectedTeamId(sortedScores[0].teamId);
      // Mark that we need to refetch breakdown after setting the team
      setScoresJustSynced(true);
    }
  }, [sortedScores, selectedTeamId]);

  // Refetch breakdown when selectedTeamId is set and scores were just synced
  useEffect(() => {
    if (scoresJustSynced && selectedTeamId && dayScores && dayScores.length > 0) {
      console.log('[AutoRefresh] Scores synced, refetching breakdown for team', selectedTeamId);
      refetchBreakdown();
      setScoresJustSynced(false);
    }
  }, [scoresJustSynced, selectedTeamId, dayScores, refetchBreakdown]);

  // Check for winner when challenge is complete (after sortedScores is defined)
  useEffect(() => {
    if (league?.status === 'complete' && sortedScores.length > 0 && !winner) {
      setWinner(sortedScores[0]);
    }
  }, [league, sortedScores, winner]);

  // Real-time updates now come via WebSocket from the server's scoreBroadcaster
  // No client-side polling needed - the server drip-feeds scoring plays automatically

  const leader = sortedScores[0];
  const challenger = sortedScores[1];
  const activeTeamCount = dayScores?.length ?? league?.teams?.length ?? 0;
  const userTeam = useMemo(() => {
    if (!league?.teams || !user?.id) return null;
    return league.teams.find((team: any) => team.userId === user.id) || null;
  }, [league, user]);
  const showInviteCard = (league?.teams?.length ?? 0) < (league?.teamCount ?? 2);
  const scoreDiff =
    leader && challenger ? (leader.points || 0) - (challenger.points || 0) : 0;

  const selectedTeam = useMemo(
    () => sortedScores.find((team) => team.teamId === selectedTeamId) || null,
    [sortedScores, selectedTeamId]
  );

  const topPerformers = useMemo<
    { name: string; type: string; total: number; breakdown: any; imageUrl?: string | null }[]
  >(() => {
    if (!breakdown || !breakdown.breakdowns) {
      return [];
    }
    return breakdown.breakdowns
      .map((item: any) => ({
        name: item.assetName || `Unknown ${item.assetType}`,
        type: item.assetType,
        total: item.breakdown?.total ?? item.totalPoints ?? 0,
        breakdown: item.breakdown,
        imageUrl: item.imageUrl || null,
      }))
      .sort((a: { total: number }, b: { total: number }) => b.total - a.total)
      .slice(0, 3);
  }, [breakdown]);



  const normalizedLineup = useMemo(
    () => normalizeLineup(teamLineup),
    [teamLineup]
  );


  if (
    !challengeId ||
    authLoading ||
    leagueLoading ||
    scoresLoading ||
    (selectedTeamId && breakdownLoading)
  ) {
    return (
      <div className="min-h-screen gradient-dark flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (leagueError || !league) {
    return (
      <div className="min-h-screen gradient-dark flex items-center justify-center">
        <div className="text-center space-y-4">
          <Trophy className="w-12 h-12 text-muted-foreground mx-auto" />
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              Challenge nicht gefunden
            </h2>
            <p className="text-muted-foreground mt-2">
              Diese Challenge existiert nicht oder wurde beendet.
            </p>
          </div>
          <Button onClick={() => setLocation("/")}>
            Zurück zum Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const isLive = league.status === "active";

  return (
    <div className="min-h-screen gradient-dark">
      {/* Coin Flip Overlay */}
      {showCoinFlip && league?.teams && league.teams.length >= 2 && (
        <CoinFlip
          team1Name={league.teams[0]?.name || "Team 1"}
          team2Name={league.teams[1]?.name || "Team 2"}
          winnerTeamName={coinFlipWinner?.teamName || null}
        />
      )}

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Back Button and Title */}
        <div className="flex items-center gap-4 mb-2">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-2xl border border-white/10 text-white hover:bg-white/10"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white">{league.name}</h1>
          </div>
        </div>

        {/* Scoring Play Announcement Banner */}
        <ScoringPlayAnnouncement
          play={currentScoringPlay}
          duration={5000}
          onComplete={handleScoringPlayComplete}
        />

        {/* Battle Arena - Team mascot GIFs (clickable to select team) */}
        <BattleArena
          leftTeam={leader ? {
            teamId: leader.teamId,
            teamName: leader.teamName,
            userName: leader.userName,
            userAvatarUrl: leader.userAvatarUrl,
            fighterIllustration: leader.fighterIllustration,
            battlefieldBackground: leader.battlefieldBackground,
            points: leader.points,
          } : null}
          rightTeam={challenger ? {
            teamId: challenger.teamId,
            teamName: challenger.teamName,
            userName: challenger.userName,
            userAvatarUrl: challenger.userAvatarUrl,
            fighterIllustration: challenger.fighterIllustration,
            battlefieldBackground: challenger.battlefieldBackground,
            points: challenger.points,
          } : !challenger && league?.leagueCode ? null : null}
          isLive={isLive}
          challengeDate={challengeDateLabel}
          userTeamId={userTeam?.id}
          selectedTeamId={selectedTeamId}
          onFighterChange={() => refetchLeague()}
          onBackgroundChange={() => refetchLeague()}
          onTeamClick={(teamId) => setSelectedTeamId(teamId)}
          scoringPlay={currentScoringPlay}
        />


        {/* Invite Block (when waiting for opponent) */}
        {!challenger && league?.leagueCode && (
          <InviteBlock
            leagueCode={league.leagueCode}
            leagueId={challengeId}
            leagueName={league.name}
          />
        )}

        {/* Status Bar with Live Feed - Double-click to manually sync */}
        <div
          className="rounded-2xl bg-white/5 border border-white/10 p-4 cursor-pointer select-none"
          onDoubleClick={handleManualSync}
          title="Double-click to sync scores"
        >
          <div className="flex flex-col gap-3">
            {/* Top Row: Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isLive ? <LiveIndicator size="sm" /> : <Badge variant="outline">Final</Badge>}
                {(league?.status === 'active' || league?.status === 'draft') && (
                  <span className="text-xs text-white/60">
                    {!isConnected && "Connecting..."}
                    {isConnected && lastUpdateTime && (
                      <>Game Stats Last Updated: {lastUpdateTime.toLocaleTimeString()}</>
                    )}
                    {isConnected && !lastUpdateTime && "Waiting for updates..."}
                    {syncScoresMutation.isPending && " • Syncing..."}
                  </span>
                )}
              </div>

            </div>

            {/* Recent Plays Feed - Left aligned with full width */}
            {recentPlays.length > 0 && (
              <div className="flex flex-col gap-2 border-t border-white/10 pt-3">
                <span className="text-[10px] uppercase tracking-wider text-white/40">Recent Scoring Plays</span>
                {recentPlays.map((play, i) => (
                  <div
                    key={`${play.playerName}-${play.pointsScored}-${i}`}
                    className={cn(
                      "flex items-center gap-3 text-sm transition-opacity",
                      i === 0 ? "opacity-100" : i < 5 ? "opacity-80" : "opacity-60"
                    )}
                  >
                    <span className="text-white/40 text-xs tabular-nums min-w-[60px]">
                      {play.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-white font-medium flex-1">{play.playerName}</span>
                    <span className="text-white/50 text-xs hidden sm:inline">
                      for {play.attackingTeamName}
                    </span>
                    <Badge
                      className={cn(
                        "text-xs font-bold px-2 py-0.5",
                        play.pointsScored >= 10
                          ? "bg-primary/30 text-primary border border-primary/50"
                          : "bg-white/10 text-white/70 border border-white/20"
                      )}
                    >
                      +{play.pointsScored.toFixed(1)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Draft In Progress Banner */}
        {(league?.status === 'draft' || (league?.draftStarted === 1 && league?.draftCompleted === 0)) && league.teams?.length === 2 && (
          <Card className="gradient-card border-primary/50 glow-primary slide-in-bottom">
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center glow-primary animate-pulse">
                    <Trophy className="w-8 h-8 text-white" />
                  </div>
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-gradient-primary mb-2 headline-primary">
                    🎯 DRAFT IN PROGRESS
                  </h2>
                  <p className="text-muted-foreground mb-4">
                    Beide Spieler sind dabei, ihre Teams zu draften
                  </p>
                </div>
                <Button
                  onClick={() => setLocation(`/challenge/${challengeId}/draft`)}
                  className="gradient-primary"
                  size="lg"
                >
                  <Trophy className="w-4 h-4 mr-2" />
                  Zum Draft Board
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Challenge Complete Banner */}
        {league?.status === 'complete' && winner && (
          <Card className="gradient-card border-border/50 glow-primary slide-in-bottom">
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <Trophy className="w-16 h-16 text-yellow-500" />
                </div>
                <div className="flex items-center gap-3 justify-center">
                  <Trophy className="w-16 h-16 text-yellow-500" />
                  <h2 className="text-3xl font-bold text-gradient-primary mb-2 headline-primary">
                    Challenge Complete!
                  </h2>
                  <p className="text-xl text-foreground mb-1">
                    Winner: <span className="font-bold text-gradient-primary">{winner.teamName}</span>
                  </p>
                  <p className="text-muted-foreground">
                    Final Score: {winner.points.toFixed(1)} points
                  </p>
                </div>
                {/* Smack Talk Chat */}
                <div className="pt-4">
                  <div className="rounded-[32px] bg-[#2a1027] border border-white/10 overflow-hidden">
                    <LeagueChat leagueId={challengeId} variant="dark" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Smack Talk Chat - Show when challenge is not complete */}
        {league?.status !== 'complete' && (
          <div className="rounded-[32px] bg-[#2a1027] border border-white/10 overflow-hidden">
            <LeagueChat leagueId={challengeId} variant="dark" />
          </div>
        )}

        {/* Top Performers */}
        {topPerformers.length > 0 && (
          <div className="space-y-3">
            <div className="text-xs uppercase tracking-[0.4em] text-white/40">
              Game Leaders
            </div>
            <div className="grid gap-3">
              {topPerformers.slice(0, 3).map((performer, index) => (
                <div
                  key={`${performer.name}-${index}`}
                  className="rounded-[26px] bg-[#2c101c] border border-white/10 px-5 py-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <span className="px-3 py-1 rounded-full bg-[#cfff4d] text-black text-sm font-semibold">
                      #{index + 1}
                    </span>
                    {performer.imageUrl && (
                      <img
                        src={performer.imageUrl}
                        alt={performer.name}
                        className="w-12 h-12 rounded-xl object-cover border border-white/10"
                      />
                    )}
                    <div>
                      <div className="text-lg font-semibold">{performer.name}</div>
                      <div className="text-xs uppercase text-white/60">
                        {performer.type} • {performer.breakdown?.components?.length || 0} Komponenten
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-[#ff744d]">
                      {performer.total.toFixed(1)}
                    </div>
                    <div className="text-xs text-white/50">Total</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}



        {/* Detailed Breakdown */}
        {selectedTeamId && breakdown?.breakdowns?.length ? (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Scoring Breakdown
            </h3>
            <div className="space-y-6">
              {/* Group assets by type and display in 2-column grid */}
              {(() => {
                const filteredBreakdowns = breakdown.breakdowns.filter((item: any) => item.assetId !== null);
                const groupedByType: Record<string, any[]> = {
                  manufacturer: [],
                  pharmacy: [],
                  cannabis_strain: [],
                  product: [],
                  brand: [],
                };

                // Group assets by type
                filteredBreakdowns.forEach((item: any) => {
                  const type = item.assetType;
                  if (groupedByType[type]) {
                    groupedByType[type].push(item);
                  }
                });

                // Render each group in a 2-column grid
                return Object.entries(groupedByType).map(([assetType, items]) => {
                  if (items.length === 0) return null;

                  return (
                    <div key={assetType} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {items.map((item: any, index: number) => (
                        <div key={`${item.assetId}-${index}`}>
                          <ScoringBreakdownV2
                            data={{
                              assetName:
                                item.assetName || `Unknown ${item.assetType}`,
                              assetType: item.assetType,
                              imageUrl: item.imageUrl || null,
                              components: item.breakdown?.components || [],
                              bonuses: item.breakdown?.bonuses || [],
                              penalties: item.breakdown?.penalties || [],
                              subtotal: item.breakdown?.subtotal || 0,
                              total: item.breakdown?.total ?? item.totalPoints ?? 0,
                              // Pass new trend fields
                              trendMultiplier: item.breakdown?.trendMultiplier,
                              streakDays: item.breakdown?.streakDays,
                              marketSharePercent: item.breakdown?.marketSharePercent,
                              consistencyScore: item.breakdown?.consistencyScore,
                              velocityScore: item.breakdown?.velocityScore,
                            }}
                            leagueAverage={item.leagueAverage}
                            weeklyTrend={item.weeklyTrend}
                            useTrendDisplay={true}
                            variant="app"
                          />
                        </div>
                      ))}
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        ) : (
          <Card className="border-border/50 bg-card/80">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Trophy className="w-10 h-10 mx-auto mb-3 opacity-70" />
              <p>Wähle ein Team, um die Scoring-Details zu sehen.</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

interface LineupSlot {
  position: string;
  assetType?: string | null;
  assetId?: number | null;
  assetName?: string | null;
  imageUrl?: string | null;
  points?: number | null;
  locked?: boolean;
}

function normalizeLineup(lineup: any): LineupSlot[] {
  if (!lineup) return [];

  const convert = (slots: any[]): LineupSlot[] =>
    slots.map((slot) => ({
      position: slot.position,
      assetType: slot.assetType ?? null,
      assetId: slot.assetId ?? null,
      assetName: slot.assetName ?? null,
      imageUrl: slot.imageUrl ?? slot.logoUrl ?? null,
      points:
        typeof slot.points === "number"
          ? slot.points
          : typeof slot.totalPoints === "number"
            ? slot.totalPoints
            : null,
      locked: slot.locked ?? false,
    }));

  if (Array.isArray(lineup)) {
    return convert(lineup);
  }

  if (typeof lineup === "object") {
    if (Array.isArray(lineup.lineup)) {
      return convert(lineup.lineup);
    }
  }

  return [];
}

function InviteBlock({
  leagueCode,
  leagueId,
  leagueName,
}: {
  leagueCode: string;
  leagueId: number;
  leagueName: string;
}) {
  const handleCopyCode = () => {
    navigator.clipboard.writeText(leagueCode);
    toast.success("Invite code copied to clipboard!");
  };

  return (
    <Card className="flex-1 rounded-2xl gradient-card border-border/50 glow-primary">
      <CardContent className="p-6 text-center space-y-4">
        <div className="flex justify-center">
          <UserPlus className="w-12 h-12 text-primary" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground mb-2">
            Challenge einen Freund!
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Teile diesen Code, um deinen Gegner einzuladen
          </p>
        </div>
        <div className="space-y-2">
          <div className="text-sm uppercase text-muted-foreground tracking-wider">
            Invite Code
          </div>
          <div className="text-4xl font-bold text-gradient-primary tracking-widest font-mono">
            {leagueCode}
          </div>
        </div>
        <Button
          onClick={handleCopyCode}
          className="gradient-primary w-full"
          size="lg"
        >
          <Copy className="w-4 h-4 mr-2" />
          Code kopieren
        </Button>
        <div className="pt-2 space-y-1">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <p className="text-sm">Warte auf Gegner...</p>
          </div>
          <p className="text-xs text-muted-foreground/80">
            Der Draft startet automatisch, sobald dein Freund beitritt!
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
