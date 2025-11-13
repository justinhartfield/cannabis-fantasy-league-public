import { useEffect, useMemo, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LiveIndicator } from "@/components/LiveIndicator";
import { ComparisonBar } from "@/components/ComparisonBar";
import ScoringBreakdown from "@/components/ScoringBreakdown";
import { StatBadge } from "@/components/StatBadge";
import { TrendIndicator } from "@/components/TrendIndicator";
import {
  Loader2,
  ArrowLeft,
  Trophy,
  Flame,
  UserCircle,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getLoginUrl } from "@/const";

interface TeamScore {
  teamId: number;
  teamName: string;
  points: number;
  rank?: number;
}

export default function DailyChallenge() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const challengeId = parseInt(id || "0", 10);

  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);

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

  const [redirecting, setRedirecting] = useState(false);

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

  const leader = sortedScores[0];
  const challenger = sortedScores[1];
  const scoreDiff =
    leader && challenger ? (leader.points || 0) - (challenger.points || 0) : 0;

  const topPerformers = useMemo(() => {
    if (!breakdown || !breakdown.breakdowns) return [];
    return breakdown.breakdowns
      .map((item: any) => ({
        name: item.assetName || `${item.assetType} #${item.assetId}`,
        type: item.assetType,
        total: item.totalPoints || 0,
        breakdown: item.breakdown,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 3);
  }, [breakdown]);

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
        {/* Hero Scoreboard */}
        <Card className="gradient-card border-border/50 glow-primary">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex-1 flex items-center justify-between gap-6">
                {leader ? (
                  <TeamScoreBlock
                    name={leader.teamName}
                    score={leader.points}
                    highlight
                  />
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
                ) : (
                  <EmptyTeamBlock />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatBadge
            label="Score Differenz"
            value={`${scoreDiff >= 0 ? "+" : ""}${scoreDiff.toFixed(1)}`}
            icon={Flame}
            variant="primary"
          />
          <StatBadge
            label="Aktive Teams"
            value={weekScores?.length || 0}
            icon={Sparkles}
            variant="secondary"
          />
          <StatBadge
            label="Dein Team"
            value={
              league.teams?.find((team: any) => team.userId === user?.id)
                ? "Aktiv"
                : "Zuschauer"
            }
            icon={UserCircle}
            variant="purple"
          />
        </div>

        {/* Team Selector */}
        <Card className="border-border/50 bg-card/80">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-2">
              {sortedScores.map((team) => (
                <Button
                  key={team.teamId}
                  variant={selectedTeamId === team.teamId ? "default" : "outline"}
                  className={cn(
                    "rounded-full",
                    selectedTeamId === team.teamId
                      ? "gradient-primary text-white border-0"
                      : "border-border/50"
                  )}
                  onClick={() => setSelectedTeamId(team.teamId)}
                >
                  {team.teamName}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Performers */}
        {topPerformers.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Game Leaders
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              {topPerformers.map((performer, index) => (
                <Card
                  key={index}
                  className="gradient-card border-border/40 card-hover-lift"
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

        {/* Detailed Breakdown */}
        {selectedTeamId && breakdown?.breakdowns?.length ? (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Scoring Breakdown
            </h3>
            <div className="grid gap-4">
              {breakdown.breakdowns.map((item: any, index: number) => (
                <ScoringBreakdown
                  key={`${item.assetId}-${index}`}
                  data={{
                    assetName:
                      item.assetName || `${item.assetType} #${item.assetId}`,
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

