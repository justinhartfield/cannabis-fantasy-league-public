import { useEffect, useMemo, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LiveIndicator } from "@/components/LiveIndicator";
import { ComparisonBar } from "@/components/ComparisonBar";
import ScoringBreakdown from "@/components/ScoringBreakdown";
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

interface TeamScore {
  teamId: number;
  teamName: string;
  points: number;
  rank?: number;
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

  const {
    data: weekScores,
    isLoading: scoresLoading,
    refetch: refetchScores,
  } = trpc.scoring.getLeagueWeekScores.useQuery(
    {
      leagueId: challengeId,
      year: currentYear,
      week: currentWeek,
    },
    { enabled: !!league }
  );

  const {
    data: breakdown,
    isLoading: breakdownLoading,
  } = trpc.scoring.getTeamBreakdown.useQuery(
    {
      teamId: selectedTeamId || 0,
      year: currentYear,
      week: currentWeek,
    },
    {
      enabled: !!selectedTeamId,
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

  const calculateScoresMutation = trpc.scoring.calculateLeagueWeek.useMutation({
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

  const [redirecting, setRedirecting] = useState(false);

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
        setLastUpdateTime(new Date(message.updateTime));
        refetchScores();
        toast.info("Scores updated!");
      } else if (message.type === 'challenge_finalized') {
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
          setLocation(`/draft/${challengeId}`);
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

  // Calculate scores on page load as fallback
  useEffect(() => {
    if (league && league.leagueType === 'challenge' && league.status === 'active' && !isCalculating) {
      // Trigger score calculation on load to ensure accuracy
      const challengeDate = new Date(league.createdAt);
      const now = new Date();
      // Only calculate if challenge was created today
      if (challengeDate.toDateString() === now.toDateString()) {
        calculateScoresMutation.mutate({
          leagueId: challengeId,
          year: currentYear,
          week: currentWeek,
        });
      }
    }
  }, [league, challengeId, currentYear, currentWeek]);

  const handleCalculateScores = () => {
    setIsCalculating(true);
    calculateScoresMutation.mutate({
      leagueId: challengeId,
      year: currentYear,
      week: currentWeek,
    });
  };

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
  useEffect(() => {
    if (league && league.leagueType !== "challenge") {
      setRedirecting(true);
      setLocation(`/league/${challengeId}`);
    }
  }, [league, challengeId, setLocation]);

  useEffect(() => {
    if (weekScores && weekScores.length > 0 && !selectedTeamId) {
      setSelectedTeamId(weekScores[0].teamId);
    }
  }, [weekScores, selectedTeamId]);

  const sortedScores: TeamScore[] = useMemo(() => {
    if (!weekScores) return [];
    return [...weekScores]
      .map((score, index) => ({
        teamId: score.teamId,
        teamName: score.teamName,
        points: score.points || 0,
        rank: index + 1,
      }))
      .sort((a, b) => (b.points || 0) - (a.points || 0));
  }, [weekScores]);

  // Check for winner when challenge is complete (after sortedScores is defined)
  useEffect(() => {
    if (league?.status === 'complete' && sortedScores.length > 0 && !winner) {
      setWinner(sortedScores[0]);
    }
  }, [league, sortedScores, winner]);

  const leader = sortedScores[0];
  const challenger = sortedScores[1];
  const scoreDiff =
    leader && challenger ? (leader.points || 0) - (challenger.points || 0) : 0;

  const selectedTeam = useMemo(
    () => sortedScores.find((team) => team.teamId === selectedTeamId) || null,
    [sortedScores, selectedTeamId]
  );

  const topPerformers = useMemo<
    { name: string; type: string; total: number; breakdown: any }[]
  >(() => {
    if (!breakdown || !breakdown.breakdowns) {
      return [];
    }
      return breakdown.breakdowns
        .map((item: any) => ({
          name: item.assetName || `Unknown ${item.assetType}`,
          type: item.assetType,
          total: item.totalPoints || 0,
          breakdown: item.breakdown,
        }))
        .sort((a: { total: number }, b: { total: number }) => b.total - a.total)
        .slice(0, 3);
  }, [breakdown]);

  const recentChallenges = useMemo<ChallengeSummary[]>(() => {
    if (!userLeagues) return [];
    return userLeagues
      .filter(
        (item: any) =>
          item.leagueType === "challenge" && item.id !== challengeId
      )
      .map(
        (item: any): ChallengeSummary => ({
          id: item.id,
          name: item.name,
          status: item.status,
          currentWeek: item.currentWeek,
          seasonYear: item.seasonYear,
          updatedAt: item.updatedAt,
          createdAt: item.createdAt,
        })
      )
      .sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt || Date.now()).getTime() -
          new Date(a.updatedAt || a.createdAt || Date.now()).getTime()
      )
      .slice(0, 4);
  }, [userLeagues, challengeId]);

  const normalizedLineup = useMemo(
    () => normalizeLineup(teamLineup),
    [teamLineup]
  );

  if (
    !challengeId ||
    authLoading ||
    leagueLoading ||
    scoresLoading ||
    (selectedTeamId && breakdownLoading) ||
    redirecting
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

      <header className="sticky top-0 z-10 border-b border-border/50 bg-card/80 backdrop-blur-lg">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gradient-primary">
                {league.name}
              </h1>
              <p className="text-muted-foreground text-sm">
                Daily Challenge • {new Date().toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isLive ? <LiveIndicator size="sm" /> : <Badge variant="outline">Final</Badge>}
            <Badge variant="secondary">
              Woche {currentWeek} • {currentYear}
            </Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Challenge Complete Banner */}
        {league?.status === 'complete' && winner && (
          <Card className="gradient-card border-border/50 glow-primary slide-in-bottom">
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <Trophy className="w-16 h-16 text-yellow-500" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-gradient-primary mb-2">
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

        {/* Update Status Indicator */}
        {league?.status === 'active' && (
          <Card className="border-border/50 bg-card/80">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isConnected ? (
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-gray-500" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {isConnected ? 'Live Updates Connected' : 'Connecting...'}
                    </p>
                    {lastUpdateTime && (
                      <p className="text-xs text-muted-foreground">
                        Last updated: {lastUpdateTime.toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>Next update in: {timeUntilUpdate || 'Calculating...'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Hero Scoreboard */}
        <Card className="gradient-card border-border/50 glow-primary slide-in-bottom">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex-1 flex items-center justify-between gap-6">
                {leader ? (
                  <TeamScoreBlock
                    name={leader.teamName}
                    score={leader.points}
                    highlight
                  />
                ) : league?.leagueCode ? (
                  <InviteBlock leagueCode={league.leagueCode} />
                ) : (
                  <EmptyTeamBlock />
                )}

                <div className="text-center">
                  <div className="text-sm uppercase text-muted-foreground">
                    Scoreboard
                  </div>
                  <div className="text-4xl font-bold text-foreground mt-1">
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
                  />
                ) : league?.leagueCode ? (
                  <InviteBlock leagueCode={league.leagueCode} />
                ) : (
                  <EmptyTeamBlock />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              label: "Score Differenz",
              value: `${scoreDiff >= 0 ? "+" : ""}${scoreDiff.toFixed(1)}`,
              icon: Flame,
              variant: "primary" as const,
            },
            {
              label: "Aktive Teams",
              value: weekScores?.length || 0,
              icon: Sparkles,
              variant: "secondary" as const,
            },
            {
              label: "Dein Team",
              value: league.teams?.find((team: any) => team.userId === user?.id)
                ? "Aktiv"
                : "Zuschauer",
              icon: UserCircle,
              variant: "purple" as const,
            },
          ].map((stat, index) => (
            <div
              key={stat.label}
              className="slide-in-bottom"
              style={{ animationDelay: `${index * 0.08}s` }}
            >
              <StatBadge
                label={stat.label}
                value={stat.value}
                icon={stat.icon}
                variant={stat.variant}
              />
            </div>
          ))}
        </div>

        {/* Leaderboard */}
        <Card className="border-border/50 bg-card/80 slide-in-bottom">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Trophy className="w-5 h-5 text-primary" />
                Leaderboard
              </CardTitle>
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-border/50"
                  onClick={handleCalculateScores}
                  disabled={isCalculating || calculateScoresMutation.isPending}
                >
                  {isCalculating || calculateScoresMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Calc...
                    </>
                  ) : (
                    "Calculate Scores"
                  )}
                </Button>
              )}
            </div>
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

        {/* Team Lineup */}
        {selectedTeam && (
          <Card className="border-border/50 bg-card/80 slide-in-bottom">
            <CardHeader>
              <CardTitle className="text-foreground">
                Team Lineup
              </CardTitle>
              <CardDescription>{selectedTeam.teamName}</CardDescription>
            </CardHeader>
            <CardContent>
              {teamLineupLoading ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Lädt Lineup...
                </div>
              ) : normalizedLineup.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {normalizedLineup.map((slot) => (
                    <div
                      key={slot.position}
                      className="p-3 rounded-lg border border-border/40 bg-card/70"
                    >
                      <div className="text-xs uppercase text-muted-foreground">
                        {slot.position}
                      </div>
                      <div className="text-sm font-semibold text-foreground mt-1">
                        {slot.assetName || "Noch nicht gesetzt"}
                      </div>
                      <div className="text-xs text-muted-foreground capitalize">
                        {slot.assetType?.replace(/_/g, " ") || "—"}
                      </div>
                      {typeof slot.points === "number" && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Punkte: {slot.points.toFixed(1)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Kein Lineup eingereicht.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Top Performers */}
        {topPerformers.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Game Leaders
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              {topPerformers.map((performer, index) => (
                <Card
                  key={`${performer.name}-${index}`}
                  className="gradient-card border-border/40 card-hover-lift slide-in-bottom"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge>#{index + 1}</Badge>
                      <TrendIndicator value={performer.total} showPercentage={false} />
                    </div>
                    <div>
                      <div className="text-lg font-bold text-foreground">
                        {performer.name}
                      </div>
                      <div className="text-xs text-muted-foreground uppercase">
                        {performer.type}
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

        {recentChallenges.length > 0 && (
          <Card className="border-border/50 bg-card/70 slide-in-bottom">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Recent Challenges
                </h3>
                <Badge variant="outline">{recentChallenges.length}</Badge>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                {recentChallenges.map((challenge: ChallengeSummary, index) => {
                  const status =
                    challenge.status === "active"
                      ? "Live"
                      : challenge.status === "draft"
                      ? "Upcoming"
                      : "Final";
                  const challengeDate =
                    challenge.updatedAt || challenge.createdAt || null;
                  const formattedDate = challengeDate
                    ? new Date(challengeDate).toLocaleDateString()
                    : "—";

                  return (
                    <div
                      key={challenge.id}
                      className="rounded-xl border border-border/40 bg-card/70 p-4 card-hover-lift slide-in-bottom"
                      style={{ animationDelay: `${index * 0.08}s` }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="uppercase text-xs">
                          {status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formattedDate}
                        </span>
                      </div>
                      <div className="text-lg font-semibold text-foreground">
                        {challenge.name}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Week {challenge.currentWeek} • {challenge.seasonYear}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-3 text-primary hover:text-primary/80 hover:bg-primary/10"
                        onClick={() => setLocation(`/challenge/${challenge.id}`)}
                      >
                        View Challenge
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Detailed Breakdown */}
        {selectedTeamId && breakdown?.breakdowns?.length ? (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Scoring Breakdown
            </h3>
            <div className="grid gap-4">
              {breakdown.breakdowns.map((item: any, index: number) => (
                <div key={`${item.assetId}-${index}`}>
                  <ScoringBreakdown
                    data={{
                      assetName:
                        item.assetName || `Unknown ${item.assetType}`,
                      assetType: item.assetType,
                      components: item.breakdown?.components || [],
                      bonuses: item.breakdown?.bonuses || [],
                      penalties: item.breakdown?.penalties || [],
                      subtotal: item.breakdown?.subtotal || 0,
                      total: item.totalPoints || 0,
                    }}
                    leagueAverage={item.leagueAverage}
                    weeklyTrend={item.weeklyTrend}
                  />
                </div>
              ))}
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
}: {
  name?: string;
  score?: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex-1 rounded-2xl p-4 bg-card/80 border border-border/40 text-left",
        highlight && "glow-primary gradient-dark"
      )}
    >
      <div className="text-xs uppercase text-muted-foreground mb-2">Team</div>
      <div className="text-xl font-bold text-foreground truncate">{name || "Team"}</div>
      <div className="text-4xl font-bold text-gradient-primary mt-3">
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

function InviteBlock({ leagueCode }: { leagueCode: string }) {
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

