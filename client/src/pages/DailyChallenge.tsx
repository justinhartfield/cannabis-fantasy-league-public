import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LiveIndicator } from "@/components/LiveIndicator";
import { ComparisonBar } from "@/components/ComparisonBar";
import ScoringBreakdownV2 from "@/components/ScoringBreakdownV2";
import { StatBadge } from "@/components/StatBadge";
import { TrendIndicator } from "@/components/TrendIndicator";
import { CoinFlip } from "@/components/CoinFlip";

import {
  Loader2,
  ArrowLeft,
  Trophy,
  Flame,
  UserCircle,
  Sparkles,
  RefreshCw,
  Clock,
  UserPlus,
  Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getLoginUrl } from "@/const";
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
    onSuccess: () => {
      toast.success("Scores calculated successfully!");
      refetchScores();
      setIsCalculating(false);
    },
    onError: (error) => {
      toast.error(`Failed to calculate scores: ${error.message}`);
      setIsCalculating(false);
    },
  });

  const createRematchMutation = trpc.league.createRematchChallenge.useMutation({
    onSuccess: (data) => {
      toast.success("Rematch challenge created!");
      setLocation(`/challenge/${data.leagueId}`);
    },
    onError: (error) => {
      toast.error(`Failed to create rematch: ${error.message}`);
    },
  });

  const { data: rematchInfo } = trpc.league.getChallengeRematchInfo.useQuery(
    { challengeId: challengeId },
    { enabled: !!challengeId && league?.status === 'complete' && isAuthenticated }
  );


  const isAdmin = user?.role === "admin";

  // Get user's team ID for WebSocket
  const userTeamId = useMemo(() => {
    if (!league?.teams || !user?.id) return undefined;
    const team = league.teams.find((t: any) => t.userId === user.id);
    return team?.id;
  }, [league, user]);

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

  const handleRematch = () => {
    if (!challengeId) return;
    createRematchMutation.mutate({ originalChallengeId: challengeId });
  };

  // Auth guard
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      const loginUrl = getLoginUrl();
      if (loginUrl) window.location.href = loginUrl;
      else setLocation("/login");
    }
  }, [authLoading, isAuthenticated, setLocation]);

  if (!authLoading && !isAuthenticated) {
    return null;
  }

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
      }));
    }

    // Finally fall back to empty teams from league data
    if (league?.teams && league.teams.length > 0) {
      return league.teams.map((team, index) => ({
        teamId: team.id,
        teamName: team.name || `Team ${index + 1}`,
        points: 0,
        userAvatarUrl: team.userAvatarUrl,
        userName: team.userName,
      }));
    }

    return [];
  }, [dayScores, cachedScores, league]);

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

  useEffect(() => {
    if (sortedScores.length > 0 && !selectedTeamId) {
      setSelectedTeamId(sortedScores[0].teamId);
    }
  }, [sortedScores, selectedTeamId]);

  // Check for winner when challenge is complete (after sortedScores is defined)
  useEffect(() => {
    if (league?.status === 'complete' && sortedScores.length > 0 && !winner) {
      setWinner(sortedScores[0]);
    }
  }, [league, sortedScores, winner]);

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
          <Button onClick={() => setLocation("/dashboard")}>
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
        <section className="rounded-[32px] bg-gradient-to-br from-[#050505] via-[#0f0f16] to-[#1b1c2a] p-6 text-white shadow-[0_25px_60px_rgba(0,0,0,0.45)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-2xl border border-white/10 text-white hover:bg-white/10"
                onClick={() => window.history.back()}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-white/60">Daily Challenge</p>
                <h1 className="text-3xl font-bold">{league.name}</h1>
                <p className="text-white/70 text-sm">{challengeDateLabel}</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 text-right">
              <div className="flex items-center gap-2">
                {isLive ? <LiveIndicator size="sm" /> : <Badge variant="outline">Final</Badge>}
                <Badge variant="secondary" className="bg-white/10 text-white">
                  {challengeDateLabel}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-white/70 text-sm">
                <Clock className="w-4 h-4" />
                <span>Next update in: {timeUntilUpdate || "Calculating..."}</span>
              </div>
            </div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3 text-white">
            <div className="rounded-2xl bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-white/50">Status</p>
              <p className="text-xl font-semibold mt-1">{isLive ? "Live" : (league.status || "Pending")}</p>
            </div>
            <div className="rounded-2xl bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-white/50">Week</p>
              <p className="text-xl font-semibold mt-1">
                Week {currentWeek} • {currentYear}
              </p>
            </div>
            <div className="rounded-2xl bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-white/50">Actions</p>
              <div className="mt-3 flex flex-wrap gap-2">
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
                    "Sync Scores"
                  )}
                </Button>
                {league.leagueCode && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="rounded-2xl"
                    onClick={copyLeagueCode}
                  >
                    Share Code
                  </Button>
                )}
              </div>
            </div>
          </div>
        </section>
        {(league?.status === 'active' || league?.status === 'draft') && (
          <p className="text-xs text-white/60">
            {isConnected ? "Live updates connected" : "Connecting to live updates..."}
            {lastUpdateTime && ` • Last updated ${lastUpdateTime.toLocaleTimeString()}`}
          </p>
        )}

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
                {rematchInfo?.opponent && (
                  <div className="pt-4">
                    <Button
                      onClick={handleRematch}
                      disabled={createRematchMutation.isPending}
                      className="gradient-primary"
                      size="lg"
                    >
                      {createRematchMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating Rematch...
                        </>
                      ) : (
                        <>
                          <Trophy className="w-4 h-4 mr-2" />
                          Rematch {rematchInfo.opponent.userName || rematchInfo.opponent.teamName}
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Hero Scoreboard */}
        <Card className="rounded-[32px] border-white/10 bg-gradient-to-br from-[#050505] via-[#111122] to-[#1f1f33] shadow-[0_25px_60px_rgba(0,0,0,0.45)] slide-in-bottom">
          <CardContent className="p-6">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                {leader ? (
                  <TeamScoreBlock
                    name={leader.teamName}
                    score={leader.points}
                    highlight
                    avatarUrl={leader.userAvatarUrl}
                    userName={leader.userName}
                  />
                ) : (
                  <EmptyTeamBlock />
                )}

                <div className="text-center w-full md:w-auto">
                  <div className="text-sm uppercase text-muted-foreground">
                    Scoreboard
                  </div>
                  <div className="text-3xl sm:text-4xl font-bold text-foreground mt-1">
                    {leader?.points?.toFixed(1) ?? "0.0"}{" "}
                    <span className="text-2xl text-muted-foreground">–</span>{" "}
                    {challenger?.points?.toFixed(1) ?? "0.0"}
                  </div>
                  <div className="mt-3">
                    <ComparisonBar
                      leftValue={leader?.points || 0}
                      rightValue={challenger?.points || 0}
                      leftLabel={leader?.teamName || "Team A"}
                      rightLabel={challenger?.teamName || "Team B"}
                    />
                  </div>
                  {leader && challenger && (
                    <div className="mt-3">
                      <TrendIndicator
                        value={scoreDiff}
                        showPercentage={false}
                      />
                    </div>
                  )}
                </div>

                {challenger ? (
                  <TeamScoreBlock
                    name={challenger.teamName}
                    score={challenger.points}
                    avatarUrl={challenger.userAvatarUrl}
                    userName={challenger.userName}
                  />
                ) : league?.leagueCode ? (
                  <InviteBlock
                    leagueCode={league.leagueCode}
                    leagueId={challengeId}
                    leagueName={league.name}
                  />
                ) : (
                  <EmptyTeamBlock />
                )}
              </div>
            </div>
          </CardContent>
        </Card>



        {/* Leaderboard */}
        <Card className="rounded-[28px] border-white/10 bg-white/5 slide-in-bottom">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Trophy className="w-5 h-5 text-primary" />
              Leaderboard
            </CardTitle>
            <CardDescription>
              Woche {currentWeek} • {currentYear}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sortedScores.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Keine Scores verfügbar.
              </p>
            ) : (
              <div className="space-y-2">
                {sortedScores.map((team: TeamScore) => (
                  <button
                    key={team.teamId}
                    onClick={() => setSelectedTeamId(team.teamId)}
                    className={cn(
                      "w-full p-3 rounded-lg border transition-all text-left card-hover-lift",
                      selectedTeamId === team.teamId
                        ? "bg-primary/10 border-primary glow-primary"
                        : "bg-card/60 border-border/50 hover:border-primary/30"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg",
                            team.rank === 1
                              ? "rank-gold text-white"
                              : team.rank === 2
                              ? "rank-silver text-white"
                              : team.rank === 3
                              ? "rank-bronze text-white"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {team.rank}
                        </div>
                        <TeamAvatar avatarUrl={team.userAvatarUrl} teamName={team.teamName} userName={team.userName} size="md" />
                        <div>
                          <div
                            className={cn(
                              "font-semibold truncate",
                              team.rank === 1 ? "text-gradient-primary" : "text-foreground"
                            )}
                          >
                            {team.teamName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Punkte
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-foreground">
                          {team.points?.toFixed(1) ?? "0.0"}
                        </div>
                        <div className="text-xs text-muted-foreground uppercase">
                          Total
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>


        {/* Top Performers */}
        {topPerformers.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Game Leaders
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {topPerformers.map((performer, index) => (
                <Card
                  key={`${performer.name}-${index}`}
                  className="rounded-[24px] border-white/10 bg-white/5 card-hover-lift slide-in-bottom"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge>#{index + 1}</Badge>
                      <TrendIndicator value={performer.total} showPercentage={false} />
                    </div>
                    <div className="flex items-center gap-3">
                      {performer.imageUrl && (
                        <img 
                          src={performer.imageUrl} 
                          alt={performer.name}
                          className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border-2 border-border"
                          onError={(e) => e.currentTarget.style.display = 'none'}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-lg font-bold text-foreground truncate">
                          {performer.name}
                        </div>
                        <div className="text-xs text-muted-foreground uppercase">
                          {performer.type}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {performer.breakdown?.components?.length || 0} Komponenten
                    </div>
                    <div className="text-3xl font-bold text-gradient-secondary">
                      {performer.total.toFixed(1)}
                    </div>
                  </CardContent>
                </Card>
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

function TeamScoreBlock({
  name,
  score,
  highlight = false,
  avatarUrl,
  userName,
}: {
  name?: string;
  score?: number;
  highlight?: boolean;
  avatarUrl?: string | null;
  userName?: string | null;
}) {
  return (
    <div
      className={cn(
        "flex-1 rounded-2xl p-4 bg-card/80 border border-border/40 text-left",
        highlight && "glow-primary gradient-dark"
      )}
    >
      <div className="text-xs uppercase text-muted-foreground mb-2">Team</div>
      <div className="flex items-center gap-2 mb-1">
        <TeamAvatar avatarUrl={avatarUrl} teamName={name || "Team"} userName={userName} size="md" />
        <div className="text-lg sm:text-xl font-bold text-foreground truncate">{name || "Team"}</div>
      </div>
      <div className="text-3xl sm:text-4xl font-bold text-gradient-primary mt-3">
        {score?.toFixed(1) ?? "0.0"}
      </div>
    </div>
  );
}

function EmptyTeamBlock() {
  return (
    <div className="flex-1 rounded-2xl p-4 bg-muted/20 border border-border/40 text-center">
      <div className="text-sm text-muted-foreground">Kein Team</div>
    </div>
  );
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

