import { useEffect, useMemo, useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  RefreshCw,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { LiveScoreCard } from "@/components/LiveScoreCard";
import { cn } from "@/lib/utils";

// Helper to get current ISO year/week (mirrors server/utils/isoWeek.ts)
function getIsoYearWeek(date: Date): { year: number; week: number } {
  const tempDate = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  const dayNum = tempDate.getUTCDay() || 7;
  tempDate.setUTCDate(tempDate.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(
    Date.UTC(tempDate.getUTCFullYear(), 0, 1)
  );
  const week = Math.ceil(
    ((tempDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
  return { year: tempDate.getUTCFullYear(), week };
}

export default function Matchups() {
  // Route is defined as `/league/:id/matchups` and `/challenge/:id/matchups`
  // so we need to read the `id` param and convert it to a number.
  const { id } = useParams<{ id: string }>();
  const leagueId = Number(id);
  const now = new Date();
  const { year: currentIsoYear, week: currentIsoWeek } = getIsoYearWeek(now);
  const [year, setYear] = useState(currentIsoYear);
  const [week, setWeek] = useState(currentIsoWeek);

  const { data: matchups, isLoading, refetch } = trpc.matchup.getWeekMatchups.useQuery({
    leagueId,
    year,
    week,
  });

  const { data: league } = trpc.league.getById.useQuery({ leagueId });
  const isSeasonLeague = league?.leagueType === "season";

  const { data: dailyMatchupScores, isLoading: isLoadingDailyScores } =
    trpc.matchup.getMatchupDailyScores.useQuery(
      { leagueId, year, week },
      {
        enabled: Boolean(isSeasonLeague),
      }
    );

  const dailyScoresByMatchup = useMemo(() => {
    if (!dailyMatchupScores) {
      return {};
    }
    return dailyMatchupScores.reduce<Record<number, typeof dailyMatchupScores[number]>>((acc, entry) => {
      acc[entry.matchupId] = entry;
      return acc;
    }, {});
  }, [dailyMatchupScores]);

  const generateMatchups = trpc.matchup.generateWeekMatchups.useMutation({
    onSuccess: () => {
      toast.success("Matchups generated successfully!");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateScores = trpc.matchup.updateMatchupScores.useMutation({
    onSuccess: () => {
      toast.success("Matchup scores updated!");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleGenerateMatchups = () => {
    generateMatchups.mutate({ leagueId, year, week });
  };

  const handleUpdateScores = () => {
    updateScores.mutate({ leagueId, year, week });
  };

  const [, setLocation] = useLocation();

  useEffect(() => {
    if (league?.leagueType === "challenge" && leagueId) {
      setLocation(`/challenge/${leagueId}`);
    }
  }, [league, leagueId, setLocation]);

  if (league?.leagueType === "challenge") {
    return null;
  }

  return (
    <div className="min-h-screen gradient-dark">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-lg border-b border-border/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gradient-primary">SCORES</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {league?.name}
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{matchups?.length || 0} games</span>
            </div>
          </div>

          {/* Week Navigation */}
          <div className="flex items-center justify-between gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setWeek(Math.max(1, week - 1))}
              disabled={week <= 1}
              className="text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>

            <div className="flex items-center gap-3">
              <Select value={year.toString()} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger className="w-[100px] bg-card border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                </SelectContent>
              </Select>

              <div className="px-4 py-2 rounded-lg bg-card border border-border/50">
                <span className="text-xs text-muted-foreground mr-2">WEEK</span>
                <span className="text-lg font-bold text-foreground">{week}</span>
              </div>

              <Select value={week.toString()} onValueChange={(v) => setWeek(Number(v))}>
                <SelectTrigger className="w-[120px] bg-card border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 18 }, (_, i) => i + 1).map((w) => (
                    <SelectItem key={w} value={w.toString()}>
                      Week {w}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setWeek(Math.min(18, week + 1))}
              disabled={week >= 18}
              className="text-muted-foreground hover:text-foreground"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 mt-4">
            <Button 
              onClick={() => refetch()} 
              variant="outline" 
              size="sm"
              className="border-border/50"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>

            {league?.isCommissioner && (
              <>
                {league?.leagueType !== "season" && (
                  <Button 
                    onClick={handleGenerateMatchups}
                    disabled={generateMatchups.isLoading}
                    size="sm"
                    className="gradient-primary"
                  >
                    {generateMatchups.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Generate Matchups
                  </Button>
                )}
                <Button 
                  onClick={handleUpdateScores}
                  disabled={updateScores.isLoading}
                  variant="outline"
                  size="sm"
                  className="border-border/50"
                >
                  {updateScores.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update Scores
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">

        {/* Matchups List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Loading matchups...</p>
            </div>
          </div>
        ) : matchups && matchups.length > 0 ? (
          <div className="grid gap-4 md:gap-6">
            {matchups.map((matchup) => {
              const dailyData = dailyScoresByMatchup[matchup.id];
              const liveTotals =
                isSeasonLeague && dailyData
                  ? dailyData.days.reduce(
                      (acc, day) => {
                        acc.team1Points += day.team1Points || 0;
                        acc.team2Points += day.team2Points || 0;
                        return acc;
                      },
                      { team1Points: 0, team2Points: 0 }
                    )
                  : null;

              const displayTeam1Score =
                liveTotals?.team1Points ??
                matchup.team1Score ??
                0;
              const displayTeam2Score =
                liveTotals?.team2Points ??
                matchup.team2Score ??
                0;

              return (
                <div key={matchup.id} className="space-y-3 slide-in-bottom">
                  <LiveScoreCard
                    team1={{
                      id: matchup.team1Id,
                      name: matchup.team1?.name || "Unknown Team",
                      score: displayTeam1Score,
                    }}
                    team2={{
                      id: matchup.team2Id,
                      name: matchup.team2?.name || "Unknown Team",
                      score: displayTeam2Score,
                    }}
                    status={
                      matchup.status as
                        | "scheduled"
                        | "in_progress"
                        | "final"
                    }
                    week={week}
                    winnerId={matchup.winnerId || undefined}
                    onClick={() => {
                      toast.info("Matchup details coming soon!");
                    }}
                  />
                  {isSeasonLeague && (
                    <MatchupDailyBreakdown
                      matchup={matchup}
                      dailyData={dailyData}
                      isLoading={isLoadingDailyScores}
                    />
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <Card className="border-border/50">
            <CardContent className="py-20 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-6">
                  <Calendar className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-2xl font-bold mb-3 text-foreground">No Matchups Yet</h3>
                <p className="text-muted-foreground mb-6">
                  There are no matchups scheduled for this week. 
                  {league?.isCommissioner && " Generate matchups to get started."}
                </p>
                {league?.isCommissioner && (
                  <Button onClick={handleGenerateMatchups} className="gradient-primary">
                    Generate Matchups
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

type WeekMatchup = Awaited<ReturnType<typeof trpc.matchup.getWeekMatchups.useQuery>> extends {
  data: infer D;
}
  ? D extends readonly (infer U)[]
    ? U
    : never
  : never;

type MatchupDailyEntry = {
  date: string;
  team1Points: number;
  team2Points: number;
  error?: boolean;
};

type MatchupDailyData = {
  matchupId: number;
  team1Id: number;
  team2Id: number;
  days: MatchupDailyEntry[];
};

function MatchupDailyBreakdown({
  matchup,
  dailyData,
  isLoading,
}: {
  matchup: WeekMatchup;
  dailyData?: MatchupDailyData;
  isLoading: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<'all' | string>('all');

  useEffect(() => {
    setSelectedDate('all');
  }, [matchup.id, dailyData?.matchupId]);

  const days = dailyData?.days ?? [];

  const weeklyTotals = useMemo(() => {
    return days.reduce(
      (acc, day) => {
        acc.team1Points += day.team1Points || 0;
        acc.team2Points += day.team2Points || 0;
        return acc;
      },
      { team1Points: 0, team2Points: 0 }
    );
  }, [days]);

  const activeDay =
    selectedDate === 'all'
      ? weeklyTotals
      : days.find((day) => day.date === selectedDate) ?? { team1Points: 0, team2Points: 0 };

  const activeLabel =
    selectedDate === 'all'
      ? 'Whole Week'
      : format(parseISO(selectedDate), "EEE, MMM d");

  const noStats = activeDay.team1Points === 0 && activeDay.team2Points === 0;

  if (!days.length && !isLoading) {
    return (
      <Card className="bg-card/40 border-dashed border-border/40">
        <CardContent className="py-6 text-sm text-muted-foreground text-center">
          Daily scoring will appear once stats sync for this week.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/40 border-border/40">
      <CardContent className="py-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
              Day-by-Day Breakdown
            </p>
            <p className="text-sm text-muted-foreground">
              Compare {matchup.team1?.name || "Team 1"} vs {matchup.team2?.name || "Team 2"} by day
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen((prev) => !prev)}
            className="text-muted-foreground hover:text-foreground"
          >
            {isOpen ? (
              <>
                Hide <ChevronUp className="w-4 h-4 ml-1" />
              </>
            ) : (
              <>
                View <ChevronDown className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>
        </div>

        {isOpen && (
          <div className="space-y-4">
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading daily scores...
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedDate('all')}
                    className={cn(
                      "px-3 py-1 text-xs font-semibold rounded-full border transition-colors",
                      selectedDate === 'all'
                        ? "bg-primary text-black border-primary"
                        : "bg-muted/40 border-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    All Week
                  </button>
                  {days.map((day) => (
                    <button
                      key={day.date}
                      onClick={() => setSelectedDate(day.date)}
                      className={cn(
                        "px-3 py-1 text-xs font-semibold rounded-full border transition-colors",
                        selectedDate === day.date
                          ? "bg-primary text-black border-primary"
                          : "bg-muted/40 border-transparent text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {format(parseISO(day.date), "EEE d")}
                    </button>
                  ))}
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <DailyScoreCard
                    label={matchup.team1?.name || "Team 1"}
                    points={activeDay.team1Points}
                    opponentPoints={activeDay.team2Points}
                  />
                  <DailyScoreCard
                    label={matchup.team2?.name || "Team 2"}
                    points={activeDay.team2Points}
                    opponentPoints={activeDay.team1Points}
                  />
                </div>

                <div className="text-xs text-muted-foreground">
                  {selectedDate === 'all' ? (
                    <>Totals shown reflect the entire ISO week.</>
                  ) : noStats ? (
                    <>No stats were recorded for {activeLabel}. Scores will populate once data syncs.</>
                  ) : (
                    <>Showing scores recorded on {activeLabel}.</>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DailyScoreCard({
  label,
  points,
  opponentPoints,
}: {
  label: string;
  points: number;
  opponentPoints: number;
}) {
  const isLeader = points > opponentPoints;
  const isTied = points === opponentPoints;
  return (
    <div
      className={cn(
        "rounded-xl border p-4 bg-background/40",
        isLeader ? "border-primary/60 shadow-[0_0_20px_rgba(130,255,148,0.15)]" : "border-border/40"
      )}
    >
      <p className="text-xs uppercase text-muted-foreground font-semibold">{label}</p>
      <div className="flex items-baseline gap-2 mt-1">
        <p className="text-3xl font-bold text-foreground">{points.toFixed(1)}</p>
        <span className="text-xs text-muted-foreground">pts</span>
      </div>
      <p className={cn("text-xs font-semibold mt-2", isLeader ? "text-primary" : isTied ? "text-muted-foreground" : "text-muted-foreground/80")}>
        {isLeader ? "Lead" : isTied ? "Tie" : "Trailing"} by {(Math.abs(points - opponentPoints)).toFixed(1)} pts
      </p>
    </div>
  );
}