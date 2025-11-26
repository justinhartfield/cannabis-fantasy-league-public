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
  RefreshCw,
  Clock,
  UserPlus,
  Copy,
  Zap,
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
  const [isCalculating, setIsCalculating] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [winner, setWinner] = useState<{ teamId: number; teamName: string; points: number } | null>(null);
  const [nextUpdateTime, setNextUpdateTime] = useState<Date | null>(null);
  const [timeUntilUpdate, setTimeUntilUpdate] = useState<string>("");
  const [showCoinFlip, setShowCoinFlip] = useState(false);
  const [coinFlipWinner, setCoinFlipWinner] = useState<{ teamId: number; teamName: string } | null>(null);
  
  // Scoring play state for battle animations
  const [currentScoringPlay, setCurrentScoringPlay] = useState<ScoringPlayData | null>(null);
  const scoringPlayQueueRef = useRef<ScoringPlayData[]>([]);
  const isPlayingRef = useRef(false);
  
  // Track previous scores for polling comparison
  const prevScoresRef = useRef<Map<number, number>>(new Map());

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

  const calculateChallengeDayMutation = trpc.scoring.calculateChallengeDay.useMutation({
    onSuccess: async () => {
      toast.success("Scores calculated successfully!");
      await refetchScores();
      // Also refetch the breakdown to show updated scoring details
      if (selectedTeamId) {
        await refetchBreakdown();
      }
      setIsCalculating(false);
    },
    onError: (error) => {
      toast.error(`Failed to calculate scores: ${error.message}`);
      setIsCalculating(false);
    },
  });



  const isAdmin = user?.role === "admin";

  // Get user's team ID for WebSocket
  const userTeamId = useMemo(() => {
    if (!league?.teams || !user?.id) return undefined;
    const team = league.teams.find((t: any) => t.userId === user.id);
    return team?.id;
  }, [league, user]);

  // Function to play next scoring play from queue
  const playNextScoringPlay = useCallback(() => {
    if (scoringPlayQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      setCurrentScoringPlay(null);
      return;
    }
    
    isPlayingRef.current = true;
    const nextPlay = scoringPlayQueueRef.current.shift()!;
    setCurrentScoringPlay(nextPlay);
  }, []);

  // Handle scoring play completion (called when announcement finishes)
  const handleScoringPlayComplete = useCallback(() => {
    // Clear current play and move to next
    setCurrentScoringPlay(null);
    // Small delay before next play for visual clarity
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
      if (message.type === 'challenge_score_update') {
        if (message.statDate && statDate && message.statDate !== statDate) {
          return;
        }
        setLastUpdateTime(new Date(message.updateTime));
        refetchScores();
        toast.info("Scores updated!");
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
        
        // Start playing if not already
        if (!isPlayingRef.current) {
          playNextScoringPlay();
        }
      }
    },
    autoConnect: !!challengeId && !!user?.id,
  });

  // Calculate next update time (top of next hour)
  useEffect(() => {
    const updateNextUpdateTime = () => {
      const now = new Date();
      const nextHour = new Date(now);
      nextHour.setHours(now.getHours() + 1, 0, 0, 0);
      setNextUpdateTime(nextHour);
    };

    updateNextUpdateTime();
    const interval = setInterval(updateNextUpdateTime, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Update countdown timer
  useEffect(() => {
    if (!nextUpdateTime) return;

    const updateCountdown = () => {
      const now = new Date();
      const diff = nextUpdateTime.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeUntilUpdate("Updating...");
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeUntilUpdate(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [nextUpdateTime]);

  // Update cache when new scores arrive
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
    }
  }, [dayScores, SCORE_CACHE_KEY]);

  // Auto-calculation removed - scores are now calculated by the backend scheduler
  // Admin users can still manually trigger calculation using the "Calculate Scores" button

  const handleCalculateScores = useCallback(() => {
    setIsCalculating(true);
    // Don't pass statDate - let the backend use the challenge creation date
    // This ensures we calculate scores for the date when stats were recorded
    calculateChallengeDayMutation.mutate({
      challengeId,
      statDate: statDate || '', // Use the challenge's stat date, not today
    });
  }, [calculateChallengeDayMutation, challengeId, statDate]);

  // Auto-trigger live score update for new challenges on first visit
  useEffect(() => {
    // Only trigger if league is active and we haven't updated yet
    if (league?.status === 'active' && challengeId) {
      const AUTO_UPDATE_KEY = `challenge-auto-update-${challengeId}`;
      const hasAutoUpdated = localStorage.getItem(AUTO_UPDATE_KEY);

      if (!hasAutoUpdated) {
        console.log('[AutoUpdate] Triggering initial score update for challenge', challengeId);
        handleCalculateScores();
        localStorage.setItem(AUTO_UPDATE_KEY, 'true');
      }
    }
  }, [league?.status, challengeId, handleCalculateScores]);


  // Show invite landing page for unauthenticated users
  if (!authLoading && !isAuthenticated) {
    return <ChallengeInviteLanding challengeId={challengeId} />;
  }

  // Helper to get fighter illustration from league teams
  const getFighterForTeam = useCallback((teamId: number) => {
    const team = league?.teams?.find((t: any) => t.id === teamId);
    return team?.fighterIllustration || null;
  }, [league?.teams]);

  // Redirect non-challenges back to league detail
  const baseTeamScores: TeamScore[] = useMemo(() => {
    // Prefer real scores from API
    if (dayScores && dayScores.length > 0) {
      return dayScores.map((score) => ({
        teamId: score.teamId,
        teamName: score.teamName,
        points: score.points || 0,
        userAvatarUrl: score.userAvatarUrl,
        userName: score.userName,
        fighterIllustration: getFighterForTeam(score.teamId),
      }));
    }

    // Fall back to cached scores for instant display
    if (cachedScores && cachedScores.length > 0) {
      console.log('[ScoreCache] Using cached scores for display');
      return cachedScores.map((score) => ({
        teamId: score.teamId,
        teamName: score.teamName,
        points: score.points || 0,
        userAvatarUrl: score.userAvatarUrl,
        userName: score.userName,
        fighterIllustration: getFighterForTeam(score.teamId),
      }));
    }

    // Finally fall back to empty teams from league data
    if (league?.teams && league.teams.length > 0) {
      return league.teams.map((team: any, index: number) => ({
        teamId: team.id,
        teamName: team.name || `Team ${index + 1}`,
        points: 0,
        userAvatarUrl: team.userAvatarUrl,
        userName: team.userName,
        fighterIllustration: team.fighterIllustration || null,
      }));
    }

    return [];
  }, [dayScores, cachedScores, league, getFighterForTeam]);

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

  // Poll for score changes every 30 seconds when challenge is active
  useEffect(() => {
    // Only poll for active challenges
    if (league?.status !== 'active' || !challengeId) return;

    // Initialize previous scores from current data
    if (sortedScores.length > 0 && prevScoresRef.current.size === 0) {
      sortedScores.forEach(team => {
        prevScoresRef.current.set(team.teamId, team.points);
      });
    }

    const pollInterval = setInterval(async () => {
      console.log('[ScorePoll] Polling for score changes...');
      
      try {
        // Refetch scores from DB
        const result = await refetchScores();
        
        if (result.data && result.data.length > 0) {
          // Compare with previous scores
          const newScores = result.data;
          const scoringPlays: ScoringPlayData[] = [];
          
          newScores.forEach((newScore: any) => {
            const prevPoints = prevScoresRef.current.get(newScore.teamId) ?? 0;
            const newPoints = newScore.totalPoints ?? 0;
            const delta = newPoints - prevPoints;
            
            if (delta > 0.1) { // Only if meaningful change (> 0.1 points)
              console.log(`[ScorePoll] Score change detected: Team ${newScore.teamId} +${delta.toFixed(1)} points`);
              
              // Find opponent team
              const opponentScore = newScores.find((s: any) => s.teamId !== newScore.teamId);
              
              if (opponentScore) {
                // Create a scoring play from the delta
                scoringPlays.push({
                  attackingTeamId: newScore.teamId,
                  attackingTeamName: newScore.teamName || 'Team',
                  defendingTeamId: opponentScore.teamId,
                  defendingTeamName: opponentScore.teamName || 'Opponent',
                  playerName: 'Score Update',
                  playerType: 'cannabis_strain', // Default type
                  pointsScored: delta,
                  attackerNewTotal: newPoints,
                  defenderTotal: opponentScore.totalPoints ?? 0,
                  imageUrl: null,
                });
              }
              
              // Update tracked score
              prevScoresRef.current.set(newScore.teamId, newPoints);
            }
          });
          
          // Queue up detected scoring plays for animation
          if (scoringPlays.length > 0 && !isPlayingRef.current) {
            scoringPlayQueueRef.current = [...scoringPlayQueueRef.current, ...scoringPlays];
            playNextScoringPlay();
          }
        }
      } catch (error) {
        console.error('[ScorePoll] Error polling scores:', error);
      }
    }, 30000); // Poll every 30 seconds

    return () => {
      clearInterval(pollInterval);
    };
  }, [league?.status, challengeId, refetchScores, sortedScores, playNextScoringPlay]);

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

  // Demo function to test battle animations (must be after leader/challenger are defined)
  const triggerDemoPlays = useCallback(() => {
    if (!leader || !challenger) {
      toast.error("Need both teams to demo battle animations");
      return;
    }

    const demoPlays: ScoringPlayData[] = [
      {
        attackingTeamId: leader.teamId,
        attackingTeamName: leader.teamName,
        defendingTeamId: challenger.teamId,
        defendingTeamName: challenger.teamName,
        playerName: "Blue Dream",
        playerType: "cannabis_strain",
        pointsScored: 8.5,
        attackerNewTotal: leader.points + 8.5,
        defenderTotal: challenger.points,
        imageUrl: "https://images.leafly.com/flower-images/blue-dream.png",
      },
      {
        attackingTeamId: challenger.teamId,
        attackingTeamName: challenger.teamName,
        defendingTeamId: leader.teamId,
        defendingTeamName: leader.teamName,
        playerName: "STIIIZY",
        playerType: "manufacturer",
        pointsScored: 12.3,
        attackerNewTotal: challenger.points + 12.3,
        defenderTotal: leader.points + 8.5,
        imageUrl: null,
      },
      {
        attackingTeamId: leader.teamId,
        attackingTeamName: leader.teamName,
        defendingTeamId: challenger.teamId,
        defendingTeamName: challenger.teamName,
        playerName: "OG Kush Pre-Roll",
        playerType: "product",
        pointsScored: 5.2,
        attackerNewTotal: leader.points + 8.5 + 5.2,
        defenderTotal: challenger.points + 12.3,
        imageUrl: null,
      },
    ];

    // Queue up demo plays
    scoringPlayQueueRef.current = [...demoPlays];
    toast.success(`Queued ${demoPlays.length} demo scoring plays!`);
    playNextScoringPlay();
  }, [leader, challenger, playNextScoringPlay]);

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

        {/* Battle Arena Hero Section */}
        <BattleArena
          leftTeam={leader ? {
            teamId: leader.teamId,
            teamName: leader.teamName,
            userName: leader.userName,
            userAvatarUrl: leader.userAvatarUrl,
            fighterIllustration: leader.fighterIllustration,
            points: leader.points,
          } : null}
          rightTeam={challenger ? {
            teamId: challenger.teamId,
            teamName: challenger.teamName,
            userName: challenger.userName,
            userAvatarUrl: challenger.userAvatarUrl,
            fighterIllustration: challenger.fighterIllustration,
            points: challenger.points,
          } : !challenger && league?.leagueCode ? null : null}
          isLive={isLive}
          challengeDate={challengeDateLabel}
          userTeamId={userTeam?.id}
          selectedTeamId={selectedTeamId}
          onFighterChange={() => refetchLeague()}
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

        {/* Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white/5 border border-white/10 p-4">
          <div className="flex items-center gap-3">
            {isLive ? <LiveIndicator size="sm" /> : <Badge variant="outline">Final</Badge>}
            {(league?.status === 'active' || league?.status === 'draft') && (
              <>
                <span className="text-xs text-white/60">
                  {isConnected ? "Connected" : "Connecting..."}
                  {lastUpdateTime && ` • ${lastUpdateTime.toLocaleTimeString()}`}
                </span>
                <span className="text-white/30">•</span>
                <span className="flex items-center gap-1.5 text-xs text-white/60">
                  <Clock className="w-3 h-3" />
                  Next: {timeUntilUpdate || "..."}
                </span>
              </>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {/* Demo Button for testing animations */}
            {leader && challenger && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-2xl border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10"
                onClick={triggerDemoPlays}
                disabled={!!currentScoringPlay}
              >
                <Zap className="w-4 h-4 mr-2" />
                Demo Battle
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="rounded-2xl border-white/30 text-white hover:bg-white/10"
              onClick={handleCalculateScores}
              disabled={isCalculating || calculateChallengeDayMutation.isPending}
            >
              {isCalculating || calculateChallengeDayMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Sync Scores
                </>
              )}
            </Button>
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

